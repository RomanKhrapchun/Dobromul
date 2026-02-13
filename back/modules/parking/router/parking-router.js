const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit, insertLimit, updateLimit } = require('../../../utils/ratelimit');
const parkingController = require('../controller/parking-controller');

const routes = async (fastify) => {
    // Список заявок парковки для адмін панелі
    fastify.post("/bookings/list", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        }),
        config: viewLimit
    }, parkingController.getBookingsList);

    // Отримання конкретної заявки за ID
    fastify.get("/bookings/:id", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        }),
        config: viewLimit
    }, parkingController.getBookingById);

    // Створення нової заявки
    fastify.post("/bookings", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.INSERT
        }),
        config: insertLimit
    }, parkingController.createBooking);

    // Оновлення заявки
    fastify.put("/bookings/:id", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.UPDATE
        }),
        config: updateLimit
    }, parkingController.updateBooking);

    // Експорт заявок
    fastify.post("/bookings/export", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        })
    }, parkingController.exportBookings);

    // Отримання статистики
    fastify.get("/bookings/stats", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        }),
        config: viewLimit
    }, parkingController.getBookingStats);

    // Перевірка заявки по номеру машини (публічний endpoint)
    fastify.post("/check", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        }),
        config: viewLimit
    }, parkingController.checkBookingByCarNumber);

    // ==================== CHECK ACTIVITY ROUTES ====================

    // Список історії перевірок
    fastify.post("/check-activity/list", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        }),
        config: viewLimit
    }, parkingController.getCheckActivityList);

    // Створення запису перевірки
    fastify.post("/check-activity", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.INSERT
        }),
        config: insertLimit
    }, parkingController.createCheckActivity);

    // Експорт історії перевірок
    fastify.post("/check-activity/export", {
        preParsing: RouterGuard({
            permissionLevel: "debtor",
            permissions: accessLevel.VIEW
        })
    }, parkingController.exportCheckActivity);
};

module.exports = routes;
