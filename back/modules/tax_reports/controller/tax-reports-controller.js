const taxReportsService = require("../service/tax-reports-service");
const Logger = require("../../../utils/logger");

class TaxReportsController {
    /**
     * Generic error handler wrapper for controller methods
     * Centralizes try-catch logic and error formatting
     * @param {Object} request - Fastify request object
     * @param {Object} reply - Fastify reply object
     * @param {Function} serviceMethod - The service method to execute
     * @param {string} errorMessage - Custom error message for this operation
     */
    async handleRequest(request, reply, serviceMethod, errorMessage) {
        try {
            const data = await serviceMethod(request);
            return reply.send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(400).send({
                error: error.message || errorMessage
            });
        }
    }

    /**
     * Generic error handler wrapper with success flag
     * For endpoints that need { success: true, ...data } format
     */
    async handleRequestWithSuccess(request, reply, serviceMethod, errorMessage) {
        try {
            const data = await serviceMethod(request);
            return reply.send({
                success: true,
                ...data
            });
        } catch (error) {
            Logger.error(errorMessage, { error: error.message, stack: error.stack });
            return reply.status(400).send({
                success: false,
                error: error.message || errorMessage
            });
        }
    }

    /**
     * Валідація обов'язкового параметра community_name
     */
    _validateCommunityName(communityName, reply) {
        if (!communityName) {
            reply.status(400).send({
                success: false,
                error: 'Параметр community_name є обов\'язковим'
            });
            return false;
        }
        return true;
    }

    // Отримання списку платників
    async getTaxpayers(request, reply) {
        return this.handleRequest(
            request,
            reply,
            () => taxReportsService.getTaxpayers(),
            'Помилка при отриманні списку платників'
        );
    }

    // Отримання списку типів податків
    async getTaxTypes(request, reply) {
        return this.handleRequest(
            request,
            reply,
            () => taxReportsService.getTaxTypes(),
            'Помилка при отриманні списку типів податків'
        );
    }

    // Отримання списку періодів
    async getPeriods(request, reply) {
        return this.handleRequest(
            request,
            reply,
            () => taxReportsService.getPeriods(),
            'Помилка при отриманні списку періодів'
        );
    }

    // Отримання даних по платнику
    async getDataByTaxpayer(request, reply) {
        return this.handleRequest(
            request,
            reply,
            (req) => taxReportsService.getDataByTaxpayer(req),
            'Помилка при отриманні даних по платнику'
        );
    }

    // Отримання даних по типу податку
    async getDataByTaxType(request, reply) {
        return this.handleRequest(
            request,
            reply,
            (req) => taxReportsService.getDataByTaxType(req),
            'Помилка при отриманні даних по типу податку'
        );
    }

    // Отримання даних по періоду
    async getDataByPeriod(request, reply) {
        return this.handleRequest(
            request,
            reply,
            (req) => taxReportsService.getDataByPeriod(req),
            'Помилка при отриманні даних по періоду'
        );
    }

    // =====================================================
    // МЕТОДИ ДЛЯ ОНОВЛЕННЯ РЕЄСТРУ ЮРИДИЧНИХ ОСІБ
    // =====================================================

    /**
     * Попередній перегляд оновлення БД (статистика з віддаленого сервера)
     * GET /api/tax-reports/database/preview?community_name=X&date=YYYY-MM-DD
     */
    async previewDatabaseUpdate(request, reply) {
        const { community_name, date } = request.query;

        if (!this._validateCommunityName(community_name, reply)) return;

        return this.handleRequestWithSuccess(
            request,
            reply,
            () => taxReportsService.previewDatabaseUpdate(community_name, date || null),
            'Помилка отримання попереднього перегляду'
        );
    }

    /**
     * Отримання списку доступних дат реєстрів
     * GET /api/tax-reports/database/available-dates?community_name=X&limit=3
     */
    async getAvailableDates(request, reply) {
        const { community_name, limit } = request.query;

        if (!this._validateCommunityName(community_name, reply)) return;

        return this.handleRequestWithSuccess(
            request,
            reply,
            () => taxReportsService.getAvailableDates(community_name, limit ? parseInt(limit, 10) : 3),
            'Помилка отримання списку дат'
        );
    }

    /**
     * Виконання оновлення локальної БД
     * POST /api/tax-reports/update-database-execute
     */
    async updateDatabaseExecute(request, reply) {
        const { community_name } = request.body;

        if (!this._validateCommunityName(community_name, reply)) return;

        try {
            const data = await taxReportsService.updateDatabaseExecute(community_name);
            return reply.send({
                success: true,
                data
            });
        } catch (error) {
            Logger.error('Помилка оновлення БД', { error: error.message, stack: error.stack });
            return reply.status(400).send({
                success: false,
                error: error.message || 'Помилка оновлення бази даних'
            });
        }
    }
}

module.exports = new TaxReportsController();