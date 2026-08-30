// Универсальный debounce + индикатор "Сохранено" для полей ввода.

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function flashSaved(indicatorEl) {
  if (!indicatorEl) return;
  indicatorEl.classList.add('saved-flash');
  indicatorEl.textContent = 'Сохранено';
  clearTimeout(indicatorEl._flashTimer);
  indicatorEl._flashTimer = setTimeout(() => {
    indicatorEl.classList.remove('saved-flash');
  }, 1200);
}
