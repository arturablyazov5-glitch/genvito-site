const authHeaderClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
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
  if (!email && !document.body.classList.contains('login-active') && !document.body.classList.contains('payment-active')) {
    window.setTimeout(() => window.location.replace('/login'), 250);
    return;
  }
  document.querySelectorAll('#account-email, #profile-email').forEach((element) => {
    element.textContent = email || '—';
  });
})();
