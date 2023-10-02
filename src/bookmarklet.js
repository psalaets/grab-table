// @ts-check

const markedTableSelector = '[data-can-grab]';

/**
 * @typedef {(table: HTMLTableElement) => string} Transform
 *
 * @typedef {Object} Format
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} ext
 * @property {Transform} fn
 */

/**
 * @type {Array<Format>}
 */
const formats = [
  {
    id: 'csv',
    name: 'csv',
    type: 'text/csv',
    ext: '.csv',
    fn: toCsv
  },
  {
    id: 'html',
    name: 'html',
    type: 'text/html',
    ext: '.html',
    fn: toHtml
  },
  {
    id: 'json',
    name: 'json',
    type: 'application/json',
    ext: '.json',
    fn: toJson
  },
];

const alreadyActivated = document.querySelectorAll(markedTableSelector).length > 0;
if (!alreadyActivated) {
  const anyTables = document.getElementsByTagName('table').length > 0;
  if (!anyTables) {
    alert('No tables found on the page');
  } else {
    const off = on(document);

    /**
     * @param {KeyboardEvent} event
     */
    const escapeListener = event => {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', escapeListener);
        off();
      }
    };

    document.addEventListener('keydown', escapeListener);
  }
}

/**
 * @param {Document} document
 */
function on(document) {
  const removeGlobalStyles = applyGlobalStyles(document);

  // mark tables for user to notice them
  const tables = Array.from(document.querySelectorAll('table'));
  tables.forEach(table => table.dataset.canGrab = '');

  // listen for clicks on tables
  const removeClickListeners = tables.map(table => {
    const clickListener = () => {
      const show = createPopup(
        table,
        format => download(format.fn(table), `${location.hostname.replace(/\./g, '-')}-table`, format),
        format => copy(format.fn(table)),
      );
      show();
    };

    table.addEventListener('click', clickListener);
    return () => table.removeEventListener('click', clickListener);
  });

  return () => {
    removeGlobalStyles();

    // unmark tables
    tables.forEach(table => delete table.dataset.canGrab);

    // stop listening
    removeClickListeners.forEach(remove => remove());
  };
}

/**
 * Download data
 *
 * @param {string} data
 * @param {string} basename - Filename without extension
 * @param {Format} format
 */
function download(data, basename, format) {
  const filename = basename + format.ext;
  const file = new File([data], filename, {
    type: format.type
  });
  const url = URL.createObjectURL(file);

  const link = document.createElement('a');
  link.download = filename;
  link.href = url;

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 250);
}

/**
 * Copy data to clipboard
 *
 * @param {string} data
 */
function copy(data) {
  navigator.clipboard.writeText(data)
    .then(
      () => alert('Copied!'),
      () => alert(`Failed: Cannot copy to clipboard`));
}

/**
 * @param {HTMLTableElement} table
 * @param {(format: Format) => void} onDownload
 * @param {(format: Format) => void} onCopy
 */
function createPopup(table, onDownload, onCopy) {
  const dialog = document.createElement('dialog');
  dialog.style.cssText = `
color: #111;
background-color: #fff;
border: 2px solid #111;
border-radius: 0.5rem;
box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
padding: 1.5rem;
width: 20rem;
font-family: Consolas, monaco, monospace;
font-size: 1rem;
line-height: 1.3;
text-align: start;`;

  const downloadAction = 'download';
  const copyAction = 'copy';
  const buttonStyles = 'all: revert; font-family: inherit;';
  const selectStyles = buttonStyles;

  const form = document.createElement('form');
  form.style.cssText = `width: 100%; max-width: 100%; display: flex; flex-direction: column; gap: .8rem`;
  form.method = 'dialog';
  form.innerHTML = `
<div>Grabbing ${table.rows.length} ${table.rows.length === 1 ? 'row' : 'rows'}.</div>
<div>
  <label for="grab-table-format" style="display: inline;">Format</label>
  <select id="grab-table-format" name="format" style="${selectStyles}">
    ${formats.map(format => `<option value="${format.id}" ${lastFormat() === format.id ? 'selected' : ''}>${format.name}</option>`)}
  </select>
</div>
<div style="display: flex; gap: 1rem;">
  <button style="${buttonStyles}" value="${copyAction}">Copy</button>
  <button style="${buttonStyles}" value="${downloadAction}">Download</button>
  <div style="flex: 1 0 auto;"></div>
  <button style="${buttonStyles}">Cancel</button>
</div>`;

  dialog.addEventListener('close', () => {
    const dropdown = form.elements.namedItem('format');
    const format = dropdown instanceof HTMLSelectElement && formats.find(format => format.id === dropdown.value);
    const action = dialog.returnValue;

    if (format) {
      lastFormat(format.id);

      const handler = {
        [downloadAction]: onDownload,
        [copyAction]: onCopy
      }[action];

      handler(format);
    }

    // destroy popup
    setTimeout(() => dialog.remove(), 0);
  });

  dialog.appendChild(form);
  document.body.appendChild(dialog);

  return () => dialog.showModal();
}

/**
 * @param {Document} document
 */
function applyGlobalStyles(document) {
  const style = document.createElement('style');
  style.textContent = `
::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}
${markedTableSelector} {
  outline: 5px dashed orange !important;
}
${markedTableSelector}:hover {
  cursor: grab !important;
}`;

  document.body.appendChild(style);
  return () => style.remove();
}

/**
 * @typedef {Object} Cell
 * @property {'th' | 'td'} type
 * @property {string} data
 * @property {number} colSpan
 * @property {number} rowSpan
 *
 * @typedef {Array<Cell>} Row
 *
 * @typedef {Object} JsonOutput
 * @property {string | null} caption
 * @property {Array<Row>} rows
 */

/**
 * @type {Transform}
 */
function toJson(table) {
  /**
   * @type {JsonOutput}
   */
  const obj = {
    caption: table.caption && table.caption.textContent || null,
    rows: Array.from(table.rows, row => {
      return Array.from(row.cells, cell => {
        return {
          type: cell.tagName === 'TD' ? 'td' : 'th',
          data: cell.innerText,
          colSpan: cell.colSpan,
          rowSpan: cell.rowSpan,
        };
      });
    }),
  };

  return JSON.stringify(obj, null, 2);
}

/**
 * @type {Transform}
 */
function toHtml(table) {
  return table.outerHTML;
}

/**
 * @type {Transform}
 */
function toCsv(table) {
  const valueDelimiter = ',';
  const rowDelimiter = '\n';

  return Array.from(table.rows, row => {
    return Array.from(row.cells, cell => escapeCsvValue(cell.innerText))
      .join(valueDelimiter);
  })
    .join(rowDelimiter);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeCsvValue(value) {
  const hasDoubleQuote = value.includes('"');
  if (hasDoubleQuote) {
    value = value.replace(/"/g, '""');
  }

  const needsQuoteWrap = hasDoubleQuote || value.includes(',') || value.includes('\n');
  if (needsQuoteWrap) {
    value = `"${value}"`;
  }

  return value;
}

function lastFormat(value) {
  const key = 'grab-table-format';
  const db = localStorage;

  if (arguments.length === 1) {
    db.setItem(key, value);
  } else {
    return db.getItem(key);
  }
}
