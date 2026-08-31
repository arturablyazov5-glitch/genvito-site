const authHeaderClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
document.body.classList.add('account-pending');
function bindLogout(element) {
  if (!element) return;
  element.removeAttribute('onclick');
  element.addEventListener('click', async (event) => {
    event.preventDefault();
    await authHeaderClient?.auth.signOut();
    window.location.replace('/app/login');
  });
}

function showLogin(element) {
  if (!element) return;
  element.replaceWith(element.cloneNode(true));
  const freshElement = document.getElementById(element.id);
  freshElement.innerHTML = icon('logIn') + (freshElement.id === 'sidebar-logout-btn' ? ' Войти' : '');
  freshElement.removeAttribute('onclick');
  freshElement.href = '/app/login';
  freshElement.title = 'Войти';
  freshElement.setAttribute('aria-label', 'Войти');
  freshElement.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.replace('/app/login');
  });
}

function showLogout(element) {
  if (!element) return;
  element.innerHTML = icon('logOut') + (element.id === 'sidebar-logout-btn' ? ' Выйти' : '');
  element.removeAttribute('href');
  element.title = 'Выйти';
  element.setAttribute('aria-label', 'Выйти');
  bindLogout(element);
}

(function showUnauthenticatedStateImmediately() {
  showLogin(document.getElementById('logout-view-btn'));
  showLogin(document.getElementById('sidebar-logout-btn'));
})();

(async () => {
  const { data: sessionData, error: sessionError } = await authHeaderClient?.auth.getSession() || {};
  const email = sessionData?.session?.user?.email;
  document.body.classList.toggle('account-pending', !email);
  const sidebarLogout = document.getElementById('sidebar-logout-btn');
  const adminTab = document.getElementById('tab-btn-admin');
  if (adminTab) adminTab.hidden = String(email || '').toLowerCase() !== 'sixxset@ya.ru';
  const headerLogout = document.getElementById('logout-view-btn');
  if (email) {
    showLogout(sidebarLogout);
    showLogout(headerLogout);
  }
  const localDemoPage = location.hostname === 'localhost' && (new URLSearchParams(location.search).has('demo-card') || sessionStorage.getItem('genvito-demo-card') === '1');
  if (localDemoPage) sessionStorage.setItem('genvito-demo-card', '1');
  if (!email && !sessionError && !localDemoPage && !document.body.classList.contains('login-active') && !document.body.classList.contains('payment-active')) {
    window.setTimeout(async () => {
      const { data: restored } = await authHeaderClient?.auth.getSession() || {};
      if (!restored?.session) window.location.replace('/app/login');
    }, 1500);
    return;
  }
  document.querySelectorAll('#account-email, #profile-email').forEach((element) => {
    element.textContent = email || '—';
  });
})();
