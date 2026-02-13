const smsService = require('../service/sms-service');

class SmsController {
    // === ШАБЛОНИ ===

    async getTemplates(request, reply) {
        try {
            const templates = await smsService.getTemplates();

            return reply.send({
                error: false,
                data: templates
            });
        } catch (error) {
            console.error('Error in getTemplates:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання шаблонів SMS'
            });
        }
    }

    async getTemplateById(request, reply) {
        try {
            const { id } = request.params;
            const template = await smsService.getTemplateById(id);

            if (!template) {
                return reply.code(404).send({
                    error: true,
                    message: 'Шаблон не знайдено'
                });
            }

            return reply.send({
                error: false,
                data: template
            });
        } catch (error) {
            console.error('Error in getTemplateById:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання шаблону'
            });
        }
    }

    async createTemplate(request, reply) {
        try {
            const data = request.body;
            // ID користувача може бути занадто великим для INTEGER типу, тому встановлюємо null
            data.createdBy = null;

            const template = await smsService.createTemplate(data);

            return reply.code(201).send({
                error: false,
                data: template,
                message: 'Шаблон успішно створено'
            });
        } catch (error) {
            console.error('Error in createTemplate:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка створення шаблону'
            });
        }
    }

    async updateTemplate(request, reply) {
        try {
            const { id } = request.params;
            const data = request.body;

            const template = await smsService.updateTemplate(id, data);

            if (!template) {
                return reply.code(404).send({
                    error: true,
                    message: 'Шаблон не знайдено'
                });
            }

            return reply.send({
                error: false,
                data: template,
                message: 'Шаблон успішно оновлено'
            });
        } catch (error) {
            console.error('Error in updateTemplate:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка оновлення шаблону'
            });
        }
    }

    async deleteTemplate(request, reply) {
        try {
            const { id } = request.params;
            const template = await smsService.deleteTemplate(id);

            if (!template) {
                return reply.code(404).send({
                    error: true,
                    message: 'Шаблон не знайдено'
                });
            }

            return reply.send({
                error: false,
                message: 'Шаблон успішно видалено'
            });
        } catch (error) {
            console.error('Error in deleteTemplate:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка видалення шаблону'
            });
        }
    }

    // === ПОПЕРЕДНІЙ ПЕРЕГЛЯД ===

    async previewSms(request, reply) {
        try {
            const { templateId, debtor } = request.body;

            const preview = await smsService.previewSms(templateId, debtor);

            return reply.send({
                error: false,
                data: preview
            });
        } catch (error) {
            console.error('Error in previewSms:', error);
            return reply.code(500).send({
                error: true,
                message: error.message || 'Помилка попереднього перегляду'
            });
        }
    }

    // === ВІДПРАВКА SMS ===

    async sendSms(request, reply) {
        try {
            const { phone, text, templateId, debtor } = request.body;

            let smsText = text;

            // Якщо передано templateId та debtor, рендеримо шаблон
            if (templateId && debtor) {
                smsText = await smsService.renderTemplate(templateId, debtor);
            }

            if (!smsText) {
                return reply.code(400).send({
                    error: true,
                    message: 'Текст SMS обов\'язковий'
                });
            }

            const result = await smsService.sendSms(phone, smsText);

            return reply.send({
                error: false,
                data: result,
                message: 'SMS успішно відправлено'
            });
        } catch (error) {
            console.error('Error in sendSms:', error);
            return reply.code(500).send({
                error: true,
                message: error.message || 'Помилка відправки SMS'
            });
        }
    }

    async sendSmsBatch(request, reply) {
        try {
            const { debtors, templateId, text } = request.body;

            if (!debtors || !Array.isArray(debtors) || debtors.length === 0) {
                return reply.code(400).send({
                    error: true,
                    message: 'Список боржників обов\'язковий'
                });
            }

            // Підготовка повідомлень
            const messages = {};
            console.log('📧 Отримано боржників для SMS:', debtors.length);
            let messageIndex = 0;

            for (const debtor of debtors) {
                console.log(`📧 Обробка боржника: ${debtor.name} (id: ${debtor.id}, phone: ${debtor.phone})`);

                if (!debtor.phone) {
                    console.log('⚠️ Пропущено - немає телефону');
                    continue;
                }

                let smsText = text;
                if (templateId) {
                    smsText = await smsService.renderTemplate(templateId, debtor);
                }

                if (smsText) {
                    // Унікальний ключ: id + номер телефону (очищений від +)
                    const phoneKey = debtor.phone.replace(/\+/g, '');
                    const uniqueKey = `debtor_${debtor.id}_${phoneKey}`;

                    messages[uniqueKey] = {
                        phone: debtor.phone,
                        text: smsText
                    };
                    messageIndex++;
                    console.log(`✅ Додано до відправки (#${messageIndex}): ${uniqueKey} → ${debtor.phone}`);
                }
            }

            console.log('📧 Всього сформовано повідомлень:', Object.keys(messages).length);

            if (Object.keys(messages).length === 0) {
                return reply.code(400).send({
                    error: true,
                    message: 'Немає валідних номерів для відправки'
                });
            }

            const result = await smsService.sendSmsBatch(messages);

            return reply.send({
                error: false,
                data: result,
                message: `Відправлено ${result.total_sent} з ${result.total_count} SMS`
            });
        } catch (error) {
            console.error('Error in sendSmsBatch:', error);
            return reply.code(500).send({
                error: true,
                message: error.message || 'Помилка масової відправки SMS'
            });
        }
    }

    // === ІСТОРІЯ ТА СТАТИСТИКА ===

    async getHistory(request, reply) {
        try {
            const filters = request.body || {};
            const result = await smsService.getHistory(filters);

            return reply.send({
                error: false,
                data: result.data || result
            });
        } catch (error) {
            console.error('Error in getHistory:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання історії SMS'
            });
        }
    }

    async getStats(request, reply) {
        try {
            const { dateFrom, dateTo } = request.query;
            const result = await smsService.getStats(dateFrom, dateTo);

            return reply.send({
                error: false,
                data: result.data || result
            });
        } catch (error) {
            console.error('Error in getStats:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання статистики SMS'
            });
        }
    }
}

module.exports = new SmsController();
