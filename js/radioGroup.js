// Общий контрол выбора одного варианта с визуальным radio-индикатором.
function initRadioGroup(root, selector, onChange) {
  const items = [...root.querySelectorAll(selector)];
  const select = (selected) => {
    items.forEach((item) => {
      const active = item === selected;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-checked', String(active));
      item.setAttribute('aria-pressed', String(active));
      const input = item.querySelector('input[type="radio"]');
      if (input) input.checked = active;
      const circle = item.querySelector('.radio-circle');
      if (circle) {
        circle.classList.toggle('checked', active);
        circle.innerHTML = active ? icon('check') : '';
      }
    });
    if (onChange) onChange(selected);
  };
  items.forEach((item) => item.addEventListener('click', () => select(item)));
  select(items.find((item) => item.classList.contains('selected')) || items[0]);
  return { select };
}
