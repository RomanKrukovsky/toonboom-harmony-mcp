import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { rigTemplateSchema } from '../../schemas/rigTemplate.js';
export class RigTemplateRegistry {
    templates = new Map();
    builtinPath;
    constructor(builtinPath = path.join(process.cwd(), 'templates', 'rig', 'builtin')) {
        this.builtinPath = builtinPath;
    }
    async initialize() {
        try {
            const files = await fs.readdir(this.builtinPath);
            for (const file of files) {
                if (file.endsWith('.rig-template.json')) {
                    await this.loadTemplate(path.join(this.builtinPath, file));
                }
            }
        }
        catch (err) {
            console.warn(`Could not read templates directory: ${this.builtinPath}`, err);
        }
    }
    async loadTemplate(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        let jsonContent;
        try {
            jsonContent = JSON.parse(content);
        }
        catch (e) {
            throw new Error(`Invalid JSON in template ${filePath}`);
        }
        const validated = rigTemplateSchema.safeParse(jsonContent);
        if (!validated.success) {
            throw new Error(`Schema validation failed for template ${filePath}: ${validated.error.message}`);
        }
        const template = validated.data;
        // Calculate RFC 8785 canonical hash
        const canonicalStr = stringify(template);
        if (!canonicalStr) {
            throw new Error(`Failed to canonicalize template ${template.template_id}`);
        }
        const hash = crypto.createHash('sha256').update(canonicalStr).digest('hex');
        const contentHash = `sha256:${hash}`;
        const key = `${template.template_id}_v${template.version}`;
        this.templates.set(key, { template, contentHash });
        // Also set "latest" version pointer
        this.templates.set(template.template_id, { template, contentHash });
    }
    getTemplate(templateId, version) {
        const key = version ? `${templateId}_v${version}` : templateId;
        const entry = this.templates.get(key);
        if (!entry) {
            throw new Error(`Template not found: ${key}`);
        }
        return entry;
    }
    listTemplates() {
        return Array.from(this.templates.values());
    }
}
