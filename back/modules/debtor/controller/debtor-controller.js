const debtorService = require("../service/debtor-service");
const Logger = require("../../../utils/logger")

class DebtorController {

    async getDebtByDebtorId(request, reply) {
        try {
            const debtData = await debtorService.getDebtByDebtorId(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            return reply.status(400).send(error)
        }
    }

    async addPhoneToDebtor(request, reply) {
        try {
            const { phone, debtId } = request.body;

            const result = await debtorService.enrichPhoneFromLocalDB(phone, debtId);

            if (result.success) {
                return reply.status(200).send({
                    message: 'Операція виконана успішно',
                    data: result.data
                });
            } else {
                return reply.status(400).send({
                    error: true,
                    message: result.error.message,
                    code: result.error.code
                });
            }

        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(500).send({ error: true, message: 'Внутрішня помилка сервера' });
        }
    }

    async deletePhoneFromDebtor(request, reply) {
        try {
            const { id: debtId } = request.params;
            const { phone } = request.body;

            if (!phone) {
                return reply.status(400).send({
                    error: true,
                    message: 'Номер телефону є обов\'язковим'
                });
            }

            const result = await debtorService.deletePhoneFromLocalDB(phone, debtId);

            if (result.success) {
                return reply.status(200).send({
                    message: 'Номер телефону успішно видалено',
                    data: result.data
                });
            } else {
                const statusCode = result.error.code === 'DEBTOR_NOT_FOUND' ? 404 : 400;
                return reply.status(statusCode).send({
                    error: true,
                    message: result.error.message,
                    code: result.error.code
                });
            }

        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            return reply.status(500).send({ error: true, message: 'Внутрішня помилка сервера' });
        }
    }

    async findDebtByFilter(request, reply) {
        try {
            const debtData = await debtorService.findDebtByFilter(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            return reply.status(400).send(error)
        }
    }

    async generateWordByDebtId(request, reply) {
        try {
            const debtData = await debtorService.generateWordByDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            return reply.status(400).send(error)
        }
    }

    async printDebtId(request, reply) {
        try {
            const debtData = await debtorService.printDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            return reply.status(400).send(error)
        }
    }

    async getDebtorCallsByIdentifier(request, reply) {
    try {
        const calls = await debtorService.getDebtorCallsByIdentifier(request);
        return reply.status(200).send(calls);
    } catch (error) {
        console.error('Error getting debtor calls by identifier:', error);
        
        if (error.message === 'Debtor ID or person name is required') {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'ID боржника або ПІБ є обов\'язковим'
                });
            }

            if (error.message.includes('not found')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Боржника не знайдено'
                });
            }

            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при отриманні дзвінків'
            });
        }
    }

    // Створити новий дзвінок по ower.id або ПІБ
    async createDebtorCallByIdentifier(request, reply) {
        try {
            const newCall = await debtorService.createDebtorCallByIdentifier(request);
            return reply.status(201).send(newCall);
        } catch (error) {
            console.error('Error creating debtor call by identifier:', error);
            
            if (error.message === 'Debtor ID or person name is required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'ID боржника або ПІБ є обов\'язковим'
                });
            }

            if (error.message === 'All fields (call_date, call_topic) are required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Всі поля (call_date, call_topic) є обов\'язковими'
                });
            }

            if (error.message.includes('not found')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Боржника не знайдено'
                });
            }

            if (error.message && error.message.includes('Call date cannot be in the future')) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    message: 'Дата дзвінка не може бути в майбутньому'
                });
            }

            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при створенні дзвінка'
            });
        }
    }

    async updateCall(request, reply) {
        try {
            const newCall = await debtorService.updateCall(request);
            return reply.status(201).send(newCall);
        } catch (error) {
            console.error('Error creating debtor call by identifier:', error);

            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при створенні дзвінка'
            });
        }
    }

    async getDebtorReceiptInfoByIdentifier(request, reply) {
        try {
            const receiptsInfo = await debtorService.getDebtorReceiptInfoByIdentifier(request);
            return reply.status(200).send(receiptsInfo);
        } catch (error) {
            console.error('Error getting debtor receipt info by identifier:', error);
            
            if (error.message === 'Debtor ID or person name is required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'ID боржника або ПІБ є обов\'язковим'
                    });
                }
    
                if (error.message.includes('not found')) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Боржника не знайдено'
                    });
                }

                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Помилка при отриманні дзвінків'
                });
            }
        }

        async createDebtorReceiptInfoByIdentifier(request, reply) {
            try {
                const newReceiptInfo = await debtorService.createDebtorReceiptInfoByIdentifier(request);
                return reply.status(201).send(newReceiptInfo);
            } catch (error) {
                console.error('Error creating debtor receipt info by identifier:', error);
                
                if (error.message === 'Debtor ID or person name is required') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'ID боржника або ПІБ є обов\'язковим'
                    });
                }
    
                if (error.message.includes('not found')) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Боржника не знайдено'
                    });
                }
    
                if (error.message && error.message.includes('Receipt info date cannot be in the future')) {
                    return reply.status(400).send({
                        error: 'Validation Error',
                        message: 'Дата дзвінка не може бути в майбутньому'
                    });
                }

                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Помилка при створенні дзвінка'
                });
            }
        }

        async getDebtorStats(request,reply) {
            try {
                const stats = await debtorService.getDebtorStats(request);
                return reply.status(200).send(stats);
            } catch (error) {
                console.error('Error getting debtor stats:', error);
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Помилка при отриманні статистики'
                });
            }
        }

        async getDebtorsWithPhones(request, reply) {
            try {
                // Отримуємо всіх боржників з телефонами
                const debtors = await debtorService.getAllDebtorsWithPhones();

                return reply.send({
                    error: false,
                    data: debtors,
                    message: `Знайдено ${debtors.length} боржників з телефонами`
                });
            } catch (error) {
                console.error('Error getting debtors with phones:', error);
                return reply.status(500).send({
                    error: true,
                    message: error.message || 'Помилка при отриманні боржників з телефонами'
                });
            }
        }

        // Оновити адресу боржника
        async updateDebtorAddress(request, reply) {
            try {
                const result = await debtorService.updateDebtorAddress(request);
                return reply.status(200).send({
                    error: false,
                    message: 'Адресу успішно оновлено',
                    data: result
                });
            } catch (error) {
                console.error('Error updating debtor address:', error);
                const statusCode = error.statusCode || 500;
                return reply.status(statusCode).send({
                    error: true,
                    message: error.message || 'Помилка при оновленні адреси'
                });
            }
        }

        // Видалити адресу боржника
        async deleteDebtorAddress(request, reply) {
            try {
                const result = await debtorService.deleteDebtorAddress(request);
                return reply.status(200).send({
                    error: false,
                    message: 'Адресу успішно видалено',
                    data: result
                });
            } catch (error) {
                console.error('Error deleting debtor address:', error);
                const statusCode = error.statusCode || 500;
                return reply.status(statusCode).send({
                    error: true,
                    message: error.message || 'Помилка при видаленні адреси'
                });
            }
        }

}




module.exports = new DebtorController();