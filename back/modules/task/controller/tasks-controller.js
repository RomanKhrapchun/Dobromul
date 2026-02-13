const tasksService = require('../service/tasks-service');
const Logger = require('../../../utils/logger');
const communityValidator = require('../../../utils/communityValidator');

class tasksController {
    constructor() {
        // Прив'язуємо методи до контексту для правильної роботи this
        this.processDebtorRegister = this.processDebtorRegister.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
        this.updateDatabaseCheck = this.updateDatabaseCheck.bind(this);
        this.previewDatabaseUpdate = this.previewDatabaseUpdate.bind(this);
        this.getAvailableDates = this.getAvailableDates.bind(this);
        this.updateDatabaseExecute = this.updateDatabaseExecute.bind(this);
    }

    /**
     * Отримати та валідувати community_name з request або .env
     * @returns {Promise<string|null>} Валідний community_name або null
     */
    async getCommunityName(request, source = 'body') {
        // Спочатку шукаємо в request
        const communityNameFromRequest = source === 'query'
            ? request.query?.community_name
            : request.body?.community_name;

        // Перевіряємо значення з request
        if (communityNameFromRequest) {
            const validation = await communityValidator.validate(communityNameFromRequest);
            if (validation.isValid) {
                return validation.communityName;
            }
            Logger.warn('community_name з request не пройшов валідацію', {
                communityName: communityNameFromRequest,
                error: validation.error
            });
        }

        // Якщо в request немає або він невалідний, шукаємо в .env
        const communityNameFromEnv = process.env.COMMUNITY_NAME;

        if (communityNameFromEnv) {
            const validation = await communityValidator.validate(communityNameFromEnv);
            if (validation.isValid) {
                Logger.info('Використано COMMUNITY_NAME з .env файлу', {
                    communityName: validation.communityName
                });
                return validation.communityName;
            }
            Logger.warn('COMMUNITY_NAME з .env не пройшов валідацію', {
                communityName: communityNameFromEnv,
                error: validation.error
            });
        }

        // Якщо нічого не знайдено або не пройшло валідацію, повертаємо null
        return null;
    }
    /**
     * POST /api/taskss/process-register
     * Обробити реєстр боржників та отримати контрольні суми
     */
    async processDebtorRegister(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            Logger.info('Запит на обробку реєстру', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.processDebtorRegister(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в processDebtorRegister', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/send-email
     * Відправити email з результатами
     */
    async sendEmail(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            Logger.info('Запит на відправку email', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.sendEmail(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в sendEmail', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Email може бути відправлено пізніше.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/update-database-check
     * Отримати контрольні суми для оновлення бази даних
     */
    async updateDatabaseCheck(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            Logger.info('Запит на перевірку оновлення бази даних', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.updateDatabaseCheck(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в updateDatabaseCheck', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * GET /api/taskss/database/preview
     * Отримати попередній перегляд даних з віддаленої БД
     * Query params: community_name, date (optional, format: YYYY-MM-DD)
     */
    async previewDatabaseUpdate(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'query');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            // Отримуємо опціональний параметр дати (формат: YYYY-MM-DD)
            const date = request.query?.date || null;

            Logger.info('Запит попереднього перегляду оновлення БД', {
                communityName: community_name,
                date: date || 'latest',
                userId: request?.user?.id
            });

            // Отримуємо статистику з віддаленої БД
            const result = await tasksService.previewDatabaseUpdate(community_name, date);

            return reply.status(200).send(result);

        } catch (error) {
            Logger.error('Помилка в previewDatabaseUpdate', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * GET /api/taskss/database/available-dates
     * Отримати список доступних дат реєстрів
     * Query params: community_name
     */
    async getAvailableDates(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'query');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            Logger.info('Запит списку доступних дат', {
                communityName: community_name,
                userId: request?.user?.id
            });

            const result = await tasksService.getAvailableDates(community_name);

            return reply.status(200).send(result);

        } catch (error) {
            Logger.error('Помилка в getAvailableDates', {
                error: error.message,
                stack: error.stack
            });

            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/update-database-execute
     * Виконати оновлення локальної бази даних
     */
    async updateDatabaseExecute(request, reply) {
        try {
            const community_name = await this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано валідний community_name (ні в запиті, ні в .env) або він не знайдений в базі даних'
                });
            }

            Logger.info('Запит на виконання оновлення бази даних', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.updateDatabaseExecute(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в updateDatabaseExecute', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Оновлення може виконуватись у фоні.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }
}

module.exports = new tasksController();