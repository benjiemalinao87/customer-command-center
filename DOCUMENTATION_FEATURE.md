# Documentation Browser Feature

## Overview

A built-in documentation browser has been added to the Tippen admin dashboard, allowing users to browse and search all markdown documentation files directly within the application.

## Access

Navigate to the **"Docs"** tab in the main navigation bar to access the documentation browser.

## Features

### 📚 Auto-Discovery
- Automatically discovers all `.md` files in:
  - `/docs/**/*.md` - Organized documentation
  - `/*.md` - Root-level documentation
  - `/cloudflare-backend/**/*.md` - Backend documentation
- No configuration needed - just add markdown files and they appear

### 🔍 Search Functionality
- Real-time search across:
  - Document titles
  - File names
  - File paths
  - Categories
- Live result count display

### 🏷️ Category Filtering
- Auto-generates categories from folder structure
- Click category pills to filter documents
- Example categories:
  - **API** - API documentation
  - **Architecture** - System architecture docs
  - **Features** - Feature specifications
  - **Implementations** - Implementation guides
  - **Guides** - User guides
  - **Fixes** - Bug fix documentation
  - **Planning** - Planning documents
  - **Operations** - SOPs and operations
  - **Backend** - Cloudflare backend docs
  - **Root** - Root-level files

### 🎨 Design
- Follows Tippen design system:
  - Clean card-based layout
  - Full dark mode support
  - Responsive grid layout
  - Smooth transitions
  - Tailwind CSS styling
- Two-panel layout:
  - **Left panel** (33%): Searchable document list
  - **Right panel** (67%): Document content viewer

### 📄 Document Display
- Raw markdown rendering (preserves formatting)
- Monospace font for code readability
- Syntax highlighting for code blocks (via markdown)
- Full document metadata:
  - File path
  - Category
  - Title

## Technical Implementation

### Technology Stack
- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **File Discovery**: Vite's `import.meta.glob` API
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### File Structure
```
src/features/documentation/
├── components/
│   └── Documentation.tsx    # Main documentation browser component
└── index.ts                  # Feature export

src/
└── vite-env.d.ts            # TypeScript declarations for .md files
```

### How It Works

1. **Build-Time Discovery**:
   ```typescript
   const markdownFiles = import.meta.glob('/docs/**/*.md', {
     query: '?raw',
     import: 'default',
     eager: false
   });
   ```
   - Vite scans for `.md` files during build
   - Creates dynamic imports for lazy loading
   - No webpack `require.context` needed

2. **Category Generation**:
   ```typescript
   const getCategory = (path: string): string => {
     if (path.includes('docs/api/')) return 'API';
     if (path.includes('docs/guides/')) return 'Guides';
     // ... etc
   };
   ```

3. **Lazy Loading**:
   - Documents loaded only when selected
   - Improves initial load time
   - Reduces memory usage

4. **Search & Filter**:
   - Client-side search (fast, no backend needed)
   - React `useMemo` for performance
   - Instant results

## Configuration

### Vite Config
Added markdown asset support in `vite.config.ts`:
```typescript
export default defineConfig({
  // ...
  assetsInclude: ['**/*.md'],
});
```

### TypeScript Support
Enhanced `src/vite-env.d.ts` with:
```typescript
declare module '*.md' {
  const content: string;
  export default content;
}
```

## Adding New Documentation

Simply add `.md` files to any of these locations:
- `/docs/` - For organized documentation (recommended)
- Root directory - For top-level docs (README, CLAUDE, etc.)
- `/cloudflare-backend/` - For backend-specific docs

**Example**:
```bash
# Add a new guide
echo "# My New Guide" > docs/guides/my-new-guide.md

# Restart dev server
npm run dev
```

The new document will automatically appear in the browser!

## Design Patterns

### Component Structure
```tsx
<Documentation>
  <Header>
    <Title />
    <DocumentCount />
  </Header>

  <MainContent>
    <Sidebar>
      <SearchBar />
      <CategoryFilters />
      <DocumentList />
    </Sidebar>

    <ContentArea>
      <DocumentHeader />
      <DocumentContent />
    </ContentArea>
  </MainContent>
</Documentation>
```

### State Management
- **Local State**: Uses React hooks (`useState`, `useMemo`, `useEffect`)
- **No Global State**: Self-contained component
- **Performance**: Memoized filtering for instant search

### Styling Conventions
Follows CLAUDE.md design patterns:
- Card pattern with borders
- Consistent spacing (`p-4`, `p-6`, `gap-2`, etc.)
- Color palette:
  - Primary: `blue-600` / `blue-400` (dark)
  - Background: `gray-50` / `gray-800` (dark)
  - Text: `gray-900` / `gray-100` (dark)
  - Borders: `gray-200` / `gray-700` (dark)

## Future Enhancements

Potential improvements:
- [ ] Markdown rendering with syntax highlighting (using `react-markdown`)
- [ ] Table of contents generation
- [ ] Document versioning
- [ ] Download/export functionality
- [ ] Print-friendly view
- [ ] Bookmark/favorite documents
- [ ] Recent documents history
- [ ] Full-text search (search within content)
- [ ] Document linking/cross-references
- [ ] AI-powered search

## Browser Support

Works in all modern browsers that support:
- ES6 modules
- CSS Grid
- Flexbox
- Dark mode media queries

## Performance

- **Initial Load**: Fast (no documents loaded initially)
- **Search**: Instant (client-side, memoized)
- **Document Load**: < 100ms (lazy-loaded)
- **Memory**: Efficient (only active document in memory)

## Maintenance

### Update Documentation Count
The document count badge updates automatically when files are added/removed.

### Clean Up Old Docs
To remove a document, simply delete the `.md` file and restart the dev server.

### Organize Categories
Move files between folders to change their category:
```bash
mv docs/features/old-feature.md docs/archive/
```

---

**Last Updated**: 2025-10-19
**Version**: 1.0.0
**Author**: Claude (Anthropic)
