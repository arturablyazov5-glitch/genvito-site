const accessLock = document.getElementById('access-lock');
const lockAction = document.getElementById('access-lock-action');
const supabaseConfig = window.SUPABASE_CONFIG;
const supabaseClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(supabaseConfig?.url, supabaseConfig?.key)));
(async () => {
  const { data } = await supabaseClient?.auth.getUser() || {};
  const email = data?.user?.email;
  if (!email) return window.location.replace('/login');
  const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(email)}`);
  const status = await response.json().catch(() => ({}));
  if (status.active) return;
  if (lockAction && !status.trialUsed) lockAction.textContent = 'Активировать пробный период';
  accessLock.hidden = false;
  document.body.classList.add('access-locked');
})();
