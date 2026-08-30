const authHeaderClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
document.body.classList.add('account-pending');
function bindLogout(element) {
  if (!element) return;
  element.removeAttribute('onclick');
  element.addEventListener('click', async (event) => {
    event.preventDefault();
    await authHeaderClient?.auth.signOut();
    window.location.replace('/login');
  });
}
bindLogout(document.getElementById('logout-view-btn'));
bindLogout(document.getElementById('sidebar-logout-btn'));
(async () => {
  const { data } = await authHeaderClient?.auth.getUser() || {};
  const email = data?.user?.email;
  document.body.classList.toggle('account-pending', !email);
  const sidebarLogout = document.getElementById('sidebar-logout-btn');
  const headerLogout = document.getElementById('logout-view-btn');
  if (!email && sidebarLogout) {
    sidebarLogout.innerHTML = icon('logIn') + ' Войти';
    sidebarLogout.onclick = () => window.location.replace('/login');
  }
  if (!email && headerLogout) {
    headerLogout.innerHTML = icon('logIn');
    headerLogout.href = '/login';
    headerLogout.title = 'Войти';
    headerLogout.setAttribute('aria-label', 'Войти');
  }
  const localDemoPage = location.hostname === 'localhost' && (new URLSearchParams(location.search).has('demo-card') || sessionStorage.getItem('genvito-demo-card') === '1');
  if (localDemoPage) sessionStorage.setItem('genvito-demo-card', '1');
  if (!email && !localDemoPage && !document.body.classList.contains('login-active') && !document.body.classList.contains('payment-active')) {
    window.setTimeout(() => window.location.replace('/login'), 250);
    return;
  }
  document.querySelectorAll('#account-email, #profile-email').forEach((element) => {
    element.textContent = email || '—';
  });
})();
