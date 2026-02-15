import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Book, FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface FolderNode {
  name: string;
  displayName: string;
  files: DocFile[];
  isExpanded?: boolean;
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
    if (segments.length > docsIndex + 2) {
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ALL_DOCS.map(doc => doc.category));
    return Array.from(cats).sort();
  }, []);

  // Filter documents by search term and category
  const filteredDocs = useMemo(() => {
    let docs = ALL_DOCS;

    if (selectedCategory) {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

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

  // Group docs into folder structure
  const folderTree = useMemo((): FolderNode[] => {
    const folderMap = new Map<string, DocFile[]>();

    for (const doc of filteredDocs) {
      const key = doc.category;
      if (!folderMap.has(key)) {
        folderMap.set(key, []);
      }
      folderMap.get(key)!.push(doc);
    }

    return Array.from(folderMap.entries())
      .map(([name, files]) => ({
        name,
        displayName: name,
        files: files.sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredDocs]);

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedFolders(new Set(folderTree.map(f => f.name)));
    }
  }, [searchTerm, folderTree]);

  // Auto-expand the folder containing the selected doc
  useEffect(() => {
    if (selectedDocId) {
      const doc = ALL_DOCS.find(d => d.id === selectedDocId);
      if (doc) {
        setExpandedFolders(prev => {
          const next = new Set(prev);
          next.add(doc.category);
          return next;
        });
      }
    }
  }, [selectedDocId]);

  const toggleFolder = useCallback((folderName: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }, []);

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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Main Content — height = viewport minus header + padding */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        <div className="grid grid-cols-12 h-full">
          {/* Sidebar */}
          <div className="col-span-3 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              {searchTerm && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {filteredDocs.length} result{filteredDocs.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Category Filter */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Folder Tree */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {folderTree.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No documentation found
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {folderTree.map((folder) => {
                    const isExpanded = expandedFolders.has(folder.name);
                    const hasActiveFile = folder.files.some(f => f.id === selectedDocId);

                    return (
                      <div key={folder.name}>
                        {/* Folder Header */}
                        <button
                          onClick={() => toggleFolder(folder.name)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
                            hasActiveFile && !isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          )}
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {folder.displayName}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0 tabular-nums">
                            {folder.files.length}
                          </span>
                        </button>

                        {/* Files */}
                        {isExpanded && (
                          <div>
                            {folder.files.map((doc) => {
                              const isActive = doc.id === selectedDocId;
                              return (
                                <button
                                  key={doc.id}
                                  onClick={() => setSelectedDocId(doc.id)}
                                  className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-left transition-colors ${
                                    isActive
                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    isActive
                                      ? 'text-blue-500 dark:text-blue-400'
                                      : 'text-gray-400 dark:text-gray-500'
                                  }`} />
                                  <span className={`text-[13px] truncate ${
                                    isActive ? 'font-medium' : ''
                                  }`}>
                                    {doc.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="col-span-9 flex flex-col overflow-hidden">
            {selectedDoc ? (
              <>
                {/* Document Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {selectedDoc.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Folder className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedDoc.fullPath}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {isLoading && (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                      </div>
                    </div>
                  )}

                  {!isLoading && loadError && (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 font-medium">{loadError}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Failed to load document
                        </p>
                      </div>
                    </div>
                  )}

                  {!isLoading && !loadError && content && (
                    <div className="px-8 py-6 prose prose-sm dark:prose-invert max-w-none
                      prose-headings:font-semibold
                      prose-h1:text-xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:dark:border-gray-700 prose-h1:pb-2 prose-h1:mb-4
                      prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
                      prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                      prose-p:text-gray-700 prose-p:dark:text-gray-300 prose-p:leading-relaxed
                      prose-a:text-blue-600 prose-a:dark:text-blue-400 prose-a:no-underline hover:prose-a:underline
                      prose-code:text-[13px] prose-code:bg-gray-100 prose-code:dark:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-gray-900 prose-pre:dark:bg-gray-950 prose-pre:text-gray-100 prose-pre:text-[13px] prose-pre:leading-relaxed prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-200 prose-pre:dark:border-gray-700
                      prose-table:text-sm
                      prose-th:bg-gray-50 prose-th:dark:bg-gray-900 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-gray-700 prose-th:dark:text-gray-300 prose-th:border prose-th:border-gray-200 prose-th:dark:border-gray-700
                      prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200 prose-td:dark:border-gray-700
                      prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50/50 prose-blockquote:dark:bg-blue-900/10 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:not-italic
                      prose-li:marker:text-gray-400 prose-li:dark:marker:text-gray-500
                      prose-strong:text-gray-900 prose-strong:dark:text-gray-100
                      prose-hr:border-gray-200 prose-hr:dark:border-gray-700
                      prose-img:rounded-lg prose-img:border prose-img:border-gray-200 prose-img:dark:border-gray-700
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    </div>
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
