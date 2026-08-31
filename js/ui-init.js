function setInnerHTML(id, html) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = html;
}

function initBackToCabinet(selector = '[data-back-to-cabinet]') {
  document.querySelectorAll(selector).forEach((element) => {
    element.href = '/app/districts';
    element.innerHTML = icon('arrowLeft') + ' Назад в кабинет';
  });
}

  setInnerHTML('cabinet-view-btn', icon('user') + ' Кабинет')
  setInnerHTML('payment-view-btn', icon('creditCard') + ' Оплата')
  setInnerHTML('logout-view-btn', icon('logOut'))
  setInnerHTML('tab-btn-districts', icon('mapPin') + ' Районы')
  setInnerHTML('tab-btn-services', icon('wrench') + ' Шаблоны объявлений')
  setInnerHTML('tab-btn-generate', icon('download') + ' Генерация')
  setInnerHTML('tab-btn-profile', icon('user') + ' Профиль')
  setInnerHTML('sidebar-logout-btn', icon('logOut') + ' Выйти')
  setInnerHTML('districts-title', icon('mapPin') + ' Районы')
  setInnerHTML('add-district-btn', icon('plus') + ' Добавить район')
  setInnerHTML('services-title', icon('wrench') + ' Шаблоны объявлений')
  setInnerHTML('generate-title', icon('download') + ' Генерация CSV')
  setInnerHTML('add-service-btn', icon('plus') + ' Добавить услугу')
  setInnerHTML('toggle-all-services-btn', icon('chevronsUpDown') + ' Скрыть все')
  setInnerHTML('generate-btn', icon('sparkles') + ' Сгенерировать')
  setInnerHTML('ads-per-district-label', icon('sparkles') + ' Объявлений на район')
  setInnerHTML('download-btn', icon('download') + ' Скачать CSV')
  setInnerHTML('folder-icon', icon('folder'))
  setInnerHTML('synonym-help-icon', icon('fileText'))
  setInnerHTML('profile-select-chevron', icon('chevronDown'))
  setInnerHTML('profile-category-chevron', icon('chevronDown'))
  setInnerHTML('generate-settings-category-chevron', icon('chevronDown'))
  setInnerHTML('new-profile-btn', icon('plus'))
  setInnerHTML('rename-profile-btn', icon('pencil'))
  setInnerHTML('delete-profile-btn', icon('trash'))
  setInnerHTML('profile-generation-icon', icon('wrench'))
  setInnerHTML('profile-generation-arrow', icon('chevronRight'))
  setInnerHTML('profile-generation-back-icon', icon('arrowLeft'))
  setInnerHTML('profile-payments-icon', icon('creditCard'))
  setInnerHTML('profile-history-icon', icon('alignLeft'))
  setInnerHTML('profile-payments-arrow', icon('chevronRight'))
  setInnerHTML('profile-history-arrow', icon('chevronRight'))
  setInnerHTML('profile-referral-arrow', icon('chevronRight'))
  setInnerHTML('profile-zap-icon', icon('sparkles'))
  setInnerHTML('profile-monitor-icon', icon('mapPin'))
  setInnerHTML('profile-globe-icon', icon('fileText'))
  setInnerHTML('profile-gauge-icon', icon('wrench'))
  setInnerHTML('profile-shield-icon', icon('shield'))
  setInnerHTML('profile-chat-icon', icon('messageCircle'))
  setInnerHTML('profile-mail-icon', icon('mail'))
  setInnerHTML('profile-status-icon', icon('circleX'))
  setInnerHTML('profile-wifi-icon', icon('wifiOff'))
  setInnerHTML('profile-calendar-icon', icon('calendarDays'))
  setInnerHTML('profile-refresh-icon', icon('refreshCw'))
  initBackToCabinet()
  const referralBackButton = document.getElementById('referral-back-btn')
  if (referralBackButton) referralBackButton.href = '/app/profile'
  setInnerHTML('referral-copy-btn', icon('copy') + ' Пока не работает')
  document.getElementById('referral-copy-btn')?.setAttribute('disabled', 'disabled')
  setInnerHTML('referral-users-icon', icon('users'))
  setInnerHTML('referral-stat-sparkles-icon', icon('sparkles'))
  setInnerHTML('profile-payments-back-btn', icon('arrowLeft') + ' Назад в профиль')
  setInnerHTML('payment-empty-icon', icon('creditCard'))
  setInnerHTML('profile-history-back-btn', icon('arrowLeft') + ' Назад в профиль')
  setInnerHTML('feature-globe', icon('globe') + ' Пропускная способность 10 Гбит/с')
  setInnerHTML('feature-monitor', icon('monitor') + ' До 5 устройств')
  setInnerHTML('feature-zap', icon('zap') + ' Все платформы')
  setInnerHTML('feature-gauge', icon('gauge') + ' Без ограничений скорости и трафика')
  setInnerHTML('tariff-check', icon('check'))
  setInnerHTML('sbp-check', icon('check'))
  setInnerHTML('pay-main-btn', 'Перейти к оплате ' + icon('arrowRight'))
  setInnerHTML('login-mail-icon', icon('mail'))
  setInnerHTML('login-field-icon', icon('mail'))
  setInnerHTML('login-arrow-icon', icon('arrowRight'))
  if (window.lucide) lucide.createIcons();
  document.getElementById('profile-renew-btn')?.addEventListener('click', () => document.getElementById('payment-view-btn').click());
