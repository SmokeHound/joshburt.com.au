// Theme Cards Configuration and Rendering
// Simplified data-driven approach to reduce HTML duplication

const THEME_CARDS_CONFIG = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Classic dark theme for comfortable viewing',
    badge: 'Popular',
    badgeColor: 'blue',
    icon: 'moon',
    bg: 'bg-gray-900',
    textColor: 'text-white',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/20',
    colors: [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600'
    ]
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Bright and clean for daytime viewing',
    badge: 'Clean',
    badgeColor: 'yellow',
    icon: 'sun',
    bg: 'bg-white',
    textColor: 'text-gray-900',
    hoverBorder: 'hover:border-yellow-500',
    hoverShadow: 'hover:shadow-yellow-500/20',
    colors: [
      'from-blue-400 to-blue-500',
      'from-green-400 to-green-500',
      'from-purple-400 to-purple-500'
    ]
  },
  {
    id: 'system',
    name: 'System Auto',
    description: 'Automatically follows system preference',
    badge: 'Smart',
    badgeColor: 'indigo',
    icon: 'desktop',
    bg: 'bg-gradient-to-r from-gray-900 via-gray-600 to-gray-100',
    textColor: 'text-white drop-shadow-lg',
    hoverBorder: 'hover:border-indigo-500',
    hoverShadow: 'hover:shadow-indigo-500/20',
    colors: [
      'from-gray-900 to-gray-700',
      'from-gray-400 to-gray-200',
      'from-indigo-500 to-purple-500'
    ]
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant neon glow for bold aesthetics',
    badge: 'Vibrant',
    badgeColor: 'cyan',
    icon: 'lightning',
    bg: 'bg-black',
    textColor: 'text-cyan-400',
    hoverBorder: 'hover:border-cyan-400',
    hoverShadow: 'hover:shadow-cyan-400/30',
    colors: [
      'from-cyan-400 to-cyan-500 shadow-cyan-400/50',
      'from-pink-400 to-pink-500 shadow-pink-400/50',
      'from-purple-400 to-purple-500 shadow-purple-400/50'
    ]
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum readability and accessibility',
    badge: 'A11y',
    badgeColor: 'yellow',
    icon: 'eye',
    bg: 'bg-black',
    textColor: 'text-yellow-400',
    hoverBorder: 'hover:border-yellow-400',
    hoverShadow: 'hover:shadow-yellow-400/30',
    colors: [
      'from-cyan-400 to-cyan-500 shadow-cyan-400/50 border-2 border-white',
      'from-lime-400 to-lime-500 shadow-lime-400/50 border-2 border-white',
      'from-yellow-400 to-yellow-500 shadow-yellow-400/50 border-2 border-white'
    ]
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep sea blues for tranquil focus',
    badge: 'Calm',
    badgeColor: 'blue',
    icon: 'water',
    bg: 'bg-gradient-to-br from-blue-900 to-cyan-900',
    textColor: 'text-blue-200',
    hoverBorder: 'hover:border-blue-400',
    hoverShadow: 'hover:shadow-blue-400/30',
    colors: [
      'from-blue-600 to-blue-700 shadow-blue-500/50',
      'from-cyan-500 to-cyan-600 shadow-cyan-500/50',
      'from-sky-400 to-sky-500 shadow-sky-400/50'
    ]
  }
  ,
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Bold magentas and cyans with electric highlights',
    badge: 'New',
    badgeColor: 'cyan',
    icon: 'lightning',
    bg: 'bg-black',
    textColor: 'text-pink-300',
    hoverBorder: 'hover:border-pink-400',
    hoverShadow: 'hover:shadow-pink-400/30',
    colors: [
      'from-pink-500 to-pink-600 shadow-pink-500/40',
      'from-cyan-400 to-cyan-500 shadow-cyan-400/40',
      'from-purple-400 to-purple-500 shadow-purple-400/40'
    ]
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soft pastel tones for a gentle UI',
    badge: 'Soft',
    badgeColor: 'yellow',
    icon: 'sun',
    bg: 'bg-white',
    textColor: 'text-gray-800',
    hoverBorder: 'hover:border-yellow-300',
    hoverShadow: 'hover:shadow-yellow-300/20',
    colors: [
      'from-pink-100 to-pink-200',
      'from-sky-100 to-sky-200',
      'from-lime-100 to-lime-200'
    ]
  },
  {
    id: 'solar',
    name: 'Solar',
    description: 'Warm solar tones with high legibility',
    badge: 'Warm',
    badgeColor: 'indigo',
    icon: 'sun',
    bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
    textColor: 'text-amber-800',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-400/20',
    colors: [
      'from-amber-400 to-amber-500',
      'from-orange-400 to-orange-500',
      'from-yellow-300 to-yellow-400'
    ]
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep, muted tones for focused work at night',
    badge: 'Calm',
    badgeColor: 'blue',
    icon: 'moon',
    bg: 'bg-gradient-to-br from-slate-900 to-slate-800',
    textColor: 'text-slate-200',
    hoverBorder: 'hover:border-slate-500',
    hoverShadow: 'hover:shadow-slate-500/20',
    colors: [
      'from-slate-800 to-slate-900',
      'from-slate-700 to-slate-800',
      'from-slate-600 to-slate-700'
    ]
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Soft cherry blossom pinks for a gentle aesthetic',
    badge: 'Elegant',
    badgeColor: 'yellow',
    icon: 'sun',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-100',
    textColor: 'text-pink-900',
    hoverBorder: 'hover:border-pink-400',
    hoverShadow: 'hover:shadow-pink-400/30',
    colors: [
      'from-pink-300 to-pink-400 shadow-pink-400/40',
      'from-rose-300 to-rose-400 shadow-rose-400/40',
      'from-fuchsia-200 to-fuchsia-300 shadow-fuchsia-300/40'
    ]
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens and earth tones for a calm workspace',
    badge: 'Nature',
    badgeColor: 'indigo',
    icon: 'sun',
    bg: 'bg-gradient-to-br from-emerald-900 to-green-800',
    textColor: 'text-emerald-100',
    hoverBorder: 'hover:border-emerald-400',
    hoverShadow: 'hover:shadow-emerald-400/30',
    colors: [
      'from-emerald-500 to-emerald-600 shadow-emerald-500/40',
      'from-green-500 to-green-600 shadow-green-500/40',
      'from-teal-400 to-teal-500 shadow-teal-400/40'
    ]
  }
];

const ICONS = {
  moon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />',
  sun: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />',
  desktop:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />',
  lightning:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />',
  eye: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />',
  water:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />'
};

function renderThemeCard(config) {
  const badgeColors = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    indigo: 'bg-indigo-500/30 text-white border-indigo-400/50',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
  };

  return `
    <div class="theme-card relative cursor-pointer rounded-lg border-2 border-gray-700 ${config.hoverBorder} ${config.hoverShadow} 
                hover:shadow-lg transition-all duration-200 overflow-hidden group" data-theme="${config.id}">
      <!-- Active Indicator -->
      <div class="theme-active-indicator absolute top-2 right-2 z-10 hidden">
        <div class="bg-green-500 rounded-full p-1 shadow-lg">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
      
      <!-- Card Content -->
      <div class="p-4 ${config.bg} relative">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br ${config.colors[0].split(' shadow')[0]} flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                ${ICONS[config.icon]}
              </svg>
            </div>
            <h4 class="font-bold ${config.textColor} text-sm">${config.name}</h4>
          </div>
          <span class="px-2 py-1 text-xs font-medium rounded-full ${badgeColors[config.badgeColor]} border">${config.badge}</span>
        </div>
        
        <!-- Color Preview -->
        <div class="flex gap-1.5 mb-3">
          ${config.colors.map(color => `<div class="flex-1 h-10 rounded bg-gradient-to-br ${color}"></div>`).join('')}
        </div>
        
        <p class="text-xs ${config.textColor} opacity-75">${config.description}</p>
      </div>
    </div>
  `;
}

function initThemeCards() {
  const container = document.getElementById('theme-cards-container');
  if (!container) {
    console.warn('Theme cards container not found');
    return;
  }

  // Render all theme cards
  container.innerHTML = THEME_CARDS_CONFIG.map(renderThemeCard).join('');

  // Add click handlers
  const themeCards = container.querySelectorAll('.theme-card');
  const themeSelect = document.getElementById('theme-select');

  function updateActiveCard(themeId) {
    themeCards.forEach(card => {
      const cardTheme = card.getAttribute('data-theme');
      const indicator = card.querySelector('.theme-active-indicator');

      if (cardTheme === themeId) {
        card.classList.add('border-green-500', 'border-4');
        card.classList.remove('border-2', 'border-gray-700');
        if (indicator) {
          indicator.classList.remove('hidden');
        }
      } else {
        card.classList.remove('border-green-500', 'border-4');
        card.classList.add('border-2', 'border-gray-700');
        if (indicator) {
          indicator.classList.add('hidden');
        }
      }
    });
  }

  themeCards.forEach(card => {
    card.addEventListener('click', async () => {
      const themeId = card.getAttribute('data-theme');
      if (themeSelect) {
        themeSelect.value = themeId;
      }
      updateActiveCard(themeId);

      // Apply theme using ThemeManager
      if (window.Theme && typeof window.Theme.setTheme === 'function') {
        window.Theme.setTheme(themeId, true);

        // Save settings and show feedback
        if (typeof window.saveSettingsQuiet === 'function') {
          await window.saveSettingsQuiet();
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`Theme changed to ${themeId}`);
        }
      }
    });
  });

  // Initialize active theme
  const currentTheme = themeSelect?.value || localStorage.getItem('theme') || 'dark';
  updateActiveCard(currentTheme);
}

// Export for use in settings page
if (typeof window !== 'undefined') {
  window.initThemeCards = initThemeCards;
}
