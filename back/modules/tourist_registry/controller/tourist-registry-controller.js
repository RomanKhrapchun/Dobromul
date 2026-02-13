const touristRegistryService = require("../service/tourist-registry-service");
const Logger = require("../../../utils/logger");
const { createSuccessMessage } = require("../../../utils/messages");

class TouristRegistryController {

    async getTouristRegistry(request, reply) {
        try {
            const data = await touristRegistryService.findTouristRegistryByFilter(request);
            return reply.send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(400).send({ 
                error: error.message || 'Помилка при отриманні реєстру туристів' 
            });
        }
    }

    async createTourist(request, reply) {
        try {
            const data = await touristRegistryService.createTourist(request);
            return reply.send({
                message: createSuccessMessage,
                data: data
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            // Перевіряємо тип помилки для більш зрозумілого повідомлення
            let errorMessage = error.message;
            if (error.message && error.message.includes('foreign key constraint')) {
                errorMessage = 'Хост з вказаним ID не знайдено. Перевірте правильність host_id.';
            } else if (error.message && error.message.includes('violates foreign key constraint')) {
                errorMessage = 'Хост з вказаним ID не існує в базі даних.';
            }
            
            return reply.status(400).send({ error: errorMessage });
        }
    }
}

module.exports = new TouristRegistryController();

