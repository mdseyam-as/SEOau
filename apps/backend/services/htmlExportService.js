/**
 * HTML Export Service
 * Конвертация Markdown в HTML с SEO-разметкой
 */
export class HtmlExportService {
  /**
   * Конвертирует Markdown в HTML с SEO-разметкой
   */
  static markdownToHtml(markdown, options = {}) {
    const {
      wrapKeywords = false,
      keywordTag = 'strong',
      keywords = [],
      addParagraphs = true
    } = options;

    if (!markdown) return '';

    let html = markdown;

    // Конвертация заголовков (от H6 до H1, чтобы не было конфликтов)
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Конвертация горизонтальных линий
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Конвертация блоков кода
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const langAttr = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langAttr}>${this.escapeHtml(code.trim())}</code></pre>`;
    });

    // Конвертация инлайн кода
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Конвертация таблиц
    html = this.convertTables(html);

    // Конвертация списков
    html = this.convertLists(html);

    // Конвертация жирного текста
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Конвертация курсива
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Конвертация зачёркнутого текста
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Конвертация ссылок
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Конвертация изображений
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Обёртывание ключевых слов
    if (wrapKeywords && keywords.length > 0) {
      html = this.wrapKeywords(html, keywords, keywordTag);
    }

    // Конвертация параграфов
    if (addParagraphs) {
      html = this.convertParagraphs(html);
    }

    return html.trim();
  }

  /**
   * Конвертирует Markdown таблицы в HTML
   */
  static convertTables(html) {
    const lines = html.split('\n');
    const result = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Проверяем, является ли строка строкой таблицы
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
      } else {
        if (inTable) {
          // Завершаем таблицу
          result.push(this.buildTable(tableRows));
          inTable = false;
          tableRows = [];
        }
        result.push(lines[i]);
      }
    }

    // Если таблица в конце файла
    if (inTable && tableRows.length > 0) {
      result.push(this.buildTable(tableRows));
    }

    return result.join('\n');
  }

  /**
   * Строит HTML таблицу из строк Markdown
   */
  static buildTable(rows) {
    if (rows.length < 2) return rows.join('\n');

    const parseRow = (row) => {
      return row
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim());
    };

    const headerCells = parseRow(rows[0]);
    const isHeaderSeparator = rows[1].match(/^\|[\s\-:|]+\|$/);

    let html = '<table>\n';

    if (isHeaderSeparator) {
      // Есть заголовок
      html += '<thead>\n<tr>\n';
      headerCells.forEach(cell => {
        html += `<th>${cell}</th>\n`;
      });
      html += '</tr>\n</thead>\n<tbody>\n';

      // Остальные строки - тело таблицы
      for (let i = 2; i < rows.length; i++) {
        const cells = parseRow(rows[i]);
        html += '<tr>\n';
        cells.forEach(cell => {
          html += `<td>${cell}</td>\n`;
        });
        html += '</tr>\n';
      }
      html += '</tbody>\n';
    } else {
      // Нет заголовка - все строки в tbody
      html += '<tbody>\n';
      rows.forEach(row => {
        const cells = parseRow(row);
        html += '<tr>\n';
        cells.forEach(cell => {
          html += `<td>${cell}</td>\n`;
        });
        html += '</tr>\n';
      });
      html += '</tbody>\n';
    }

    html += '</table>';
    return html;
  }

  /**
   * Конвертирует Markdown списки в HTML
   */
  static convertLists(html) {
    const lines = html.split('\n');
    const result = [];
    let inUl = false;
    let inOl = false;
    let listIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Маркированный список
      const ulMatch = trimmed.match(/^[-*+] (.+)$/);
      // Нумерованный список
      const olMatch = trimmed.match(/^\d+\. (.+)$/);

      if (ulMatch) {
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          result.push('<ul>');
          inUl = true;
        }
        result.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          result.push('<ol>');
          inOl = true;
        }
        result.push(`<li>${olMatch[1]}</li>`);
      } else {
        if (inUl) {
          result.push('</ul>');
          inUl = false;
        }
        if (inOl) {
          result.push('</ol>');
          inOl = false;
        }
        result.push(line);
      }
    }

    // Закрываем открытые списки
    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  /**
   * Конвертирует текстовые блоки в параграфы
   */
  static convertParagraphs(html) {
    const blocks = html.split('\n\n');

    return blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Пропускаем блоки, которые уже являются HTML элементами
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<p') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<blockquote')
      ) {
        return block;
      }

      // Оборачиваем в параграф
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n\n');
  }

  /**
   * Обёртывает ключевые слова в указанный тег
   */
  static wrapKeywords(html, keywords, tag) {
    let result = html;

    // Сортируем по длине (длинные первыми, чтобы не было конфликтов)
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (!keyword || keyword.length < 2) continue;

      // Экранируем специальные символы регулярных выражений
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Ищем слово, не находящееся внутри HTML тега
      const regex = new RegExp(`(?<!<[^>]*)\\b(${escaped})\\b(?![^<]*>)`, 'gi');

      // Заменяем только первое вхождение каждого ключевого слова
      let replaced = false;
      result = result.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          return `<${tag}>${match}</${tag}>`;
        }
        return match;
      });
    }

    return result;
  }

  /**
   * Экранирование HTML символов
   */
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Генерирует полный HTML документ
   */
  static generateFullHtml(content, meta = {}) {
    const {
      title = '',
      description = '',
      keywords = '',
      lang = 'ru',
      charset = 'UTF-8'
    } = meta;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="${charset}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${title ? `<title>${this.escapeHtml(title)}</title>` : ''}
  ${description ? `<meta name="description" content="${this.escapeHtml(description)}">` : ''}
  ${keywords ? `<meta name="keywords" content="${this.escapeHtml(keywords)}">` : ''}
</head>
<body>
${content}
</body>
</html>`;
  }

  /**
   * Конвертирует Markdown в чистый текст (для подсчёта символов и т.д.)
   */
  static markdownToPlainText(markdown) {
    if (!markdown) return '';

    let text = markdown;

    // Удаляем заголовки
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Удаляем жирный/курсив
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');

    // Удаляем ссылки, оставляя текст
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Удаляем изображения
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // Удаляем блоки кода
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');

    // Удаляем горизонтальные линии
    text = text.replace(/^[-*]{3,}$/gm, '');

    // Удаляем маркеры списков
    text = text.replace(/^[-*+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // Удаляем таблицы (упрощённо)
    text = text.replace(/^\|.*\|$/gm, '');

    // Очистка лишних пробелов
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }
}

export const htmlExportService = new HtmlExportService();
