(async () => {
  const title = document.getElementById('payment-success-title');
  const message = document.getElementById('payment-success-message');
  const iconBox = document.getElementById('payment-success-icon');
  const details = document.getElementById('payment-success-details');
  const plan = document.getElementById('payment-success-plan');
  const cabinet = document.getElementById('payment-success-cabinet');
  const retry = document.getElementById('payment-success-retry');
  const pending = JSON.parse(sessionStorage.getItem('genvito-pending-payment') || '{}');
  const checkoutToken = new URLSearchParams(location.search).get('checkout') || pending.checkoutToken || '';
  const paymentId = new URLSearchParams(location.search).get('payment_id') || pending.paymentId || '';
  const hasPaymentReference = Boolean(paymentId || checkoutToken);
  let isTrial = pending.trial === true;
  const authClient = window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
  cabinet.href = '/app/login';
  cabinet.textContent = 'Войти в кабинет';
  // A delayed auth request must never hold the payment confirmation screen.
  // The payment-status endpoint uses the checkout token and can be verified
  // without the browser session.
  authClient?.auth.getUser().then(({ data: { user } = {} } = {}) => {
    cabinet.href = user ? '/app/profile' : '/app/login';
    cabinet.textContent = user ? 'Перейти в кабинет' : 'Войти в кабинет';
  }).catch(() => {});

  function render(state, data = {}) {
    iconBox.className = `payment-success-icon is-${state}`;
    if (state === 'success') {
      iconBox.innerHTML = '<i data-lucide="circle-check" aria-hidden="true"></i>';
      title.textContent = isTrial ? 'Пробный период активирован' : 'Спасибо! Оплата прошла';
      message.textContent = isTrial
        ? 'Карта привязана без списания. Через 3 дня автоматически спишется 299 ₽ за 1 месяц доступа. Отменить автопродление можно в профиле.'
        : data.paymentMethodSaved
        ? 'Доступ активирован. Способ оплаты сохранён для автопродления.'
        : data.autoRenew
          ? 'Доступ активирован. Автопродление продолжит работать с основного способа оплаты.'
          : 'Доступ активирован без автопродления.';
      plan.textContent = isTrial ? '3 дня бесплатно' : data.plan || pending.plan || 'Оплаченный тариф';
      details.hidden = false; cabinet.hidden = false; retry.hidden = true;
      sessionStorage.removeItem('genvito-pending-payment');
    } else if (state === 'pending') {
      iconBox.innerHTML = '<i data-lucide="clock-3" aria-hidden="true"></i>';
      title.textContent = 'Платёж обрабатывается';
      message.textContent = 'Банк ещё не подтвердил оплату. Можно подождать или вернуться сюда позже.';
      cabinet.hidden = false; retry.hidden = true;
    } else {
      iconBox.innerHTML = '<i data-lucide="circle-x" aria-hidden="true"></i>';
      title.textContent = hasPaymentReference ? 'Оплата не завершена' : 'Не удалось определить платёж';
      message.textContent = hasPaymentReference ? 'Деньги не списаны. Попробуйте оплатить ещё раз.' : 'Вернитесь к выбору тарифа и повторите оплату.';
      cabinet.hidden = true; retry.hidden = false;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (!paymentId && !checkoutToken) return render('error');
  let paymentPaid = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const query = checkoutToken ? `checkout=${encodeURIComponent(checkoutToken)}` : `paymentId=${encodeURIComponent(paymentId)}`;
    const endpoint = isTrial ? 'trial-status' : 'payment-status';
    let response = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/${endpoint}?${query}`);
    let data = await response.json().catch(() => ({}));
    // sessionStorage can be unavailable after an external redirect. The
    // checkout token still lets the server identify a zero-sum card binding.
    if (!isTrial && checkoutToken && !response.ok) {
      const trialResponse = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/trial-status?${query}`);
      const trialData = await trialResponse.json().catch(() => ({}));
      if (trialResponse.ok) {
        isTrial = true;
        response = trialResponse;
        data = trialData;
      }
    }
    if (response.ok && data.status === 'succeeded' && data.activated && (isTrial || data.paid)) return render('success', data);
    paymentPaid = paymentPaid || Boolean(data.paid);
    if (response.ok && data.status === 'canceled') return render('error', data);
    if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  render('pending');
  if (paymentPaid) message.textContent = 'Оплата получена. Доступ ещё активируется — обновите страницу через несколько секунд.';
})();
