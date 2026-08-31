(() => {
  const adminEmail = 'sixxset@ya.ru';
  const root = document.getElementById('admin-root');
  const eventLabels = { otp_verified: 'Вход по коду подтверждён' };
  const formatDate = (value) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' г.', '');
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
    root.innerHTML = `<section class="tab-panel profile-history-panel active"><div class="profile-panel-heading"><h2>Админка</h2><p class="subtitle">События регистрации</p></div><div class="history-list">${rows.length ? rows.map((row) => `<div class="history-row"><div><strong>${escapeHtml(eventLabels[row.event_type] || 'Событие регистрации')}</strong><small>${escapeHtml(row.email)}</small></div><strong>${formatDate(row.created_at)}</strong></div>`).join('') : '<p class="history-empty">Событий пока нет.</p>'}</div></section>`;
  }

  start().catch(() => window.location.replace('/app/districts'));
})();
