# UI Primitives Documentation

## Overview

This document describes the standardized UI primitive system implemented across the joshburt.com.au application. All UI components follow a token-driven architecture with consistent naming conventions.

## Design Tokens

All design values are defined as CSS custom properties in `src/styles.css` under the `:root` selector. These tokens can be overridden for theme variations.

### Color Tokens

#### Primary Theme (Neon Blue)
- `--token-color-primary`: #00d4ff
- `--token-color-primary-hover`: #00eeff
- `--token-color-primary-active`: #00b8e6
- `--token-color-primary-alpha-10` through `--token-color-primary-alpha-60`: rgba variations

#### Secondary Theme (Neon Green)
- `--token-color-secondary`: #00ff88
- `--token-color-secondary-hover`: #00ff99
- `--token-color-secondary-active`: #00dd77
- `--token-color-secondary-alpha-*`: rgba variations

#### Accent Theme (Neon Purple)
- `--token-color-accent`: #8000ff
- `--token-color-accent-hover`: #9900ff
- `--token-color-accent-active`: #7700dd
- `--token-color-accent-alpha-*`: rgba variations

#### Danger/Error Theme (Neon Pink)
- `--token-color-danger`: #ff0080
- `--token-color-danger-hover`: #ff0099
- `--token-color-danger-active`: #dd0077
- `--token-color-danger-alpha-*`: rgba variations

#### Warning Theme (Orange)
- `--token-color-warning`: #ff6600
- `--token-color-warning-hover`: #ff7733
- `--token-color-warning-active`: #dd5c22

### Background Tokens
- `--token-bg-primary`: #0a0a0a (main background)
- `--token-bg-secondary`: #111111 (cards, sidebars)
- `--token-bg-tertiary`: #181818 (inputs)
- `--token-bg-elevated`: #1a1a1a (elevated surfaces)

### Spacing Tokens
- `--token-spacing-xs`: 0.25rem (4px)
- `--token-spacing-sm`: 0.5rem (8px)
- `--token-spacing-md`: 1rem (16px)
- `--token-spacing-lg`: 1.5rem (24px)
- `--token-spacing-xl`: 2rem (32px)
- `--token-spacing-2xl`: 3rem (48px)

### Shadow Tokens
- `--token-shadow-sm` through `--token-shadow-xl`: Standard box shadows
- `--token-shadow-glow-primary`: Neon glow effect for primary color
- `--token-shadow-glow-secondary`: Neon glow effect for secondary color
- `--token-shadow-glow-accent`: Neon glow effect for accent color
- `--token-shadow-glow-danger`: Neon glow effect for danger color

## UI Primitives

### Button System (`ui-btn`)

#### Base Class
```html
<button class="ui-btn">Base Button</button>
```

The base `ui-btn` class provides:
- Consistent padding (0.5rem 1rem)
- Border radius from token
- Transition effects
- Cursor pointer
- Flex display for icon alignment

#### Button Variants

**Primary (Neon Blue)**
```html
<button class="ui-btn ui-btn-primary">Primary Action</button>
```

**Secondary (Neon Green)**
```html
<button class="ui-btn ui-btn-secondary">Secondary Action</button>
```

**Accent (Neon Purple)**
```html
<button class="ui-btn ui-btn-accent">Accent Action</button>
```

**Danger (Neon Pink)**
```html
<button class="ui-btn ui-btn-danger">Delete</button>
```

**Warning (Orange)**
```html
<button class="ui-btn ui-btn-warning">Warning Action</button>
```

**Outline**
```html
<button class="ui-btn ui-btn-outline">Outline Button</button>
```

#### Button Sizes

**Small**
```html
<button class="ui-btn ui-btn-primary ui-btn-sm">Small Button</button>
```

**Large**
```html
<button class="ui-btn ui-btn-primary ui-btn-lg">Large Button</button>
```

#### Button States

Buttons automatically support:
- **Hover**: Enhanced glow and color shift
- **Active**: Darker color on click
- **Disabled**: Reduced opacity and no pointer events
- **Focus**: Outline for accessibility

```html
<button class="ui-btn ui-btn-primary" disabled>Disabled Button</button>
```

### Card System (`ui-card`)

#### Base Class
```html
<div class="ui-card">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

The base `ui-card` class provides:
- Background color from token
- Border with default color
- Border radius from token
- Padding from token
- Hover effects (lift and glow)

#### Card Variants

**Primary Card**
```html
<div class="ui-card ui-card-primary">
  Primary themed card with blue border
</div>
```

**Secondary Card**
```html
<div class="ui-card ui-card-secondary">
  Secondary themed card with green border
</div>
```

**Accent Card**
```html
<div class="ui-card ui-card-accent">
  Accent themed card with purple border
</div>
```

**Flat Card** (no hover effects)
```html
<div class="ui-card ui-card-flat">
  Flat card without hover lift
</div>
```

#### Card Features
- Automatic hover lift (-4px translateY)
- Border color transitions
- Glow effects on hover
- Responsive padding

### Modal System (`ui-modal`)

#### Modal Structure
```html
<div class="ui-modal-backdrop hidden">
  <div class="ui-modal-panel">
    <div class="ui-modal-header">
      <h2>Modal Title</h2>
    </div>
    <div class="ui-modal-body">
      <p>Modal content goes here</p>
    </div>
    <div class="ui-modal-footer">
      <button class="ui-btn ui-btn-secondary">Cancel</button>
      <button class="ui-btn ui-btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

#### Modal Classes

**ui-modal-backdrop**: Full-screen overlay
- Fixed positioning covering viewport
- Dark semi-transparent background
- Flexbox centering
- z-index management

**ui-modal-panel**: Modal container
- Max-width constraint
- Themed background
- Border and shadow
- Padding from tokens

**ui-modal-header**: Modal header section
- Bottom border
- Margin and padding from tokens

**ui-modal-body**: Modal content area
- Standard spacing

**ui-modal-footer**: Modal action area
- Top border
- Flexbox with gap
- Right-aligned buttons

#### Modal Sizes

**Small Modal**
```html
<div class="ui-modal-backdrop ui-modal-sm">
  <div class="ui-modal-panel">...</div>
</div>
```

**Large Modal**
```html
<div class="ui-modal-backdrop ui-modal-lg">
  <div class="ui-modal-panel">...</div>
</div>
```

**Extra Large Modal**
```html
<div class="ui-modal-backdrop ui-modal-xl">
  <div class="ui-modal-panel">...</div>
</div>
```

### Link System (`ui-link`)

#### Base Link
```html
<a href="#" class="ui-link">Standard Link</a>
```

#### Link Variants

**Primary Link**
```html
<a href="#" class="ui-link ui-link-primary">Primary Link</a>
```

**Secondary Link**
```html
<a href="#" class="ui-link ui-link-secondary">Secondary Link</a>
```

**Muted Link**
```html
<a href="#" class="ui-link ui-link-muted">Muted Link</a>
```

**Navigation Link**
```html
<a href="#" class="ui-link ui-link-nav">Nav Link</a>
```

#### Link States
- **Hover**: Color transition and text shadow
- **Active**: Special styling for navigation links
- **Focus**: Outline for accessibility

## Usage Guidelines

### Combining Classes

1. **Always include base class first**:
   ```html
   <!-- Correct -->
   <button class="ui-btn ui-btn-primary">Click Me</button>
   
   <!-- Incorrect -->
   <button class="ui-btn-primary ui-btn">Click Me</button>
   ```

2. **Combine with Tailwind utility classes**:
   ```html
   <button class="ui-btn ui-btn-primary rounded-lg px-6 py-3">
     Large Primary Button
   </button>
   ```

3. **Use semantic HTML elements**:
   ```html
   <!-- Correct -->
   <button class="ui-btn ui-btn-primary">Button</button>
   <a href="#" class="ui-btn ui-btn-secondary">Link Button</a>
   
   <!-- Avoid -->
   <div class="ui-btn ui-btn-primary">Not a real button</div>
   ```

### Accessibility

All UI primitives are designed with accessibility in mind:

- Buttons have proper focus states
- Links have visible focus indicators
- Modals trap focus appropriately
- Color contrast meets WCAG AA standards
- Disabled states prevent interaction

### Theme Customization

To create a custom theme, override the token values:

```css
:root {
  --token-color-primary: #your-color;
  --token-color-primary-hover: #your-hover-color;
  /* ... etc */
}
```

Or for a specific theme class:

```css
.light {
  --token-bg-primary: #ffffff;
  --token-bg-secondary: #f9fafb;
  --token-text-primary: #1f2937;
  /* ... etc */
}
```

## Migration from Legacy Classes

If you're migrating from the old class system:

| Old Class | New Class |
|-----------|-----------|
| `btn-neon-blue` | `ui-btn ui-btn-primary` |
| `btn-neon-green` | `ui-btn ui-btn-secondary` |
| `btn-neon-purple` | `ui-btn ui-btn-accent` |
| `btn-neon-pink` | `ui-btn ui-btn-danger` |
| `btn-neon-orange` | `ui-btn ui-btn-warning` |
| `card` | `ui-card` |
| `widget-primary` | `ui-card ui-card-primary` |
| `widget-secondary` | `ui-card ui-card-secondary` |
| `widget-accent` | `ui-card ui-card-accent` |
| `modal-backdrop` | `ui-modal-backdrop` |
| `modal-panel` | `ui-modal-panel` |
| `nav-link` | `ui-link ui-link-nav` |

## Examples

### Complete Button Group
```html
<div class="flex gap-4">
  <button class="ui-btn ui-btn-primary">Save</button>
  <button class="ui-btn ui-btn-secondary">Cancel</button>
  <button class="ui-btn ui-btn-danger">Delete</button>
  <button class="ui-btn ui-btn-outline">More Options</button>
</div>
```

### Card with Actions
```html
<div class="ui-card ui-card-primary">
  <h3 class="text-xl font-bold mb-4">User Profile</h3>
  <p class="mb-6">Manage your account settings and preferences.</p>
  <div class="flex gap-2">
    <button class="ui-btn ui-btn-primary">Edit Profile</button>
    <button class="ui-btn ui-btn-outline">View Activity</button>
  </div>
</div>
```

### Confirmation Modal
```html
<div class="ui-modal-backdrop" id="confirm-modal">
  <div class="ui-modal-panel">
    <div class="ui-modal-header">
      <h2>Confirm Deletion</h2>
    </div>
    <div class="ui-modal-body">
      <p>Are you sure you want to delete this item? This action cannot be undone.</p>
    </div>
    <div class="ui-modal-footer">
      <button class="ui-btn ui-btn-outline" onclick="closeModal()">Cancel</button>
      <button class="ui-btn ui-btn-danger" onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>
```

## Best Practices

1. **Use semantic color variants**: Choose button variants based on action semantics (primary for main actions, danger for destructive actions)

2. **Maintain consistency**: Use the same variant for similar actions across the application

3. **Respect spacing tokens**: Use the spacing tokens for margins and padding instead of arbitrary values

4. **Test accessibility**: Ensure all interactive elements are keyboard accessible and have proper ARIA labels

5. **Leverage hover states**: The built-in hover effects provide visual feedback - avoid overriding them unless necessary

6. **Consider mobile**: Test touch targets on mobile devices (minimum 44x44px recommended)

7. **Use card variants sparingly**: Reserve colored card variants for emphasis; default cards work for most content

## Resources

- Source CSS: `src/styles.css`
- Compiled CSS: `assets/css/styles.css`
- Tailwind Config: `tailwind.config.js`
- Architecture Docs: `docs/ARCHITECTURE.md`
