// Панель "Районы": таблица Район | Адрес, по строке на пару. Пара живёт
// в одной строке таблицы, так что расхождение количества физически
// невозможно — в отличие от двух раздельных списков. Поддерживает вставку
// сразу нескольких строк (из Excel/заметок): вставленный многострочный
// текст распределяется по последующим рядам таблицы.

function initDistrictsPanel(store, onChange) {
  const tbody = document.getElementById('districts-tbody');
  const addBtn = document.getElementById('add-district-btn');
  const indicator = document.getElementById('districts-saved');
  const countEl = document.getElementById('districts-count');
  const tableScroll = document.querySelector('#tab-districts .table-scroll');

  // rows — единственный источник правды на фронте, DOM просто его отражает.
  let rows = zipRows(store.districts, store.addresses || [], store.districtIds || []);
  if (rows.length === 0) rows = [{ id: '', district: '', address: '' }];

  const save = debounce(async () => {
    const fromDom = readRowsFromDom();
    const districts = fromDom.map((r) => r.district);
    const addresses = fromDom.map((r) => r.address);
    const districtIds = fromDom.map((r) => r.id);
    const res = await Api.saveDistricts(districts, addresses, districtIds);
    store.districts = res.districts;
    store.addresses = res.addresses;
    store.districtIds = res.districtIds || [];
    applySavedDistrictIds(store.districtIds);
    flashSaved(indicator);
    updateCount();
    onChange();
  }, 500);

  function zipRows(districts, addresses, districtIds) {
    const total = Math.max(districts.length, addresses.length, districtIds.length);
    return Array.from({ length: total }, (_, i) => ({
      id: districtIds[i] || '',
      district: districts[i] || '',
      address: addresses[i] || ''
    }));
  }

  function readRowsFromDom() {
    return Array.from(tbody.querySelectorAll('tr')).map((tr) => ({
      id: tr.dataset.id || '',
      district: tr.querySelector('.district-input').value.trim(),
      address: tr.querySelector('.address-input').value.trim()
    }));
  }

  function applySavedDistrictIds(districtIds) {
    let savedIndex = 0;
    Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
      const district = tr.querySelector('.district-input').value.trim();
      if (!district) {
        tr.dataset.id = '';
        return;
      }

      tr.dataset.id = districtIds[savedIndex] || '';
      savedIndex += 1;
    });
  }

  function updateCount() {
    const currentRows = readRowsFromDom();
    const hasDistrictsOrAddresses = currentRows.some((r) => r.district || r.address);
    tableScroll.hidden = !hasDistrictsOrAddresses;
    tableScroll.style.display = hasDistrictsOrAddresses ? 'block' : 'none';

    const filled = currentRows.filter((r) => r.district);
    const withoutAddress = filled.filter((r) => !r.address).length;
    if (filled.length === 0) {
      countEl.textContent = 'Районов пока нет';
      return;
    }
    countEl.textContent =
      withoutAddress > 0
        ? `Районов: ${filled.length} · без адреса: ${withoutAddress}`
        : `Районов: ${filled.length} · у всех есть адрес`;
  }

  function renderRow(row) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id || '';
    tr.innerHTML = `
      <td><input type="text" class="district-input" placeholder="Центральный район" value="${escapeHtml(row.district)}" /></td>
      <td><input type="text" class="address-input" placeholder="г. Краснодар, ул. Колотушкина" value="${escapeHtml(row.address)}" /></td>
      <td><button class="icon-btn danger remove-district-btn" title="Удалить строку">${icon('trash')}</button></td>
    `;

    tr.querySelector('.remove-district-btn').addEventListener('click', () => {
      if (tbody.children.length === 1) {
        // последнюю строку не удаляем, а просто очищаем — иначе некуда вставлять
        tr.querySelector('.district-input').value = '';
        tr.querySelector('.address-input').value = '';
        tr.dataset.id = '';
      } else {
        tr.remove();
      }
      updateCount();
      save();
    });

    const districtInput = tr.querySelector('.district-input');
    const addressInput = tr.querySelector('.address-input');

    districtInput.addEventListener('paste', (e) => handleMultilinePaste(e, tr, 'district'));
    addressInput.addEventListener('paste', (e) => handleMultilinePaste(e, tr, 'address'));

    [districtInput, addressInput].forEach((el) => {
      el.addEventListener('input', () => {
        updateCount();
        save();
      });
    });

    return tr;
  }

  // Вставка нескольких строк сразу: первая строка идёт в текущую ячейку,
  // остальные — в последующие ряды (создаём новые, если не хватает).
  function handleMultilinePaste(e, tr, field) {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length <= 1) return; // одиночная строка — пусть вставляется как обычно

    e.preventDefault();
    let currentTr = tr;
    lines.forEach((line, i) => {
      if (i > 0) {
        currentTr = currentTr.nextElementSibling || appendEmptyRow();
      }
      currentTr.querySelector(`.${field}-input`).value = line;
    });
    updateCount();
    save();
  }

  function appendEmptyRow() {
    const tr = renderRow({ id: '', district: '', address: '' });
    tbody.appendChild(tr);
    return tr;
  }

  function renderAll() {
    tbody.innerHTML = '';
    rows.forEach((row) => tbody.appendChild(renderRow(row)));
    updateCount();
  }

  addBtn.addEventListener('click', () => {
    appendEmptyRow().querySelector('.district-input').focus();
  });

  renderAll();
}
