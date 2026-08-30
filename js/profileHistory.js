(async () => {
  const list = document.getElementById('profile-history-list');
  if (!list) return;
  const client = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
  const { data: { user } = {} } = await client?.auth.getUser() || {};
  if (!user?.email) return;
  const token = (await client.auth.getSession()).data.session?.access_token;
  const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/history?email=${encodeURIComponent(user.email)}`, { headers: { Authorization: `Bearer ${token || ''}` } });
  const rows = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(rows) || rows.length === 0) return;
  list.innerHTML = rows.map((row) => {
    const date = new Date(row.paid_at || row.received_at).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
    return `<div class="history-row"><div><strong>Оплата подписки${row.plan ? ` на ${escapeHtml(row.plan)}` : ''}</strong><small>${date}</small></div><strong>${escapeHtml(row.amount ? `${row.amount} ₽` : '—')}</strong></div>`;
  }).join('');
})();
