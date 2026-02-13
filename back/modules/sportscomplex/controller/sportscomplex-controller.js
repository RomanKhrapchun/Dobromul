// файл: back/modules/sportcomplex/controller/sportscomplex-controller.js

const sportsComplexService = require("../service/sportscomplex-service");
const logger = require("../../../utils/logger");

class SportsComplexController {
    async findRequisitesByFilter(request, reply) {
        try {
            const data = await sportsComplexService.findRequisitesByFilter(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[findRequisitesByFilter]", error);
            return reply.code(500).send({ error: "Не вдалося застосувати фільтр до реквізитів." });
        }
    }

    async findPoolServicesByFilter(request, reply) {
        try {
            const data = await sportsComplexService.findPoolServicesByFilter(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[findPoolServicesByFilter]", error);
            return reply.code(500).send({ error: "Не вдалося застосувати фільтр до послуг басейну." });
        }
    }

    async getById(request, reply) {
        try {
            const data = await sportsComplexService.getById(request.params.id);
            return reply.send(data);
        } catch (error) {
            logger.error("[getById]", error);
            return reply.code(500).send({ error: "Не вдалося отримати дані." });
        }
    }

    async generateWordById(request, reply) {
        try {
            const docxBuffer = await sportsComplexService.generateWordById(request.params.id);
            reply.header("Content-Disposition", `attachment; filename=generated.docx`);
            reply.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            return reply.send(docxBuffer);
        } catch (error) {
            logger.error("[generateWordById]", error);
            return reply.code(500).send({ error: "Помилка генерації документа." });
        }
    }

    async printById(request, reply) {
        try {
            const data = await sportsComplexService.printById(request.params.id);
            return reply.send(data);
        } catch (error) {
            logger.error("[printById]", error);
            return reply.code(500).send({ error: "Не вдалося отримати дані для друку." });
        }
    }

    // Нові методи для функціоналу рахунків

    async createPoolService(request, reply) {
        try {
            const result = await sportsComplexService.createPoolService(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[createPoolService]", error);
            return reply.code(500).send({ error: "Не вдалося створити послугу." });
        }
    }

    async createRequisite(request, reply) {
        try {
            const result = await sportsComplexService.createRequisite(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[createRequisite]", error);
            return reply.code(500).send({ error: "Не вдалося створити реквізити." });
        }
    }

    async getServiceGroups(request, reply) {
        try {
            const data = await sportsComplexService.getServiceGroups();
            return reply.send(data);
        } catch (error) {
            logger.error("[getServiceGroups]", error);
            return reply.code(500).send({ error: "Не вдалося отримати групи послуг." });
        }
    }

    async getServicesByGroup(request, reply) {
        try {
            console.log("getServicesByGroup викликано з ID:", request.params.id);
            const data = await sportsComplexService.getServicesByGroup(request.params.id);
            console.log("Дані для відповіді:", data);
            
            // Переконайтеся, що повертаємо масив навіть якщо даних немає
            return reply.send(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Помилка getServicesByGroup:", error);
            // Повертаємо порожній масив замість помилки
            return reply.send([]);
        }
    }

    async createBill(request, reply) {
        try {
            const result = await sportsComplexService.createBill(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[createBill]", error);
            return reply.code(500).send({ error: "Не вдалося створити рахунок." });
        }
    }

    async findBillsByFilter(request, reply) {
        try {
            const data = await sportsComplexService.findBillsByFilter(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[findBillsByFilter]", error);
            return reply.code(500).send({ error: "Не вдалося застосувати фільтр до рахунків." });
        }
    }

    async getBillById(request, reply) {
        try {
            const data = await sportsComplexService.getBillById(request.params.id);
            return reply.send(data);
        } catch (error) {
            logger.error("[getBillById]", error);
            return reply.code(500).send({ error: "Не вдалося отримати рахунок." });
        }
    }
    
    async updateBillStatus(request, reply) {
        try {
            const result = await sportsComplexService.updateBillStatus(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[updateBillStatus]", error);
            return reply.code(500).send({ error: "Не вдалося змінити статус рахунку." });
        }
    }

    async generateBillReceipt(request, reply) {
        try {
            const pdfBuffer = await sportsComplexService.generateBillReceipt(request, reply);
            reply.header("Content-Disposition", `attachment; filename=receipt-${request.params.id}.pdf`);
            reply.type("application/pdf");
            return reply.send(pdfBuffer);
        } catch (error) {
            logger.error("[generateBillReceipt]", error);
            return reply.code(500).send({ error: "Помилка генерації квитанції." });
        }
    }

    async createServiceGroup(request, reply) {
        try {
            const result = await sportsComplexService.createServiceGroup(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[createServiceGroup]", error);
            return reply.code(500).send({ error: "Не вдалося створити групу послуг." });
        }
    }

    async updateRequisite(request, reply) {
        try {
            const result = await sportsComplexService.updateRequisite(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[updateRequisite]", error);
            return reply.code(500).send({ error: "Не вдалося оновити реквізити." });
        }
    }

    async getServiceById(request, reply) {
        try {
            const data = await sportsComplexService.getServiceById(request.params.id);
            return reply.send(data);
        } catch (error) {
            logger.error("[getServiceById]", error);
            return reply.code(500).send({ error: "Не вдалося отримати дані послуги." });
        }
    }

    async updateService(request, reply) {
        try {
            const result = await sportsComplexService.updateService(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[updateService]", error);
            return reply.code(500).send({ error: "Не вдалося оновити послугу." });
        }
    }

    async searchClients(request, reply) {
        try {
            const data = await sportsComplexService.searchClients(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[searchClients]", error);
            return reply.code(500).send({ error: "Не вдалося знайти клієнтів." });
        }
    }

    async updateBill(request, reply) {
        try {
            const result = await sportsComplexService.updateBill(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[updateBill]", error);
            return reply.code(500).send({ error: "Не вдалося оновити рахунок." });
        }
    }

    async downloadBill(request, reply) {
        try {
            const fileBuffer = await sportsComplexService.downloadBill(request);
            reply.header("Content-Disposition", `attachment; filename=bill-${request.params.id}.pdf`);
            reply.type("application/pdf");
            return reply.send(fileBuffer);
        } catch (error) {
            logger.error("[downloadBill]", error);
            return reply.code(500).send({ error: "Помилка генерації файлу." });
        }
    }

    async findClientsByFilter(request, reply) {
        try {
            const data = await sportsComplexService.findClientsByFilter(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[findClientsByFilter]", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            return reply.code(500).send({ error: "Не вдалося застосувати фільтр до клієнтів." });
        }
    }

    async createClient(request, reply) {
        try {
            const result = await sportsComplexService.createClient(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[createClient]", error);
            return reply.code(500).send({ error: "Не вдалося створити клієнта." });
        }
    }

    async updateClient(request, reply) {
        try {
            const result = await sportsComplexService.updateClient(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[updateClient]", error);
            return reply.code(500).send({ error: "Не вдалося оновити клієнта." });
        }
    }

    async getClientById(request, reply) {
        console.log("getClientById викликано з параметрами:", request.params);
        console.log("URL:", request.url);
        console.log("Method:", request.method);

        try {
            const id = parseInt(request.params.id);
            
            // Валідація ID
            if (isNaN(id) || id <= 0) {
                return reply.code(400).send({ 
                    error: "Неправильний ID клієнта" 
                });
            }
            
            const data = await sportsComplexService.getClientById(id);
            
            if (!data) {
                return reply.code(404).send({ 
                    error: "Клієнта не знайдено" 
                });
            }
            
            return reply.send(data);
        } catch (error) {
            logger.error("[getClientById]", error);
            return reply.code(500).send({ 
                error: "Не вдалося отримати клієнта." 
            });
        }
    }

    async deleteClient(request, reply) {
        try {
            const result = await sportsComplexService.deleteClient(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[deleteClient]", error);
            return reply.code(500).send({ error: "Не вдалося видалити клієнта." });
        }
    }

    async renewSubscription(request, reply) {
        try {
            const result = await sportsComplexService.renewSubscription(request);
            return result;
        } catch (error) {
            logger.error("[renewSubscription]", error);
            reply.status(error.statusCode || 500);
            return { 
                success: false, 
                message: error.message || 'Внутрішня помилка сервера' 
            };
        }
    }

    async startLesson(request, reply) {
        try {
            const result = await sportsComplexService.startLesson(request);
            return reply.send(result);
        } catch (error) {
            logger.error("[startLesson]", error);
            return reply.code(500).send({ error: "Не вдалося розпочати заняття." });
        }
    }

    async searchClientByMembership(request, reply) {
        try {
            const data = await sportsComplexService.searchClientByMembership(request);
            return reply.send(data);
        } catch (error) {
            logger.error("[searchClientByMembership]", error);
            return reply.code(500).send({ error: "Не вдалося знайти клієнта." });
        }
    }
    
    async getBillsReport(request, reply) {
        try {
            const result = await sportsComplexService.getBillsReport(request);
            reply.send(result);
        } catch (error) {
            logger.error("[getBillsReport]", error);
            reply.code(500).send({ error: "Не вдалося отримати дані для звіту." });
        }
    }

    async exportBillsToWord(request, reply) {
        try {
            const result = await sportsComplexService.exportBillsToWord(request);
            
            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                .header('Content-Disposition', 'attachment; filename="bills-report.docx"')
                .send(result);
        } catch (error) {
            logger.error("[exportBillsToWord]", error);
            reply.code(500).send({ error: "Помилка генерації звіту." });
        }
    }
}

module.exports = new SportsComplexController();