(async () => {
  const card = document.getElementById('profile-payment-method-card');
  if (!card) return;
  const list = document.getElementById('profile-payment-method-list');
  const emptyText = document.getElementById('profile-payment-empty-text');
  const feedback = document.getElementById('profile-payment-feedback');
  const toggle = document.getElementById('profile-autorenew-toggle');
  const caption = document.getElementById('profile-autorenew-caption');
  const client = window.__supabaseClient || window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
  const { data: { user } = {} } = await client?.auth.getUser() || {};
  if (!user?.email) return;
  const token = (await client.auth.getSession()).data.session?.access_token;
  const headers = { Authorization: `Bearer ${token || ''}` };
  const safe = (value) => window.escapeHtml ? window.escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const status = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(user.email)}`, { headers });
  const data = await status.json().catch(() => ({}));
  const methods = data.paymentMethods || (data.paymentMethodId ? [{ id: data.paymentMethodId, type: data.paymentMethodType, cardLast4: data.cardLast4, isPrimary: true }] : []);
  const recurringPlans = new Set(['3 дня', '1 месяц', '3 месяца', '6 месяцев', '1 год']);
  const recurringAvailable = recurringPlans.has(data.plan);
  emptyText.hidden = methods.length > 0;
  list.innerHTML = methods.map((method) => {
    const isYooMoney = method.type === 'yoo_money' || method.methodType === 'yoo_money';
    const isSbp = method.type === 'sbp' || method.methodType === 'sbp';
    const cardLabel = method.cardBrand ? String(method.cardBrand).toUpperCase() : 'Банковская карта';
    const name = method.cardLast4 ? `${cardLabel} •••• ${method.cardLast4}` : isYooMoney ? 'ЮMoney' : isSbp ? 'СБП' : 'Способ оплаты';
    const available = method.availableForRenewal !== false;
    const captionText = !available
      ? 'Сохранён в другом магазине и сейчас недоступен'
      : isYooMoney ? 'Кошелёк сохранён для автопродления' : isSbp ? 'СБП сохранён для автопродления' : 'Сохранён для автопродления';
    const iconSrc = isYooMoney ? 'https://trace-logos.ru/assets/logos/svgs/yoomoney.svg' : isSbp ? '/assets/sbp-full.svg' : '/assets/bank_card.svg';
    const iconAlt = isYooMoney ? 'ЮMoney' : isSbp ? 'СБП' : 'Банковская карта';
    const primaryLabel = method.isPrimary ? 'Основной способ' : available ? 'Сделать основным' : 'Недоступен для автопродления';
    return `<div class="payment-method-row" data-method-id="${safe(method.id)}" data-primary="${method.isPrimary ? 'true' : 'false'}"><img src="${iconSrc}" alt="${iconAlt}" class="payment-method-card-icon${isYooMoney ? ' is-payment-logo' : ''}${isSbp ? ' is-sbp-logo' : ''}"><div class="payment-method-copy"><div class="payment-method-title"><strong>${safe(name)}</strong><button class="payment-method-primary" type="button" aria-pressed="${method.isPrimary ? 'true' : 'false'}"${available ? '' : ' disabled'}>${primaryLabel}</button></div><small>${safe(captionText)}</small></div><button class="payment-method-remove" type="button" aria-label="Отвязать способ оплаты" title="Отвязать способ оплаты"><i data-lucide="trash-2" aria-hidden="true"></i></button></div>`;
  }).join('');
  if (window.lucide) window.lucide.createIcons();
  const syncAutoRenew = (enabled) => {
    toggle.classList.toggle('is-on', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    caption.textContent = enabled
      ? data.plan === '3 дня' ? 'После пробного периода спишется 299 ₽ за 1 месяц' : 'Автоматическое продление включено'
      : data.plan === '3 дня' ? 'Списания после пробного периода не будет' : 'Автоматическое продление отключено';
  };
  syncAutoRenew(Boolean(data.autoRenew));
  if (!recurringAvailable) {
    toggle.disabled = true;
    caption.textContent = data.plan === 'Бессрочный доступ'
      ? 'Для бессрочного доступа автопродление не требуется'
      : 'Для этого тарифа автопродление недоступно';
  }
  toggle.addEventListener('click', async () => {
    const enabled = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.disabled = true;
    const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/auto-renew`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) syncAutoRenew(Boolean(result.autoRenew));
    else if (result.error === 'payment_method_required') feedback.textContent = 'Сначала добавьте способ оплаты.';
    else if (result.error === 'payment_method_unavailable') feedback.textContent = 'Выбранный способ сохранён в другом магазине и сейчас недоступен.';
    else if (result.error === 'renewal_unavailable') feedback.textContent = 'Для этого тарифа автопродление не требуется.';
    else feedback.textContent = 'Не удалось изменить автопродление.';
    toggle.disabled = !recurringAvailable;
  });
  list.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-method-id]');
    if (!row) return;
    const methodId = row.dataset.methodId;
    const primary = event.target.closest('.payment-method-primary');
    if (primary && primary.getAttribute('aria-pressed') !== 'true') {
      const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/set-primary`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ methodId }) });
      if (response.ok) location.reload(); else feedback.textContent = 'Не удалось выбрать основной способ оплаты.';
    }
    if (event.target.closest('.payment-method-remove')) {
      const warning = row.dataset.primary === 'true' && methods.length === 1
        ? 'Отвязать единственный способ оплаты? Автопродление будет отключено, но доступ сохранится до конца оплаченного периода.'
        : 'Отвязать этот способ оплаты?';
      if (!window.confirm(warning)) return;
      const response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/detach`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ methodId }) });
      if (response.ok) location.reload(); else feedback.textContent = 'Не удалось отвязать способ оплаты.';
    }
  });
})();
