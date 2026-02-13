const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const touristRegistryController = require('../controller/tourist-registry-controller');
const { touristRegistryFilterSchema, createTouristSchema } = require('../schema/tourist-registry-schema');

const routes = async (fastify) => {
    // POST /api/touristtax/tourist-registry - Отримання списку туристів
    fastify.post("/", { 
        schema: touristRegistryFilterSchema, 
        preParsing: RouterGuard(),
        config: viewLimit 
    }, touristRegistryController.getTouristRegistry);

    // POST /api/touristtax/tourist-registry/create - Створення нового туриста
    fastify.post("/create", {
        schema: createTouristSchema,
        // preParsing: RouterGuard(), 
    }, touristRegistryController.createTourist);
}

module.exports = routes;