import { useState, useMemo, useEffect } from 'react';
import { Search, Book, FileText, Folder, ChevronRight } from 'lucide-react';

// Import all markdown files using Vite's glob import
const markdownFiles = import.meta.glob('/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: false
});

// Also include root-level markdown files
const rootMarkdownFiles = import.meta.glob('/*.md', {
  query: '?raw',
  import: 'default',
  eager: false
});

// Also include cloudflare-backend markdown files
const backendMarkdownFiles = import.meta.glob('/cloudflare-backend/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: false
});

// Merge all markdown files
const allMarkdownFiles = {
  ...markdownFiles,
  ...rootMarkdownFiles,
  ...backendMarkdownFiles
};

interface DocFile {
  id: string;
  title: string;
  fileName: string;
  fullPath: string;
  category: string;
  loader: () => Promise<any>;
}

// Convert filename to title case
const toTitle = (value: string) =>
  value
    .replace(/\.md$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

// Get category from path
const getCategory = (path: string): string => {
  const segments = path.split('/').filter(s => s && s !== '.');

  if (segments.includes('docs')) {
    const docsIndex = segments.indexOf('docs');
    if (segments.length > docsIndex + 1) {
      return toTitle(segments[docsIndex + 1]);
    }
  }

  if (segments.includes('cloudflare-backend')) {
    return 'Backend';
  }

  return 'Root';
};

// Discover all markdown files
const ALL_DOCS: DocFile[] = Object.entries(allMarkdownFiles)
  .map(([path, loader]) => {
    const normalized = path.replace(/^\//, '');
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1];

    return {
      id: path,
      title: toTitle(fileName),
      fileName,
      fullPath: normalized,
      category: getCategory(normalized),
      loader: loader as () => Promise<any>
    };
  })
  .filter((doc, index, self) =>
    index === self.findIndex((d) => d.fullPath === doc.fullPath)
  )
  .sort((a, b) => {
    // Sort by category first, then by title
    if (a.category === b.category) {
      return a.title.localeCompare(b.title);
    }
    return a.category.localeCompare(b.category);
  });

export function Documentation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(ALL_DOCS[0]?.id ?? null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ALL_DOCS.map(doc => doc.category));
    return Array.from(cats).sort();
  }, []);

  // Filter documents by search term and category
  const filteredDocs = useMemo(() => {
    let docs = ALL_DOCS;

    // Filter by category
    if (selectedCategory) {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

    // Filter by search term
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      docs = docs.filter(doc => {
        const titleMatch = doc.title.toLowerCase().includes(term);
        const pathMatch = doc.fullPath.toLowerCase().includes(term);
        const fileNameMatch = doc.fileName.toLowerCase().includes(term);
        const categoryMatch = doc.category.toLowerCase().includes(term);

        return titleMatch || pathMatch || fileNameMatch || categoryMatch;
      });
    }

    return docs;
  }, [searchTerm, selectedCategory]);

  const selectedDoc = useMemo(
    () => ALL_DOCS.find((doc) => doc.id === selectedDocId) ?? null,
    [selectedDocId]
  );

  // Load document content
  useEffect(() => {
    if (!selectedDoc) {
      setContent('');
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);

    selectedDoc.loader()
      .then((content) => {
        if (!isCancelled) {
          setContent(content);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setLoadError(error.message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoc]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Book className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Documentation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse project documentation and guides
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
            {ALL_DOCS.length} Documents
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-12" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Sidebar */}
          <div className="col-span-4 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              {searchTerm && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {filteredDocs.length} result{filteredDocs.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredDocs.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No documentation found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocs.map((doc) => {
                    const isActive = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {doc.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {doc.category}
                            </p>
                          </div>
                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="col-span-8 flex flex-col overflow-hidden">
            {selectedDoc ? (
              <>
                {/* Document Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDoc.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Folder className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedDoc.fullPath}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isLoading && (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Loading document...</p>
                      </div>
                    </div>
                  )}

                  {!isLoading && loadError && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 font-medium">{loadError}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Failed to load document content
                        </p>
                      </div>
                    </div>
                  )}

                  {!isLoading && !loadError && content && (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      {content}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Book className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a document to view
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
