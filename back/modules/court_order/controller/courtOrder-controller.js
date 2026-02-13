const courtOrderService = require("../service/courtOrder-service");
const Logger = require("../../../utils/logger");

class CourtOrderController {

    async handleRequest(serviceMethod, request, reply) {
        try {
            const result = await serviceMethod.call(null, request, reply);
            // Service methods that handle replies directly (e.g., generateDocument) return the reply object
            // Only send if we got a result that isn't the reply object
            if (result !== undefined && result !== reply) {
                return reply.send(result);
            }
            return result;
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(400).send({ message: error.message });
        }
    }

    async create(request, reply) {
        return this.handleRequest(
            courtOrderService.create.bind(courtOrderService),
            request,
            reply
        );
    }

    async getById(request, reply) {
        return this.handleRequest(
            courtOrderService.getById.bind(courtOrderService),
            request,
            reply
        );
    }

    async findByFilter(request, reply) {
        return this.handleRequest(
            courtOrderService.findByFilter.bind(courtOrderService),
            request,
            reply
        );
    }

    async generateDocument(request, reply) {
        return this.handleRequest(
            courtOrderService.generateDocument.bind(courtOrderService),
            request,
            reply
        );
    }

    async deleteById(request, reply) {
        return this.handleRequest(
            courtOrderService.deleteById.bind(courtOrderService),
            request,
            reply
        );
    }
}

module.exports = new CourtOrderController();
