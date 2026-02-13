const { RouterGuard } = require('../../../helpers/Guard');
const { viewLimit, updateLimit } = require('../../../utils/ratelimit');
const taxReportsController = require('../controller/tax-reports-controller');
const { taxpayerDataSchema, taxTypeDataSchema, periodDataSchema } = require('../schema/tax-reports-schema');

const routes = async (fastify) => {
    // GET /taxpayers - список платників для випадаючого меню
    fastify.get("/taxpayers", {
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getTaxpayers.bind(taxReportsController));

    // GET /tax-types - список типів податків для випадаючого меню
    fastify.get("/tax-types", {
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getTaxTypes.bind(taxReportsController));

    // GET /periods - список періодів для випадаючого меню
    fastify.get("/periods", {
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getPeriods.bind(taxReportsController));

    // GET /by-taxpayer/:taxpayerCode - дані по платнику з пагінацією
    fastify.get("/by-taxpayer/:taxpayerCode", {
        schema: taxpayerDataSchema,
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getDataByTaxpayer.bind(taxReportsController));

    // GET /by-tax-type/:incomeCode - дані по типу податку з пагінацією
    fastify.get("/by-tax-type/:incomeCode", {
        schema: taxTypeDataSchema,
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getDataByTaxType.bind(taxReportsController));

    // GET /by-period/:period - дані по періоду з пагінацією
    fastify.get("/by-period/:period", {
        schema: periodDataSchema,
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getDataByPeriod.bind(taxReportsController));

    // =====================================================
    // ЕНДПОІНТИ ДЛЯ ОНОВЛЕННЯ РЕЄСТРУ ЮРИДИЧНИХ ОСІБ
    // =====================================================

    // GET /database/preview - попередній перегляд статистики з віддаленого сервера
    fastify.get("/database/preview", {
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.previewDatabaseUpdate.bind(taxReportsController));

    // GET /database/available-dates - список доступних дат реєстрів
    fastify.get("/database/available-dates", {
        preParsing: RouterGuard(),
        config: viewLimit
    }, taxReportsController.getAvailableDates.bind(taxReportsController));

    // POST /update-database-execute - виконати оновлення локальної БД
    fastify.post("/update-database-execute", {
        preParsing: RouterGuard(),
        config: updateLimit
    }, taxReportsController.updateDatabaseExecute.bind(taxReportsController));
}

module.exports = routes;