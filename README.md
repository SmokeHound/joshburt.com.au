# Josh Burt - Website with Server-Side Authentication

[![🚀 Deploy website via FTP on push.](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)

## Overview
This is a static HTML website for joshburt.com.au featuring a unified Tailwind CSS design system, responsive sidebar navigation, dark/light mode, admin dashboard, user management, analytics, site settings, and a Castrol oil product ordering system.

## Features

### Frontend
- Responsive sidebar navigation with mobile hamburger menu
- Dark/Light mode toggle (persistent via localStorage)
- Consistent color scheme: green, red, white, dark grey
- Unified typography (Inter font family)
- Responsive grid layouts and spacing
- Shared components: `shared-nav.html`, `shared-config.html`, `shared-theme.html`
- No build process or dependencies (pure static site)

## Pages
- **Home** (`index.html`): Landing page, login modal
- **Admin** (`admin.html`): Dashboard, management links
- **User Management** (`users.html`): User CRUD
- **Analytics** (`analytics.html`): Site metrics
- **Settings** (`settings.html`): Site configuration
- **Oil Orders** (`oil.html`): Castrol product ordering, CSV export
- **Login** (`login.html`): Authentication

## Architecture
- **Tailwind CSS** for all styling
- **Navigation**: Fixed sidebar, active page highlighting
- **Theme System**: Unified dark/light mode
- **State**: All user/session/settings data stored in localStorage

## Manual Testing
- Validate sidebar navigation, theme toggle, mobile menu, login modal, and all page layouts
- Test oil ordering system, CSV export, and order summary
- Confirm settings and user management features work end-to-end

## Known Limitations
- CDN blocking may affect styling in restricted environments
- Placeholder images may not load if blocked
- All functionality is client-side; no server/database

## Maintenance
- All styling is handled by Tailwind CSS (inline styles)
- Shared components should be updated for all pages
- Layout consistency maintained across all pages

## Security
- FTP credentials are stored in GitHub Secrets (never exposed in repo)

---
For more details, see copilot-instructions.md and comments in shared-nav.html.
