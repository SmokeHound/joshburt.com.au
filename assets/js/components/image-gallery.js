/**
 * Image Gallery Component
 * Provides a responsive image gallery with lightbox functionality
 * 
 * Usage:
 * const gallery = new ImageGallery('gallery-container', {
 *   images: [{url: '...', alt: '...', caption: '...'}],
 *   columns: 3,
 *   gap: 16
 * });
 */

class ImageGallery {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.options = {
      images: options.images || [],
      columns: options.columns || 3,
      gap: options.gap || 16,
      aspectRatio: options.aspectRatio || null, // e.g., '16/9', '1/1'
      lightbox: options.lightbox !== false,
      lazy: options.lazy !== false,
      onClick: options.onClick || null,
      className: options.className || '',
    };

    this.state = {
      currentImageIndex: 0,
      lightboxOpen: false,
    };

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  setImages(images) {
    this.options.images = images;
    this.render();
    this.attachEventListeners();
  }

  getImages() {
    return this.options.images;
  }

  addImage(image) {
    this.options.images.push(image);
    this.render();
    this.attachEventListeners();
  }

  removeImage(index) {
    this.options.images.splice(index, 1);
    this.render();
    this.attachEventListeners();
  }

  openLightbox(index) {
    if (!this.options.lightbox) return;
    
    this.state.currentImageIndex = index;
    this.state.lightboxOpen = true;
    this.renderLightbox();
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.state.lightboxOpen = false;
    const lightbox = document.getElementById('image-gallery-lightbox');
    if (lightbox) {
      lightbox.remove();
    }
    document.body.style.overflow = '';
  }

  navigateLightbox(direction) {
    const newIndex = this.state.currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < this.options.images.length) {
      this.state.currentImageIndex = newIndex;
      this.renderLightbox();
    }
  }

  render() {
    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };

    const gridClass = gridCols[this.options.columns] || gridCols[3];
    const gapClass = `gap-${Math.floor(this.options.gap / 4)}`;

    this.container.innerHTML = `
      <div class="image-gallery ${this.options.className}">
        <div class="grid ${gridClass} ${gapClass}">
          ${this.options.images.map((image, index) => this.renderImage(image, index)).join('')}
        </div>
      </div>
    `;
  }

  renderImage(image, index) {
    const aspectRatioStyle = this.options.aspectRatio 
      ? `aspect-ratio: ${this.options.aspectRatio};` 
      : '';

    return `
      <div class="gallery-item group relative overflow-hidden rounded-lg cursor-pointer transition-transform hover:scale-105"
           data-index="${index}">
        <div class="relative w-full h-full" style="${aspectRatioStyle}">
          <img
            src="${image.url}"
            alt="${image.alt || ''}"
            class="w-full h-full object-cover"
            ${this.options.lazy ? 'loading="lazy"' : ''}
          />
          ${image.caption ? `
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <p class="text-white text-sm">${image.caption}</p>
            </div>
          ` : ''}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <svg class="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  renderLightbox() {
    const existing = document.getElementById('image-gallery-lightbox');
    if (existing) existing.remove();

    const image = this.options.images[this.state.currentImageIndex];
    if (!image) return;

    const lightbox = document.createElement('div');
    lightbox.id = 'image-gallery-lightbox';
    lightbox.className = 'fixed inset-0 z-50 bg-black/95 flex items-center justify-center';
    lightbox.innerHTML = `
      <button class="lightbox-close absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors z-50 w-12 h-12 flex items-center justify-center">
        ×
      </button>
      
      ${this.state.currentImageIndex > 0 ? `
        <button class="lightbox-prev absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-50 w-12 h-12 flex items-center justify-center">
          ‹
        </button>
      ` : ''}
      
      ${this.state.currentImageIndex < this.options.images.length - 1 ? `
        <button class="lightbox-next absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors z-50 w-12 h-12 flex items-center justify-center">
          ›
        </button>
      ` : ''}

      <div class="lightbox-content max-w-7xl max-h-screen p-4 flex flex-col items-center justify-center">
        <img
          src="${image.url}"
          alt="${image.alt || ''}"
          class="max-w-full max-h-[80vh] object-contain"
        />
        ${image.caption ? `
          <div class="mt-4 text-center">
            <p class="text-white text-lg">${image.caption}</p>
          </div>
        ` : ''}
        <div class="mt-4 text-gray-400 text-sm">
          ${this.state.currentImageIndex + 1} / ${this.options.images.length}
        </div>
      </div>
    `;

    document.body.appendChild(lightbox);

    // Attach lightbox event listeners
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    closeBtn.addEventListener('click', () => this.closeLightbox());
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        this.closeLightbox();
      }
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateLightbox(1));
    }

    // Keyboard navigation
    const handleKeyboard = (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
        document.removeEventListener('keydown', handleKeyboard);
      } else if (e.key === 'ArrowLeft') {
        this.navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        this.navigateLightbox(1);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
  }

  attachEventListeners() {
    const galleryItems = this.container.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        
        if (this.options.onClick) {
          this.options.onClick(this.options.images[index], index);
        }
        
        if (this.options.lightbox) {
          this.openLightbox(index);
        }
      });
    });
  }

  destroy() {
    this.closeLightbox();
    this.container.innerHTML = '';
  }
}

// Utility function to add default gallery styles
ImageGallery.addDefaultStyles = function() {
  if (document.getElementById('image-gallery-styles')) return;

  const style = document.createElement('style');
  style.id = 'image-gallery-styles';
  style.textContent = `
    .image-gallery {
      width: 100%;
    }

    .gallery-item {
      position: relative;
      overflow: hidden;
    }

    .gallery-item img {
      transition: transform 0.3s ease;
    }

    .gallery-item:hover img {
      transform: scale(1.05);
    }

    #image-gallery-lightbox {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .lightbox-content {
      animation: zoomIn 0.2s ease;
    }

    @keyframes zoomIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .lightbox-close,
    .lightbox-prev,
    .lightbox-next {
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      backdrop-filter: blur(10px);
    }

    .lightbox-close:hover,
    .lightbox-prev:hover,
    .lightbox-next:hover {
      background: rgba(0, 0, 0, 0.7);
    }
  `;
  document.head.appendChild(style);
};

// Auto-add default styles when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ImageGallery.addDefaultStyles());
  } else {
    ImageGallery.addDefaultStyles();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageGallery;
}
