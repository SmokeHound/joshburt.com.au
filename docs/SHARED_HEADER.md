# Shared Header Component Documentation

## Overview

The shared header component provides a consistent, reusable page header design across the joshburt.com.au application. It offers a flexible API for customization while maintaining design consistency.

## Features

- **Consistent Design**: Single source of truth for header styling
- **Flexible Configuration**: Support for icons, subtitles, actions, gradients, and metadata
- **14 Built-in Icons**: Common page icons ready to use
- **Responsive**: Mobile-first design with desktop enhancements
- **Accessible**: Proper ARIA attributes and semantic HTML
- **Token-driven**: Uses CSS custom properties for theming
- **Event Handling**: Easy button click handlers

## Basic Usage

### 1. Include the Component

Add the shared header script to your page:

```html
<script>
  // Load and execute shared-header.html
  fetch('/shared-header.html')
    .then(response => response.text())
    .then(html => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const scripts = tempDiv.getElementsByTagName('script');
      for (let script of scripts) {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript);
      }
    });
</script>
```

### 2. Add a Container

Place a container element where you want the header to appear:

```html
<div id="page-header-container"></div>
```

### 3. Render the Header

Call `window.PageHeader.render()` with your configuration:

```javascript
window.PageHeader.render({
  title: 'Your Page Title',
  subtitle: 'Optional description',
  icon: 'settings',
  containerId: 'page-header-container'
});
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `title` | string | The main heading text (required) |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `subtitle` | string | - | Optional subtitle/description text |
| `icon` | string | - | Icon key from built-in library (see below) |
| `actions` | array | - | Array of action button configurations |
| `gradient` | boolean | false | Enable animated gradient background |
| `metadata` | object | - | Key-value pairs to display as metadata |
| `containerId` | string | 'page-header-container' | Target container element ID |
| `className` | string | - | Additional CSS classes |

## Icon Library

The following icons are available:

| Icon Key | Use Case |
|----------|----------|
| `home` | Dashboard, home pages |
| `user` | User profile, account pages |
| `users` | User management, team pages |
| `settings` | Settings, configuration pages |
| `products` | Product catalog, inventory |
| `orders` | Order management, tracking |
| `analytics` | Analytics, reports, statistics |
| `logs` | Audit logs, activity logs |
| `filter` | Filter management pages |
| `consumables` | Consumables catalog |
| `notification` | Notifications, alerts |
| `search` | Search pages |
| `refresh` | Refresh action |
| `admin` | Administration pages |

## Action Buttons

Action buttons are defined as an array of objects:

```javascript
actions: [
  {
    id: 'add-user-btn',           // Optional: button ID
    label: 'Add User',            // Button text
    className: 'ui-btn ui-btn-primary', // CSS classes
    onClick: handleAddUser,       // Click handler function
    ariaLabel: 'Add new user',    // Optional: ARIA label
    title: 'Create a new user'    // Optional: tooltip
  }
]
```

### Button Styles

Use these UI primitive classes for consistent button styling:

- `ui-btn ui-btn-primary` - Primary action (neon blue)
- `ui-btn ui-btn-secondary` - Secondary action (neon green)
- `ui-btn ui-btn-accent` - Accent action (neon purple)
- `ui-btn ui-btn-danger` - Destructive action (neon pink)
- `ui-btn ui-btn-warning` - Warning action (orange)
- `ui-btn ui-btn-outline` - Outline style

## Examples

### Simple Header

```javascript
window.PageHeader.render({
  title: 'Dashboard',
  containerId: 'page-header-container'
});
```

### Header with Icon and Subtitle

```javascript
window.PageHeader.render({
  title: 'User Management',
  subtitle: 'Manage user accounts and permissions',
  icon: 'users',
  containerId: 'page-header-container'
});
```

### Header with Action Buttons

```javascript
window.PageHeader.render({
  title: 'Product Catalog',
  subtitle: 'Browse and manage product inventory',
  icon: 'products',
  actions: [
    {
      label: 'Add Product',
      className: 'ui-btn ui-btn-secondary',
      onClick: function() {
        openAddProductModal();
      }
    },
    {
      label: 'Export',
      className: 'ui-btn ui-btn-primary',
      onClick: function() {
        exportProducts();
      }
    }
  ],
  containerId: 'page-header-container'
});
```

### Header with Gradient Background

```javascript
window.PageHeader.render({
  title: 'Welcome Dashboard',
  subtitle: 'Your personalized overview',
  icon: 'home',
  gradient: true,
  actions: [
    {
      label: 'Refresh',
      className: 'ui-btn ui-btn-primary',
      onClick: refreshDashboard
    }
  ],
  containerId: 'page-header-container'
});
```

### Header with Metadata

```javascript
window.PageHeader.render({
  title: 'Analytics Dashboard',
  subtitle: 'View detailed statistics and insights',
  icon: 'analytics',
  metadata: {
    'Last Updated': '2 hours ago',
    'Status': 'Online'
  },
  actions: [
    {
      label: 'Refresh Data',
      className: 'ui-btn ui-btn-primary',
      onClick: refreshAnalytics
    }
  ],
  containerId: 'page-header-container'
});
```

## Migration Guide

### Migrating Existing Pages

To migrate an existing page to use the shared header:

1. **Identify the current header**
   ```html
   <header class="page-header ui-card border" role="banner">
     <div class="flex items-center justify-between">
       <div>
         <h1>User Management</h1>
         <p class="subtitle">Manage accounts and permissions</p>
       </div>
       <button id="add-user">Add User</button>
     </div>
   </header>
   ```

2. **Replace with container**
   ```html
   <div id="page-header-container"></div>
   ```

3. **Add initialization script**
   ```html
   <script>
     // Load shared header component
     fetch('/shared-header.html')
       .then(response => response.text())
       .then(html => {
         const tempDiv = document.createElement('div');
         tempDiv.innerHTML = html;
         const scripts = tempDiv.getElementsByTagName('script');
         for (let script of scripts) {
           const newScript = document.createElement('script');
           newScript.textContent = script.textContent;
           document.body.appendChild(newScript);
         }
       });
   </script>
   
   <script>
     function initHeader() {
       if (typeof window.PageHeader === 'undefined') {
         setTimeout(initHeader, 100);
         return;
       }
       
       window.PageHeader.render({
         title: 'User Management',
         subtitle: 'Manage accounts and permissions',
         icon: 'users',
         actions: [
           {
             label: 'Add User',
             className: 'ui-btn ui-btn-primary',
             onClick: openAddUserModal
           }
         ]
       });
     }
     
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', initHeader);
     } else {
       initHeader();
     }
   </script>
   ```

## CSS Customization

The shared header uses CSS custom properties (design tokens) for styling:

```css
/* Override header styles if needed */
.page-header {
  --token-spacing-lg: 1.5rem;  /* Padding */
  --token-radius-lg: 0.75rem;   /* Border radius */
}

.page-header h1 {
  /* Title styling */
  color: var(--token-text-primary);
  font-size: 1.875rem; /* 30px */
}

@media (min-width: 768px) {
  .page-header h1 {
    font-size: 2.25rem; /* 36px */
  }
}
```

## Accessibility

The shared header follows accessibility best practices:

- Uses semantic `<header>` element with `role="banner"`
- Proper heading hierarchy (always uses `<h1>`)
- ARIA labels on action buttons
- Keyboard accessible
- Screen reader friendly
- Responsive and mobile-friendly

## Browser Support

The shared header component requires:

- Modern browsers with ES6 support
- `fetch` API support
- CSS custom properties support

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Demo Page

Visit `/shared-header-demo.html` to see all configuration options in action.

## Best Practices

1. **Use Appropriate Icons**: Choose icons that match the page purpose
2. **Keep Subtitles Concise**: 1-2 sentences maximum
3. **Limit Action Buttons**: 2-3 buttons maximum for best UX
4. **Use Semantic Titles**: Clear, descriptive page titles
5. **Consistent Button Styles**: Use the same style for the same action across pages
6. **Test Responsiveness**: Always test on mobile devices
7. **Provide ARIA Labels**: For better accessibility

## Troubleshooting

### Header Not Rendering

**Problem**: Header container remains empty

**Solution**: Ensure `window.PageHeader` is defined before calling `render()`. Use the `initHeader()` pattern shown in the migration guide.

### Icons Not Showing

**Problem**: Icon doesn't appear

**Solution**: Check that you're using a valid icon key from the icon library.

### Buttons Not Working

**Problem**: Click handlers don't fire

**Solution**: Verify your onClick handler is a function or the function name exists in window scope.

### Styling Issues

**Problem**: Header doesn't match site theme

**Solution**: Rebuild CSS with `npm run build` to include the latest styles.

## Performance Considerations

- The shared header component is lightweight (~11KB uncompressed)
- Icons are inline SVG (no additional requests)
- Uses native JavaScript (no framework dependencies)
- Minimal DOM manipulation

## Related Documentation

- [UI Primitives](./UI_PRIMITIVES.md) - Button and card styling
- [Architecture](./ARCHITECTURE.md) - Overall system design
- [Development Guide](../IMPLEMENTATION_GUIDE.md) - Setup and workflow

## Support

For issues or questions about the shared header component:

1. Check the demo page at `/shared-header-demo.html`
2. Review this documentation
3. Check existing page implementations
4. Create an issue on GitHub
