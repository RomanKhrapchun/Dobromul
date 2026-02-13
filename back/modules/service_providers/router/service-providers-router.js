const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const serviceProvidersController = require('../controller/service-providers-controller');
const { serviceProvidersFilterSchema, createServiceProviderSchema } = require('../schema/service-providers-schema');

const routes = async (fastify) => {               
        // POST endpoint для створення хоста
        fastify.post("/", {
            schema: createServiceProviderSchema,
            preParsing: RouterGuard({ permissionLevel: "touristtax/service-providers", permissions: accessLevel.INSERT }),
            config: viewLimit
        }, serviceProvidersController.addServiceProvider);

        // POST endpoint для фільтрації/пошуку (зберігаємо для сумісності, якщо потрібно)
        fastify.post("/filter", {
            schema: serviceProvidersFilterSchema,
            preParsing: RouterGuard(),
            config: viewLimit
        }, serviceProvidersController.getServiceProviders);
}

module.exports = routes;

