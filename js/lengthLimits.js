// Подсчёт длины итогового текста объявления с учётом синтаксиса шаблона:
// {варианты} дают разную длину в зависимости от того, какой вариант выпадет,
// а [zone] заменяется на район — тоже разной длины. Поэтому считаем не одно
// число, а диапазон "минимум–максимум" по всем районам и вариантам синонимов,
// и сверяем его с лимитами Авито.

const AVITO_TITLE_LIMIT = 50;
const AVITO_BODY_LIMIT = 7500; // текст + SEO-хвост показываются на Авито одним полем

// Разбирает шаблон в дерево: последовательность текстовых кусков и групп
// {альтернатива1|альтернатива2|...}, где каждая альтернатива — снова
// последовательность (поддерживает вложенность). К незакрытым/лишним скобкам
// терпим — это только оценка длины, за корректность синтаксиса отвечает
// braceHighlight.js.
function parseTemplateTree(str) {
  let i = 0;

  function parseSeq(stopAtPipeOrClose) {
    const items = [];
    let buf = '';
    while (i < str.length) {
      const ch = str[i];
      if (ch === '{') {
        if (buf) { items.push({ type: 'text', value: buf }); buf = ''; }
        i += 1;
        items.push(parseGroup());
        continue;
      }
      if (ch === '}') break;
      if (stopAtPipeOrClose && ch === '|') break;
      buf += ch;
      i += 1;
    }
    if (buf) items.push({ type: 'text', value: buf });
    return { type: 'seq', items };
  }

  function parseGroup() {
    const alternatives = [parseSeq(true)];
    while (i < str.length && str[i] === '|') {
      i += 1;
      alternatives.push(parseSeq(true));
    }
    if (i < str.length && str[i] === '}') i += 1;
    return { type: 'group', alternatives };
  }

  return parseSeq(false);
}

// Длина текстового куска с подставленной длиной [zone] (zoneLen символов на каждое вхождение).
function textNodeLength(value, zoneLen) {
  const occurrences = (value.match(/\[zone\]/g) || []).length;
  return value.length - occurrences * '[zone]'.length + occurrences * zoneLen;
}

// Возвращает {min, max} длину узла при фиксированной длине [zone] = zoneLen.
function evalNode(node, zoneLen) {
  if (node.type === 'text') {
    const len = textNodeLength(node.value, zoneLen);
    return { min: len, max: len };
  }
  if (node.type === 'group') {
    const ranges = node.alternatives.map((alt) => evalNode(alt, zoneLen));
    return {
      min: Math.min(...ranges.map((r) => r.min)),
      max: Math.max(...ranges.map((r) => r.max))
    };
  }
  // seq
  return node.items.reduce(
    (acc, item) => {
      const r = evalNode(item, zoneLen);
      return { min: acc.min + r.min, max: acc.max + r.max };
    },
    { min: 0, max: 0 }
  );
}

const VARIANT_COUNT_CAP = 1000000; // дальше просто пишем "1 000 000+", число не важно

// Сколько разных текстов теоретически может дать шаблон: у группы {a|b|c} —
// сумма вариантов её альтернатив (сама альтернатива тоже может содержать
// вложенные группы), у последовательности кусков — произведение их вариантов.
function countVariants(node) {
  if (node.type === 'text') return 1;
  if (node.type === 'group') {
    return node.alternatives.reduce(
      (sum, alt) => Math.min(VARIANT_COUNT_CAP, sum + countVariants(alt)),
      0
    ) || 1;
  }
  // seq
  return node.items.reduce((product, item) => Math.min(VARIANT_COUNT_CAP, product * countVariants(item)), 1);
}

function templateVariantCount(str) {
  if (!str) return 1;
  return countVariants(parseTemplateTree(str));
}

function formatVariantCount(n) {
  const capped = n >= VARIANT_COUNT_CAP ? `${VARIANT_COUNT_CAP.toLocaleString('ru-RU')}+` : n.toLocaleString('ru-RU');
  return `${capped} ${pluralize(n, 'вариант', 'варианта', 'вариантов')}`;
}

// Диапазон длины шаблона по всем комбинациям синонимов и всем районам
// (zoneMinLen/zoneMaxLen — длина самого короткого и самого длинного района).
function templateLengthRange(str, zoneMinLen, zoneMaxLen) {
  if (!str) return { min: 0, max: 0 };
  const tree = parseTemplateTree(str);
  return {
    min: evalNode(tree, zoneMinLen).min,
    max: evalNode(tree, zoneMaxLen).max
  };
}

// Длина самого короткого/длинного названия района из списка. Если районов
// нет, [zone] в оценку не вносит длины.
function zoneLenBounds(districts) {
  if (!districts || !districts.length) return { min: 0, max: 0 };
  const lens = districts.map((d) => d.length);
  return { min: Math.min(...lens), max: Math.max(...lens) };
}

function formatRange(range) {
  return range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`;
}

// Пересчитывает и отображает счётчики символов внутри одной карточки услуги.
// districts нужны, чтобы оценить длину [zone] — берём самый короткий и самый
// длинный район из текущего списка.
function updateLengthCounters(card, districts) {
  const titleEl = card.querySelector('.service-tpl-title');
  const textEl = card.querySelector('.service-tpl-text');
  const seoEl = card.querySelector('.service-tpl-seo');
  const titleStatus = card.querySelector('[data-len="title"]');
  const bodyStatus = card.querySelector('[data-len="body"]');
  if (!titleEl || !textEl || !seoEl) return;

  const { min: zMin, max: zMax } = zoneLenBounds(districts);

  const titleRange = templateLengthRange(titleEl.value, zMin, zMax);
  const textRange = templateLengthRange(textEl.value, zMin, zMax);
  const seoRange = templateLengthRange(seoEl.value, zMin, zMax);
  const bothFilled = Boolean(textEl.value) && Boolean(seoEl.value);
  const separator = bothFilled ? 2 : 0; // "\n\n" между текстом и SEO-хвостом
  const bodyRange = {
    min: textRange.min + seoRange.min + separator,
    max: textRange.max + seoRange.max + separator
  };

  if (titleStatus) {
    const titleVariants = templateVariantCount(titleEl.value);
    titleStatus.textContent = `${formatRange(titleRange)} / ${AVITO_TITLE_LIMIT} · ${formatVariantCount(titleVariants)}`;
    titleStatus.classList.toggle('length-status-bad', titleRange.max > AVITO_TITLE_LIMIT);
  }
  if (bodyStatus) {
    const bodyVariants = Math.min(
      VARIANT_COUNT_CAP,
      templateVariantCount(textEl.value) * templateVariantCount(seoEl.value)
    );
    bodyStatus.textContent =
      `Текст + SEO: ${formatRange(bodyRange)} / ${AVITO_BODY_LIMIT} · ${formatVariantCount(bodyVariants)}`;
    bodyStatus.classList.toggle('length-status-bad', bodyRange.max > AVITO_BODY_LIMIT);
  }

  // Краткая сводка для свёрнутой карточки — те же цифры, без открытия полей.
  const summaryEl = card.querySelector('.service-collapsed-summary');
  if (summaryEl) {
    const overLimit = titleRange.max > AVITO_TITLE_LIMIT || bodyRange.max > AVITO_BODY_LIMIT;
    summaryEl.textContent =
      `Заголовок ${formatRange(titleRange)} из ${AVITO_TITLE_LIMIT} · ` +
      `Текст + SEO ${formatRange(bodyRange)} из ${AVITO_BODY_LIMIT}`;
    summaryEl.classList.toggle('length-status-bad', overLimit);
  }
}

// Пересчитывает счётчики во всех карточках внутри контейнера — вызывается,
// когда меняется список районов (влияет на длину [zone] сразу везде).
function refreshLengthCountersIn(root, districts) {
  root.querySelectorAll('.service-card').forEach((card) => updateLengthCounters(card, districts));
}
