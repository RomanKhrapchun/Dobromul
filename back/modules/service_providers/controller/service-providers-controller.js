const serviceProvidersService = require("../service/service-providers-service");
const Logger = require("../../../utils/logger");
const { createSuccessMessage } = require("../../../utils/messages");

class ServiceProvidersController {

    async getServiceProviders(request, reply) {
        try {
            const data = await serviceProvidersService.findServiceProvidersByFilter(request);
            return reply.send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(400).send({ 
                error: error.message || 'Помилка при отриманні надавачів послуг' 
            });
        }
    }

    async addServiceProvider(request, reply) {
        try {
            await serviceProvidersService.addServiceProvider(request);
            return reply.send(createSuccessMessage);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(400).send({ 
                error: error.message || 'Помилка при додаванні надавача послуг' 
            });
        }
    }
}

module.exports = new ServiceProvidersController();

