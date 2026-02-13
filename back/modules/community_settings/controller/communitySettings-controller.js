const communitySettingsService = require('../service/communitySettings-service');
const Logger = require('../../../utils/logger');

class CommunitySettingsController {

    async getSettings(request, reply) {
        try {
            const settings = await communitySettingsService.getSettings();

            if (!settings) {
                return reply.status(404).send({
                    error: true,
                    message: 'Налаштування громади не знайдено'
                });
            }

            // Transform to frontend format
            const transformed = communitySettingsService.transformToFrontend(settings);

            return reply.send({
                error: false,
                data: transformed
            });
        } catch (error) {
            Logger.error('Error in getSettings controller:', error);
            return reply.status(500).send({
                error: true,
                message: 'Помилка при отриманні налаштувань'
            });
        }
    }

    // Public endpoint - no auth required, for frontend initial load
    async getPublicSettings(request, reply) {
        try {
            const settings = await communitySettingsService.getSettings();

            if (!settings) {
                return reply.status(404).send({
                    error: true,
                    message: 'Налаштування громади не знайдено'
                });
            }

            // Transform to frontend format
            const transformed = communitySettingsService.transformToFrontend(settings);

            return reply.send({
                error: false,
                data: transformed
            });
        } catch (error) {
            Logger.error('Error in getPublicSettings controller:', error);
            return reply.status(500).send({
                error: true,
                message: 'Помилка при отриманні налаштувань'
            });
        }
    }

    async updateSettings(request, reply) {
        try {
            const settingsData = request.body;

            // Transform from frontend to DB format
            const dbSettings = communitySettingsService.transformToDb(settingsData);

            const updated = await communitySettingsService.updateSettings(dbSettings);

            if (!updated) {
                return reply.status(404).send({
                    error: true,
                    message: 'Налаштування не знайдено для оновлення'
                });
            }

            // Transform back to frontend format
            const transformed = communitySettingsService.transformToFrontend(updated);

            return reply.send({
                error: false,
                message: 'Налаштування успішно оновлено',
                data: transformed
            });
        } catch (error) {
            Logger.error('Error in updateSettings controller:', error);
            return reply.status(500).send({
                error: true,
                message: 'Помилка при оновленні налаштувань'
            });
        }
    }

    async createSettings(request, reply) {
        try {
            const settingsData = request.body;

            // Check if settings already exist
            const existing = await communitySettingsService.getSettings();
            if (existing) {
                return reply.status(400).send({
                    error: true,
                    message: 'Налаштування громади вже існують. Використовуйте PUT для оновлення.'
                });
            }

            // Transform from frontend to DB format
            const dbSettings = communitySettingsService.transformToDb(settingsData);

            const created = await communitySettingsService.createSettings(dbSettings);

            // Transform back to frontend format
            const transformed = communitySettingsService.transformToFrontend(created);

            return reply.status(201).send({
                error: false,
                message: 'Налаштування успішно створено',
                data: transformed
            });
        } catch (error) {
            Logger.error('Error in createSettings controller:', error);
            return reply.status(500).send({
                error: true,
                message: 'Помилка при створенні налаштувань'
            });
        }
    }

    async invalidateCache(request, reply) {
        try {
            await communitySettingsService.invalidateCache();

            return reply.send({
                error: false,
                message: 'Кеш налаштувань очищено'
            });
        } catch (error) {
            Logger.error('Error in invalidateCache controller:', error);
            return reply.status(500).send({
                error: true,
                message: 'Помилка при очищенні кешу'
            });
        }
    }
}

module.exports = new CommunitySettingsController();
