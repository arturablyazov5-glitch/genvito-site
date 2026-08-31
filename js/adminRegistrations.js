(() => {
  const adminEmail = 'sixxset@ya.ru';
  const root = document.getElementById('admin-root');
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

  async function start() {
    const client = window.__supabaseClient || window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
    const { data: sessionData } = await client?.auth.getSession() || {};
    const token = sessionData?.session?.access_token;
    if (!token) {
      window.location.replace('/app/login');
      return;
    }
    const { data } = await client?.auth.getUser() || {};
    if (String(data?.user?.email || '').toLowerCase() !== adminEmail) {
      window.location.replace('/app/districts');
      return;
    }
    const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/workspace-api/admin/registrations`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      root.textContent = 'Не удалось получить события регистрации.';
      return;
    }
    const rows = await response.json();
    root.innerHTML = `<div class="neo-shell"><div class="dashboard-shell"><div class="workspace"><main><section class="tab-panel active"><div class="panel-heading"><h2>Админка</h2><p>События регистрации.</p></div><div class="history-list">${rows.length ? rows.map((row) => `<div class="history-item"><strong>${escapeHtml(row.event_type)}</strong><span>${escapeHtml(row.email)} · ${new Date(row.created_at).toLocaleString('ru-RU')}</span></div>`).join('') : '<p>Событий пока нет.</p>'}</div></section></main></div></div></div>`;
  }

  start().catch(() => window.location.replace('/app/districts'));
})();
