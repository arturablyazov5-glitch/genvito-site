(async () => {
const paymentEmail = document.getElementById('payment-email');
const emailStep = document.getElementById('payment-email-step');
const planStep = document.getElementById('payment-plan-step');
const methodStep = document.getElementById('payment-method-step');
const submitStep = document.getElementById('payment-submit-step');
const paymentForm = document.getElementById('payment-form');
const feedback = document.getElementById('checkout-feedback');
const paymentButton = document.getElementById('pay-main-btn');
const paymentTotalRow = document.getElementById('payment-total-row');
const authClient = window.supabase?.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key);
const { data: { user } = {} } = await authClient?.auth.getUser() || {};
const signedIn = Boolean(user);
const accountEmail = (user?.email || '').trim().toLowerCase();
let trialUsed = false;
if (accountEmail) {
  const statusResponse = await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/status?email=${encodeURIComponent(accountEmail)}`);
  const status = await statusResponse.json().catch(() => ({}));
  trialUsed = Boolean(status.trialUsed);
}
const tariffs = document.getElementById('payment-tariffs');
// Тарифы и идентификатор продукта Genvito для платёжного checkout.
const CHECKOUT_ENDPOINT = `${window.SUPABASE_CONFIG.url}/functions/v1/payment-api/checkout`;
const CHECKOUT_PRODUCT_ID = '078103ba-9cc0-4cd8-8ed8-297b251039cf';

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

const tariff = (plan, price, note, selected = false, wide = false) => `<button class="tariff-card${selected ? ' selected' : ''}${wide ? ' tariff-card--wide' : ''}" type="button" data-plan="${plan}" data-price="${price}" role="radio" aria-checked="${selected}"><span class="tariff-name">${plan}</span><strong>${price.toLocaleString('ru-RU')} ₽</strong><small>${note}</small><span class="radio-circle${selected ? ' checked' : ''}">${selected ? icon('check') : ''}</span></button>`;
const projectAddonCheckout = new URLSearchParams(window.location.search).get('plan') === 'project-addon';
const trialTariff = tariff('3 дня', 0, 'бесплатно', true, true);
const regularTariffs = tariff('1 месяц', 299, 'в месяц') + tariff('3 месяца', 799, '266 ₽ / мес (выгода 98 ₽)', trialUsed && !signedIn) + tariff('6 месяцев', 1490, '248 ₽ / мес (выгода 304 ₽)') + tariff('1 год', 2790, '233 ₽ / мес (выгода 798 ₽)');
const signedInTariffs = tariff('1 месяц', 299, 'в месяц', !trialUsed) + tariff('3 месяца', 799, '266 ₽ / мес (выгода 98 ₽)', trialUsed) + tariff('6 месяцев', 1490, '248 ₽ / мес (выгода 304 ₽)') + tariff('1 год', 2790, '233 ₽ / мес (выгода 798 ₽)');

tariffs.innerHTML = projectAddonCheckout
  ? tariff('Дополнительный проект', 100, 'в месяц', true, true)
  : trialUsed ? signedInTariffs : trialTariff + regularTariffs;
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
  if (paymentTotalRow) paymentTotalRow.hidden = selectedPaymentMethod === 'sbp';
  if (paymentButton) {
    paymentButton.classList.toggle('is-unavailable', selectedPaymentMethod === 'sbp');
    paymentButton.textContent = selectedPaymentMethod === 'sbp'
      ? 'Временно недоступно'
      : 'Перейти к оплате';
  }
});
if (!signedIn && totalPrice) totalPrice.textContent = '0 ₽';
if (!signedIn && paymentBenefit) paymentBenefit.hidden = true;

if (signedIn) {
  emailStep.hidden = true;
  planStep.querySelector('.step-number').textContent = '1';
  methodStep.querySelector('.step-number').textContent = '2';
} else {
  methodStep.querySelector('.step-number').textContent = '3';
}

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!signedIn && selectedTariff?.dataset.plan !== '3 дня' && !paymentEmail.checkValidity()) {
    paymentEmail.reportValidity();
    return;
  }

  if (selectedTariff?.dataset.plan === '3 дня') {
    const trialEmail = paymentEmail.value.trim() || accountEmail;
    if (!trialEmail) {
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

  if (selectedPaymentMethod === 'card') {
    const amount = Number(selectedTariff?.dataset.price || 0);
    const email = paymentEmail.value.trim() || accountEmail;
    const button = paymentButton;
    const oldLabel = button?.textContent || '';

    if (!selectedTariff || !email) {
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
          lang: 'ru',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.paymentUrl) {
        if (selectedTariff?.dataset.plan === '3 дня') {
        }
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
