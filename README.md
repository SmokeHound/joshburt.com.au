 https://joshburt.com.au/
 
[![🚀 Deploy website via FTP on push.](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)

## Design System

This website uses a unified design system based on **Tailwind CSS** with consistent navigation and theming across all pages.

### Features
- **Responsive sidebar navigation** with mobile-friendly hamburger menu
- **Dark/Light mode toggle** with persistent localStorage preferences
- **Consistent color scheme**: Primary blue, Secondary green, Accent purple
- **Unified typography** using Inter font family
- **Responsive grid layouts** and consistent spacing

### Architecture
- **Shared Components**: `shared-nav.html`, `shared-config.html`, `shared-theme.html`
- **Framework**: Tailwind CSS for consistent styling
- **Navigation**: Fixed sidebar with active page highlighting
- **Theme System**: Unified dark/light mode with smooth transitions

### Pages
- **Home** (`index.html`) - Landing page with authentication features
- **Admin** (`admin.html`) - Dashboard with management links
- **User Management** (`users.html`) - User CRUD interface
- **Analytics** (`analytics.html`) - Site statistics and metrics
- **Settings** (`settings.html`) - Site configuration
- **Oil Orders** (`oil.html`) - Castrol product ordering system
- **Login** (`login.html`) - Authentication page
