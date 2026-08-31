// Навигация внутри кабинета не перезагружает документ: все рабочие панели
// уже есть в DOM и используют один загруженный workspace.

const CABINET_ROUTES = {
  '/app/districts': 'districts',
  '/app/services': 'services',
  '/app/generate': 'generate'
};

function cabinetSectionFromPath(pathname = location.pathname) {
  return CABINET_ROUTES[pathname] || null;
}

function setCabinetSection(section, { updateHistory = false } = {}) {
  const path = Object.entries(CABINET_ROUTES).find(([, value]) => value === section)?.[0];
  if (!path || !document.getElementById(`tab-${section}`)) return false;

  document.querySelectorAll('[id^="tab-"][class~="tab-panel"]').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${section}`);
  });
  document.querySelectorAll('.sidebar .tab-btn').forEach((link) => {
    if (link.id === `tab-btn-${section}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.body.dataset.page = section;
  if (updateHistory && location.pathname !== path) history.pushState({ section }, '', path);
  return true;
}

function initCabinetNavigation() {
  if (!document.getElementById('tab-districts') || !document.getElementById('tab-services') || !document.getElementById('tab-generate')) return;

  // Each cabinet tab has its own static page. Keep the browser's native
  // navigation so the URL and the rendered page cannot get out of sync.
  setCabinetSection(cabinetSectionFromPath() || 'districts');
}
