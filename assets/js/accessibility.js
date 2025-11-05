/**
 * Accessibility Utilities
 * Provides helper functions for improving accessibility across the application
 */

(function() {
  'use strict';

  /**
   * Enhanced Focus Management
   * Ensures visible focus indicators for keyboard navigation
   */
  function enhanceFocusManagement() {
    // Track if user is using keyboard for navigation
    let usingKeyboard = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        usingKeyboard = true;
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      usingKeyboard = false;
      document.body.classList.remove('keyboard-navigation');
    });

    // Enhance focus visibility
    document.addEventListener('focusin', (e) => {
      if (usingKeyboard) {
        e.target.classList.add('keyboard-focused');
      }
    });

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('keyboard-focused');
    });
  }

  /**
   * Announce to Screen Readers
   * Creates a live region to announce dynamic content changes
   */
  function createAnnouncementRegion() {
    const existing = document.getElementById('a11y-announcer');
    if (existing) {return existing;}

    const announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';

    document.body.appendChild(announcer);
    return announcer;
  }

  function announce(message, priority = 'polite') {
    const announcer = createAnnouncementRegion();
    announcer.setAttribute('aria-live', priority);

    // Clear and set new message
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }

  /**
   * Trap Focus Within Element
   * Useful for modals and dialogs
   */
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e) {
      if (e.key !== 'Tab') {return;}

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }

    element.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Manage Focus on Route Change
   * Returns focus to main content after navigation
   */
  function handleRouteChange() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.removeAttribute('tabindex');
    }
  }

  /**
   * Add Skip Links Dynamically
   * Adds skip-to-content link if not present
   */
  function _addSkipLink() {
    // Check if skip link already exists
    if (document.querySelector('.skip-link')) {return;}

    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('aria-label', 'Skip to main content');

    // Insert at the beginning of body
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Ensure main content has the ID
    const mainContent = document.querySelector('main');
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
  }

  /**
   * Improve Form Accessibility
   * Enhances form fields with proper labels and ARIA attributes
   */
  function enhanceFormAccessibility() {
    // Find all inputs without explicit labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
    inputs.forEach((input, index) => {
      if (!input.id) {
        input.id = `input-${index}-${Date.now()}`;
      }

      // Check for placeholder as backup label
      if (input.placeholder && !input.getAttribute('aria-label')) {
        input.setAttribute('aria-label', input.placeholder);
      }
    });

    // Enhance error messages
    const errorMessages = document.querySelectorAll('.error-message, [role="alert"]');
    errorMessages.forEach((error) => {
      if (!error.getAttribute('role')) {
        error.setAttribute('role', 'alert');
      }
      if (!error.getAttribute('aria-live')) {
        error.setAttribute('aria-live', 'assertive');
      }
    });
  }

  /**
   * Add Heading Navigation
   * Creates a keyboard shortcut to jump between headings
   */
  function enableHeadingNavigation() {
    let currentHeadingIndex = -1;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    headings.forEach(h => {
      if (!h.hasAttribute('tabindex')) {
        h.setAttribute('tabindex', '-1');
      }
    });

    document.addEventListener('keydown', (e) => {
      // Alt + H: Next heading
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        currentHeadingIndex = (currentHeadingIndex + 1) % headings.length;
        headings[currentHeadingIndex].focus();
        announce(`Heading level ${headings[currentHeadingIndex].tagName.charAt(1)}: ${headings[currentHeadingIndex].textContent}`);
      }

      // Alt + Shift + H: Previous heading
      if (e.altKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        currentHeadingIndex = currentHeadingIndex <= 0 ? headings.length - 1 : currentHeadingIndex - 1;
        headings[currentHeadingIndex].focus();
        announce(`Heading level ${headings[currentHeadingIndex].tagName.charAt(1)}: ${headings[currentHeadingIndex].textContent}`);
      }
    });
  }

  /**
   * Enhance Button Accessibility
   * Ensures all buttons have proper labels
   */
  function enhanceButtonAccessibility() {
    const buttons = document.querySelectorAll('button:not([aria-label])');
    buttons.forEach(button => {
      // If button has no text content and no aria-label, try to infer from icon or context
      if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
        const icon = button.querySelector('svg, img');
        if (icon) {
          const title = icon.getAttribute('title') || icon.getAttribute('alt');
          if (title) {
            button.setAttribute('aria-label', title);
          }
        }
      }
    });
  }

  /**
   * Add Landmark Roles
   * Ensures proper landmark roles for better navigation
   */
  function ensureLandmarkRoles() {
    // Add role to header if needed
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }

    // Add role to nav if needed
    const nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
      nav.setAttribute('role', 'navigation');
    }

    // Add role to main if needed
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    // Add role to aside if needed
    const aside = document.querySelector('aside');
    if (aside && !aside.getAttribute('role')) {
      aside.setAttribute('role', 'complementary');
    }

    // Add role to footer if needed
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  /**
   * Initialize All Accessibility Features
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    enhanceFocusManagement();
    createAnnouncementRegion();
    // Skip-link removed by request: do not auto-insert the skip-to-content link.
    // _addSkipLink();
    enhanceFormAccessibility();
    enhanceButtonAccessibility();
    ensureLandmarkRoles();
    enableHeadingNavigation();
  }

  // Public API
  window.A11y = {
    announce,
    trapFocus,
    handleRouteChange,
    init
  };

  // Auto-initialize
  init();
})();
