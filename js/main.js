// Точка входа фронтенда: грузит store, инициализирует все панели и связывает их.

(async function main() {
  initProfileBar();
  const store = await Api.getStore();
  initProfileSettings(store);

  let generatePanel;
  let servicesPanel;
  const onChange = () => {
    if (generatePanel) generatePanel.updateSummary();
    if (servicesPanel) servicesPanel.refreshLengths();
  };

  if (document.getElementById('tab-districts')) initDistrictsPanel(store, onChange);
  if (document.getElementById('tab-services')) servicesPanel = initServicesPanel(store, onChange);
  if (document.getElementById('tab-generate')) generatePanel = initGeneratePanel(store);
})();
