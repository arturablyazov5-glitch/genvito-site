// Панель "Услуги": карточка на каждую услугу — название, цена, свой шаблон
// объявления (заголовок / текст / SEO-хвост) и до 10 ссылок на фото.
// Карточки сворачиваемые: длинные шаблоны легко превращаются в простыню
// текста, и без сворачивания легко проскроллить границу между услугами
// не заметив. Свёрнутая карточка показывает только имя/цену и сводку по
// символам, содержимое скрыто.

function formatServicePrice(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${Number(digits).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`;
}

function editServicePrice(value) {
  return String(value || '').replace(/\D/g, '');
}

function initServicesPanel(store, onChange) {
  const list = document.getElementById('services-list');
  const indicator = document.getElementById('services-saved');
  const addBtn = document.getElementById('add-service-btn');
  const toggleAllBtn = document.getElementById('toggle-all-services-btn');
  let saveQueue = Promise.resolve();

  // Какие карточки свёрнуты — состояние только для UI, на сервер не уходит.
  const collapsedIds = new Set();

  document.addEventListener('click', (event) => {
    if (event.target.closest('.service-actions-menu')) return;
    document.querySelectorAll('.service-actions-menu[open]').forEach((menu) => menu.removeAttribute('open'));
  });

  list.addEventListener('toggle', (event) => {
    const menu = event.target.closest('.service-actions-menu');
    if (!menu || !menu.open) return;
    list.querySelectorAll('.service-actions-menu[open]').forEach((other) => {
      if (other !== menu) other.removeAttribute('open');
    });
  }, true);

  const save = debounce(() => {
    const services = readServicesFromDom();
    saveQueue = saveQueue.then(async () => {
      const res = await Api.saveServices(services);
      store.services = res.services;
      flashSaved(indicator);
      onChange();
    }).catch((error) => {
      console.error('Не удалось сохранить услуги:', error);
      indicator.textContent = 'Ошибка сохранения';
    });
  }, 500);

  function readServicesFromDom() {
    return Array.from(list.querySelectorAll('.service-card')).map((card) => ({
      id: card.dataset.id,
      enabled: card.querySelector('.service-enabled').checked,
      name: card.querySelector('.service-name').value.trim(),
      avitoCategoryKey: card.querySelector('.service-avito-category').value,
      price: card.querySelector('.service-price').value.trim(),
      template: {
        title: card.querySelector('.service-tpl-title').value,
        text: card.querySelector('.service-tpl-text').value,
        seo: card.querySelector('.service-tpl-seo').value
      },
      photos: Array.from(card.querySelectorAll('.service-photo-row')).map((row) => ({
        url: row.querySelector('.service-photo-input').value.trim(),
        pinned: row.querySelector('.service-photo-pin').classList.contains('active')
      })).filter((photo) => photo.url)
    }));
  }

  function applyCollapsedState(card) {
    const collapsed = collapsedIds.has(card.dataset.id);
    card.classList.toggle('collapsed', collapsed);
    const toggleBtn = card.querySelector('.collapse-toggle-btn');
    if (toggleBtn) toggleBtn.title = collapsed ? 'Развернуть' : 'Свернуть';
  }

  function setCollapsed(card, collapsed) {
    if (collapsed) collapsedIds.add(card.dataset.id);
    else collapsedIds.delete(card.dataset.id);
    applyCollapsedState(card);
    if (!collapsed) window.requestAnimationFrame(() => autosizeAll(card));
    updateToggleAllButton();
  }

  function updateToggleAllButton() {
    const cards = Array.from(list.querySelectorAll('.service-card'));
    const hasTemplates = cards.some((card) => [
      card.querySelector('.service-name')?.value,
      card.querySelector('.service-tpl-title')?.value,
      card.querySelector('.service-tpl-text')?.value,
      card.querySelector('.service-tpl-seo')?.value,
      card.querySelector('.service-photo-input')?.value
    ].some((value) => String(value || '').trim()));
    const canToggleAll = hasTemplates && cards.length > 1;
    toggleAllBtn.hidden = !canToggleAll;
    toggleAllBtn.style.display = canToggleAll ? 'inline-flex' : 'none';
    list.closest('.services-main-card')?.classList.toggle('has-services', hasTemplates);
    const allCollapsed =
      cards.length > 0 && cards.every((card) => collapsedIds.has(card.dataset.id));
    toggleAllBtn.innerHTML = icon('chevronsUpDown') + (allCollapsed ? ' Раскрыть все' : ' Скрыть все');
  }

  function updateOrderButtons() {
    const cards = Array.from(list.querySelectorAll('.service-card'));
    cards.forEach((card, index) => {
      const moveUp = card.querySelector('.move-service-up-btn');
      const moveDown = card.querySelector('.move-service-down-btn');
      if (moveUp) moveUp.disabled = index === 0;
      if (moveDown) moveDown.disabled = index === cards.length - 1;
    });
  }

  function moveCard(card, direction) {
    const sibling = direction === 'up' ? card.previousElementSibling : card.nextElementSibling;
    if (!sibling) return;
    if (direction === 'up') sibling.before(card);
    else sibling.after(card);
    card.querySelector('.service-actions-menu')?.removeAttribute('open');
    updateOrderButtons();
    save();
  }

  function renderCard(service) {
    const tpl = service.template || { title: '', text: '', seo: '' };
    const selectedCategoryKey = getAvitoCategoryKey(service);
    const categoryOptions = AVITO_CATEGORIES.map((category) => `
      <option value="${escapeHtml(category.key)}" ${category.key === selectedCategoryKey ? 'selected' : ''}>
        ${escapeHtml(category.label)}
      </option>
    `).join('');
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.id = service.id;
    card.innerHTML = `
      <div class="service-card-header">
        <div class="service-card-primary">
          <input class="service-name" type="text" aria-label="Название услуги" placeholder="Название услуги" value="${escapeHtml(service.name)}" />
          <label class="service-enabled-label" title="Участвует в генерации"><input class="service-enabled" type="checkbox" ${service.enabled !== false ? 'checked' : ''} /><span class="service-toggle" aria-hidden="true"></span><span class="service-enabled-text">${service.enabled !== false ? 'Включён' : 'Выключен'}</span></label>
        </div>
        <div class="service-card-meta">
          <div class="service-meta-fields">
            <div class="select-control">
              <select class="service-avito-category" title="Категория Авито" aria-label="Категория Авито">${categoryOptions}</select>
              <span class="select-control-icon" aria-hidden="true">${icon('chevronDown')}</span>
            </div>
            <input class="service-price" type="text" aria-label="Цена услуги" placeholder="Цена" value="${escapeHtml(service.price || '')}" />
          </div>
        </div>
        <div class="service-card-actions">
          <details class="service-actions-menu">
            <summary class="icon-btn" title="Другие действия" aria-label="Другие действия">${icon('moreHorizontal')}</summary>
            <div class="service-actions-popover">
              <button type="button" class="move-service-up-btn">${icon('arrowUp')}Поднять выше</button>
              <button type="button" class="move-service-down-btn">${icon('arrowDown')}Опустить ниже</button>
              <div class="service-actions-divider"></div>
              <button type="button" class="remove-service-btn">${icon('trash')}Удалить услугу</button>
            </div>
          </details>
          <button class="icon-btn collapse-toggle-btn" title="Свернуть" aria-label="Свернуть или раскрыть услугу">${icon('chevronDown')}</button>
        </div>
      </div>

      <p class="service-collapsed-summary"></p>

      <div class="service-card-body">
        <div class="template-field ${tpl.title ? 'is-expanded' : 'is-collapsed'}">
        <label class="field-label">${icon('fileText')} Заголовок</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-title" rows="2" placeholder="{Ремонт|Срочный ремонт} стиральных машин в [zone]">${escapeHtml(tpl.title)}</textarea>
        </div>
        </div>
        <div class="field-footer">
          <p class="brace-status"></p>
          <p class="length-status" data-len="title"></p>
        </div>

        <div class="template-field ${tpl.text ? 'is-expanded' : 'is-collapsed'}">
        <label class="field-label">${icon('fileText')} Текст объявления</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-text" rows="8" placeholder="{Мастер|Специалист} выезжает в [zone] в день обращения...">${escapeHtml(tpl.text)}</textarea>
        </div>
        </div>
        <p class="brace-status"></p>

        <div class="template-field ${tpl.seo ? 'is-expanded' : 'is-collapsed'}">
        <label class="field-label">${icon('fileText')} SEO-хвост</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-seo" rows="5" placeholder="Ремонт стиральных машин [zone], мастер по стиральным машинам [zone]...">${escapeHtml(tpl.seo)}</textarea>
        </div>
        </div>
        <div class="field-footer">
          <p class="brace-status"></p>
          <p class="length-status" data-len="body"></p>
        </div>

        <span class="field-label">${icon('image')} Фото</span>
        <div class="service-photos" role="list"></div>
        <button type="button" class="btn secondary add-photo-btn">${icon('plus')} Добавить ссылку</button>
      </div>
    `;

    card.querySelector('.remove-service-btn').addEventListener('click', () => {
      collapsedIds.delete(card.dataset.id);
      card.remove();
      updateToggleAllButton();
      updateOrderButtons();
      save();
    });
    card.querySelector('.move-service-up-btn').addEventListener('click', () => moveCard(card, 'up'));
    card.querySelector('.move-service-down-btn').addEventListener('click', () => moveCard(card, 'down'));
    card.querySelector('.collapse-toggle-btn').addEventListener('click', () => {
      setCollapsed(card, !collapsedIds.has(card.dataset.id));
    });
    card.querySelector('.service-enabled').addEventListener('change', (event) => {
      card.querySelector('.service-enabled-text').textContent = event.target.checked ? 'Включён' : 'Выключен';
    });
    const priceInput = card.querySelector('.service-price');
    priceInput.addEventListener('focus', () => {
      priceInput.value = editServicePrice(priceInput.value);
    });
    priceInput.addEventListener('blur', () => {
      priceInput.value = formatServicePrice(priceInput.value);
      save();
    });
    priceInput.value = formatServicePrice(priceInput.value);
    card.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('input', save);
      el.addEventListener('change', save);
    });
    const photosBox = card.querySelector('.service-photos');
    const addPhotoButton = card.querySelector('.add-photo-btn');
    const updatePhotoRows = () => {
      const rows = [...photosBox.querySelectorAll('.service-photo-row')];
      rows.forEach((row, rowIndex) => {
        row.querySelector('.service-photo-input').setAttribute('aria-label', `Ссылка на фото ${rowIndex + 1}`);
      });
    };
    const rawPhotos = (service.photos || []).filter((photo) => {
      const url = typeof photo === 'string' ? photo : photo?.url;
      return String(url || '').trim();
    });
    rawPhotos.forEach((photo, index) => addPhotoRow(typeof photo === 'string' ? { url: photo, pinned: false } : photo, index));
    addPhotoButton.addEventListener('click', () => { addPhotoRow({ url: '', pinned: false }); save(); });
    function addPhotoRow(photo, index) {
      const row = document.createElement('div'); row.className = 'service-photo-row';
      row.setAttribute('role', 'listitem');
      row.innerHTML = `<input class="service-photo-input" type="url" placeholder="Вставьте ссылку на фото" value="${escapeHtml(photo.url || '')}"><button type="button" class="service-photo-pin" aria-pressed="false"><i data-lucide="pin" aria-hidden="true"></i><span>Закрепить</span></button><button type="button" class="icon-btn danger remove-photo-btn" aria-label="Удалить фото" title="Удалить фото">${icon('trash')}</button>`;
      photosBox.appendChild(row);
      if (window.lucide) window.lucide.createIcons({ root: row });
      const pinButton = row.querySelector('.service-photo-pin');
      const setPinned = (pinned) => {
        pinButton.classList.toggle('active', pinned);
        pinButton.setAttribute('aria-pressed', String(pinned));
        pinButton.querySelector('span').textContent = pinned ? 'Закреплено' : 'Закрепить';
        pinButton.title = pinned ? 'Фото останется на этой позиции' : 'Закрепить фото на этой позиции';
      };
      setPinned(Boolean(photo.pinned));
      pinButton.addEventListener('click', () => { setPinned(!pinButton.classList.contains('active')); save(); });
      row.querySelector('.remove-photo-btn').addEventListener('click', () => { row.remove(); updatePhotoRows(); save(); });
      row.querySelector('.service-photo-input').addEventListener('input', save);
      updatePhotoRows();
    }
    // Заголовок/текст/SEO — с подсветкой
    // скобок, у них своя автовысота через CSS-грид (см. braceHighlight.js).
    initBraceFieldsIn(card);
    card.querySelectorAll('.template-field').forEach((field) => {
      const textarea = field.querySelector('textarea');
      const expand = () => {
        field.classList.add('is-expanded');
        field.classList.remove('is-collapsed');
        window.requestAnimationFrame(() => autosize(textarea));
      };
      textarea.addEventListener('focus', expand);
      textarea.addEventListener('input', expand);
    });

    const recompute = () => updateLengthCounters(card, store.districts);
    card
      .querySelectorAll('.service-tpl-title, .service-tpl-text, .service-tpl-seo')
      .forEach((el) => el.addEventListener('input', recompute));
    recompute();

    applyCollapsedState(card);

    return card;
  }

  function renderAll() {
    list.innerHTML = '';
    // Если услуг несколько, при первом открытии сворачиваем все — так сразу
    // видно список названий, а не полотно текста первой попавшейся услуги.
    if (store.services.length > 1 && collapsedIds.size === 0) {
      store.services.forEach((s) => collapsedIds.add(s.id));
    }
    store.services.forEach((service) => list.appendChild(renderCard(service)));
    autosizeAll(list);
    updateToggleAllButton();
    updateOrderButtons();
  }

  addBtn.addEventListener('click', () => {
    const newService = {
      id: String(Date.now() + Math.random()),
      name: '',
      avitoCategoryKey: store.avitoCategoryKey || AVITO_CATEGORIES[0].key,
      price: '',
      template: { title: '', text: '', seo: '' },
      photos: [],
      enabled: true
    };
    store.services.push(newService);
    list.appendChild(renderCard(newService)); // новая карточка всегда открыта
    autosizeAll(list.lastElementChild);
    updateToggleAllButton();
    updateOrderButtons();
    save();
  });

  toggleAllBtn.addEventListener('click', () => {
    const cards = Array.from(list.querySelectorAll('.service-card'));
    const anyExpanded = cards.some((c) => !collapsedIds.has(c.dataset.id));
    cards.forEach((c) => setCollapsed(c, anyExpanded));
    updateToggleAllButton();
  });

  renderAll();

  // Список районов меняет длину [zone] — пересчитываем счётчики символов везде.
  return {
    refreshLengths: () => refreshLengthCountersIn(list, store.districts)
  };
}
