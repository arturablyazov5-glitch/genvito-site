(async () => {
  const statusElement = document.getElementById('profile-subscription-status');
  if (!statusElement) return;
  const authClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
  const { data: { user } = {} } = await authClient?.auth.getUser() || {};
  const email = (user?.email || '').trim().toLowerCase();
  if (!email) return;
  const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(email)}`);
  const data = await response.json().catch(() => ({}));
  const active = Boolean(data.active);
  const trial = active && (data.trialEndsAt || data.plan === '3 дня');
  statusElement.textContent = active ? (trial ? 'Пробный период' : 'Подписка активна') : 'Подписка неактивна';
  const statusIcon = document.getElementById('profile-status-icon');
  if (statusIcon) {
    statusIcon.classList.toggle('is-active', active);
    statusIcon.innerHTML = icon(active ? 'circleCheck' : 'circleX');
  }
  const renewButton = document.getElementById('profile-renew-btn');
  const cancelButton = document.getElementById('profile-cancel-btn');
  if (renewButton) {
    renewButton.hidden = active && !trial;
    renewButton.lastChild.textContent = 'Оплатить подписку';
  }
  if (cancelButton) cancelButton.hidden = !(active && !trial);
  const plan = document.getElementById('profile-subscription-plan');
  if (plan) plan.textContent = active ? (trial ? '3 дня' : (data.plan || 'Активный тариф')) : 'Нет активного тарифа';
  const expiry = document.getElementById('profile-subscription-expiry');
  const end = data.trialEndsAt || data.currentPeriodEnd;
  if (expiry) expiry.textContent = end ? new Date(end).toLocaleDateString('ru-RU') : '—';
})();
