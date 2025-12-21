/**
 * UI Polish Utilities
 * Provides optimistic UI updates, confirmation dialogs, and improved UX
 */

(function () {
  'use strict';

  /**
   * Confirmation Dialog
   * Shows user-friendly confirmation for destructive actions
   */
  function showConfirmationDialog(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning', // 'warning', 'danger', 'info'
      onConfirm = () => {},
      onCancel = () => {}
    } = options;

    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay confirmation-dialog-overlay';
      modal.setAttribute('role', 'alertdialog');
      modal.setAttribute('aria-labelledby', 'confirmation-title');
      modal.setAttribute('aria-describedby', 'confirmation-message');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
        animation: fadeIn 0.2s ease-out;
      `;

      const typeColors = {
        warning: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', icon: '⚠️' },
        danger: { bg: 'rgba(220, 38, 38, 0.1)', border: '#dc2626', icon: '🗑️' },
        info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: 'ℹ️' }
      };

      const colors = typeColors[type] || typeColors.warning;

      modal.innerHTML = `
        <div class="confirmation-dialog theme-transition" style="
          background-color: #1f2937;
          border: 2px solid ${colors.border};
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          padding: 1.5rem;
          max-width: 400px;
          width: 100%;
          animation: slideIn 0.3s ease-out;
        ">
          <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="
              font-size: 2rem;
              line-height: 1;
              background-color: ${colors.bg};
              border: 2px solid ${colors.border};
              border-radius: 50%;
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">${colors.icon}</div>
            <div style="flex: 1;">
              <h3 id="confirmation-title" style="
                font-size: 1.25rem;
                font-weight: 700;
                color: #f3f4f6;
                margin-bottom: 0.5rem;
              ">${title}</h3>
              <p id="confirmation-message" style="
                color: #d1d5db;
                line-height: 1.5;
              ">${message}</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button id="confirm-cancel" class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors" style="min-width: 100px;">
              ${cancelText}
            </button>
            <button id="confirm-action" class="px-4 py-2 rounded-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'ui-btn ui-btn-primary'} text-white font-medium transition-colors" style="min-width: 100px;">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      // Add animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(modal);

      const cancelBtn = document.getElementById('confirm-cancel');
      const confirmBtn = document.getElementById('confirm-action');

      const cleanup = () => {
        modal.style.animation = 'fadeIn 0.2s ease-out reverse';
        setTimeout(() => modal.remove(), 200);
        style.remove();
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        onCancel();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        onConfirm();
        resolve(true);
      });

      // Close on overlay click
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          cleanup();
          onCancel();
          resolve(false);
        }
      });

      // Close on Escape
      const escHandler = e => {
        if (e.key === 'Escape') {
          cleanup();
          onCancel();
          resolve(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Focus first button
      cancelBtn.focus();

      // Trap focus
      if (window.A11y && window.A11y.trapFocus) {
        window.A11y.trapFocus(modal.querySelector('.confirmation-dialog'));
      }
    });
  }

  /**
   * Optimistic UI Update
   * Updates UI immediately, then syncs with server
   */
  function optimisticUpdate(options = {}) {
    const {
      action = () => Promise.resolve(),
      onSuccess = () => {},
      onError = () => {},
      rollback = () => {},
      successMessage = 'Action completed successfully',
      errorMessage = 'Action failed'
    } = options;

    // Execute action immediately (optimistic)
    onSuccess();

    // Sync with server
    return action()
      .then(result => {
        // Server confirmed, show success
        if (window.A11y) {
          window.A11y.announce(successMessage);
        }
        return result;
      })
      .catch(error => {
        // Server failed, rollback
        rollback();
        onError(error);

        if (window.A11y) {
          window.A11y.announce(errorMessage, 'assertive');
        }

        // Show error message
        showToast({
          message: errorMessage,
          type: 'error',
          duration: 5000
        });

        throw error;
      });
  }

  /**
   * Toast Notification
   * Shows temporary notification message
   */
  function showToast(options = {}) {
    const {
      message = 'Notification',
      type = 'info', // 'success', 'error', 'warning', 'info'
      duration = 3000,
      position = 'top-right' // 'top-right', 'top-center', 'bottom-right', 'bottom-center'
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const typeConfig = {
      success: { icon: '✓', bg: 'rgba(34, 197, 94, 0.9)', color: '#fff' },
      error: { icon: '✕', bg: 'rgba(220, 38, 38, 0.9)', color: '#fff' },
      warning: { icon: '⚠', bg: 'rgba(234, 179, 8, 0.9)', color: '#000' },
      info: { icon: 'ℹ', bg: 'rgba(59, 130, 246, 0.9)', color: '#fff' }
    };

    const config = typeConfig[type] || typeConfig.info;

    const positions = {
      'top-right': 'top: 20px; right: 20px;',
      'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
    };

    toast.style.cssText = `
      position: fixed;
      ${positions[position]}
      background-color: ${config.bg};
      color: ${config.color};
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 10001;
      animation: slideInToast 0.3s ease-out;
      max-width: 400px;
      font-weight: 500;
    `;

    toast.innerHTML = `
      <span style="font-size: 1.25rem; line-height: 1;">${config.icon}</span>
      <span>${message}</span>
      <button aria-label="Close notification" style="
        margin-left: 0.5rem;
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1;
        opacity: 0.7;
        transition: opacity 0.2s;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInToast {
        from { 
          opacity: 0;
          transform: translateX(100px) ${position.includes('center') ? 'translateX(-50%)' : ''};
        }
        to { 
          opacity: 1;
          transform: translateX(0) ${position.includes('center') ? 'translateX(-50%)' : ''};
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    const closeBtn = toast.querySelector('button');
    const remove = () => {
      toast.style.animation = 'slideInToast 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    };

    closeBtn.addEventListener('click', remove);

    if (duration > 0) {
      setTimeout(remove, duration);
    }

    return { remove };
  }

  /**
   * Loading Overlay
   * Shows loading state for async operations
   */
  function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', message);
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    `;

    overlay.innerHTML = `
      <div class="spinner" style="
        width: 48px;
        height: 48px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      " aria-hidden="true"></div>
      <p style="
        color: #fff;
        margin-top: 1rem;
        font-size: 1rem;
        font-weight: 500;
      ">${message}</p>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    return {
      updateMessage: newMessage => {
        const p = overlay.querySelector('p');
        if (p) {
          p.textContent = newMessage;
        }
      },
      remove: () => {
        overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
        setTimeout(() => {
          overlay.remove();
          style.remove();
        }, 200);
      }
    };
  }

  /**
   * Progress Bar
   * Shows progress for long-running operations
   */
  function createProgressBar(options = {}) {
    const { label = 'Progress', total = 100, showPercentage = true } = options;

    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', total);
    container.setAttribute('aria-valuenow', '0');
    container.setAttribute('aria-label', label);

    container.style.cssText = `
      width: 100%;
      background-color: #374151;
      border-radius: 9999px;
      overflow: hidden;
      height: 8px;
      position: relative;
    `;

    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    fill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      transition: width 0.3s ease-in-out;
      border-radius: 9999px;
    `;

    container.appendChild(fill);

    if (showPercentage) {
      const percentText = document.createElement('div');
      percentText.className = 'progress-percentage';
      percentText.textContent = '0%';
      percentText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75rem;
        font-weight: 600;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      `;
      container.appendChild(percentText);
    }

    return {
      element: container,
      setProgress: value => {
        const percentage = Math.min(Math.max((value / total) * 100, 0), 100);
        fill.style.width = `${percentage}%`;
        container.setAttribute('aria-valuenow', value);

        if (showPercentage) {
          const percentText = container.querySelector('.progress-percentage');
          if (percentText) {
            percentText.textContent = `${Math.round(percentage)}%`;
          }
        }
      },
      complete: () => {
        fill.style.width = '100%';
        container.setAttribute('aria-valuenow', total);

        if (showPercentage) {
          const percentText = container.querySelector('.progress-percentage');
          if (percentText) {
            percentText.textContent = '100%';
          }
        }
      }
    };
  }

  // Public API
  window.UIPolish = {
    showConfirmationDialog,
    optimisticUpdate,
    showToast,
    showLoadingOverlay,
    createProgressBar
  };

  // Auto-attach to delete buttons
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-confirm]').forEach(element => {
      element.addEventListener('click', async e => {
        e.preventDefault();
        const message = element.getAttribute('data-confirm');
        const confirmed = await showConfirmationDialog({
          title: 'Confirm Action',
          message: message || 'Are you sure?',
          type: element.classList.contains('btn-danger') ? 'danger' : 'warning'
        });

        if (confirmed) {
          // Proceed with original action
          if (element.tagName === 'FORM') {
            element.submit();
          } else if (element.href) {
            window.location.href = element.href;
          }
        }
      });
    });
  });
})();
