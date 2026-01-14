/**
 * Template Service
 * Handles CRUD operations for message templates in the admin panel
 */

import { supabase } from '../../../lib/supabase';

export interface MessageTemplate {
    id: string;
    name: string;
    content: string;
    channel: 'sms' | 'email';
    category: string;
    workspace_id: string | null;
    is_sequence: boolean;
    is_favorite: boolean;
    messages: SequenceMessage[] | null;
    variables: string[];
    ai_generated: boolean;
    ai_prompt: Record<string, unknown> | null;
    generation_version: number;
    created_at: string;
    updated_at: string;
}

export interface SequenceMessage {
    text: string;
    order: number;
    subject: string;
    timeUnit: 'minutes' | 'hours' | 'days';
    timeValue: number;
    messageType: 'sms' | 'email';
}

export interface CreateTemplateData {
    name: string;
    content: string;
    channel: 'sms' | 'email';
    category: string;
    is_sequence?: boolean;
    messages?: SequenceMessage[];
    variables?: string[];
}

export interface UpdateTemplateData {
    name?: string;
    content?: string;
    channel?: 'sms' | 'email';
    category?: string;
    is_sequence?: boolean;
    messages?: SequenceMessage[];
    variables?: string[];
    is_favorite?: boolean;
}

class TemplateService {
    /**
     * Fetch all global templates (workspace_id IS NULL)
     */
    async listTemplates(): Promise<{ success: boolean; templates?: MessageTemplate[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .is('workspace_id', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching templates:', error);
                return { success: false, error: error.message };
            }

            return { success: true, templates: data as MessageTemplate[] };
        } catch (error) {
            console.error('Exception in listTemplates:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Get a single template by ID
     */
    async getTemplate(templateId: string): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('message_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) {
                console.error('Error fetching template:', error);
                return { success: false, error: error.message };
            }

            return { success: true, template: data as MessageTemplate };
        } catch (error) {
            console.error('Exception in getTemplate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Create a new global template
     */
    async createTemplate(templateData: CreateTemplateData): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
        try {
            const insertData = {
                ...templateData,
                workspace_id: null, // Global template
                is_sequence: templateData.is_sequence || false,
                messages: templateData.messages || null,
                variables: templateData.variables || [],
            };

            const { data, error } = await supabase
                .from('message_templates')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('Error creating template:', error);
                return { success: false, error: error.message };
            }

            return { success: true, template: data as MessageTemplate };
        } catch (error) {
            console.error('Exception in createTemplate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Update an existing template
     */
    async updateTemplate(templateId: string, templateData: UpdateTemplateData): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
        try {
            const updateData = {
                ...templateData,
                updated_at: new Date().toISOString(),
            };

            console.log('TemplateService: Updating template', templateId, 'with data:', updateData);

            const { data, error } = await supabase
                .from('message_templates')
                .update(updateData)
                .eq('id', templateId)
                .is('workspace_id', null) // Only update global templates
                .select();

            console.log('TemplateService: Update result - data:', data, 'error:', error);

            if (error) {
                console.error('Error updating template:', error);
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                console.error('No rows updated - template may not exist or is not a global template');
                return { success: false, error: 'Template not found or update not permitted' };
            }

            return { success: true, template: data[0] as MessageTemplate };
        } catch (error) {
            console.error('Exception in updateTemplate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('message_templates')
                .delete()
                .eq('id', templateId)
                .is('workspace_id', null); // Only delete global templates

            if (error) {
                console.error('Error deleting template:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Exception in deleteTemplate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Duplicate a template
     */
    async duplicateTemplate(templateId: string): Promise<{ success: boolean; template?: MessageTemplate; error?: string }> {
        try {
            // First, get the original template
            const { template, error: fetchError } = await this.getTemplate(templateId);

            if (fetchError || !template) {
                return { success: false, error: fetchError || 'Template not found' };
            }

            // Create a copy with modified name
            const duplicateData: CreateTemplateData = {
                name: `${template.name} (Copy)`,
                content: template.content,
                channel: template.channel,
                category: template.category,
                is_sequence: template.is_sequence,
                messages: template.messages || undefined,
                variables: template.variables,
            };

            return this.createTemplate(duplicateData);
        } catch (error) {
            console.error('Exception in duplicateTemplate:', error);
            return { success: false, error: (error as Error).message };
        }
    }
}

export const templateService = new TemplateService();
