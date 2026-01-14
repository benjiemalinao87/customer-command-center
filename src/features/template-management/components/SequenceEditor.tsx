import { useState } from 'react';
import { X, Save, Plus, Trash2, MessageSquare, Mail, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { templateService, MessageTemplate, SequenceMessage, CreateTemplateData, UpdateTemplateData } from '../services/templateService';

interface SequenceEditorProps {
    template: MessageTemplate | null;
    onSave: () => void;
    onClose: () => void;
}

const CATEGORIES = ['Onboarding', 'Promotional', 'Follow-up', 'Transactional'];
const TIME_UNITS: ('minutes' | 'hours' | 'days')[] = ['minutes', 'hours', 'days'];

const createEmptyMessage = (order: number): SequenceMessage => ({
    text: '',
    order,
    subject: '',
    timeUnit: order === 0 ? 'minutes' : 'days',
    timeValue: order === 0 ? 0 : 1,
    messageType: 'sms',
});

export function SequenceEditor({ template, onSave, onClose }: SequenceEditorProps) {
    const [name, setName] = useState(template?.name || '');
    const [category, setCategory] = useState(template?.category || 'Onboarding');
    const [messages, setMessages] = useState<SequenceMessage[]>(
        template?.messages && template.messages.length > 0
            ? template.messages
            : [createEmptyMessage(0)]
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!template;
    const selectedMessage = messages[selectedIndex] || messages[0];

    const handleAddMessage = () => {
        const newMessage = createEmptyMessage(messages.length);
        setMessages([...messages, newMessage]);
        setSelectedIndex(messages.length);
    };

    const handleDeleteMessage = (index: number) => {
        if (messages.length <= 1) return;

        const newMessages = messages.filter((_, i) => i !== index).map((msg, i) => ({
            ...msg,
            order: i,
        }));
        setMessages(newMessages);

        if (selectedIndex >= newMessages.length) {
            setSelectedIndex(newMessages.length - 1);
        } else if (selectedIndex === index) {
            setSelectedIndex(Math.max(0, index - 1));
        }
    };

    const handleMoveMessage = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === messages.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newMessages = [...messages];
        [newMessages[index], newMessages[newIndex]] = [newMessages[newIndex], newMessages[index]];

        // Update order numbers
        newMessages.forEach((msg, i) => { msg.order = i; });

        setMessages(newMessages);
        setSelectedIndex(newIndex);
    };

    const handleUpdateMessage = (field: keyof SequenceMessage, value: unknown) => {
        const newMessages = [...messages];
        newMessages[selectedIndex] = {
            ...newMessages[selectedIndex],
            [field]: value,
        };
        setMessages(newMessages);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Please enter a sequence name');
            return;
        }

        const emptyMessage = messages.find(m => !m.text.trim());
        if (emptyMessage) {
            setError('All messages must have content');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            let result;
            if (isEditing) {
                const updateData: UpdateTemplateData = {
                    name,
                    category,
                    messages,
                    is_sequence: true,
                    content: messages[0]?.text || '',
                    channel: messages[0]?.messageType || 'sms',
                };
                result = await templateService.updateTemplate(template.id, updateData);
            } else {
                const createData: CreateTemplateData = {
                    name,
                    category,
                    messages,
                    is_sequence: true,
                    content: messages[0]?.text || '',
                    channel: messages[0]?.messageType || 'sms',
                };
                result = await templateService.createTemplate(createData);
            }

            if (result.success) {
                onSave();
            } else {
                setError(result.error || 'Failed to save sequence');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDelay = (msg: SequenceMessage, index: number) => {
        if (index === 0 && msg.timeValue === 0) return 'Immediately';
        return `${msg.timeValue} ${msg.timeUnit}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sequence Name..."
                            className="text-xl font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:ring-0 focus:outline-none placeholder-gray-400"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {messages.length} step{messages.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Timeline */}
                    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Sequence Timeline
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedIndex(index)}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIndex === index
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                                        }`}
                                >
                                    {/* Step indicator */}
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${msg.messageType === 'email'
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                        : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                        }`}>
                                        {msg.messageType === 'email' ? (
                                            <Mail className="w-4 h-4" />
                                        ) : (
                                            <MessageSquare className="w-4 h-4" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                {msg.messageType === 'email' ? 'Email' : 'SMS'} {index + 1}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDelay(msg, index)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {msg.text || 'Empty message...'}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveMessage(index, 'up'); }}
                                            disabled={index === 0}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveMessage(index, 'down'); }}
                                            disabled={index === messages.length - 1}
                                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleAddMessage}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Message
                            </button>
                        </div>
                    </div>

                    {/* Center Panel - Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Step Configuration
                            </p>
                            {messages.length > 1 && (
                                <button
                                    onClick={() => handleDeleteMessage(selectedIndex)}
                                    className="flex items-center gap-1.5 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Delay */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Wait for</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={selectedMessage.timeValue}
                                    onChange={(e) => handleUpdateMessage('timeValue', parseInt(e.target.value) || 0)}
                                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-center"
                                />
                                <select
                                    value={selectedMessage.timeUnit}
                                    onChange={(e) => handleUpdateMessage('timeUnit', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                >
                                    {TIME_UNITS.map((unit) => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                                <span className="text-sm text-gray-600 dark:text-gray-400">then send a</span>
                            </div>

                            {/* Message Type */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMessage('messageType', 'sms')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${selectedMessage.messageType === 'sms'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    SMS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMessage('messageType', 'email')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${selectedMessage.messageType === 'email'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    <Mail className="w-4 h-4" />
                                    Email
                                </button>
                            </div>

                            {/* Subject (for email) */}
                            {selectedMessage.messageType === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Subject Line
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedMessage.subject}
                                        onChange={(e) => handleUpdateMessage('subject', e.target.value)}
                                        placeholder="Enter email subject..."
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Message Content
                                </label>
                                <textarea
                                    value={selectedMessage.text}
                                    onChange={(e) => handleUpdateMessage('text', e.target.value)}
                                    placeholder={selectedMessage.messageType === 'email'
                                        ? "Hi {{firstName}},\n\nThank you for your interest..."
                                        : "Hi {{firstName}}, thanks for reaching out!"}
                                    rows={8}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                                />
                                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    Use {"{{fieldName}}"} for merge fields
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {messages.length} message{messages.length !== 1 ? 's' : ''} in sequence
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : isEditing ? 'Update Sequence' : 'Create Sequence'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
