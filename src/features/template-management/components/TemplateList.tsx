import { Edit2, Copy, Trash2, Eye, RefreshCw, Mail, MessageSquare, Layers } from 'lucide-react';
import { MessageTemplate } from '../services/templateService';

interface TemplateListProps {
    templates: MessageTemplate[];
    isLoading: boolean;
    onEdit: (template: MessageTemplate) => void;
    onDelete: (templateId: string) => void;
    onDuplicate: (templateId: string) => void;
    onRefresh: () => void;
}

export function TemplateList({
    templates,
    isLoading,
    onEdit,
    onDelete,
    onDuplicate,
    onRefresh,
}: TemplateListProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
                </div>
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                <Layers className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No templates found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
                    Get started by creating a new template or sequence for your customers.
                </p>
            </div>
        );
    }

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'onboarding':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            case 'promotional':
                return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300';
            case 'follow-up':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'transactional':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {templates.length} template{templates.length !== 1 ? 's' : ''}
                </span>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {templates.map((template) => (
                            <tr
                                key={template.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {template.name}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                            {template.is_sequence
                                                ? `${template.messages?.length || 0} messages`
                                                : template.content.substring(0, 60) + (template.content.length > 60 ? '...' : '')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {template.is_sequence ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                                <Layers className="w-3.5 h-3.5" />
                                                Sequence
                                            </span>
                                        ) : template.channel === 'sms' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                SMS
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                                <Mail className="w-3.5 h-3.5" />
                                                Email
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                                        {template.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(template.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onEdit(template)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDuplicate(template.id)}
                                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(template.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
