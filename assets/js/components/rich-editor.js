/**
 * Rich Text Editor Component
 * Wrapper around Quill.js for rich text editing
 *
 * Usage:
 * const editor = new RichEditor('editor-container', {
 *   placeholder: 'Enter text...',
 *   theme: 'snow',
 *   onChange: (content) => console.log(content)
 * });
 */

/* global Quill */

class RichEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      placeholder: options.placeholder || 'Write something...',
      theme: options.theme || 'snow', // 'snow' or 'bubble'
      readOnly: options.readOnly || false,
      modules: options.modules || this.getDefaultModules(),
      onChange: options.onChange || null,
      onSelectionChange: options.onSelectionChange || null
    };

    this.editor = null;
    this.quill = null;
    this.init();
  }

  async init() {
    // Load Quill if not already loaded
    if (typeof Quill === 'undefined') {
      await this.loadQuill();
    }

    this.createEditor();
  }

  async loadQuill() {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (window.__quillLoading) {
        const checkInterval = setInterval(() => {
          if (typeof Quill !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      window.__quillLoading = true;

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.snow.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.js';
      script.onload = () => {
        window.__quillLoading = false;
        resolve();
      };
      script.onerror = () => {
        window.__quillLoading = false;
        reject(new Error('Failed to load Quill'));
      };
      document.head.appendChild(script);
    });
  }

  getDefaultModules() {
    return {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean']
      ]
    };
  }

  createEditor() {
    this.quill = new Quill(this.container, {
      theme: this.options.theme,
      placeholder: this.options.placeholder,
      readOnly: this.options.readOnly,
      modules: this.options.modules
    });

    // Set up event handlers
    if (this.options.onChange) {
      this.quill.on('text-change', () => {
        const content = this.getContent();
        this.options.onChange(content);
      });
    }

    if (this.options.onSelectionChange) {
      this.quill.on('selection-change', (range, oldRange, source) => {
        this.options.onSelectionChange(range, oldRange, source);
      });
    }
  }

  getContent(format = 'html') {
    if (!this.quill) {return '';}

    switch (format) {
    case 'html':
      return this.quill.root.innerHTML;
    case 'text':
      return this.quill.getText();
    case 'delta':
      return this.quill.getContents();
    default:
      return this.quill.root.innerHTML;
    }
  }

  setContent(content, format = 'html') {
    if (!this.quill) {return;}

    switch (format) {
    case 'html':
      this.quill.root.innerHTML = content;
      break;
    case 'text':
      this.quill.setText(content);
      break;
    case 'delta':
      this.quill.setContents(content);
      break;
    default:
      this.quill.root.innerHTML = content;
    }
  }

  clear() {
    if (this.quill) {
      this.quill.setText('');
    }
  }

  enable() {
    if (this.quill) {
      this.quill.enable();
    }
  }

  disable() {
    if (this.quill) {
      this.quill.disable();
    }
  }

  focus() {
    if (this.quill) {
      this.quill.focus();
    }
  }

  blur() {
    if (this.quill) {
      this.quill.blur();
    }
  }

  getLength() {
    return this.quill ? this.quill.getLength() : 0;
  }

  insertText(index, text, formats = {}) {
    if (this.quill) {
      this.quill.insertText(index, text, formats);
    }
  }

  deleteText(index, length) {
    if (this.quill) {
      this.quill.deleteText(index, length);
    }
  }

  format(name, value) {
    if (this.quill) {
      this.quill.format(name, value);
    }
  }

  getSelection() {
    return this.quill ? this.quill.getSelection() : null;
  }

  setSelection(index, length, source = 'api') {
    if (this.quill) {
      this.quill.setSelection(index, length, source);
    }
  }

  destroy() {
    if (this.quill) {
      // Quill doesn't have a destroy method, so we clear the container
      this.container.innerHTML = '';
      this.quill = null;
    }
  }
}

// Utility function to add custom styles for dark theme
RichEditor.addDarkTheme = function() {
  if (document.getElementById('quill-dark-theme')) {return;}

  const style = document.createElement('style');
  style.id = 'quill-dark-theme';
  style.textContent = `
    .ql-snow .ql-stroke {
      stroke: #ccc;
    }

    .ql-snow .ql-fill {
      fill: #ccc;
    }

    .ql-snow .ql-picker-label {
      color: #ccc;
    }

    .ql-snow .ql-picker-options {
      background-color: #1f2937;
      border-color: #374151;
    }

    .ql-snow .ql-picker-item:hover {
      background-color: #374151;
      color: #fff;
    }

    .ql-toolbar.ql-snow {
      background-color: #1f2937;
      border-color: #374151;
    }

    .ql-container.ql-snow {
      background-color: #111827;
      border-color: #374151;
      color: #f3f4f6;
    }

    .ql-editor {
      color: #f3f4f6;
    }

    .ql-editor.ql-blank::before {
      color: #9ca3af;
    }

    .ql-snow .ql-tooltip {
      background-color: #1f2937;
      border-color: #374151;
      color: #f3f4f6;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .ql-snow .ql-tooltip input[type=text] {
      background-color: #111827;
      border-color: #374151;
      color: #f3f4f6;
    }

    .ql-snow .ql-tooltip a.ql-action::after,
    .ql-snow .ql-tooltip a.ql-remove::before {
      color: #60a5fa;
    }

    .ql-snow.ql-toolbar button:hover,
    .ql-snow .ql-toolbar button:hover,
    .ql-snow.ql-toolbar button:focus,
    .ql-snow .ql-toolbar button:focus,
    .ql-snow.ql-toolbar button.ql-active,
    .ql-snow .ql-toolbar button.ql-active {
      color: #60a5fa;
    }

    .ql-snow.ql-toolbar button:hover .ql-stroke,
    .ql-snow .ql-toolbar button:hover .ql-stroke,
    .ql-snow.ql-toolbar button:focus .ql-stroke,
    .ql-snow .ql-toolbar button:focus .ql-stroke,
    .ql-snow.ql-toolbar button.ql-active .ql-stroke,
    .ql-snow .ql-toolbar button.ql-active .ql-stroke {
      stroke: #60a5fa;
    }

    .ql-snow.ql-toolbar button:hover .ql-fill,
    .ql-snow .ql-toolbar button:hover .ql-fill,
    .ql-snow.ql-toolbar button:focus .ql-fill,
    .ql-snow .ql-toolbar button:focus .ql-fill,
    .ql-snow.ql-toolbar button.ql-active .ql-fill,
    .ql-snow .ql-toolbar button.ql-active .ql-fill {
      fill: #60a5fa;
    }
  `;
  document.head.appendChild(style);
};

// Auto-add dark theme styles when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RichEditor.addDarkTheme());
  } else {
    RichEditor.addDarkTheme();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RichEditor;
}
