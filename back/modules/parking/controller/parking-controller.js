const parkingService = require("../service/parking-service");
const Logger = require("../../../utils/logger");

class ParkingController {

    // Отримання списку заявок парковки з фільтрами
    async getBookingsList(request, reply) {
        try {
            const bookingsData = await parkingService.getBookingsList(request);
            return reply.send(bookingsData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Отримання конкретної заявки за ID
    async getBookingById(request, reply) {
        try {
            const bookingData = await parkingService.getBookingById(request);
            return reply.send(bookingData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Створення нової заявки
    async createBooking(request, reply) {
        try {
            const newBooking = await parkingService.createBooking(request);
            return reply.status(201).send(newBooking);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Оновлення заявки
    async updateBooking(request, reply) {
        try {
            const updatedBooking = await parkingService.updateBooking(request);
            return reply.send(updatedBooking);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Експорт заявок
    async exportBookings(request, reply) {
        try {
            const exportData = await parkingService.exportBookings(request);
            return reply.send(exportData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Отримання статистики заявок
    async getBookingStats(request, reply) {
        try {
            const statsData = await parkingService.getBookingStats(request);
            return reply.send(statsData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Перевірка заявки по номеру машини (публічний endpoint)
    async checkBookingByCarNumber(request, reply) {
        try {
            const bookingData = await parkingService.checkBookingByCarNumber(request);
            return reply.send(bookingData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // ==================== CHECK ACTIVITY METHODS ====================

    // Отримання списку історії перевірок
    async getCheckActivityList(request, reply) {
        try {
            const checkActivityData = await parkingService.getCheckActivityList(request);
            return reply.send(checkActivityData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Створення запису перевірки
    async createCheckActivity(request, reply) {
        try {
            const newCheckActivity = await parkingService.createCheckActivity(request);
            return reply.status(201).send(newCheckActivity);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // Експорт історії перевірок
    async exportCheckActivity(request, reply) {
        try {
            const exportData = await parkingService.exportCheckActivity(request);
            return reply.send(exportData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }
}

const parkingController = new ParkingController();
module.exports = parkingController;
