const smsRepository = require('../repository/sms-repository');
const rabbitmqClient = require('../../../helpers/rabbitmq');
const Logger = require('../../../utils/logger');
const communityValidator = require('../../../utils/communityValidator');
const communitySettingsService = require('../../community_settings/service/communitySettings-service');

class SmsService {
    // === ОТРИМАННЯ COMMUNITY_NAME ===

    /**
     * Отримує community_name з кешованих налаштувань або .env (fallback)
     * @returns {Promise<string>}
     */
    async getCommunityName() {
        const communityName = await communitySettingsService.getCommunityName();
        if (communityName) {
            return communityName;
        }
        // Fallback до .env
        return process.env.COMMUNITY_NAME;
    }

    // === ШАБЛОНИ (локальна БД) ===

    async getTemplates() {
        return await smsRepository.getTemplates();
    }

    async getTemplateById(id) {
        return await smsRepository.getTemplateById(id);
    }

    async createTemplate(data) {
        return await smsRepository.createTemplate(data);
    }

    async updateTemplate(id, data) {
        return await smsRepository.updateTemplate(id, data);
    }

    async deleteTemplate(id) {
        return await smsRepository.deleteTemplate(id);
    }

    // === РЕНДЕР ШАБЛОНУ ===

    async renderTemplate(templateId, debtor) {
        const template = await smsRepository.getTemplateById(templateId);
        if (!template) {
            throw new Error('Шаблон не знайдено');
        }

        let text = template.text;

        // Обчислення загальної суми боргу
        const totalDebt = (parseFloat(debtor.non_residential_debt) || 0) +
            (parseFloat(debtor.residential_debt) || 0) +
            (parseFloat(debtor.land_debt) || 0) +
            (parseFloat(debtor.orenda_debt) || 0) +
            (parseFloat(debtor.mpz) || 0);

        // Плейсхолдери для підстановки
        const replacements = {
            '{{name}}': debtor.name || '',
            '{{debt_amount}}': totalDebt.toFixed(2),
            '{{address}}': debtor.address || '',
            '{{phone}}': debtor.phone || '',
            '{{date}}': new Date().toLocaleDateString('uk-UA'),
            '{{identification}}': debtor.identification || ''
        };

        // Підстановка плейсхолдерів
        for (const [placeholder, value] of Object.entries(replacements)) {
            text = text.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        }

        return text;
    }

    // === ПОПЕРЕДНІЙ ПЕРЕГЛЯД ===

    async previewSms(templateId, debtor) {
        const text = await this.renderTemplate(templateId, debtor);
        const segmentsCount = this.calculateSegments(text);

        return {
            text,
            segmentsCount,
            charactersCount: text.length
        };
    }

    // Розрахунок кількості SMS сегментів
    calculateSegments(text) {
        const hasUnicode = /[^\x00-\x7F]/.test(text);
        const maxLength = hasUnicode ? 70 : 160;
        const concatMaxLength = hasUnicode ? 67 : 153;

        if (text.length <= maxLength) {
            return 1;
        }
        return Math.ceil(text.length / concatMaxLength);
    }

    // === ВІДПРАВКА SMS (через RabbitMQ) ===

    async sendSms(phone, text) {
        Logger.info('[SMS] sendSms: Початок відправки SMS', { phone, textLength: text?.length });

        // Отримуємо community_name з БД або .env
        const communityName = await this.getCommunityName();
        Logger.info('[SMS] sendSms: Отримано community_name', {
            communityName,
            type: typeof communityName
        });

        // Валідація community_name
        Logger.info('[SMS] sendSms: Передаємо на валідацію', { communityName });
        const validation = await communityValidator.validate(communityName);
        Logger.info('[SMS] sendSms: Результат валідації', {
            isValid: validation.isValid,
            error: validation.error,
            validatedCommunityName: validation.communityName
        });

        if (!validation.isValid) {
            Logger.error('[SMS] sendSms: Валідація не пройдена', {
                error: validation.error,
                communityName
            });
            throw new Error(validation.error);
        }

        // Валідація номера телефону
        const normalizedPhone = this.normalizePhone(phone);
        if (!normalizedPhone) {
            throw new Error('Невірний формат номера телефону');
        }

        try {
            Logger.info('Відправка SMS', { phone: normalizedPhone, textLength: text.length });

            const result = await rabbitmqClient.sendTaskWithReply(
                'send_sms',
                {
                    community_name: communityName,
                    phone: normalizedPhone,
                    text: text
                },
                60000
            );

            Logger.info('SMS відправлено', { result });
            return result;
        } catch (error) {
            Logger.error('Помилка відправки SMS', { error: error.message, phone: normalizedPhone });
            throw error;
        }
    }

    async sendSmsBatch(messages) {
        // Отримуємо community_name з БД або .env
        const communityName = await this.getCommunityName();

        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        // Підготовка повідомлень
        const preparedMessages = {};
        Logger.info('🔧 Отримано messages для обробки', { count: Object.keys(messages).length });

        for (const [key, msg] of Object.entries(messages)) {
            Logger.info(`🔧 Обробка: ${key} → ${msg.phone}`);
            const normalizedPhone = this.normalizePhone(msg.phone);
            if (normalizedPhone) {
                preparedMessages[key] = {
                    phone: normalizedPhone,
                    text: msg.text
                };
                Logger.info(`✅ Додано: ${key} → ${normalizedPhone}`);
            } else {
                Logger.warn(`⚠️ Відхилено (невалідний номер): ${key} → ${msg.phone}`);
            }
        }

        if (Object.keys(preparedMessages).length === 0) {
            throw new Error('Немає валідних номерів для відправки');
        }

        try {
            Logger.info('Масова відправка SMS', { count: Object.keys(preparedMessages).length });

            const result = await rabbitmqClient.sendTaskWithReply(
                'send_sms_batch',
                {
                    community_name: communityName,
                    messages: preparedMessages
                },
                120000
            );

            Logger.info('Batch SMS відправлено', { totalSent: result.total_sent });
            return result;
        } catch (error) {
            Logger.error('Помилка batch відправки SMS', { error: error.message });
            throw error;
        }
    }

    // === ІСТОРІЯ ТА СТАТИСТИКА (з Worker через RabbitMQ) ===

    async getHistory(filters = {}) {
        // Отримуємо community_name з БД або .env
        const communityName = await this.getCommunityName();

        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                {
                    community_name: communityName,
                    query_type: 'get_community_sms_list',
                    params: {
                        phones: filters.phones || null,
                        status: filters.status || null,
                        date_from: filters.dateFrom || null,
                        date_to: filters.dateTo || null,
                        limit: filters.limit || 100,
                        offset: filters.offset || 0
                    }
                },
                60000
            );

            // Додаємо ПІБ боржників по телефонам
            if (result.success && result.data && result.data.sms_list) {
                const smsList = result.data.sms_list;
                const phones = [...new Set(smsList.map(sms => sms.phone).filter(Boolean))];

                if (phones.length > 0) {
                    // Отримуємо боржників по телефонам
                    const debtorsMap = await this.getDebtorsByPhones(phones);

                    // Додаємо ПІБ до кожного SMS
                    result.data.sms_list = smsList.map(sms => ({
                        ...sms,
                        debtor_name: debtorsMap[sms.phone] || null
                    }));
                }
            }

            return result;
        } catch (error) {
            Logger.error('Помилка отримання історії SMS', { error: error.message });
            throw error;
        }
    }

    async getDebtorsByPhones(phones) {
        const { pool } = require('../../../helpers/database');

        try {
            if (!phones || phones.length === 0) {
                return {};
            }

            // Нормалізуємо телефони (видаляємо всі символи крім цифр)
            const normalizedPhones = phones.map(phone =>
                phone.replace(/\D/g, '')
            );

            // Формуємо умову для пошуку по нормалізованих телефонах
            const phoneConditions = normalizedPhones.map((_, index) =>
                `REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $${index + 1}`
            ).join(' OR ');

            const query = `
                SELECT DISTINCT name, phone, REGEXP_REPLACE(phone, '[^0-9]', '', 'g') as normalized_phone
                FROM ower.phone
                WHERE ${phoneConditions}
            `;

            const result = await pool.query(query, normalizedPhones);

            Logger.info('📱 SQL результат', {
                rowsCount: result.rows.length,
                rows: result.rows
            });

            // Створюємо мапу нормалізований_телефон -> ПІБ
            const debtorsMap = {};
            result.rows.forEach(row => {
                const normalizedPhone = row.normalized_phone;
                if (normalizedPhone && !debtorsMap[normalizedPhone]) {
                    debtorsMap[normalizedPhone] = row.name;
                }
            });

            Logger.info('📱 debtorsMap (нормалізовані)', debtorsMap);

            // Тепер мапимо оригінальні телефони на ПІБ
            const finalMap = {};
            phones.forEach(phone => {
                const normalized = phone.replace(/\D/g, '');
                Logger.info(`📱 Мапінг: ${phone} -> normalized: ${normalized} -> name: ${debtorsMap[normalized]}`);
                if (debtorsMap[normalized]) {
                    finalMap[phone] = debtorsMap[normalized];
                }
            });

            Logger.info('📱 finalMap (результат)', {
                requested: phones.length,
                found: Object.keys(finalMap).length,
                map: finalMap
            });

            return finalMap;
        } catch (error) {
            Logger.error('Помилка отримання боржників по телефонам', { error: error.message });
            return {}; // Повертаємо порожню мапу в разі помилки
        }
    }

    async getStats(dateFrom, dateTo) {
        // Отримуємо community_name з БД або .env
        const communityName = await this.getCommunityName();

        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                {
                    community_name: communityName,
                    query_type: 'get_community_sms_stats',
                    params: {
                        date_from: dateFrom || null,
                        date_to: dateTo || null
                    }
                },
                60000
            );

            return result;
        } catch (error) {
            Logger.error('Помилка отримання статистики SMS', { error: error.message });
            throw error;
        }
    }

    // === ДОПОМІЖНІ МЕТОДИ ===

    normalizePhone(phone) {
        if (!phone) return null;

        // Видаляємо всі символи крім цифр
        let normalized = phone.replace(/\D/g, '');

        // Якщо починається з 0, додаємо 38
        if (normalized.startsWith('0') && normalized.length === 10) {
            normalized = '38' + normalized;
        }

        // Якщо починається з 380 і має 12 цифр - валідний
        if (normalized.startsWith('380') && normalized.length === 12) {
            return normalized;
        }

        return null;
    }
}

module.exports = new SmsService();
