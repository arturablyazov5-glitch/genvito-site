// Экранирование текста перед вставкой в innerHTML. Общая утилита —
// используется в servicesPanel.js и districtsPanel.js.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
