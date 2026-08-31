(async () => {
const paymentEmail = document.getElementById('payment-email');
const paymentEmailField = document.querySelector('.payment-email-field');
const paymentEmailError = document.getElementById('payment-email-error');
const emailStep = document.getElementById('payment-email-step');
const planStep = document.getElementById('payment-plan-step');
const methodStep = document.getElementById('payment-method-step');
const submitStep = document.getElementById('payment-submit-step');
const paymentForm = document.getElementById('payment-form');
const feedback = document.getElementById('checkout-feedback');
const paymentButton = document.getElementById('pay-main-btn');
const paymentTotalRow = document.getElementById('payment-total-row');
const authClient = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
const { data: sessionData } = await authClient?.auth.getSession() || {};
const headerEmail = document.getElementById('account-email')?.textContent?.trim() || '';
const user = sessionData?.session?.user || (headerEmail.includes('@') ? { email: headerEmail } : null);
const signedIn = Boolean(user);
const accountEmail = (user?.email || '').trim().toLowerCase();
const tariffs = document.getElementById('payment-tariffs');
const CHECKOUT_ENDPOINT = `${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/checkout`;
const CHECKOUT_PRODUCT_ID = '078103ba-9cc0-4cd8-8ed8-297b251039cf';
const projectAddonCheckout = new URLSearchParams(window.location.search).get('plan') === 'project-addon';
let trialUsed = false;

const tariff = (plan, price, note, selected = false, wide = false) => `<button class="tariff-card${selected ? ' selected' : ''}${wide ? ' tariff-card--wide' : ''}" type="button" data-plan="${plan}" data-price="${price}" role="radio" aria-checked="${selected}"><span class="tariff-name">${plan}</span><strong>${price.toLocaleString('ru-RU')} ₽</strong><small>${note}</small><span class="radio-circle${selected ? ' checked' : ''}">${selected ? icon('check') : ''}</span></button>`;
function renderTariffs() {
  const trialTariff = tariff('3 дня', 0, 'бесплатно', true, true);
  const regularTariffs = tariff('1 месяц', 299, 'в месяц') + tariff('3 месяца', 799, '266 ₽ / мес (выгода 98 ₽)', trialUsed && !signedIn) + tariff('6 месяцев', 1490, '248 ₽ / мес (выгода 304 ₽)') + tariff('1 год', 2790, '233 ₽ / мес (выгода 798 ₽)');
  const signedInTariffs = tariff('1 месяц', 299, 'в месяц', !trialUsed) + tariff('3 месяца', 799, '266 ₽ / мес (выгода 98 ₽)', trialUsed) + tariff('6 месяцев', 1490, '248 ₽ / мес (выгода 304 ₽)') + tariff('1 год', 2790, '233 ₽ / мес (выгода 798 ₽)');
  tariffs.innerHTML = projectAddonCheckout
    ? tariff('Дополнительный проект', 100, 'в месяц', true, true)
    : trialUsed ? signedInTariffs : trialTariff + regularTariffs;
}

// Critical checkout UI must not wait for Supabase network requests.
renderTariffs();
if (signedIn) {
  emailStep.hidden = true;
  planStep.querySelector('.step-number').textContent = '1';
  methodStep.querySelector('.step-number').textContent = '2';
} else {
  methodStep.querySelector('.step-number').textContent = '3';
}

async function fetchWithTimeout(url, options = {}, timeout = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

if (accountEmail) {
  const accountToken = sessionData?.session?.access_token || '';
  const statusResponse = await fetchWithTimeout(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(accountEmail)}`, { headers: { Authorization: `Bearer ${accountToken || ''}` } });
  const status = await statusResponse?.json().catch(() => ({}));
  trialUsed = Boolean(status?.trialUsed);
  renderTariffs();
}
const configResponse = await fetchWithTimeout(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/config`);
const paymentConfig = configResponse?.ok ? await configResponse.json().catch(() => ({})) : {};
const sbpMethod = document.getElementById('payment-method-sbp');
if (sbpMethod && Array.isArray(paymentConfig.methods) && !paymentConfig.methods.includes('sbp')) sbpMethod.hidden = true;

function setPaymentEmailError(message = '') {
  const hasError = Boolean(message);
  paymentEmailField?.classList.toggle('has-error', hasError);
  if (paymentEmailError) {
    paymentEmailError.textContent = message;
    paymentEmailError.hidden = !hasError;
  }
  if (hasError) {
    requestAnimationFrame(() => paymentEmailField?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
}

paymentEmail.addEventListener('input', () => setPaymentEmailError());

function paymentErrorText(error) {
  const normalized = String(error || '').toLowerCase();
  if (normalized.includes('incorrect email to purchase')) {
    return 'Этот email нельзя использовать для покупки. Укажите другой email покупателя.';
  }
  if (normalized.includes('email')) {
    return 'Проверьте email покупателя и попробуйте ещё раз.';
  }
  if (normalized.includes('offer') || normalized.includes('product')) {
    return 'Тариф временно недоступен. Попробуйте позже.';
  }
  return 'Не удалось создать ссылку на оплату. Попробуйте ещё раз.';
}

const totalPrice = document.querySelector('#payment-submit-step .total-row strong');
const paymentBenefit = document.getElementById('payment-benefit');
const tariffBenefits = { '3 месяца': 98, '6 месяцев': 304, '1 год': 798 };
function updatePaymentSummary(card) {
  if (!card) return;
  if (totalPrice) totalPrice.textContent = card.querySelector('strong').textContent;
  const benefit = tariffBenefits[card.dataset.plan];
  if (paymentBenefit) {
    paymentBenefit.hidden = !benefit;
    paymentBenefit.textContent = benefit ? `(выгода ${benefit.toLocaleString('ru-RU')} ₽)` : '';
  }
}
function updateTrialUI(card) {
  const isTrial = card?.dataset.plan === '3 дня';
  if (methodStep) methodStep.hidden = isTrial;
  if (paymentButton) {
    paymentButton.classList.toggle('is-unavailable', false);
    paymentButton.disabled = false;
    paymentButton.textContent = isTrial ? 'Активировать пробный период' : 'Перейти к оплате';
  }
}
let selectedTariff = null;
initRadioGroup(tariffs, '.tariff-card', (card) => {
  selectedTariff = card;
  updatePaymentSummary(card);
  updateTrialUI(card);
});
if (projectAddonCheckout) {
  selectedTariff = tariffs.querySelector('.tariff-card');
  updatePaymentSummary(selectedTariff);
  updateTrialUI(selectedTariff);
}
let selectedPaymentMethod = 'card';
initRadioGroup(document, '.payment-method', (method) => {
  selectedPaymentMethod = method?.dataset.method || 'sbp';
  if (selectedTariff?.dataset.plan === '3 дня') return;
  if (paymentTotalRow) paymentTotalRow.hidden = false;
  if (paymentButton) {
    paymentButton.classList.remove('is-unavailable');
    paymentButton.textContent = 'Перейти к оплате';
  }
});
if (!signedIn && totalPrice) totalPrice.textContent = '0 ₽';
if (!signedIn && paymentBenefit) paymentBenefit.hidden = true;

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!signedIn && selectedTariff?.dataset.plan !== '3 дня' && !paymentEmail.checkValidity()) {
    setPaymentEmailError(paymentEmail.value.trim() ? 'Введите корректный email.' : 'Укажите email.');
    return;
  }

  if (selectedTariff?.dataset.plan === '3 дня') {
    const trialEmail = paymentEmail.value.trim() || accountEmail;
    if (!trialEmail) {
      setPaymentEmailError('Укажите email для активации пробного периода.');
      feedback.textContent = 'Укажите email для активации пробного периода.';
      feedback.classList.add('is-error', 'is-visible');
      return;
    }
    const trialResponse = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/trial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: trialEmail }) });
    const trialData = await trialResponse.json().catch(() => ({}));
    if (!trialResponse.ok) {
      feedback.textContent = trialData.error === 'trial_already_used' ? 'Пробный период для этого email уже использован.' : 'Не удалось активировать пробный период. Попробуйте ещё раз.';
      feedback.classList.add('is-error', 'is-visible');
      return;
    }
    if (trialData.paymentUrl) {
      window.location.href = trialData.paymentUrl;
      return;
    }
    feedback.textContent = 'Пробный период активирован на 3 дня.';
    feedback.classList.remove('is-error');
    feedback.classList.add('is-visible');
    paymentButton.disabled = true;
    paymentButton.textContent = 'Пробный период активирован';
    setTimeout(() => {
      window.location.href = signedIn ? '/generate' : `/login?email=${encodeURIComponent(trialEmail)}`;
    }, 500);
    return;
  }

  if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'sbp') {
    const amount = Number(selectedTariff?.dataset.price || 0);
    const email = paymentEmail.value.trim() || accountEmail;
    const button = paymentButton;
    const oldLabel = button?.textContent || '';

    if (!selectedTariff || !email) {
      setPaymentEmailError('Укажите email и выберите тариф.');
      feedback.textContent = 'Укажите email и выберите тариф.';
      feedback.classList.add('is-error');
      feedback.classList.add('is-visible');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Создаём ссылку на оплату…';
    }
    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: CHECKOUT_PRODUCT_ID,
          plan: selectedTariff?.dataset.plan || '',
          amount,
          currency: 'RUB',
          email,
          paymentMethod: selectedPaymentMethod,
          lang: 'ru',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.paymentUrl) {
        sessionStorage.setItem('genvito-pending-payment', JSON.stringify({
          paymentId: data.paymentId || '',
          checkoutToken: data.checkoutToken || '',
          plan: data.plan || selectedTariff?.dataset.plan || '',
          createdAt: new Date().toISOString(),
        }));
        window.location.href = data.paymentUrl;
        return;
      }
      feedback.classList.add('is-error');
      feedback.textContent = data.error === 'payments_disabled'
        ? 'Оплата временно недоступна.'
        : paymentErrorText(data.error);
    } catch (_) {
      feedback.classList.add('is-error');
      feedback.textContent = 'Ошибка соединения с платёжным сервисом.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldLabel;
      }
      feedback.classList.add('is-visible');
    }
    return;
  }

  feedback.textContent = 'Переход к оплате будет доступен после подключения платёжного сервиса.';
  feedback.classList.remove('is-error');
  feedback.classList.add('is-visible');
});

if (window.lucide) lucide.createIcons();
})();
