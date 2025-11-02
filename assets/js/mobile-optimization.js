/**
 * Mobile Optimization Utilities
 * Enhances mobile user experience with touch gestures and responsive features
 */

(function() {
  'use strict';

  /**
   * Pull-to-Refresh Implementation
   */
  class PullToRefresh {
    constructor(options = {}) {
      this.options = {
        threshold: 80,
        maxPullDistance: 100,
        refreshCallback: options.refreshCallback || (() => window.location.reload()),
        ...options
      };

      this.startY = 0;
      this.currentY = 0;
      this.isDragging = false;
      this.refreshIndicator = null;

      this.init();
    }

    init() {
      // Only enable on mobile devices
      if (!this.isMobileDevice()) {return;}

      this.createRefreshIndicator();
      this.attachListeners();
    }

    isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    }

    createRefreshIndicator() {
      this.refreshIndicator = document.createElement('div');
      this.refreshIndicator.id = 'pull-to-refresh-indicator';
      this.refreshIndicator.className = 'pull-to-refresh-indicator';
      this.refreshIndicator.style.cssText = `
        position: fixed;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
        background-color: rgba(59, 130, 246, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: top 0.3s ease-out;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;

      this.refreshIndicator.innerHTML = `
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" style="display: none;">
          <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="3" fill="none" 
            stroke-dasharray="60" stroke-dashoffset="60" 
            style="animation: dash 1.5s ease-in-out infinite;"/>
        </svg>
        <svg class="arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      `;

      document.body.appendChild(this.refreshIndicator);

      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes dash {
          0% { stroke-dashoffset: 60; }
          50% { stroke-dashoffset: 0; transform: rotate(180deg); }
          100% { stroke-dashoffset: -60; transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    attachListeners() {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleTouchStart(e) {
      // Only trigger if at the top of the page
      if (window.scrollY === 0) {
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
      }
    }

    handleTouchMove(e) {
      if (!this.isDragging) {return;}

      this.currentY = e.touches[0].clientY;
      const pullDistance = this.currentY - this.startY;

      if (pullDistance > 0 && pullDistance <= this.options.maxPullDistance) {
        e.preventDefault();

        const top = Math.min(pullDistance - 60, 40);
        this.refreshIndicator.style.top = `${top}px`;

        // Rotate arrow based on pull distance
        const rotation = (pullDistance / this.options.threshold) * 180;
        const arrow = this.refreshIndicator.querySelector('.arrow');
        if (arrow) {
          arrow.style.transform = `rotate(${Math.min(rotation, 180)}deg)`;
        }
      }
    }

    handleTouchEnd() {
      if (!this.isDragging) {return;}

      const pullDistance = this.currentY - this.startY;

      if (pullDistance >= this.options.threshold) {
        this.triggerRefresh();
      } else {
        this.resetIndicator();
      }

      this.isDragging = false;
    }

    triggerRefresh() {
      const arrow = this.refreshIndicator.querySelector('.arrow');
      const spinner = this.refreshIndicator.querySelector('.spinner');

      if (arrow) {arrow.style.display = 'none';}
      if (spinner) {spinner.style.display = 'block';}

      this.refreshIndicator.style.top = '20px';

      // Execute refresh callback
      Promise.resolve(this.options.refreshCallback()).finally(() => {
        setTimeout(() => {
          this.resetIndicator();
          if (window.A11y) {
            window.A11y.announce('Page refreshed');
          }
        }, 500);
      });
    }

    resetIndicator() {
      this.refreshIndicator.style.top = '-60px';

      setTimeout(() => {
        const arrow = this.refreshIndicator.querySelector('.arrow');
        const spinner = this.refreshIndicator.querySelector('.spinner');

        if (arrow) {
          arrow.style.display = 'block';
          arrow.style.transform = 'rotate(0deg)';
        }
        if (spinner) {spinner.style.display = 'none';}
      }, 300);
    }
  }

  /**
   * Touch Target Size Validator
   * Ensures all interactive elements meet minimum touch target size
   */
  function validateTouchTargets() {
    const MIN_SIZE = 44; // pixels
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [onclick]'
    );

    const violations = [];

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      const padding = {
        top: parseFloat(computedStyle.paddingTop),
        bottom: parseFloat(computedStyle.paddingBottom),
        left: parseFloat(computedStyle.paddingLeft),
        right: parseFloat(computedStyle.paddingRight)
      };

      const totalWidth = rect.width;
      const totalHeight = rect.height;

      if (totalWidth < MIN_SIZE || totalHeight < MIN_SIZE) {
        violations.push({
          element,
          width: totalWidth,
          height: totalHeight,
          text: element.textContent?.trim().substring(0, 50)
        });
      }
    });

    if (violations.length > 0) {
      console.warn(`Found ${violations.length} touch target violations:`, violations);
    }

    return violations;
  }

  /**
   * Mobile Viewport Height Fix
   * Fixes mobile browser viewport height issues
   */
  function fixMobileViewportHeight() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  }

  /**
   * Detect Touch Device
   */
  function isTouchDevice() {
    return ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0);
  }

  /**
   * Add touch-device class to body
   */
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
  }

  /**
   * Prevent zoom on double-tap for specific elements
   */
  function preventDoubleTabZoom() {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  /**
   * Mobile-friendly select enhancement
   */
  function enhanceMobileSelects() {
    if (!isTouchDevice()) {return;}

    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      // Make selects larger on mobile
      select.style.minHeight = '48px';
      select.style.fontSize = '16px'; // Prevents zoom on iOS
    });
  }

  /**
   * Mobile-friendly input enhancement
   */
  function enhanceMobileInputs() {
    if (!isTouchDevice()) {return;}

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      // Prevent zoom on focus (iOS)
      if (input.style.fontSize && parseFloat(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }

      // Add better touch targets
      if (!input.style.minHeight) {
        input.style.minHeight = '44px';
      }
    });
  }

  /**
   * Safe Area Insets Support (for notched devices)
   */
  function addSafeAreaSupport() {
    const style = document.createElement('style');
    style.textContent = `
      @supports (padding: max(0px)) {
        body {
          padding-left: max(0px, env(safe-area-inset-left));
          padding-right: max(0px, env(safe-area-inset-right));
        }
        
        .fixed-top {
          padding-top: max(0px, env(safe-area-inset-top));
        }
        
        .fixed-bottom {
          padding-bottom: max(0px, env(safe-area-inset-bottom));
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initialize all mobile optimizations
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    fixMobileViewportHeight();
    addSafeAreaSupport();

    if (isTouchDevice()) {
      preventDoubleTabZoom();
      enhanceMobileSelects();
      enhanceMobileInputs();

      // Initialize pull-to-refresh on data pages
      const dataPages = ['index.html', 'users.html', 'orders-review.html', 'analytics.html'];
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';

      if (dataPages.includes(currentPage)) {
        new PullToRefresh({
          refreshCallback: () => {
            // Reload page data instead of full reload
            if (window.location.reload) {
              window.location.reload();
            }
          }
        });
      }

      // Validate touch targets in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(validateTouchTargets, 1000);
      }
    }
  }

  // Public API
  window.MobileOptimization = {
    PullToRefresh,
    validateTouchTargets,
    isTouchDevice,
    init
  };

  // Auto-initialize
  init();
})();
