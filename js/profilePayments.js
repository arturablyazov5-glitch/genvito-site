(async () => {
  const card = document.getElementById('profile-payment-method-card');
  if (!card) return;
  const detach = document.getElementById('profile-detach-card');
  const text = document.getElementById('profile-payment-method-text');
  const row = document.getElementById('profile-payment-method-row');
  const emptyText = document.getElementById('profile-payment-empty-text');
  const cardCaption = document.getElementById('profile-payment-method-caption');
  const feedback = document.getElementById('profile-payment-feedback');
  const toggle = document.getElementById('profile-autorenew-toggle');
  const caption = document.getElementById('profile-autorenew-caption');
  const localDemo = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (localDemo) {
    row.hidden = false;
    emptyText.hidden = true;
    text.textContent = 'Банковская карта •••• 4242';
    cardCaption.textContent = 'Демо-карта, только локальный просмотр';
    detach.hidden = false;
    detach.addEventListener('click', () => {
      row.hidden = true;
      emptyText.hidden = false;
      detach.hidden = true;
      toggle.classList.remove('is-on');
      toggle.setAttribute('aria-pressed', 'false');
      caption.textContent = 'Автоматическое продление отключено';
    });
    return;
  }
  const client = window.__supabaseClient || window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
  const { data: { user } = {} } = await client?.auth.getUser() || {};
  if (!user?.email) return;
  const token = (await client.auth.getSession()).data.session?.access_token;
  const status = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(user.email)}`, { headers: { Authorization: `Bearer ${token || ''}` } });
  const data = await status.json().catch(() => ({}));
  const attached = Boolean(data.paymentMethodId);
  if (attached) {
    row.hidden = false;
    emptyText.hidden = true;
    const isYooMoney = data.paymentMethodType === 'yoo_money';
    const methodIcon = row.querySelector('.payment-method-card-icon');
    methodIcon.src = isYooMoney ? 'https://trace-logos.ru/assets/logos/svgs/yoomoney.svg' : '/assets/bank_card.svg';
    methodIcon.alt = isYooMoney ? 'ЮMoney' : 'Банковская карта';
    methodIcon.classList.toggle('is-payment-logo', isYooMoney);
    const methodName = data.cardLast4 ? `Банковская карта •••• ${data.cardLast4}` : isYooMoney ? 'ЮMoney' : 'Способ оплаты привязан';
    text.textContent = methodName;
    cardCaption.textContent = 'Сохранён для автопродления';
    detach.hidden = false;
  }
  if (data.autoRenew !== false) { toggle.classList.add('is-on'); toggle.setAttribute('aria-pressed', 'true'); caption.textContent = 'Автоматическое продление включено'; }
  detach?.addEventListener('click', async () => {
    detach.disabled = true;
    const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/detach`, { method: 'POST', headers: { Authorization: `Bearer ${token || ''}` } });
    if (response.ok) { row.hidden = true; emptyText.hidden = false; text.textContent = 'Карта отвязана'; detach.hidden = true; toggle.classList.remove('is-on'); caption.textContent = 'Автоматическое продление отключено'; }
    else feedback.textContent = 'Не удалось отвязать карту. Попробуйте ещё раз.';
    detach.disabled = false;
  });
})();
