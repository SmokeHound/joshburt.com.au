# Phase 9 UI Components

This directory contains advanced UI components implemented as part of Phase 9 of the UPGRADE_PLAN.md.

## Components

### 1. DataTable (`data-table.js`)

A fully-featured data table component with sorting, filtering, and pagination.

**Features:**
- Column sorting (ascending/descending)
- Global text filtering
- Pagination with page size control
- Row selection
- Custom cell rendering
- Responsive design

**Usage:**
```javascript
const table = new DataTable('container-id', {
  data: [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ],
  columns: [
    { field: 'id', label: 'ID', sortable: true },
    { field: 'name', label: 'Name', sortable: true },
    { 
      field: 'email', 
      label: 'Email',
      render: (value) => `<a href="mailto:${value}">${value}</a>`
    }
  ],
  pageSize: 10,
  sortable: true,
  filterable: true,
  selectable: true,
  onRowClick: (row) => console.log('Clicked:', row)
});
```

### 2. DragDrop (`drag-drop.js`)

A wrapper around SortableJS for drag-and-drop functionality.

**Features:**
- Drag-to-reorder lists
- Custom drag handles
- Animation effects
- Group support for drag between containers
- Event callbacks

**Usage:**
```javascript
const dragDrop = new DragDrop('list-id', {
  handle: '.drag-handle',
  animation: 150,
  onSort: (event) => console.log('Order changed')
});
```

**Dependencies:** SortableJS (loaded from CDN automatically)

### 3. RichEditor (`rich-editor.js`)

A rich text editor component powered by Quill.js.

**Features:**
- Full WYSIWYG editing
- Formatting toolbar (bold, italic, underline, etc.)
- Lists (ordered/unordered)
- Links and images
- Color and alignment
- Dark theme support
- Multiple output formats (HTML, text, Delta)

**Usage:**
```javascript
const editor = new RichEditor('editor-container', {
  placeholder: 'Write something...',
  onChange: (content) => console.log('Content:', content)
});

// Get content
const html = editor.getContent('html');
const text = editor.getContent('text');

// Set content
editor.setContent('<p>Hello world!</p>');
```

**Dependencies:** Quill.js (loaded from CDN automatically)

### 4. ImageGallery (`image-gallery.js`)

A responsive image gallery with lightbox functionality.

**Features:**
- Responsive grid layout
- Configurable columns
- Lightbox with keyboard navigation
- Lazy loading
- Image captions
- Hover effects

**Usage:**
```javascript
const gallery = new ImageGallery('gallery-container', {
  images: [
    {
      url: '/path/to/image1.jpg',
      alt: 'Image 1',
      caption: 'A beautiful photo'
    },
    {
      url: '/path/to/image2.jpg',
      alt: 'Image 2',
      caption: 'Another great shot'
    }
  ],
  columns: 3,
  gap: 16,
  lightbox: true,
  lazy: true
});
```

### 5. DashboardBuilder (`dashboard-builder.js`)

A customizable dashboard with drag-to-rearrange widgets.

**Features:**
- Drag-to-rearrange widgets
- Edit mode toggle
- Widget add/remove
- Layout persistence (localStorage)
- Responsive grid
- Widget configuration

**Usage:**
```javascript
const dashboard = new DashboardBuilder('dashboard-container', {
  widgets: [
    {
      id: 'widget-1',
      title: 'Statistics',
      content: '<div>Widget content...</div>'
    },
    {
      id: 'widget-2',
      title: 'Chart',
      render: () => '<canvas id="chart"></canvas>'
    }
  ],
  columns: 3,
  editable: true,
  storageKey: 'my-dashboard-layout',
  onSave: (layout) => console.log('Saved:', layout)
});
```

## Demo

See `phase9-components-demo.html` for a complete demonstration of all components.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Uses modern CSS features (Grid, Flexbox)

## Dependencies

All components are self-contained. External dependencies are loaded from CDN automatically when needed:

- **SortableJS**: Used by DragDrop component
- **Quill.js**: Used by RichEditor component

## Styling

All components include default styles and are designed to work with the dark theme of the application. They use Tailwind CSS utility classes for consistency.

## Accessibility

Components follow accessibility best practices:

- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly

## License

MIT License - Same as the main project
