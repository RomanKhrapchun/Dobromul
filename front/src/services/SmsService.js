import API from "../http";
import { fetchTimeout } from "../utils/constants";

export default class SmsService {
    // === ШАБЛОНИ ===

    static async getTemplates() {
        return API.get('api/sms/templates', { timeout: fetchTimeout });
    }

    static async getTemplateById(id) {
        return API.get(`api/sms/templates/${id}`, { timeout: fetchTimeout });
    }

    static async createTemplate(data) {
        return API.post('api/sms/templates', data, { timeout: fetchTimeout });
    }

    static async updateTemplate(id, data) {
        return API.put(`api/sms/templates/${id}`, data, { timeout: fetchTimeout });
    }

    static async deleteTemplate(id) {
        return API.delete(`api/sms/templates/${id}`, { timeout: fetchTimeout });
    }

    // === ПОПЕРЕДНІЙ ПЕРЕГЛЯД ===

    static async previewSms(templateId, debtor) {
        return API.post('api/sms/preview', { templateId, debtor }, { timeout: fetchTimeout });
    }

    // === ВІДПРАВКА SMS ===

    static async sendSms(phone, text, templateId = null, debtor = null) {
        return API.post('api/sms/send', { phone, text, templateId, debtor }, { timeout: fetchTimeout });
    }

    static async sendSmsBatch(debtors, templateId = null, text = null) {
        return API.post('api/sms/send-batch', { debtors, templateId, text }, { timeout: 120000 });
    }

    // === ІСТОРІЯ ТА СТАТИСТИКА ===

    static async getHistory(filters = {}) {
        return API.post('api/sms/history', filters, { timeout: fetchTimeout });
    }

    static async getStats(dateFrom = null, dateTo = null) {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        const query = params.toString() ? `?${params.toString()}` : '';
        return API.get(`api/sms/stats${query}`, { timeout: fetchTimeout });
    }
}
