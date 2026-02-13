const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit, insertLimit } = require('../../../utils/ratelimit');
const courtOrderController = require('../controller/courtOrder-controller');
const {
    courtOrderCreateSchema,
    courtOrderInfoSchema,
    courtOrderFilterSchema,
} = require('../schema/courtOrder-schema');

const routes = async (fastify) => {
    // Створення заяви
    fastify.post("/create", {
        schema: courtOrderCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT }),
        config: insertLimit
    }, courtOrderController.create);

    // Список заяв з фільтрацією
    fastify.post("/filter", {
        schema: courtOrderFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, courtOrderController.findByFilter);

    // Отримання заяви за ID
    fastify.get("/info/:id", {
        schema: courtOrderInfoSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit
    }, courtOrderController.getById);

    // Генерування документу
    fastify.get("/generate/:id", {
        schema: courtOrderInfoSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, courtOrderController.generateDocument);

    // Видалення заяви
    fastify.delete("/delete/:id", {
        schema: courtOrderInfoSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, courtOrderController.deleteById);
};

module.exports = routes;
