// Подсветка синтаксиса { синонимов } и [zone] прямо поверх textarea: находит
// каждой { пару }, красит парные скобки одним цветом по уровню вложенности,
// а лишние/незакрытые — красным. Одновременно поле растёт по высоте вслед
// за текстом (задний план с текстом определяет высоту через CSS-грид,
// сам textarea прозрачный и лежит поверх — без JS-расчётов scrollHeight).

const BRACE_DEPTH_COLORS = 4; // сколько разных цветов чередуется по вложенности

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
function escapeHtmlChar(ch) {
  return HTML_ESCAPES[ch] || ch;
}

// Разбирает строку на скобочные пары. Для каждого символа { или } определяет,
// парный он или "лишний"/"незакрытый", и на какой глубине вложенности стоит.
function analyzeBraces(str) {
  const marks = new Array(str.length).fill(null);
  const openStack = [];

  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (ch === '{') {
      openStack.push(i);
    } else if (ch === '}') {
      if (openStack.length) {
        const openIdx = openStack.pop();
        const depth = openStack.length + 1;
        marks[openIdx] = { valid: true, depth };
        marks[i] = { valid: true, depth };
      } else {
        marks[i] = { valid: false, depth: 0 };
      }
    }
  }
  // Всё, что осталось в стеке — открытые скобки без пары.
  openStack.forEach((openIdx) => {
    marks[openIdx] = { valid: false, depth: 0 };
  });

  const unmatchedOpen = openStack.length;
  const unmatchedClose = marks.filter((m, i) => m && !m.valid && str[i] === '}').length;

  return { marks, unmatchedOpen, unmatchedClose };
}

// Строит подсвеченный HTML для заднего плана. [zone] выделяется отдельным
// стилем — это не скобки синонимов, а токен подстановки района.
function renderHighlightedHtml(str) {
  const { marks } = analyzeBraces(str);
  let html = '';
  let i = 0;
  while (i < str.length) {
    if (str.startsWith('[zone]', i)) {
      html += '<span class="tok-zone">[zone]</span>';
      i += 6;
      continue;
    }
    const mark = marks[i];
    const ch = str[i];
    if (mark) {
      const cls = mark.valid ? `tok-brace depth-${((mark.depth - 1) % BRACE_DEPTH_COLORS) + 1}` : 'tok-brace invalid';
      html += `<span class="${cls}">${escapeHtmlChar(ch)}</span>`;
    } else {
      html += escapeHtmlChar(ch);
    }
    i += 1;
  }
  return `${html} `; // хвостовой пробел — чтобы висящий перевод строки тоже занимал высоту
}

function statusMessage(str) {
  const { unmatchedOpen, unmatchedClose } = analyzeBraces(str);
  if (!unmatchedOpen && !unmatchedClose) {
    return { ok: true, text: str.includes('{') ? 'Скобки сбалансированы' : '' };
  }
  const parts = [];
  if (unmatchedClose) parts.push(`лишних «}»: ${unmatchedClose}`);
  if (unmatchedOpen) parts.push(`не закрыто «{»: ${unmatchedOpen}`);
  return { ok: false, text: '⚠ ' + parts.join(' · ') };
}

// Подключает подсветку+автовысоту к одному полю шаблона.
// wrap — контейнер .tpl-grow-wrap с .tpl-backdrop и textarea внутри,
// statusEl — соседний элемент .brace-status для текста "скобки не сходятся".
function initBraceField(wrap, statusEl) {
  const textarea = wrap.querySelector('textarea');
  const backdrop = wrap.querySelector('.tpl-backdrop');

  // Пустое поле не должно схлопываться в одну строку — минимальная высота
  // берётся из rows, как у обычных textarea.
  const styles = getComputedStyle(textarea);
  const lineHeight = parseFloat(styles.lineHeight) || 20;
  const chrome =
    parseFloat(styles.paddingTop) +
    parseFloat(styles.paddingBottom) +
    parseFloat(styles.borderTopWidth) +
    parseFloat(styles.borderBottomWidth);
  const rows = parseInt(textarea.getAttribute('rows'), 10) || 2;
  backdrop.style.minHeight = `${rows * lineHeight + chrome}px`;

  function render() {
    backdrop.innerHTML = renderHighlightedHtml(textarea.value);
    const status = statusMessage(textarea.value);
    statusEl.textContent = status.text;
    statusEl.classList.toggle('brace-status-bad', !status.ok);
  }

  textarea.addEventListener('input', render);
  render();
}

// Инициализирует все поля шаблона внутри контейнера (например, карточки услуги).
function initBraceFieldsIn(root) {
  root.querySelectorAll('.tpl-grow-wrap').forEach((wrap) => {
    const next = wrap.nextElementSibling;
    const field = wrap.closest('.template-field');
    const fieldNext = field?.nextElementSibling;
    if (!next) return;
    // brace-status стоит либо сразу за полем, либо внутри .field-footer
    // рядом со счётчиком символов (см. servicesPanel.js).
    const statusEl = next?.classList.contains('brace-status')
      ? next
      : next?.querySelector('.brace-status')
        || fieldNext?.classList.contains('brace-status') && fieldNext
        || fieldNext?.querySelector('.brace-status');
    if (statusEl) initBraceField(wrap, statusEl);
  });
}
