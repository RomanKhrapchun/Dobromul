const owerSettingsService = require('../service/owerSettings-service');

class OwerSettingsController {
    async getSettings(request, reply) {
        try {
            const settings = await owerSettingsService.getSettings();

            if (!settings) {
                return reply.code(404).send({
                    error: true,
                    message: 'Налаштування реквізитів не знайдено'
                });
            }

            return reply.send({
                error: false,
                data: settings
            });
        } catch (error) {
            console.error('Error in getSettings:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання налаштувань реквізитів'
            });
        }
    }

    async getPublicSettings(request, reply) {
        try {
            const settings = await owerSettingsService.getSettings();

            if (!settings) {
                return reply.code(404).send({
                    error: true,
                    message: 'Налаштування реквізитів не знайдено'
                });
            }

            return reply.send({
                error: false,
                data: settings
            });
        } catch (error) {
            console.error('Error in getPublicSettings:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка отримання налаштувань реквізитів'
            });
        }
    }

    async updateSettings(request, reply) {
        try {
            const settings = request.body;

            const updated = await owerSettingsService.updateSettings(settings);

            return reply.send({
                error: false,
                data: updated,
                message: 'Налаштування реквізитів успішно оновлено'
            });
        } catch (error) {
            console.error('Error in updateSettings:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка оновлення налаштувань реквізитів'
            });
        }
    }

    async invalidateCache(request, reply) {
        try {
            await owerSettingsService.invalidateCache();

            return reply.send({
                error: false,
                message: 'Кеш налаштувань реквізитів очищено'
            });
        } catch (error) {
            console.error('Error in invalidateCache:', error);
            return reply.code(500).send({
                error: true,
                message: 'Помилка очищення кешу'
            });
        }
    }
}

module.exports = new OwerSettingsController();
