const { sqlRequest } = require('../../../helpers/database');

class SmsRepository {
    // === ШАБЛОНИ (локальна БД) ===

    async getTemplates() {
        const sql = `
            SELECT id, name, text, description, placeholders, is_active, created_at, updated_at, created_by
            FROM ower.sms_templates
            WHERE is_active = true
            ORDER BY created_at DESC
        `;
        return await sqlRequest(sql);
    }

    async getTemplateById(id) {
        const sql = `
            SELECT id, name, text, description, placeholders, is_active, created_at, updated_at, created_by
            FROM ower.sms_templates
            WHERE id = $1 AND is_active = true
        `;
        const result = await sqlRequest(sql, [id]);
        return result[0] || null;
    }

    async createTemplate(data) {
        const sql = `
            INSERT INTO ower.sms_templates (name, text, description, placeholders, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await sqlRequest(sql, [
            data.name,
            data.text,
            data.description || null,
            JSON.stringify(data.placeholders || []),
            data.createdBy || null
        ]);
        return result[0];
    }

    async updateTemplate(id, data) {
        const sql = `
            UPDATE ower.sms_templates
            SET
                name = COALESCE($1, name),
                text = COALESCE($2, text),
                description = COALESCE($3, description),
                placeholders = COALESCE($4, placeholders),
                updated_at = NOW()
            WHERE id = $5 AND is_active = true
            RETURNING *
        `;
        const result = await sqlRequest(sql, [
            data.name,
            data.text,
            data.description,
            data.placeholders ? JSON.stringify(data.placeholders) : null,
            id
        ]);
        return result[0] || null;
    }

    async deleteTemplate(id) {
        const sql = `
            UPDATE ower.sms_templates
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await sqlRequest(sql, [id]);
        return result[0] || null;
    }
}

module.exports = new SmsRepository();
