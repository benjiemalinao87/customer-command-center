import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Mail, MessageSquare, FileText } from 'lucide-react';
import { templateService, MessageTemplate } from '../services/templateService';
import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { SequenceEditor } from './SequenceEditor';

type FilterTab = 'all' | 'sms' | 'email' | 'sequences';

export function TemplateManagement() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSequenceEditorOpen, setIsSequenceEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        const result = await templateService.listTemplates();
        if (result.success && result.templates) {
            setTemplates(result.templates);
        }
        setIsLoading(false);
    };

    const handleCreateTemplate = () => {
        setEditingTemplate(null);
        setIsEditorOpen(true);
    };

    const handleCreateSequence = () => {
        setEditingTemplate(null);
        setIsSequenceEditorOpen(true);
    };

    const handleEditTemplate = (template: MessageTemplate) => {
        setEditingTemplate(template);
        if (template.is_sequence) {
            setIsSequenceEditorOpen(true);
        } else {
            setIsEditorOpen(true);
        }
    };

    const handleSaveTemplate = async () => {
        await fetchTemplates();
        setIsEditorOpen(false);
        setIsSequenceEditorOpen(false);
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        const result = await templateService.deleteTemplate(templateId);
        if (result.success) {
            await fetchTemplates();
        }
    };

    const handleDuplicateTemplate = async (templateId: string) => {
        const result = await templateService.duplicateTemplate(templateId);
        if (result.success) {
            await fetchTemplates();
        }
    };

    // Filter templates based on search and tab
    const filteredTemplates = templates.filter(template => {
        const matchesSearch =
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.content.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        switch (activeTab) {
            case 'sms':
                return template.channel === 'sms' && !template.is_sequence;
            case 'email':
                return template.channel === 'email' && !template.is_sequence;
            case 'sequences':
                return template.is_sequence;
            default:
                return true;
        }
    });

    const tabs: { id: FilterTab; label: string; icon: React.ElementType }[] = [
        { id: 'all', label: 'All Templates', icon: FileText },
        { id: 'sms', label: 'SMS', icon: MessageSquare },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'sequences', label: 'Sequences', icon: RefreshCw },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Template Management
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Create and manage message templates for all workspaces
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateSequence}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Sequence
                    </button>
                    <button
                        onClick={handleCreateTemplate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const count = templates.filter(t => {
                            switch (tab.id) {
                                case 'sms': return t.channel === 'sms' && !t.is_sequence;
                                case 'email': return t.channel === 'email' && !t.is_sequence;
                                case 'sequences': return t.is_sequence;
                                default: return true;
                            }
                        }).length;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Template List */}
            <TemplateList
                templates={filteredTemplates}
                isLoading={isLoading}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onDuplicate={handleDuplicateTemplate}
                onRefresh={fetchTemplates}
            />

            {/* Template Editor Modal */}
            {isEditorOpen && (
                <TemplateEditor
                    template={editingTemplate}
                    onSave={handleSaveTemplate}
                    onClose={() => {
                        setIsEditorOpen(false);
                        setEditingTemplate(null);
                    }}
                />
            )}

            {/* Sequence Editor Modal */}
            {isSequenceEditorOpen && (
                <SequenceEditor
                    template={editingTemplate}
                    onSave={handleSaveTemplate}
                    onClose={() => {
                        setIsSequenceEditorOpen(false);
                        setEditingTemplate(null);
                    }}
                />
            )}
        </div>
    );
}
