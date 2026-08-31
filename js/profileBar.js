// Переключатель проектов (профилей): у каждого проекта свой независимый
// набор районов/услуг/шаблонов. Переключение и удаление активного меняют
// весь набор данных на странице, поэтому просто перезагружаем страницу —
// надёжнее, чем вручную пересобирать состояние всех панелей.

async function initProfileBar() {
  if (document.body.dataset.profileBarInitialized === 'true') return;
  const select = document.getElementById('profile-select');
  const newBtn = document.getElementById('new-profile-btn');
  const renameBtn = document.getElementById('rename-profile-btn');
  const deleteBtn = document.getElementById('delete-profile-btn');
  const pickerTrigger = document.getElementById('project-picker-trigger');
  const pickerMenu = document.getElementById('project-picker-menu');

  if (!select || !newBtn || !renameBtn) return;
  document.body.dataset.profileBarInitialized = 'true';

  const { profiles, activeId } = await Api.getProfiles();
  window.activeProfileId = activeId;
  renderOptions(profiles, activeId);
  if (deleteBtn) deleteBtn.disabled = profiles.length <= 1;

  const accessModal = document.getElementById('project-access-modal');
  let trialActive = false;
  const authClient = window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
  const { data: { user } = {} } = await authClient?.auth.getUser() || {};
  if (user?.email) {
    const response = await fetch(`/api/payment/status?email=${encodeURIComponent(user.email.trim().toLowerCase())}`);
    const status = await response.json().catch(() => ({}));
    trialActive = Boolean(status.active && status.trialEndsAt);
  }

  function showProjectAccessModal() {
    if (!accessModal) return;
    document.getElementById('project-access-title').textContent = 'Проекты недоступны на пробном периоде';
    document.getElementById('project-access-message').textContent = 'Переключение между проектами доступно после оплаты подписки.';
    const paymentLink = accessModal.querySelector('.project-modal-actions a');
    if (paymentLink) {
      paymentLink.href = '/app/payment';
      paymentLink.textContent = 'Оплатить подписку';
    }
    accessModal.hidden = false;
  }

  function showProjectLimitModal() {
    if (!accessModal) return;
    document.getElementById('project-access-title').textContent = 'Лимит проектов';
    document.getElementById('project-access-message').textContent = 'До 5 проектов включено в аккаунт. Дополнительный проект — 100 ₽ в месяц.';
    const paymentLink = accessModal.querySelector('.project-modal-actions a');
    if (paymentLink) {
      paymentLink.href = '/app/payment?plan=project-addon';
      paymentLink.textContent = 'Докупить проект';
    }
    accessModal.hidden = false;
  }

  accessModal?.querySelectorAll('[data-project-access-close]').forEach((el) => {
    el.addEventListener('click', () => { accessModal.hidden = true; });
  });

  function renderOptions(list, active) {
    select.innerHTML = list
      .map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === active ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
      .join('');
    const activeProfile = list.find((p) => p.id === active);
    if (pickerTrigger) pickerTrigger.textContent = activeProfile?.name || '';
    if (pickerMenu) {
      pickerMenu.innerHTML = list.map((p) => `<button type="button" class="project-picker-option${p.id === active ? ' selected' : ''}" data-profile-id="${escapeHtml(p.id)}" role="option" aria-selected="${p.id === active}">${escapeHtml(p.name)}</button>`).join('');
      pickerMenu.querySelectorAll('.project-picker-option').forEach((option) => option.addEventListener('click', () => {
        select.value = option.dataset.profileId;
        select.dispatchEvent(new Event('change'));
        closePicker();
      }));
    }
  }

  function closePicker() {
    if (!pickerMenu || !pickerTrigger) return;
    pickerMenu.hidden = true;
    pickerTrigger.setAttribute('aria-expanded', 'false');
  }

  pickerTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    pickerMenu.hidden = !pickerMenu.hidden;
    pickerTrigger.setAttribute('aria-expanded', String(!pickerMenu.hidden));
  });
  document.addEventListener('click', closePicker);

  function openProjectModal(title, initialValue, submit) {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-modal-form');
    const input = document.getElementById('project-modal-input');
    const error = document.getElementById('project-modal-error');
    if (!modal || !form || !input) return Promise.resolve(null);
    document.getElementById('project-modal-title').textContent = title;
    input.value = initialValue || '';
    error.textContent = '';
    modal.hidden = false;
    input.focus();
    input.select();
    return new Promise((resolve) => {
      const close = (value) => {
        modal.hidden = true;
        form.removeEventListener('submit', onSubmit);
        modal.querySelectorAll('[data-project-modal-close]').forEach((el) => el.removeEventListener('click', onClose));
        resolve(value);
      };
      const onClose = () => close(null);
      const onSubmit = async (event) => {
        event.preventDefault();
        try {
          await submit(input.value.trim());
          close(input.value.trim());
        } catch (err) {
          error.textContent = err.message;
        }
      };
      form.addEventListener('submit', onSubmit);
      modal.querySelectorAll('[data-project-modal-close]').forEach((el) => el.addEventListener('click', onClose));
    });
  }

  select.addEventListener('change', async () => {
    if (trialActive) {
      select.value = activeId;
      showProjectAccessModal();
      return;
    }
    window.activeProfileId = select.value;
    const selectedProfile = profiles.find((profile) => profile.id === select.value);
    const originalLabel = selectedProfile?.name || pickerTrigger?.textContent || '';
    select.disabled = true;
    if (pickerTrigger) {
      pickerTrigger.disabled = true;
      pickerTrigger.classList.add('is-loading');
      pickerTrigger.textContent = 'Загрузка…';
    }
    closePicker();
    try {
      await Api.activateProfile(select.value);
      location.reload();
    } catch (error) {
      select.disabled = false;
      if (pickerTrigger) {
        pickerTrigger.disabled = false;
        pickerTrigger.classList.remove('is-loading');
        pickerTrigger.textContent = originalLabel;
      }
      console.error('Не удалось переключить проект:', error);
    }
  });

  newBtn.addEventListener('click', async () => {
    if (profiles.length >= 5) {
      showProjectLimitModal();
      return;
    }
    const result = await openProjectModal('Новый проект', '', (name) => Api.createProfile(name));
    if (result !== null) {
      location.reload();
    }
  });

  renameBtn.addEventListener('click', async () => {
    const current = select.options[select.selectedIndex];
    let result = null;
    result = await openProjectModal('Переименовать проект', current ? current.textContent : '', (name) => Api.renameProfile(select.value, name));
    if (result !== null) {
      const res = await Api.getProfiles();
      renderOptions(res.profiles, select.value);
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    const current = select.options[select.selectedIndex];
    const label = current ? current.textContent : 'этот проект';
    if (!window.confirm(`Удалить проект «${label}» вместе со всеми его данными? Отменить нельзя.`)) return;
    try {
      await Api.deleteProfile(select.value);
      location.reload();
    } catch (err) {
      window.alert(err.message);
    }
  });
}

function initProfileSettings(store) {
  const select = document.getElementById('profile-avito-category') || document.getElementById('generate-settings-avito-category');
  if (!select || typeof AVITO_CATEGORIES === 'undefined') return;
  select.innerHTML = AVITO_CATEGORIES.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join('');
  select.value = store.avitoCategoryKey || AVITO_CATEGORIES[0].key;
  select.addEventListener('change', async () => {
    select.disabled = true;
    try {
      await Api.saveSettings({ adsPerDistrict: store.adsPerDistrict, avitoCategoryKey: select.value });
      store.avitoCategoryKey = select.value;
    } finally {
      select.disabled = false;
    }
  });
}
