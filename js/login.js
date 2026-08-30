const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const emailFromUrl = new URLSearchParams(window.location.search).get('email');
if (emailFromUrl) loginEmail.value = emailFromUrl;
const codeStep = document.getElementById('login-code-step');
const codeEmail = document.getElementById('login-code-email');
const codeError = document.getElementById('login-code-error');
const codeInputs = [...document.querySelectorAll('.login-code-input')];
const verifyButton = document.getElementById('login-verify-btn');
const resendButton = document.getElementById('login-resend-btn');
let pendingEmail = '';
let resendTimer;
function updateVerifyButton() {
  const complete = codeInputs.every((field) => field.value);
  verifyButton.disabled = !complete;
  verifyButton.hidden = !complete;
}
updateVerifyButton();
function startResendTimer() {
  let seconds = 60;
  resendButton.disabled = true;
  resendButton.textContent = `Отправить код ещё раз через ${seconds} сек.`;
  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendButton.disabled = false;
      resendButton.textContent = 'Отправить код ещё раз';
    } else resendButton.textContent = `Отправить код ещё раз через ${seconds} сек.`;
  }, 1000);
}
const supabaseConfig = window.SUPABASE_CONFIG;
const supabaseClient = window.supabase?.createClient(supabaseConfig?.url, supabaseConfig?.key);

// Приложение работает локально и не подключено к почтовому провайдеру.
// Нет фиктивного списка пользователей и «универсального» кода.
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginEmail.checkValidity()) {
    loginEmail.reportValidity();
    return;
  }
  pendingEmail = loginEmail.value.trim().toLowerCase();
  if (!supabaseClient) return showError('Сервис входа временно недоступен.');
  const { error } = await supabaseClient.auth.signInWithOtp({ email: pendingEmail });
  if (error) return showError('Не удалось отправить код. Попробуйте ещё раз.');
  loginForm.hidden = true;
  document.querySelector('.login-initial-content').hidden = true;
  codeStep.hidden = false;
  codeEmail.textContent = pendingEmail;
  codeInputs[0].focus();
  startResendTimer();
});

function showError(message) {
  let error = document.getElementById('login-error-message');
  if (!error) {
    error = document.createElement('p');
    error.id = 'login-error-message';
    error.className = 'login-error';
    loginForm.append(error);
  }
  error.textContent = message;
}

codeInputs.forEach((input, index) => input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(-1);
  updateVerifyButton();
  if (input.value && codeInputs[index + 1]) codeInputs[index + 1].focus();
}));

codeInputs.forEach((input) => input.addEventListener('paste', (event) => {
  event.preventDefault();
  const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
  pasted.split('').forEach((digit, index) => {
    if (codeInputs[index]) codeInputs[index].value = digit;
  });
  updateVerifyButton();
  codeInputs[Math.min(pasted.length, codeInputs.length) - 1]?.focus();
}));

verifyButton.addEventListener('click', async () => {
  const token = codeInputs.map((input) => input.value).join('');
  codeError.hidden = true;
  if (token.length !== 6) {
    codeError.textContent = 'Введите код из 6 цифр.';
    codeError.hidden = false;
    return;
  }
  verifyButton.disabled = true;
  const { data, error } = await supabaseClient.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
  verifyButton.disabled = false;
  if (error || !data.session) {
    codeError.textContent = 'Неверный или просроченный код.';
    codeError.hidden = false;
    return;
  }
  await fetch(`${window.SUPABASE_CONFIG.url}/functions/v1/registration-notify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}` }
  }).catch(() => {});
  window.location.href = '/';
});

resendButton.addEventListener('click', async () => {
  resendButton.disabled = true;
  const { error } = await supabaseClient.auth.signInWithOtp({ email: pendingEmail });
  if (error) {
    codeError.textContent = 'Не удалось отправить код повторно. Попробуйте позже.';
    codeError.hidden = false;
  }
  startResendTimer();
});

document.getElementById('login-back-btn').addEventListener('click', () => {
  codeStep.hidden = true;
  loginForm.hidden = false;
  document.querySelector('.login-initial-content').hidden = false;
  loginEmail.focus();
});

if (window.lucide) lucide.createIcons();
