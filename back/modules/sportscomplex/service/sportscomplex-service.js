const sportsComplexRepository = require("../repository/sportscomplex-repository");
const logRepository = require("../../log/repository/log-repository");
const logger = require("../../../utils/logger");
const { paginate, paginationData } = require("../../../utils/function");
const { 
    allowedRequisitesFilterFields, 
    allowedServicesFilterFields, 
    allowedBillsFilterFields, 
    allowedClientsFilterFields, 
    displayRequisitesFilterFields, 
    displayServicesFilterFields, 
    displayBillsFilterFields, 
    displayClientsFilterFields,
    allowedSortFieldsBills,
    allowedSortFieldsClients,
    allowedSortFieldsServices,
    allowedSortFieldsRequisites
} = require("../../../utils/constants");
const { createRequisiteWord } = require("../../../utils/generateDocx");

class SportsComplexService {
    async findRequisitesByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = null, 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;
        
        const { offset } = paginate(page, limit);
        const allowedFields = allowedRequisitesFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Валідація сортування
        const isValidSortField = sort_by && allowedSortFieldsRequisites.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
        
        const validSortBy = isValidSortField ? sort_by : null;
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        console.log('🔄 Requisites sorting params:', { sort_by, sort_direction, validSortBy, validSortDirection });

        const data = await sportsComplexRepository.findRequisitesByFilter(
            limit, 
            offset, 
            displayRequisitesFilterFields, 
            allowedFields,
            validSortBy,
            validSortDirection
        );

        if (Object.keys(whereConditions).length > 0) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
        }

        const paginatedData = paginationData(data[0], page, limit, data[1]);
        
        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }
    
    async findPoolServicesByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = null, 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;
        
        const { offset } = paginate(page, limit);
        const allowedFields = allowedServicesFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Валідація сортування
        const isValidSortField = sort_by && allowedSortFieldsServices.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
        
        const validSortBy = isValidSortField ? sort_by : null;
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        console.log('🔄 Services sorting params:', { sort_by, sort_direction, validSortBy, validSortDirection });

        const data = await sportsComplexRepository.findPoolServicesByFilter(
            limit, 
            offset, 
            displayServicesFilterFields, 
            allowedFields,
            validSortBy,
            validSortDirection
        );

        if (Object.keys(whereConditions).length > 0) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук послуг басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
        }

        const paginatedData = paginationData(data[0], page, limit, data[1]);
        
        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    async getById(id) {
        try {
            return await sportsComplexRepository.getById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getById]", error);
            throw error;
        }
    }

    async generateWordById(id) {
        try {
            const data = await sportsComplexRepository.getRequisite(id);
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерування документа реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return await createRequisiteWord(data);
        } catch (error) {
            logger.error("[SportsComplexService][generateWordById]", error);
            throw error;
        }
    }

    async printById(id) {
        try {
            return await sportsComplexRepository.getRequisite(id);
        } catch (error) {
            logger.error("[SportsComplexService][printById]", error);
            throw error;
        }
    }

    // Методи для послуг
    async createPoolService(request) {
        try {
            const { name, lesson_count, price, service_group_id } = request.body;
            const result = await sportsComplexRepository.createPoolService({
                name,
                lesson_count,
                price,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення послуги басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
            
            return { success: true, message: 'Послугу успішно створено' };
        } catch (error) {
            logger.error("[SportsComplexService][createPoolService]", error);
            throw error;
        }
    }

    async createRequisite(request) {
        try {
            const { kved, iban, edrpou, service_group_id } = request.body;
            const result = await sportsComplexRepository.createRequisite({
                kved,
                iban,
                edrpou,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return { success: true, message: 'Реквізити успішно створено' };
        } catch (error) {
            logger.error("[SportsComplexService][createRequisite]", error);
            throw error;
        }
    }

    async getServiceGroups() {
        try {
            return await sportsComplexRepository.getServiceGroups();
        } catch (error) {
            logger.error("[SportsComplexService][getServiceGroups]", error);
            throw error;
        }
    }

    async getServicesByGroup(id) {
        try {
            return await sportsComplexRepository.getServicesByGroup(id);
        } catch (error) {
            logger.error("[SportsComplexService][getServicesByGroup]", error);
            throw error;
        }
    }

    // Нові методи для клієнтів та рахунків
    async searchClients(request) {
        try {
            const { name } = request.body;
            return await sportsComplexRepository.searchClientsByName(name);
        } catch (error) {
            logger.error("[SportsComplexService][searchClients]", error);
            throw error;
        }
    }

    async createBill(request) {
        try {
            const { membership_number, client_name, phone_number, service_id, discount_type } = request.body;
            
            const result = await sportsComplexRepository.createBillWithDiscount({
                membership_number,
                client_name,
                phone_number,
                service_id,
                discount_type
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення рахунку з пільгою',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return { 
                success: true, 
                message: 'Рахунок успішно створено',
                id: result.id
            };
        } catch (error) {
            logger.error("[SportsComplexService][createBill]", error);
            throw error;
        }
    }

    async updateBill(request) {
        try {
            const { id } = request.params;
            const { membership_number, client_name, phone_number, service_id, discount_type } = request.body;
            
            const result = await sportsComplexRepository.updateBillWithDiscount(id, {
                membership_number,
                client_name,
                phone_number,
                service_id,
                discount_type
            });
            
            if (!result) {
                throw new Error('Рахунок не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення рахунку з пільгою',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return { success: true, message: 'Рахунок успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateBill]", error);
            throw error;
        }
    }

    async findBillsByFilter(request) {
        try {
            console.log('🔍 === ПОЧАТОК ДЕБАГУ СЕРВІСУ BILLS ===');
            console.log('🔍 request.body:', JSON.stringify(request.body, null, 2));
            
            const { 
                page = 1, 
                limit = 16, 
                sort_by = null, 
                sort_direction = 'asc',
                ...whereConditions
            } = request.body;
            
            console.log('🔍 whereConditions:', JSON.stringify(whereConditions, null, 2));
            console.log('🔍 allowedBillsFilterFields:', allowedBillsFilterFields);
            
            const { offset } = paginate(page, limit);
            const allowedFields = allowedBillsFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

            console.log('🔍 allowedFields після фільтрації:', JSON.stringify(allowedFields, null, 2));
            console.log('🔍 allowedFields ключі:', Object.keys(allowedFields));

            // Валідація сортування
            const isValidSortField = sort_by && allowedSortFieldsBills.includes(sort_by);
            const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
            
            const validSortBy = isValidSortField ? sort_by : null;
            const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

            console.log('🔄 Bills sorting params:', { sort_by, sort_direction, validSortBy, validSortDirection });
            console.log('🔍 === ПЕРЕДАЄМО В РЕПОЗИТОРІЙ ===');

            const data = await sportsComplexRepository.findBillsByFilterWithDiscount(
                limit, 
                offset, 
                displayBillsFilterFields, 
                allowedFields,
                {}, // dateFilter
                validSortBy,
                validSortDirection
            );
            
            if (Object.keys(whereConditions).length > 0) {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук рахунків',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'payments',
                    oid: '16506',
                });
            }
            
            const paginatedData = paginationData(data[0], page, limit, data[1]);
            
            console.log('🔍 === РЕЗУЛЬТАТ СЕРВІСУ ===');
            console.log('🔍 paginatedData.items length:', paginatedData?.items?.length || 0);
            console.log('🔍 === КІНЕЦЬ ДЕБАГУ СЕРВІСУ ===');
            
            return {
                ...paginatedData,
                sort_by: validSortBy,
                sort_direction: validSortDirection
            };
        } catch (error) {
            logger.error("[SportsComplexService][findBillsByFilter]", error);
            console.error('❌ Service Error:', error.message);
            throw error;
        }
    }

    async getBillById(id) {
        try {
            return await sportsComplexRepository.getBillByIdWithDiscount(id);
        } catch (error) {
            logger.error("[SportsComplexService][getBillById]", error);
            throw error;
        }
    }

    async downloadBill(request) {
        try {
            const { id } = request.params;
            
            // Отримуємо дані рахунку
            const bill = await sportsComplexRepository.getBillByIdWithDiscount(id);
            
            if (!bill) {
                throw new Error('Рахунок не знайдено');
            }
            
            // Тут буде логіка генерації PDF файлу
            // Поки що повертаємо заглушку
            const pdfBuffer = Buffer.from('PDF заглушка');
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Завантаження рахунку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return pdfBuffer;
        } catch (error) {
            logger.error("[SportsComplexService][downloadBill]", error);
            throw error;
        }
    }

    async createServiceGroup(request) {
        try {
            const { name } = request.body;
            const result = await sportsComplexRepository.createServiceGroup({ name });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення групи послуг',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'service_groups',
                oid: '16503',
            });
            
            return result;
        } catch (error) {
            logger.error("[SportsComplexService][createServiceGroup]", error);
            throw error;
        }
    }

    async updateRequisite(request) {
        try {
            const { id } = request.params;
            const { kved, iban, edrpou, service_group_id } = request.body;
            
            const result = await sportsComplexRepository.updateRequisite(id, {
                kved,
                iban,
                edrpou,
                service_group_id
            });
            
            if (!result) {
                throw new Error('Реквізити не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return { success: true, message: 'Реквізити успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateRequisite]", error);
            throw error;
        }
    }

    async getServiceById(id) {
        try {
            return await sportsComplexRepository.getServiceById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getServiceById]", error);
            throw error;
        }
    }

    async updateService(request) {
        try {
            const { id } = request.params;
            const { name, lesson_count, price, service_group_id } = request.body;
            
            const result = await sportsComplexRepository.updateService(id, {
                name,
                lesson_count,
                price,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення послуги басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
            
            return { success: true, message: 'Послугу успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateService]", error);
            throw error;
        }
    }

    async findClientsByFilter(request) {
        try {
            const { 
                page = 1, 
                limit = 16, 
                sort_by = null, 
                sort_direction = 'asc',
                ...whereConditions
            } = request.body;
            
            const { offset } = paginate(page, limit);
            const allowedFields = allowedClientsFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

            // Валідація сортування
            const isValidSortField = sort_by && allowedSortFieldsClients.includes(sort_by);
            const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
            
            const validSortBy = isValidSortField ? sort_by : null;
            const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

            console.log('🔄 Clients sorting params:', { sort_by, sort_direction, validSortBy, validSortDirection });

            const data = await sportsComplexRepository.findClientsByFilter(
                limit, 
                offset, 
                displayClientsFilterFields, 
                allowedFields,
                validSortBy,
                validSortDirection
            );
            
            if (Object.keys(whereConditions).length > 0) {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук клієнтів',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'clients',
                    oid: '16507',
                });
            }
            
            const paginatedData = paginationData(data[0], page, limit, data[1]);
            
            return {
                ...paginatedData,
                sort_by: validSortBy,
                sort_direction: validSortDirection
            };
        } catch (error) {
            logger.error("[SportsComplexService][findClientsByFilter]", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    }

    validateUkrainianPhone(phone) {
        const cleanPhone = phone.replace(/\s/g, '');
        const phoneRegex = /^\+380(50|63|66|67|68|91|92|93|94|95|96|97|98|99)\d{7}$/;
        return phoneRegex.test(cleanPhone);
    }

    normalizeUkrainianPhone(phone) {
        let cleanPhone = phone.replace(/\s/g, '');
        
        if (cleanPhone.startsWith('380') && !cleanPhone.startsWith('+380')) {
            cleanPhone = '+' + cleanPhone;
        }
        
        if (cleanPhone.startsWith('+380') && cleanPhone.length === 13) {
            return cleanPhone.replace(/(\+38)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        }
        
        return phone;
    }

    async createClient(request) {
        try {
            const { name, phone_number, membership_number } = request.body;
            
            // Валідація ПІБ
            if (!name || name.trim().length < 2) {
                throw new Error('ПІБ клієнта обов\'язкове і має містити мінімум 2 символи');
            }
            
            // Валідація номера телефону
            if (!phone_number || !this.validateUkrainianPhone(phone_number)) {
                throw new Error('Номер телефону має бути у форматі +38 0XX XXX XX XX (український номер)');
            }
            
            // Нормалізуємо номер телефону
            const normalizedPhone = this.normalizeUkrainianPhone(phone_number);
            
            // Генерація/перевірка номера абонемента
            let finalMembershipNumber = membership_number;
            
            if (!finalMembershipNumber || finalMembershipNumber.trim() === '') {
                // Генеруємо новий унікальний номер
                finalMembershipNumber = await sportsComplexRepository.generateUniqueClientNumber();
            } else {
                // Перевіряємо унікальність введеного номера
                const membershipToCheck = finalMembershipNumber.trim();
                const isUnique = await sportsComplexRepository.checkMembershipUnique(membershipToCheck);
                
                if (!isUnique) {
                    throw new Error(`Номер абонемента "${membershipToCheck}" вже існує. Залиште поле порожнім для автоматичної генерації або введіть інший номер.`);
                }
                
                finalMembershipNumber = membershipToCheck;
            }
            
            const result = await sportsComplexRepository.createClient({
                name: name.trim(),
                phone_number: normalizedPhone,
                membership_number: finalMembershipNumber
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { 
                success: true, 
                message: 'Клієнта успішно створено',
                id: result.id,
                membership_number: finalMembershipNumber
            };
        } catch (error) {
            logger.error("[SportsComplexService][createClient]", error);
            throw error;
        }
    }

    async updateClient(request) {
        try {
            const { id } = request.params;
            const { name, membership_number, phone_number, subscription_duration, service_name } = request.body;
            
            const result = await sportsComplexRepository.updateClient(id, {
                name,
                membership_number,
                phone_number,
                subscription_duration,
                service_name
            });
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { 
                success: true, 
                message: 'Клієнта успішно оновлено',
                id: result.id
            };
        } catch (error) {
            logger.error("[SportsComplexService][updateClient]", error);
            throw error;
        }
    }

    async renewSubscription(request) {
        try {
            const { id } = request.params;
            
            const client = await sportsComplexRepository.getClientById(id);
            if (!client) {
                const error = new Error('Клієнта не знайдено');
                error.statusCode = 404;
                throw error;
            }
            
            const success = await sportsComplexRepository.renewClientSubscription(id);
            
            if (success) {
                await logRepository.createLog({
                    row_pk_id: id,
                    uid: request?.user?.id,
                    action: 'UPDATE',
                    client_addr: request?.ip,
                    application_name: 'Оновлення абонемента',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'clients',
                    oid: '16507',
                });
                
                return { 
                    success: true, 
                    message: 'Абонемент успішно оновлено на 30 днів' 
                };
            } else {
                throw new Error('Помилка при оновленні абонемента');
            }
        } catch (error) {
            logger.error("[SportsComplexService][renewSubscription]", error);
            throw error;
        }
    }

    async getClientById(id) {
        try {
            return await sportsComplexRepository.getClientById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getClientById]", error);
            throw error;
        }
    }

    async deleteClient(request) {
        try {
            const { id } = request.params;
            
            const result = await sportsComplexRepository.deleteClient(id);
            
            if (!result) {
                throw new Error('Клієнта не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'DELETE',
                client_addr: request?.ip,
                application_name: 'Видалення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { success: true, message: 'Клієнта успішно видалено' };
        } catch (error) {
            logger.error("[SportsComplexService][deleteClient]", error);
            throw error;
        }
    }

    async startLesson(request) {
        try {
            const { id } = request.params;
            
            const result = await sportsComplexRepository.startLesson(id);
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Початок заняття',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return result;
        } catch (error) {
            logger.error("[SportsComplexService][startLesson]", error);
            throw error;
        }
    }

    async searchClientByMembership(request) {
        try {
            const { membership_number } = request.body;
            const client = await sportsComplexRepository.searchClientByMembership(membership_number);
            return { data: client };
        } catch (error) {
            logger.error("[SportsComplexService][searchClientByMembership]", error);
            throw error;
        }
    }

    async getBillsReport(request) {
        try {
            const filters = request.body || {};
            const result = await sportsComplexRepository.findBillsForReport(filters);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            logger.error("[SportsComplexService][getBillsReport]", error);
            throw error;
        }
    }

    async exportBillsToWord(request) {
        try {
            const bills = request.body;
            
            if (!Array.isArray(bills) || bills.length === 0) {
                throw new Error('Немає даних для експорту');
            }
            
            const { Document, Paragraph, Table, TableRow, TableCell, AlignmentType, WidthType, Packer, BorderStyle } = require('docx');
            
            // Визначаємо тип звіту на основі дат
            const reportType = this.determineReportType(bills);
            console.log('📊 Тип звіту:', reportType);
            
            // Створюємо заголовки таблиці в залежності від типу звіту
            let headerRow;
            if (reportType === 'all_time') {
                // Для звіту за весь час - показуємо дату
                headerRow = new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER })],
                            width: { size: 4, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Номер абонемента", alignment: AlignmentType.CENTER })],
                            width: { size: 14, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "ПІБ клієнта", alignment: AlignmentType.CENTER })],
                            width: { size: 22, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Послуга", alignment: AlignmentType.CENTER })],
                            width: { size: 13, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "К-сть відвідувань", alignment: AlignmentType.CENTER })],
                            width: { size: 8, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Сума", alignment: AlignmentType.CENTER })],
                            width: { size: 10, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Пільга", alignment: AlignmentType.CENTER })],
                            width: { size: 23, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Дата створення", alignment: AlignmentType.CENTER })],
                            width: { size: 10, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        })
                    ]
                });
            } else {
                // Для звіту за день/дату - без дати, телефону, групи послуг
                headerRow = new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER })],
                            width: { size: 5, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Номер абонемента", alignment: AlignmentType.CENTER })],
                            width: { size: 16, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "ПІБ клієнта", alignment: AlignmentType.CENTER })],
                            width: { size: 24, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Послуга", alignment: AlignmentType.CENTER })],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "К-сть відвідувань", alignment: AlignmentType.CENTER })],
                            width: { size: 10, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Сума", alignment: AlignmentType.CENTER })],
                            width: { size: 9, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: "Пільга", alignment: AlignmentType.CENTER })],
                            width: { size: 16, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        })
                    ]
                });
            }

            // Створюємо рядки з даними
            const dataRows = bills.map((bill, index) => {
                if (reportType === 'all_time') {
                    // Для звіту за весь час - з датою
                    return new TableRow({
                        children: [
                            new TableCell({ 
                                children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })],
                                width: { size: 4, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.membership_number || "", alignment: AlignmentType.LEFT })],
                                width: { size: 14, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.client_name || "", alignment: AlignmentType.LEFT })],
                                width: { size: 18, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.service_name || "", alignment: AlignmentType.LEFT })],
                                width: { size: 15, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: (bill.visit_count || 0).toString(), alignment: AlignmentType.CENTER })],
                                width: { size: 8, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ 
                                    text: `${Math.round(parseFloat(bill.total_price) || 0)} грн`,
                                    alignment: AlignmentType.RIGHT 
                                })],
                                width: { size: 8, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: this.getDiscountLabel(bill.discount_type), alignment: AlignmentType.LEFT })],
                                width: { size: 23, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: new Date(bill.created_at).toLocaleDateString('uk-UA'), alignment: AlignmentType.CENTER })],
                                width: { size: 10, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            })
                        ]
                    });
                } else {
                    // Для звіту за день/дату - без дати
                    return new TableRow({
                        children: [
                            new TableCell({ 
                                children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })],
                                width: { size: 5, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.membership_number || "", alignment: AlignmentType.LEFT })],
                                width: { size: 16, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.client_name || "", alignment: AlignmentType.LEFT })],
                                width: { size: 24, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: bill.service_name || "", alignment: AlignmentType.LEFT })],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: (bill.visit_count || 0).toString(), alignment: AlignmentType.CENTER })],
                                width: { size: 10, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ 
                                    text: `${Math.round(parseFloat(bill.total_price) || 0)} грн`,
                                    alignment: AlignmentType.RIGHT 
                                })],
                                width: { size: 9, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            }),
                            new TableCell({ 
                                children: [new Paragraph({ text: this.getDiscountLabel(bill.discount_type), alignment: AlignmentType.LEFT })],
                                width: { size: 16, type: WidthType.PERCENTAGE },
                                margins: { top: 100, bottom: 100, left: 100, right: 100 }
                            })
                        ]
                    });
                }
            });
            
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 1 },
                    bottom: { style: BorderStyle.SINGLE, size: 1 },
                    left: { style: BorderStyle.SINGLE, size: 1 },
                    right: { style: BorderStyle.SINGLE, size: 1 },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                },
                rows: [headerRow, ...dataRows]
            });
            
            // Підрахунок загальної суми
            const totalAmount = bills.reduce((sum, bill) => {
                const price = parseFloat(bill.total_price) || 0;
                return sum + price;
            }, 0);
            
            // Заголовок документу
            const reportDate = this.getReportDate(bills, reportType);
            const documentTitle = this.getDocumentTitle(reportType, reportDate);
            
            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            text: documentTitle,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),
                        new Paragraph({
                            text: `Дата формування: ${new Date().toLocaleDateString('uk-UA')}`,
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: `Загальна кількість рахунків: ${bills.length}`,
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            text: `Загальна сума: ${Math.round(totalAmount)} грн`,
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 300 }
                        }),
                        table
                    ]
                }]
            });
            
            const buffer = await Packer.toBuffer(doc);
            return buffer;
            
        } catch (error) {
            logger.error("[SportsComplexService][exportBillsToWord]", error);
            throw error;
        }
    }

    // Допоміжні методи
    determineReportType(bills) {
        if (bills.length === 0) return 'all_time';
        
        const today = new Date().toISOString().split('T')[0];
        const firstBillDate = new Date(bills[0].created_at).toISOString().split('T')[0];
        
        // Перевіряємо чи всі рахунки за сьогодні
        const allToday = bills.every(bill => {
            const billDate = new Date(bill.created_at).toISOString().split('T')[0];
            return billDate === today;
        });
        
        if (allToday) return 'today';
        
        // Перевіряємо чи всі рахунки за одну дату
        const allSameDate = bills.every(bill => {
            const billDate = new Date(bill.created_at).toISOString().split('T')[0];
            return billDate === firstBillDate;
        });
        
        if (allSameDate) return 'specific_date';
        
        return 'all_time';
    }

    getReportDate(bills, reportType) {
        if (reportType === 'today') {
            return new Date().toLocaleDateString('uk-UA');
        } else if (reportType === 'specific_date' && bills.length > 0) {
            return new Date(bills[0].created_at).toLocaleDateString('uk-UA');
        }
        return null;
    }

    getDocumentTitle(reportType, reportDate) {
        if (reportType === 'today' || reportType === 'specific_date') {
            return `Звіт за день (${reportDate})`;
        }
        return 'Звіт по платежам за увесь час';
    }

    getDiscountLabel(discountType) {
        if (!discountType) return 'Без пільги';
        
        const discountLabels = {
            'orphans_heroes': 'Дітям-сиротам та багатодітним сім\'ям',
            'refugees_heroes_war': 'Дітям-біженцям та героям війни',
            'disability_1_2': 'Особам з інвалідністю I-II групи',
            'war_veterans': 'Учасникам бойових дій',
            'military_service': 'Військовослужбовці'
        };
        
        return discountLabels[discountType] || discountType;
    }
}

module.exports = new SportsComplexService();