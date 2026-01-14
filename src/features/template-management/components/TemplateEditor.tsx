import { useState } from 'react';
import { X, Save, MessageSquare, Mail } from 'lucide-react';
import { templateService, MessageTemplate, CreateTemplateData, UpdateTemplateData } from '../services/templateService';

interface TemplateEditorProps {
    template: MessageTemplate | null;
    onSave: () => void;
    onClose: () => void;
}

const CATEGORIES = ['Onboarding', 'Promotional', 'Follow-up', 'Transactional'];

export function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
    const [name, setName] = useState(template?.name || '');
    const [content, setContent] = useState(template?.content || '');
    const [channel, setChannel] = useState<'sms' | 'email'>(template?.channel || 'sms');
    const [category, setCategory] = useState(template?.category || 'Onboarding');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!template;

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Please enter a template name');
            return;
        }
        if (!content.trim()) {
            setError('Please enter template content');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            let result;
            if (isEditing) {
                const updateData: UpdateTemplateData = {
                    name,
                    content,
                    channel,
                    category,
                };
                result = await templateService.updateTemplate(template.id, updateData);
            } else {
                const createData: CreateTemplateData = {
                    name,
                    content,
                    channel,
                    category,
                };
                result = await templateService.createTemplate(createData);
            }

            if (result.success) {
                onSave();
            } else {
                setError(result.error || 'Failed to save template');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    // Extract merge fields from content
    const mergeFields = content.match(/\{\{[^}]+\}\}/g) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {isEditing ? 'Edit Template' : 'Create Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Welcome Message"
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Channel */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Channel
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setChannel('sms')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${channel === 'sms'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}
                            >
                                <MessageSquare className="w-5 h-5" />
                                SMS
                            </button>
                            <button
                                type="button"
                                onClick={() => setChannel('email')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${channel === 'email'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}
                            >
                                <Mail className="w-5 h-5" />
                                Email
                            </button>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={channel === 'email'
                                ? "Hi {{firstName}},\n\nThank you for your interest..."
                                : "Hi {{firstName}}, thanks for reaching out!"}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                            Use {"{{fieldName}}"} for merge fields, e.g., {"{{firstName}}"}, {"{{companyName}}"}
                        </p>
                    </div>

                    {/* Merge Fields Preview */}
                    {mergeFields.length > 0 && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                                Merge Fields Detected
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {mergeFields.map((field, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-mono"
                                    >
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
