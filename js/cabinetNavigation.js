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

  document.querySelector('.sidebar')?.addEventListener('click', (event) => {
    const link = event.target.closest('.tab-btn');
    const section = link && cabinetSectionFromPath(new URL(link.href, location.origin).pathname);
    if (!section || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setCabinetSection(section, { updateHistory: true });
  });

  window.addEventListener('popstate', () => {
    const section = cabinetSectionFromPath();
    if (section) setCabinetSection(section);
  });

  setCabinetSection(cabinetSectionFromPath() || 'districts');
}
