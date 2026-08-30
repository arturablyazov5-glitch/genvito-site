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

  // Какие карточки свёрнуты — состояние только для UI, на сервер не уходит.
  const collapsedIds = new Set();

  const save = debounce(async () => {
    const services = readServicesFromDom();
    const res = await Api.saveServices(services);
    store.services = res.services;
    flashSaved(indicator);
    onChange();
  }, 500);

  function readServicesFromDom() {
    return Array.from(list.querySelectorAll('.service-card')).map((card) => ({
      id: card.dataset.id,
      name: card.querySelector('.service-name').value.trim(),
      avitoCategoryKey: card.querySelector('.service-avito-category').value,
      price: card.querySelector('.service-price').value.trim(),
      template: {
        title: card.querySelector('.service-tpl-title').value,
        text: card.querySelector('.service-tpl-text').value,
        seo: card.querySelector('.service-tpl-seo').value
      },
      photos: card
        .querySelector('.service-photos')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
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
      card.querySelector('.service-photos')?.value
    ].some((value) => String(value || '').trim()));
    toggleAllBtn.hidden = !hasTemplates;
    toggleAllBtn.style.display = hasTemplates ? 'inline-flex' : 'none';
    list.closest('.services-main-card')?.classList.toggle('has-services', hasTemplates);
    const allCollapsed =
      cards.length > 0 && cards.every((card) => collapsedIds.has(card.dataset.id));
    toggleAllBtn.innerHTML = icon('chevronsUpDown') + (allCollapsed ? ' Раскрыть все' : ' Скрыть все');
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
        <input class="service-name" type="text" placeholder="Название услуги, напр. Ремонт посудомоечных машин" value="${escapeHtml(service.name)}" />
        <div class="select-control">
          <select class="service-avito-category" title="Категория Авито">${categoryOptions}</select>
          <span class="select-control-icon" aria-hidden="true">${icon('chevronDown')}</span>
        </div>
        <input class="service-price" type="text" placeholder="Цена, напр. от 1500 ₽" value="${escapeHtml(service.price || '')}" />
        <button class="icon-btn danger remove-service-btn" title="Удалить услугу">${icon('trash')}</button>
        <button class="icon-btn collapse-toggle-btn" title="Свернуть">${icon('chevronDown')}</button>
      </div>

      <p class="service-collapsed-summary"></p>

      <div class="service-card-body">
        <label class="field-label">${icon('fileText')} Заголовок</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-title" rows="2" placeholder="{Ремонт|Срочный ремонт} стиральных машин в [zone]">${escapeHtml(tpl.title)}</textarea>
        </div>
        <div class="field-footer">
          <p class="brace-status"></p>
          <p class="length-status" data-len="title"></p>
        </div>

        <label class="field-label">${icon('fileText')} Текст объявления</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-text" rows="8" placeholder="{Мастер|Специалист} выезжает в [zone] в день обращения...">${escapeHtml(tpl.text)}</textarea>
        </div>
        <p class="brace-status"></p>

        <label class="field-label">${icon('fileText')} SEO-хвост</label>
        <div class="tpl-grow-wrap">
          <div class="tpl-backdrop" aria-hidden="true"></div>
          <textarea class="service-tpl-seo" rows="5" placeholder="Ремонт стиральных машин [zone], мастер по стиральным машинам [zone]...">${escapeHtml(tpl.seo)}</textarea>
        </div>
        <div class="field-footer">
          <p class="brace-status"></p>
          <p class="length-status" data-len="body"></p>
        </div>

        <label class="field-label">${icon('image')} Ссылки на фото с Яндекс.Диска (до 10, по одной на строку)</label>
        <textarea class="service-photos" rows="1" placeholder="https://disk.yandex.ru/...">${escapeHtml((service.photos || []).filter(Boolean).join('\n'))}</textarea>
      </div>
    `;

    card.querySelector('.remove-service-btn').addEventListener('click', () => {
      collapsedIds.delete(card.dataset.id);
      card.remove();
      updateToggleAllButton();
      save();
    });
    card.querySelector('.collapse-toggle-btn').addEventListener('click', () => {
      setCollapsed(card, !collapsedIds.has(card.dataset.id));
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
    // Фото — обычное поле с JS-автовысотой. Заголовок/текст/SEO — с подсветкой
    // скобок, у них своя автовысота через CSS-грид (см. braceHighlight.js).
    attachAutosize(card.querySelector('.service-photos'));
    initBraceFieldsIn(card);

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
  }

  addBtn.addEventListener('click', () => {
    const newService = {
      id: String(Date.now() + Math.random()),
      name: '',
      avitoCategoryKey: store.avitoCategoryKey || AVITO_CATEGORIES[0].key,
      price: '',
      template: { title: '', text: '', seo: '' },
      photos: []
    };
    store.services.push(newService);
    list.appendChild(renderCard(newService)); // новая карточка всегда открыта
    autosizeAll(list.lastElementChild);
    updateToggleAllButton();
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
