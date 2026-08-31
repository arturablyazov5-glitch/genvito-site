(() => {
  const client = window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
  client?.auth.getSession().then(({ data }) => {
    if (!data?.session?.user?.email) return;
    const link = document.querySelector('.landing-login-tab');
    if (!link) return;
    link.textContent = 'Войти';
    link.href = '/app/districts';
  });
})();
