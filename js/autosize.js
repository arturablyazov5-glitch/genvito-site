// Автоподстройка высоты textarea под содержимое: чем больше текста, тем выше поле.

// Минимальная высота поля — та, что задана атрибутом rows.
function minHeightOf(el) {
  const styles = getComputedStyle(el);
  const lineHeight = parseFloat(styles.lineHeight) || 20;
  const chrome =
    parseFloat(styles.paddingTop) +
    parseFloat(styles.paddingBottom) +
    parseFloat(styles.borderTopWidth) +
    parseFloat(styles.borderBottomWidth);
  const rows = parseInt(el.getAttribute('rows'), 10) || 2;
  return rows * lineHeight + chrome;
}

// Пересчитывает высоту одного поля.
function autosize(el) {
  if (!el) return;
  // offsetParent === null у скрытых полей (неактивная вкладка) — там scrollHeight
  // равен нулю, поэтому высоту таким полям пересчитываем при показе вкладки.
  if (el.offsetParent === null) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight + 2, minHeightOf(el))}px`;
}

// Вешает автоподстройку на поле и сразу подгоняет высоту под текущий текст.
// Подписку вешаем один раз, а высоту пересчитываем при каждом вызове —
// поле могло быть скрыто (неактивная вкладка) или ещё не вставлено в DOM.
function attachAutosize(el) {
  if (!el) return;
  if (!el._autosizeAttached) {
    el._autosizeAttached = true;
    el.addEventListener('input', () => autosize(el));
  }
  autosize(el);
}

// Применяет автоподстройку ко всем textarea внутри контейнера.
// Поля с подсветкой скобок (.tpl-grow-wrap) сюда не входят — у них своя
// автовысота через CSS-грид, см. braceHighlight.js.
function autosizeAll(root) {
  (root || document).querySelectorAll('textarea').forEach((el) => {
    if (!el.closest('.tpl-grow-wrap')) attachAutosize(el);
  });
}
