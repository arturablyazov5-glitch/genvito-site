// Панель "Генерация": считает сколько объявлений получится, по клику строит
// статистику, а скачивание CSV — отдельная кнопка, без повторной генерации
// (иначе из-за случайных синонимов скачанный файл отличался бы от того,
// что показала статистика).

function statCard(label, value, tone, sub) {
  return `
    <div class="stat-card ${tone || ''}">
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ''}
    </div>`;
}

function similarityTone(pct) {
  if (pct >= 75) return 'stat-bad';
  if (pct >= 50) return 'stat-warn';
  return 'stat-good';
}

// Статистика: сколько объявлений получилось, насколько тексты похожи друг
// на друга (и не пора ли добавить синонимов), есть ли точные дубли и не
// вылезают ли длины заголовка/текста за лимиты Авито (50 / 7500 символов).
function renderStatsHtml(stats) {
  const simTone = similarityTone(stats.avgSimilarityPercent);
  const dupTone = stats.duplicateTextCount > 0 ? 'stat-bad' : 'stat-good';
  const titleTone = stats.title.overLimitCount > 0 ? 'stat-bad' : 'stat-good';
  const bodyTone = stats.body.overLimitCount > 0 ? 'stat-bad' : 'stat-good';
  const missingPhotosCount = Number(stats.missingPhotosCount);
  const hasPhotoStats = Number.isFinite(missingPhotosCount);
  const photosTone = !hasPhotoStats || missingPhotosCount > 0 ? 'stat-bad' : 'stat-good';
  const sampleNote =
    stats.sampledForSimilarity < stats.total ? ` (по выборке из ${stats.sampledForSimilarity})` : '';

  // Если есть поля вообще без синонимов — это и есть конкретная причина
  // высокой похожести, называем её прямо, а не общим советом "добавьте синонимов".
  const hasWeakFields = stats.fieldsWithoutSynonyms && stats.fieldsWithoutSynonyms.length > 0;
  const similaritySub = hasWeakFields
    ? `Без синонимов совсем: ${stats.fieldsWithoutSynonyms.join('; ')}`
    : simTone === 'stat-bad'
    ? 'Тексты почти одинаковые — добавьте больше синонимов'
    : simTone === 'stat-warn'
    ? 'Неплохо, но можно разнообразнее'
    : 'Хорошее разнообразие';

  return [
    statCard('Всего объявлений', stats.total),
    statCard(
      `Похожесть текстов${sampleNote}`,
      `${stats.avgSimilarityPercent}%`,
      hasWeakFields ? 'stat-bad' : simTone,
      similaritySub
    ),
    statCard(
      'Точных дублей текста',
      stats.duplicateTextCount,
      dupTone,
      dupTone === 'stat-bad' ? 'Есть полностью одинаковые объявления' : 'Дублей нет'
    ),
    statCard(
      'Заголовок',
      `${stats.title.min}–${stats.title.max} симв.`,
      titleTone,
      titleTone === 'stat-bad'
        ? `⚠ превышают лимит ${stats.title.limit}: ${stats.title.overLimitCount}`
        : `в пределах лимита ${stats.title.limit}`
    ),
    statCard(
      'Текст + SEO',
      `${stats.body.min}–${stats.body.max} симв.`,
      bodyTone,
      bodyTone === 'stat-bad'
        ? `⚠ превышают лимит 7500: ${stats.body.overLimitCount}`
        : 'в пределах лимита 7500'
    ),
    statCard(
      'Фото',
      !hasPhotoStats ? 'нет данных' : missingPhotosCount > 0 ? `${missingPhotosCount} без фото` : 'ОК',
      photosTone,
      !hasPhotoStats
        ? 'Перезапустите сервер, API отдает старую статистику'
        : missingPhotosCount > 0
        ? 'Авито требует ImageUrls или ImageNames'
        : 'ImageUrls заполнен'
    )
  ].join('');
}

function initGeneratePanel(store) {
  const summaryEl = document.getElementById('generate-summary');
  const btn = document.getElementById('generate-btn');
  const errorEl = document.getElementById('generate-error');
  const resultsEl = document.getElementById('generate-results');
  const statsEl = document.getElementById('generate-stats');
  const downloadBtn = document.getElementById('download-btn');
  const adsPerDistrictInput = document.getElementById('ads-per-district-input');
  const adsPerDistrictSaved = document.getElementById('ads-per-district-saved');

  let lastCsv = null;

  adsPerDistrictInput.value = store.adsPerDistrict || 1;

  function hideResults() {
    resultsEl.hidden = true;
    lastCsv = null;
  }

  function updateSummary() {
    const districts = store.districts.length;
    const services = store.services.length;
    const adsPerDistrict = Math.max(1, Number(adsPerDistrictInput.value) || 1);
    const total = districts * services * adsPerDistrict;
    const districtWord = pluralize(districts, 'район', 'района', 'районов');
    const serviceWord = pluralize(services, 'услуга', 'услуги', 'услуг');
    const adWord = pluralize(total, 'объявление', 'объявления', 'объявлений');
    summaryEl.textContent =
      `${districts} ${districtWord} × ${services} ${serviceWord} × ${adsPerDistrict} на район ` +
      `= ${total} ${adWord}`;
    btn.disabled = total === 0;
    btn.innerHTML = total === 0
      ? `Добавьте ${districts === 0 && services === 0 ? 'районы и шаблоны' : districts === 0 ? 'районы' : 'шаблоны'}`
      : `${icon('sparkles')} Сгенерировать`;
    // Шаблон или списки изменились с прошлой генерации — старый предпросмотр
    // больше не соответствует текущим данным, скачивать его нельзя.
    hideResults();
  }

  const saveAdsPerDistrict = debounce(async () => {
    const res = await Api.saveSettings({ adsPerDistrict: adsPerDistrictInput.value });
    store.adsPerDistrict = res.adsPerDistrict;
    adsPerDistrictInput.value = res.adsPerDistrict; // подтягиваем зажатое в границы [1,20] значение
    flashSaved(adsPerDistrictSaved);
    updateSummary();
  }, 500);

  adsPerDistrictInput.addEventListener('input', () => {
    updateSummary();
    saveAdsPerDistrict();
  });

  btn.addEventListener('click', async () => {
    errorEl.textContent = '';
    hideResults();
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `${icon('sparkles')} Генерирую…`;
    try {
      const data = await Api.generate();
      lastCsv = data.csv;
      statsEl.innerHTML = renderStatsHtml(data.stats);
      resultsEl.hidden = false;
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastCsv) return;
    const blob = new Blob([lastCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'avito-ads.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  updateSummary();
  if (store.lastGeneration?.csv && store.lastGeneration?.stats) {
    lastCsv = store.lastGeneration.csv;
    statsEl.innerHTML = renderStatsHtml(store.lastGeneration.stats);
    resultsEl.hidden = false;
  }
  return { updateSummary };
}
