const kindergartenService = require("../service/kindergarten-service");
const Logger = require("../../../utils/logger")

class KindergartenController {

    async getDebtByDebtorId(request, reply) {
        try {
            const debtData = await kindergartenService.getDebtByDebtorId(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ error: true, message: error.message })
        }
    }

    async findDebtByFilter(request, reply) {
        try {
            const debtData = await kindergartenService.findDebtByFilter(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ error: true, message: error.message })
        }
    }

    async generateWordByDebtId(request, reply) {
        try {
            const debtData = await kindergartenService.generateWordByDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ error: true, message: error.message })
        }
    }

    async printDebtId(request, reply) {
        try {
            const debtData = await kindergartenService.printDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ error: true, message: error.message })
        }
    }

    // ===============================
    // МЕТОДИ ДЛЯ ГРУП САДОЧКА
    // ===============================

    async findGroupsByFilter(request, reply) {
        try {
            const data = await kindergartenService.findGroupsByFilter(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch kindergarten groups',
                message: error.message 
            })
        }
    }

    async createGroup(request, reply) {
        try {
            const result = await kindergartenService.createGroup(request)
            reply.status(201).send({ 
                message: 'Групу створено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат назви групи
            if (error.message.includes('існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to create kindergarten group',
                message: error.message 
            })
        }
    }

    async updateGroup(request, reply) {
        try {
            const result = await kindergartenService.updateGroup(request)
            reply.status(200).send({ 
                message: 'Групу оновлено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат назви групи
            if (error.message.includes('існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо чи група існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to update kindergarten group',
                message: error.message 
            })
        }
    }

    async deleteGroup(request, reply) {
        try {
            await kindergartenService.deleteGroup(request)
            reply.status(200).send({ 
                message: 'Групу видалено успішно'
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо чи група існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete kindergarten group',
                message: error.message 
            })
        }
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДІТЕЙ САДОЧКА
    // ===============================

    async findChildrenByFilter(request, reply) {
        try {
            const data = await kindergartenService.findChildrenByFilter(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch children',
                message: error.message 
            })
        }
    }

    async getChildById(request, reply) {
        try {
            const data = await kindergartenService.getChildById(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to fetch child',
                message: error.message 
            })
        }
    }

    async createChild(request, reply) {
        try {
            const result = await kindergartenService.createChild(request)
            reply.status(201).send({ 
                message: 'Дитину створено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо на неіснуючу групу
            if (error.message.includes('Група не знайдена')) {
                return reply.status(404).send({ 
                    error: 'Group Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to create child',
                message: error.message 
            })
        }
    }

    async updateChild(request, reply) {
        try {
            const result = await kindergartenService.updateChild(request)
            reply.status(200).send({ 
                message: 'Дані дитини оновлено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо чи дитина існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }

            // Перевіряємо на неіснуючу групу
            if (error.message.includes('Група не знайдена')) {
                return reply.status(404).send({ 
                    error: 'Group Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to update child',
                message: error.message 
            })
        }
    }

    async deleteChild(request, reply) {
        try {
            await kindergartenService.deleteChild(request)
            reply.status(200).send({ 
                message: 'Дитину видалено успішно'
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо чи дитина існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete child',
                message: error.message 
            })
        }
    }

        // ===============================
    // МЕТОДИ ДЛЯ ВІДВІДУВАНОСТІ САДОЧКА
    // ===============================

    async findAttendanceByFilter(request, reply) {
        try {
            const data = await kindergartenService.findAttendanceByFilter(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch attendance',
                message: error.message 
            })
        }
    }

    async getAttendanceById(request, reply) {
        try {
            const data = await kindergartenService.getAttendanceById(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to fetch attendance',
                message: error.message 
            })
        }
    }

    async createAttendance(request, reply) {
        try {
            const result = await kindergartenService.createAttendance(request)
            reply.status(201).send({ 
                message: 'Запис відвідуваності створено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо на неіснуючу дитину
            if (error.message.includes('Дитину не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Child Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to create attendance',
                message: error.message 
            })
        }
    }

    async updateAttendance(request, reply) {
        try {
            const result = await kindergartenService.updateAttendance(request)
            reply.status(200).send({ 
                message: 'Запис відвідуваності оновлено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо чи запис існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }

            // Перевіряємо на неіснуючу дитину
            if (error.message.includes('Дитину не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Child Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to update attendance',
                message: error.message 
            })
        }
    }

    async deleteAttendance(request, reply) {
        try {
            await kindergartenService.deleteAttendance(request)
            reply.status(200).send({ 
                message: 'Запис відвідуваності видалено успішно'
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо чи запис існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete attendance',
                message: error.message 
            })
        }
    }

    // ===============================
    // ОТРИМАННЯ ДАТ З ВІДВІДУВАНІСТЮ
    // ===============================

    async getAttendanceDates(request, reply) {
        try {
            const data = await kindergartenService.getAttendanceDates(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch attendance dates',
                message: error.message 
            })
        }
    }

    // ===============================
    // КОНТРОЛЕР ДЛЯ ДОВІДНИКА САДОЧКІВ
    // ===============================

    // ✅ ДОДАНО: Отримати всі садочки
    async getAllKindergartens(request, reply) {
        try {
            const data = await kindergartenService.getAllKindergartens();
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to fetch kindergartens',
                message: error.message
            });
        }
    }

    // ===============================
    // КОНТРОЛЕРИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ (скопійовано з груп)
    // ===============================

    async findDailyFoodCostByFilter(request, reply) {
        try {
            const data = await kindergartenService.findDailyFoodCostByFilter(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch daily food cost',
                message: error.message 
            })
        }
    }

    async createDailyFoodCost(request, reply) {
        try {
            const result = await kindergartenService.createDailyFoodCost(request)
            reply.status(201).send({ 
                message: 'Вартість харчування створено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            reply.status(400).send({ 
                error: 'Failed to create daily food cost',
                message: error.message 
            })
        }
    }

    async updateDailyFoodCost(request, reply) {
        try {
            const result = await kindergartenService.updateDailyFoodCost(request)
            reply.status(200).send({ 
                message: 'Вартість харчування оновлено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }

            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            reply.status(400).send({ 
                error: 'Failed to update daily food cost',
                message: error.message 
            })
        }
    }

    async deleteDailyFoodCost(request, reply) {
        try {
            const result = await kindergartenService.deleteDailyFoodCost(request)
            reply.status(200).send({ 
                message: 'Вартість харчування видалено успішно',
                data: result 
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }

            reply.status(400).send({ 
                error: 'Failed to delete daily food cost',
                message: error.message 
            })
        }
    }

    // ===============================
    // ✅ ЗАВДАННЯ 2: КОНТРОЛЕРИ ДЛЯ BREAKDOWN ВАРТОСТІ
    // ===============================

    async getDailyCostBreakdown(request, reply) {
        try {
            const data = await kindergartenService.getDailyCostBreakdown(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to get daily cost breakdown',
                message: error.message
            });
        }
    }

    async getChildDailyCostBreakdown(request, reply) {
        try {
            const data = await kindergartenService.getChildDailyCostBreakdown(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to get child daily cost breakdown',
                message: error.message
            });
        }
    }

    // ===============================
    // ✅ ЗАВДАННЯ 3: КОНТРОЛЕРИ ДЛЯ CHILD PROPOSALS
    // ===============================

    async createChildProposal(request, reply) {
        try {
            const result = await kindergartenService.createChildProposal(request);
            reply.status(201).send({
                message: 'Пропозицію створено успішно',
                data: result
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to create child proposal',
                message: error.message
            });
        }
    }

    async findChildProposals(request, reply) {
        try {
            const data = await kindergartenService.findChildProposals(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to fetch child proposals',
                message: error.message
            });
        }
    }

    async getChildProposalById(request, reply) {
        try {
            const data = await kindergartenService.getChildProposalById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to fetch child proposal',
                message: error.message
            });
        }
    }

    async updateChildProposal(request, reply) {
        try {
            const result = await kindergartenService.updateChildProposal(request);
            reply.status(200).send({
                message: 'Пропозицію оновлено успішно',
                data: result
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to update child proposal',
                message: error.message
            });
        }
    }

    async deleteChildProposal(request, reply) {
        try {
            const result = await kindergartenService.deleteChildProposal(request);
            reply.status(200).send({
                message: 'Пропозицію видалено успішно',
                data: result
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to delete child proposal',
                message: error.message
            });
        }
    }

    async approveChildProposal(request, reply) {
        try {
            const result = await kindergartenService.approveChildProposal(request);
            reply.status(200).send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to approve child proposal',
                message: error.message
            });
        }
    }

    async rejectChildProposal(request, reply) {
        try {
            const result = await kindergartenService.rejectChildProposal(request);
            reply.status(200).send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to reject child proposal',
                message: error.message
            });
        }
    }

    // ===============================
    // ✅ ЗАВДАННЯ 4: КОНТРОЛЕРИ ДЛЯ ПІЛЬГ (CHILD BENEFITS)
    // ===============================

    async createChildBenefit(request, reply) {
        try {
            const data = await kindergartenService.createChildBenefit(request);
            reply.status(201).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to create child benefit',
                message: error.message
            });
        }
    }

    async findChildBenefits(request, reply) {
        try {
            const data = await kindergartenService.findChildBenefits(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to fetch child benefits',
                message: error.message
            });
        }
    }

    async getChildBenefitById(request, reply) {
        try {
            const data = await kindergartenService.getChildBenefitById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to fetch child benefit',
                message: error.message
            });
        }
    }

    async updateChildBenefit(request, reply) {
        try {
            const data = await kindergartenService.updateChildBenefit(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to update child benefit',
                message: error.message
            });
        }
    }

    async deleteChildBenefit(request, reply) {
        try {
            const data = await kindergartenService.deleteChildBenefit(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            }

            reply.status(400).send({
                error: 'Failed to delete child benefit',
                message: error.message
            });
        }
    }

    // ===============================
    // КОНТРОЛЕРИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
    // ===============================

    async findBillingByFilter(request, reply) {
        try {
            const data = await kindergartenService.findBillingByFilter(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                error: 'Failed to fetch billing records',
                message: error.message 
            })
        }
    }

    async getBillingById(request, reply) {
        try {
            const data = await kindergartenService.getBillingById(request)
            reply.status(200).send(data)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to fetch billing record',
                message: error.message 
            })
        }
    }

    async createBilling(request, reply) {
        try {
            const result = await kindergartenService.createBilling(request);
            reply.status(201).send({ 
                message: 'Запис створено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            // ✅ Обробка дубліката
            if (error.message === 'DUPLICATE_BILLING' && error.existingData) {
                return reply.status(409).send({ 
                    error: 'DUPLICATE_BILLING',
                    message: 'Запис для цієї дитини та місяця вже існує',
                    existingData: error.existingData
                });
            }

            if (error.message.includes('існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }

            reply.status(400).send({ 
                error: 'Failed to create billing',
                message: error.message 
            });
        }
    }

    async updateBilling(request, reply) {
        try {
            await kindergartenService.updateBilling(request)
            reply.status(200).send({ 
                message: 'Запис батьківської плати оновлено успішно'
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо на дублікат
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                })
            }

            // Перевіряємо чи запис існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to update billing record',
                message: error.message 
            })
        }
    }

    async deleteBilling(request, reply) {
        try {
            await kindergartenService.deleteBilling(request)
            reply.status(200).send({ 
                message: 'Запис батьківської плати видалено успішно'
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            // Перевіряємо чи запис існує
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                })
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete billing record',
                message: error.message 
            })
        }
    }

    // ===============================
    // API ДЛЯ МОБІЛЬНОГО ДОДАТКУ
    // ===============================

    async getMobileAttendance(request, reply) {
        try {
            const timestamp = parseInt(request.params.date);
            const data = await kindergartenService.getMobileAttendance(timestamp, request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch mobile attendance',
                message: error.message 
            });
        }
    }

    async saveMobileAttendance(request, reply) {
        try {
            const result = await kindergartenService.saveMobileAttendance(request);
            reply.status(200).send({ 
                success: true,
                message: 'Відвідуваність збережено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to save mobile attendance',
                message: error.message 
            });
        }
    }

    // ===============================
    // КОНТРОЛЕРИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКА
    // ===============================

    async findAdminsByFilter(request, reply) {
        try {
            const data = await kindergartenService.findAdminsByFilter(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch kindergarten admins',
                message: error.message 
            });
        }
    }

    async getAdminById(request, reply) {
        try {
            const data = await kindergartenService.getAdminById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to fetch admin',
                message: error.message 
            });
        }
    }

    async createAdmin(request, reply) {
        try {
            const result = await kindergartenService.createAdmin(request);
            reply.status(201).send({ 
                message: 'Адміністратора створено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to create admin',
                message: error.message 
            });
        }
    }

    async updateAdmin(request, reply) {
        try {
            const result = await kindergartenService.updateAdmin(request);
            reply.status(200).send({ 
                message: 'Дані адміністратора оновлено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to update admin',
                message: error.message 
            });
        }
    }

    async deleteAdmin(request, reply) {
        try {
            await kindergartenService.deleteAdmin(request);
            reply.status(200).send({ 
                message: 'Адміністратора видалено успішно'
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete admin',
                message: error.message 
            });
        }
    }

    // ===============================
    // ПЕРЕВІРКА ЧИ Є ВИХОВАТЕЛЕМ
    // ===============================

    async verifyEducator(request, reply) {
        try {
            const result = await kindergartenService.verifyEducator(request);
            reply.status(200).send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to verify educator',
                message: error.message 
            });
        }
    }

    // ===============================
    // КОНТРОЛЕРИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    async findPaymentStatementsByFilter(request, reply) {
        try {
            const data = await kindergartenService.findPaymentStatementsByFilter(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch payment statements',
                message: error.message 
            });
        }
    }

    async getPaymentStatementById(request, reply) {
        try {
            const data = await kindergartenService.getPaymentStatementById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to get payment statement',
                message: error.message 
            });
        }
    }

    async createPaymentStatement(request, reply) {
        try {
            const result = await kindergartenService.createPaymentStatement(request);
            reply.status(201).send({ 
                message: 'Виписку по оплаті створено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }

            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }

            reply.status(400).send({ 
                error: 'Failed to create payment statement',
                message: error.message 
            });
        }
    }

    async createPaymentStatementAuto(request, reply) {
        try {
            const result = await kindergartenService.createPaymentStatementAuto(request);
            reply.status(201).send({ 
                message: 'Виписку по оплаті створено успішно з автозаповненням суми',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }

            if (error.message.includes('не знайдено') || error.message.includes('не знайдена')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }

            reply.status(400).send({ 
                error: 'Failed to create payment statement',
                message: error.message 
            });
        }
    }

    async updatePaymentStatement(request, reply) {
        try {
            const result = await kindergartenService.updatePaymentStatement(request);
            reply.status(200).send({ 
                message: 'Виписку по оплаті оновлено успішно',
                data: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }

            if (error.message.includes('вже існує')) {
                return reply.status(409).send({ 
                    error: 'Conflict',
                    message: error.message 
                });
            }

            reply.status(400).send({ 
                error: 'Failed to update payment statement',
                message: error.message 
            });
        }
    }

    async deletePaymentStatement(request, reply) {
        try {
            await kindergartenService.deletePaymentStatement(request);
            reply.status(200).send({ 
                message: 'Виписку по оплаті видалено успішно' 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to delete payment statement',
                message: error.message 
            });
        }
    }

    async parseBillingPDF(request, reply) {
        try {
            const pdf = require('pdf-parse');
            
            let buffer = null;
            
            if (request.body?.file?.value) {
                buffer = await request.body.file.value.toBuffer();
            } else if (request.body?.file) {
                buffer = await request.body.file.toBuffer();
            } else {
                const firstKey = Object.keys(request.body || {})[0];
                if (firstKey && request.body[firstKey]) {
                    buffer = await request.body[firstKey].toBuffer();
                }
            }
            
            if (!buffer) {
                throw new Error('Файл не завантажено');
            }
            
            const pdfData = await pdf(buffer);
            const text = pdfData.text;
            
            console.log('📄 PDF Text (excerpt):', text.substring(0, 800));
            
            // ✅ ПІБ - тільки великі літери перед "(Адреса платника)"
            const nameMatch = text.match(/([А-ЯІЇЄҐ][А-ЯІЇЄҐ\s]+[А-ЯІЇЄҐ])\s*\(Адреса платника\)/);
            
            // ✅ Витягуємо всі числа формату XXX.XX
            const allNumbers = text.match(/\d+\.\d+/g);
            console.log('🔢 Всі числа:', allNumbers);
            
            let debt = 0, accrued = 0, paid = 0;
            
            if (allNumbers && allNumbers.length >= 7) {
                // Перше число - борг (674.03)
                debt = parseFloat(allNumbers[0]) || 0;
                
                // 5-те число - нараховано (672.62)
                accrued = parseFloat(allNumbers[4]) || 0;
                
                // 7-ме число - оплачено (960.37)
                paid = parseFloat(allNumbers[6]) || 0;
            }
            
            // ✅ Місяць - "Червень 2025"
            const monthMatch = text.match(/(Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень)\s+(\d{4})/i);
            
            const parsedData = {
                child_name: nameMatch ? nameMatch[1].trim() : null,
                current_debt: debt,
                current_accrual: accrued,
                current_payment: paid,
                payment_month: monthMatch ? `${monthMatch[1]} ${monthMatch[2]}` : null
            };
            
            console.log('✅ Parsed data:', parsedData);
            
            if (!parsedData.child_name) {
                throw new Error('Не вдалося розпізнати ПІБ з квитанції');
            }
            
            return reply.send({
                success: true,
                data: parsedData
            });
            
        } catch (error) {
            console.error('❌ Error parsing PDF:', error);
            return reply.status(400).send({
                success: false,
                error: error.message || 'Помилка обробки PDF'
            });
        }
    }

    async findMonthlyPaymentStatements(request, reply) {
        try {
            const data = await kindergartenService.findMonthlyPaymentStatements(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch monthly payment statements',
                message: error.message 
            });
        }
    }

    // ===============================
    // КОНТРОЛЕРИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ
    // ===============================

    async findPastAttendanceByFilter(request, reply) {
        try {
            const data = await kindergartenService.findPastAttendanceByFilter(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch past attendance',
                message: error.message 
            });
        }
    }

    async getPastAttendanceById(request, reply) {
        try {
            const data = await kindergartenService.getPastAttendanceById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            
            if (error.message.includes('не знайдено')) {
                return reply.status(404).send({ 
                    error: 'Not Found',
                    message: error.message 
                });
            }
            
            reply.status(400).send({ 
                error: 'Failed to get past attendance',
                message: error.message 
            });
        }
    }


    // ===============================
    // КОНТРОЛЕРИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ (PAST_ATTENDANCE)
    // ===============================

    async findPastAttendanceByFilter(request, reply) {
        try {
            const data = await kindergartenService.findPastAttendanceByFilter(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to fetch past attendance',
                message: error.message
            });
        }
    }

    async getPastAttendanceById(request, reply) {
        try {
            const data = await kindergartenService.getPastAttendanceById(request);
            reply.status(200).send(data);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(404).send({
                error: 'Past attendance not found',
                message: error.message
            });
        }
    }

    async archiveYesterdayAttendance(request, reply) {
        try {
            const result = await kindergartenService.archiveYesterdayAttendance();
            reply.status(200).send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({ 
                error: 'Failed to archive attendance',
                message: error.message 
            });
        }
    }   

    // ===============================
    // ОТРИМАННЯ ГРУП ПО САДОЧКУ
    // ===============================

    async getGroupsByKindergarten(request, reply) {
        try {
            const groups = await kindergartenService.getGroupsByKindergarten(request);
            reply.status(200).send(groups);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({ 
                error: 'Failed to fetch groups',
                message: error.message 
            });
        }
    }

    async syncAllBilling(request, reply) {
        try {
            const result = await kindergartenService.syncAllBilling(request);
            reply.status(200).send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to sync all billing',
                message: error.message
            });
        }
    }

    // ===============================
    // ГЕНЕРАЦІЯ РЕКВІЗИТІВ ДЛЯ САДОЧКА
    // ===============================

    async generateKindergartenRequisite(request, reply) {
        try {
            return await kindergartenService.generateKindergartenRequisite(request, reply);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send({
                error: 'Failed to generate kindergarten requisite',
                message: error.message
            });
        }
    }
}

module.exports = new KindergartenController();