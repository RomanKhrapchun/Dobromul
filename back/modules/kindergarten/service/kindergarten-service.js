const KindergartenRepository = require("../repository/kindergarten-repository");
const { paginate, paginationData } = require("../../../utils/function");
const logRepository = require('../../log/repository/log-repository');
const { createKindergartenRequisiteWord } = require('../../../utils/generateDocx');
const debtorRepository = require('../../debtor/repository/debtor-repository');

class KindergartenService {


    /**
     * Визначити тип садочка з body запиту
     * @param {object} request - Fastify request object
     * @returns {string|null} - '1', '2', або null для спільних таблиць
     */
    getKindergartenType(request) {
        const kindergartenType = request.body?.kindergarten_type || request.query?.kindergarten_type || null;

        if (kindergartenType === '1' || kindergartenType === 1) {
            console.log('🎯 Kindergarten type detected: 1');
            return '1';
        }

        if (kindergartenType === '2' || kindergartenType === 2) {
            console.log('🎯 Kindergarten type detected: 2');
            return '2';
        }

        console.log('🎯 Kindergarten type detected: null (shared tables)');
        return null;
    }

    async getDebtByDebtorId(request) {
        const userData = await KindergartenRepository.findDebtorById(request.params?.id)
        return userData[0];
    }

    async findDebtByFilter(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const userData = await KindergartenRepository.findDebtByFilter(limit, offset, whereConditions);
        return paginationData(userData[0], page, limit);
    }

    async generateWordByDebtId(request, reply) {
        const userData = await KindergartenRepository.generateWordByDebtId(request, reply)
        return userData;
    }

    async printDebtId(request, reply) {
        const userData = await KindergartenRepository.printDebtId(request, reply)
        return userData;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ГРУП САДОЧКА
    // ===============================

    async findGroupsByFilter(request) {
        // Визначити тип садочка з URL
        const kindergartenType = this.getKindergartenType(request);
        
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            kindergarten_name,  // ✅ ДОДАНО: витягуємо з request
            group_name,
            group_type,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є хоча б один фільтр
        // ✅ ЗМІНЕНО: додано kindergarten_name до умови
        if (kindergarten_name || group_name || group_type) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук груп садочку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_groups',
                oid: '16505',
            });
        }

        // ✅ ЗМІНЕНО: додано передачу kindergarten_name до Repository
        const userData = await KindergartenRepository.findGroupsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            kindergarten_name,  // ✅ ДОДАНО
            group_name,
            group_type,
            ...whereConditions
        }, kindergartenType);

        return paginationData(userData[0], page, limit);
    }

    async createGroup(request) {
        
    const { kindergarten_name, group_name, group_type } = request.body;

        // ❌ ВИДАЛИТИ ЦЮ КОНВЕРТАЦІЮ:
        // const groupTypeMapping = {
        //     'young': 'молодша група',
        //     'older': 'старша група'
        // };
        // const group_type_ua = groupTypeMapping[group_type] || group_type;

        const existingGroup = await KindergartenRepository.getGroupByName(group_name);
        if (existingGroup && existingGroup.length > 0) {
            throw new Error('Група з такою назвою вже існує');
        }

    const groupData = { kindergarten_name, group_name, group_type, created_at: new Date() };

        const result = await KindergartenRepository.createGroup(groupData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення групи садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async updateGroup(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        // ❌ ВИДАЛИТИ ЦЮ КОНВЕРТАЦІЮ:
        // if (updateData.group_type) {
        //     const groupTypeMapping = {
        //         'young': 'молодша група',
        //         'older': 'старша група'
        //     };
        //     updateData.group_type = groupTypeMapping[updateData.group_type] || updateData.group_type;
        // }

        if (updateData.group_name) {
            const duplicateGroup = await KindergartenRepository.getGroupByName(
                updateData.group_name,
                id
            );

            if (duplicateGroup && duplicateGroup.length > 0) {
                throw new Error('Група з такою назвою вже існує');
            }
        }

        const result = await KindergartenRepository.updateGroup(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення групи садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async deleteGroup(request) {
        const { id } = request.params;

        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        const result = await KindergartenRepository.deleteGroup(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення групи садочку',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДІТЕЙ САДОЧКА
    // ===============================

    async findChildrenByFilter(request) {
        // Визначити тип садочка з URL
        const kindergartenType = this.getKindergartenType(request);
        
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name', 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (Object.keys(whereConditions).length > 0) {
            try {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук дітей садочка',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'ower',
                    table_name: 'children_roster',
                    oid: '16506',
                });
            } catch (logError) {
                console.error('[findChildrenByFilter] Logging error:', logError.message);
            }
        }

        const userData = await KindergartenRepository.findChildrenByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            ...whereConditions
        }, kindergartenType);

        return paginationData(userData[0], page, limit, userData[1]);
    }

    async getChildById(request) {
        const kindergartenType = this.getKindergartenType(request);
        const { id } = request.params;
        const childData = await KindergartenRepository.getChildById(id);

        if (!childData || childData.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        return childData[0];
    }

    async createChild(request) {
        const kindergartenType = this.getKindergartenType(request);
        const {
            child_name,
            parent_name,
            phone_number,
            
            group_id
        } = request.body;

        const existingChild = await KindergartenRepository.getChildByNameAndParent(
            child_name,
            parent_name,
            
        );

        if (existingChild && existingChild.length > 0) {
            throw new Error('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
        }

        if (group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Група не знайдена');
            }
        }

        const childData = {
            child_name,
            parent_name,
            phone_number,
            
            group_id,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createChild(childData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async updateChild(request) {
        const kindergartenType = this.getKindergartenType(request);
        const { id } = request.params;
        const updateData = request.body;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        if (updateData.group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(updateData.group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Група не знайдена');
            }
        }

        if (updateData.child_name && updateData.parent_name) {
            const duplicateChild = await KindergartenRepository.getChildByNameAndParent(
                updateData.child_name,
                updateData.parent_name,
                
                id
            );

            if (duplicateChild && duplicateChild.length > 0) {
                throw new Error('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
            }
        }

        const result = await KindergartenRepository.updateChild(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення даних дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async deleteChild(request) {
        const kindergartenType = this.getKindergartenType(request);
        const { id } = request.params;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const result = await KindergartenRepository.deleteChild(id);

        try {
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'DELETE',
                client_addr: request?.ip,
                application_name: 'Видалення дитини з садочка',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'children_roster',
                oid: '16506',
            });
        } catch (logError) {
            console.error('[deleteChild] Logging error:', logError.message);
        }

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВІДВІДУВАНОСТІ
    // ===============================

    async findAttendanceByFilter(request) {
        // Визначити тип садочка з URL
        const kindergartenType = this.getKindergartenType(request);
        
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name', 
            sort_direction = 'asc',
            child_name,
            group_name,
            kindergarten_name,
            date,
            attendance_status,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        const getCurrentUkraineDate = () => {
            const now = new Date();
            const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
            return ukraineTime.toISOString().split('T')[0];
        };
        
        const filterDate = date || getCurrentUkraineDate();
        const currentDate = getCurrentUkraineDate();
        
        // ✅ АВТОМАТИЧНЕ АРХІВУВАННЯ: якщо дата запиту = сьогодні, архівуємо вчорашні дані
        if (filterDate === currentDate) {
            try {
                console.log('🗄️ Автоархівування: перевірка необхідності...');
                await KindergartenRepository.archiveYesterdayAttendance();
                console.log('✅ Автоархівування завершено');
            } catch (archiveError) {
                console.error('⚠️ Помилка автоархівування (не критично):', archiveError.message);
                // Продовжуємо навіть якщо архівування не вдалося
            }
        }
        
        if (child_name || group_name || kindergarten_name || attendance_status) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }

        const userData = await KindergartenRepository.findAttendanceByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_name,
            group_name,
            kindergarten_name,
            date: filterDate,
            attendance_status,
            ...whereConditions
        }, kindergartenType);

        return paginationData(userData[0], page, limit);
    }
    
    async getAttendanceById(request) {
        const { id } = request.params;
        
        const attendanceData = await KindergartenRepository.getAttendanceById(id);
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        return attendanceData[0];
    }

    async createAttendance(request) {
        const kindergartenType = this.getKindergartenType(request);
        const {
            date,
            child_id,
            attendance_status,
            notes
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const existingAttendance = await KindergartenRepository.getAttendanceByDateAndChild(date, child_id);
        if (existingAttendance && existingAttendance.length > 0) {
            throw new Error('Запис відвідуваності для цієї дитини на цю дату вже існує');
        }

        const attendanceData = {
            date,
            child_id,
            attendance_status,
            notes: notes || null,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createAttendance(attendanceData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        if (attendance_status === 'present') {
            try {
                console.log('🎯 Дитина присутня, створюємо payment_statement');
                console.log('📅 Дата:', date);
                console.log('👶 child_id:', child_id);
                
                const existingPayment = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
                
                if (!existingPayment || existingPayment.length === 0) {
                    console.log('✅ Виписки ще немає, створюємо нову');
                    
                    const child = existingChild[0];
                    const groupId = child.group_id;
                    
                    console.log('👥 Group ID:', groupId);

                    let payment_amount = 0;
                    
                    if (groupId) {
                        const groupData = await KindergartenRepository.getGroupById(groupId);

                        console.log('📊 Дані групи:', groupData);

                        if (groupData && groupData.length > 0) {
                            const groupType = groupData[0].group_type;
                            const groupName = groupData[0].group_name;
                            const kindergartenId = groupData[0].kindergarten_id;  // ✅ ДОДАНО

                            console.log('🔍 DEBUG:', {
                                groupType,
                                groupName,
                                kindergartenId,  // ✅ ДОДАНО
                                date
                            });

                            // ✅ ЗМІНЕНО: передаємо kindergartenId
                            const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroupType(date, groupType, kindergartenId);

                            console.log('💰 Food cost result:', foodCostResult);

                            if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
                                payment_amount = parseFloat(foodCostResult[0].cost);
                                console.log('✅ Base payment_amount:', payment_amount);
                            } else {
                                console.warn(`⚠️ УВАГА: Не знайдено вартість харчування для дати ${date} та типу групи "${groupType}" для садочка #${kindergartenId}. Payment statement буде створено з сумою 0. Будь ласка, встановіть вартість харчування у відповідній вкладці.`);
                            }
                        }
                    } else {
                        console.log('⚠️ У дитини немає group_id');
                    }

                    // ✅ ЗАВДАННЯ 4: Перевіряємо чи є пільга для дитини
                    console.log(`🔍 Перевіряємо пільгу для дитини #${child_id} на дату ${date}`);
                    const benefitResult = await KindergartenRepository.getActiveBenefitForChild(child_id, date);
                    console.log(`📋 Результат запиту пільги:`, benefitResult);
                    let benefitApplied = false;
                    let benefitPercentage = 0;

                    if (benefitResult && benefitResult.length > 0) {
                        benefitPercentage = parseFloat(benefitResult[0].benefit_percentage) || 0;
                        console.log(`🎁 Знайдено активну пільгу ${benefitPercentage}% для дитини #${child_id}`);

                        // Якщо пільга 100% - НЕ створюємо payment_statement взагалі
                        if (benefitPercentage >= 100) {
                            console.log('🎉 Пільга 100% - payment_statement НЕ створюється');
                            benefitApplied = true;
                            // Виходимо без створення payment_statement
                        } else if (benefitPercentage > 0) {
                            // Застосовуємо пільгу: payment_amount = base_cost * (1 - benefit_percentage / 100)
                            const originalAmount = payment_amount;
                            payment_amount = payment_amount * (1 - benefitPercentage / 100);
                            console.log(`💰 Застосовано пільгу: ${originalAmount} → ${payment_amount.toFixed(2)} (зниження ${benefitPercentage}%)`);
                            benefitApplied = true;
                        }
                    }

                    // Створюємо payment_statement тільки якщо пільга не 100%
                    if (!benefitApplied || benefitPercentage < 100) {
                        const paymentData = {
                            date,
                            child_id,
                            payment_amount,
                            created_at: new Date()
                        };

                        console.log('💾 Зберігаємо payment_statement:', paymentData);

                        await KindergartenRepository.createPaymentStatement(paymentData);

                        try {
                            const child_name = child.child_name;
                            const payment_month = date.substring(0, 7);
                            await KindergartenRepository.syncBillingForMonth(child_name, payment_month);
                        } catch (syncError) {
                            console.error('⚠️ Помилка синхронізації:', syncError);
                        }

                        await logRepository.createLog({
                            row_pk_id: null,
                            uid: request?.user?.id,
                            action: 'INSERT',
                            client_addr: request?.ip,
                            application_name: 'Автоматичне створення виписки по оплаті',
                            action_stamp_tx: new Date(),
                            action_stamp_stm: new Date(),
                            action_stamp_clk: new Date(),
                            schema_name: 'ower',
                            table_name: 'payment_statements',
                            oid: '16509',
                        });

                        console.log('✅ Payment statement успішно створено!');
                    } else {
                        console.log('🎁 Payment statement НЕ створено через 100% пільгу');
                    }
                } else {
                    console.log('ℹ️ Виписка вже існує для цієї дати та дитини');
                }
            } catch (error) {
                console.error('❌ Помилка при створенні payment_statement:', {
                    error: error.message,
                    stack: error.stack,
                    date,
                    child_id
                });
            }
        }

        let warningMessage = null;

        // Перевіряємо чи був створений payment_statement з сумою 0
        if (attendance_status === 'present') {
            const paymentCheck = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
            if (paymentCheck && paymentCheck.length > 0 && parseFloat(paymentCheck[0].payment_amount) === 0) {
                warningMessage = 'УВАГА: Payment statement створено з сумою 0. Можливо, не встановлена вартість харчування для цієї дати та групи.';
            }
        }

        return {
            success: true,
            message: 'Запис відвідуваності створено успішно',
            warning: warningMessage,
            data: result
        };
    }

    async updateAttendance(request) {
        const kindergartenType = this.getKindergartenType(request);
        const { id } = request.params;
        const updateData = request.body;

        const existingAttendance = await KindergartenRepository.getAttendanceById(id);
        if (!existingAttendance || existingAttendance.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        const oldAttendance = existingAttendance[0];
        const oldStatus = oldAttendance.attendance_status;
        const newStatus = updateData.attendance_status;
        const date = oldAttendance.date;
        const child_id = oldAttendance.child_id;

        console.log('🔄 Оновлення відвідуваності:', {
            oldStatus,
            newStatus,
            date,
            child_id
        });

        // Перевірка на дублікат при зміні дати або дитини
        if (updateData.date || updateData.child_id) {
            const checkDate = updateData.date || date;
            const checkChildId = updateData.child_id || child_id;
            
            const duplicateAttendance = await KindergartenRepository.getAttendanceByDateAndChild(
                checkDate,
                checkChildId,
                id
            );

            if (duplicateAttendance && duplicateAttendance.length > 0) {
                throw new Error('Запис відвідуваності для цієї дитини на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updateAttendance(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        // ✅ ЛОГІКА РОБОТИ З PAYMENT_STATEMENTS
        try {
            const existingPayment = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);

            // Якщо статус змінився з "present" на щось інше - ВИДАЛЯЄМО payment_statement
            if (oldStatus === 'present' && newStatus !== 'present') {
                console.log('🗑️ Дитина більше не присутня, видаляємо payment_statement');
                
                if (existingPayment && existingPayment.length > 0) {
                    const paymentId = existingPayment[0].id;
                    await KindergartenRepository.deletePaymentStatement(paymentId);
                    
                    await logRepository.createLog({
                        row_pk_id: paymentId,
                        uid: request?.user?.id,
                        action: 'DELETE',
                        client_addr: request?.ip,
                        application_name: 'Автоматичне видалення виписки по оплаті',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'payment_statements',
                        oid: '16509',
                    });
                    
                    console.log('✅ Payment statement видалено');

                    try {
                        const childData = await KindergartenRepository.getChildById(child_id);
                        if (childData && childData.length > 0) {
                            const child_name = childData[0].child_name;
                            const payment_month = typeof date === 'string' ? date.substring(0, 7) : date.toISOString().substring(0, 7);
                            await KindergartenRepository.syncBillingForMonth(child_name, payment_month);
                            console.log('✅ Billing синхронізовано після видалення');
                        }
                    } catch (syncError) {
                        console.error('⚠️ Помилка синхронізації:', syncError);
                    }
                }
            }
            
            // Якщо статус змінився на "present" - СТВОРЮЄМО payment_statement
            else if (oldStatus !== 'present' && newStatus === 'present') {
                console.log('✅ Дитина тепер присутня, створюємо payment_statement');

                if (!existingPayment || existingPayment.length === 0) {
                    const child = await KindergartenRepository.getChildById(child_id);

                    if (child && child.length > 0) {
                        const groupId = child[0].group_id;
                        let payment_amount = 0;

                        if (groupId) {
                            const groupData = await KindergartenRepository.getGroupById(groupId);

                            if (groupData && groupData.length > 0) {
                                const groupType = groupData[0].group_type;
                                const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroupType(date, groupType);

                                if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
                                    payment_amount = parseFloat(foodCostResult[0].cost);
                                }
                            }
                        }

                        // ✅ ЗАВДАННЯ 4: Перевіряємо чи є пільга для дитини
                        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
                        console.log(`🔍 Перевіряємо пільгу для дитини #${child_id} на дату ${dateStr}`);
                        const benefitResult = await KindergartenRepository.getActiveBenefitForChild(child_id, dateStr);
                        console.log(`📋 Результат запиту пільги:`, benefitResult);

                        let benefitApplied = false;
                        let benefitPercentage = 0;

                        if (benefitResult && benefitResult.length > 0) {
                            benefitPercentage = parseFloat(benefitResult[0].benefit_percentage) || 0;
                            console.log(`🎁 Знайдено активну пільгу ${benefitPercentage}% для дитини #${child_id}`);

                            // Якщо пільга 100% - НЕ створюємо payment_statement взагалі
                            if (benefitPercentage >= 100) {
                                console.log('🎉 Пільга 100% - payment_statement НЕ створюється');
                                benefitApplied = true;
                            } else if (benefitPercentage > 0) {
                                // Застосовуємо пільгу: payment_amount = base_cost * (1 - benefit_percentage / 100)
                                const originalAmount = payment_amount;
                                payment_amount = payment_amount * (1 - benefitPercentage / 100);
                                console.log(`💰 Застосовано пільгу: ${originalAmount} → ${payment_amount.toFixed(2)} (зниження ${benefitPercentage}%)`);
                                benefitApplied = true;
                            }
                        }

                        // Створюємо payment_statement тільки якщо пільга не 100%
                        if (benefitPercentage < 100) {
                            const paymentData = {
                                date,
                                child_id,
                                payment_amount,
                                created_at: new Date()
                            };

                            await KindergartenRepository.createPaymentStatement(paymentData);

                            await logRepository.createLog({
                                row_pk_id: null,
                                action: 'INSERT',
                                client_addr: request?.ip,
                                application_name: 'Автоматичне створення виписки по оплаті',
                                action_stamp_tx: new Date(),
                                action_stamp_stm: new Date(),
                                action_stamp_clk: new Date(),
                                schema_name: 'ower',
                                table_name: 'payment_statements',
                                oid: '16509',
                            });

                            console.log('✅ Payment statement створено');

                            try {
                                const child_name = child[0].child_name;
                                const payment_month = typeof date === 'string' ? date.substring(0, 7) : date.toISOString().substring(0, 7);
                                await KindergartenRepository.syncBillingForMonth(child_name, payment_month);
                                console.log('✅ Billing синхронізовано після створення');
                            } catch (syncError) {
                                console.error('⚠️ Помилка синхронізації:', syncError);
                            }
                        } else {
                            // Пільга 100% - не створюємо payment_statement
                            console.log('🎉 Пільга 100% - нарахування не створюється, billing не змінюється');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Помилка при роботі з payment_statement:', {
                error: error.message,
                date,
                child_id
            });
        }

        return result;
    }

    async deleteAttendance(request) {
        const kindergartenType = this.getKindergartenType(request);
        const { id } = request.params;

        const existingRecord = await KindergartenRepository.getAttendanceById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        const result = await KindergartenRepository.deleteAttendance(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        return result;
    }

    // ===============================
    // ОТРИМАННЯ ДАТ З ВІДВІДУВАНІСТЮ
    // ===============================

    async getAttendanceDates(request) {
        const filters = request.body;

        const dates = await KindergartenRepository.getAttendanceDates(filters);
        
        return {
            dates: dates.map(item => item.date),
            count: dates.length
        };
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДОВІДНИКА САДОЧКІВ
    // ===============================

    // ✅ ДОДАНО: Отримати всі садочки
    async getAllKindergartens() {
        return await KindergartenRepository.getAllKindergartens();
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
    // ===============================

    async findDailyFoodCostByFilter(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'date',
            sort_direction = 'desc',
            date_from,
            date_to,
            kindergarten_type,  // ✅ Витягуємо kindergarten_type
            kindergarten_id,    // ✅ Ігноруємо застарілий kindergarten_id (якщо прийшов з кешу)
            ...whereConditions
        } = request.body;

        const { offset } = paginate(page, limit);

        if (date_from || date_to) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук вартості харчування',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'daily_food_cost',
                oid: '16508',
            });
        }

        // ✅ Передаємо kindergarten_type як другий параметр
        const userData = await KindergartenRepository.findDailyFoodCostByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            date_from,
            date_to,
            ...whereConditions
        }, kindergarten_type);

        return paginationData(userData[0], page, limit);
    }

    async createDailyFoodCost(request) {
        const {
            date,
            kindergarten_type,  // ✅ ЗМІНЕНО: kindergarten_id → kindergarten_type
            young_group_cost,
            older_group_cost
        } = request.body;

        // ✅ КОНВЕРТУЄМО kindergarten_type в kindergarten_id
        const kindergartenName = KindergartenRepository.getKindergartenName(kindergarten_type);
        const kindergarten_id = await KindergartenRepository.getKindergartenIdByName(kindergartenName);

        if (!kindergarten_id) {
            throw new Error(`Садочок з типом "${kindergarten_type}" не знайдено`);
        }

        // ✅ ЗМІНЕНО: Перевіряємо дублікат для конкретного садочка
        const existingRecord = await KindergartenRepository.getDailyFoodCostByDateAndKindergarten(
            date,
            kindergarten_id
        );

        if (existingRecord && existingRecord.length > 0) {
            throw new Error('Вартість харчування на цю дату для цього садочка вже існує');
        }

        const recordData = {
            date,
            kindergarten_id,  // ✅ ДОДАНО
            young_group_cost,
            older_group_cost,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createDailyFoodCost(recordData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        // ✅ АВТООНОВЛЕННЯ: Замінити поточну суму на нову
        try {
            console.log('🔄 Створення вартості - оновлюємо payment_statements для дати:', date);
            // ✅ ДОДАНО: передаємо kindergarten_id
            await this.applyFoodCostToPayments(
                date,
                young_group_cost,
                older_group_cost,
                'create',
                0,
                0,
                kindergarten_id  // ✅ ДОДАНО
            );
            console.log('✅ Payment_statements оновлено');
        } catch (error) {
            console.error('❌ Помилка оновлення payment_statements:', error);
        }

        return result;
    }

    async updateDailyFoodCost(request) {
        const { id } = request.params;
        const updateData = { ...request.body };

        // ✅ КОНВЕРТУЄМО kindergarten_type в kindergarten_id якщо передано
        if (updateData.kindergarten_type) {
            const kindergartenName = KindergartenRepository.getKindergartenName(updateData.kindergarten_type);
            const kindergarten_id = await KindergartenRepository.getKindergartenIdByName(kindergartenName);
            if (!kindergarten_id) {
                throw new Error(`Садочок з типом "${updateData.kindergarten_type}" не знайдено`);
            }
            updateData.kindergarten_id = kindergarten_id;
            delete updateData.kindergarten_type;  // Видаляємо, бо в БД немає такої колонки
        }

        // Отримуємо СТАРУ вартість ДО оновлення
        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const oldYoungCost = parseFloat(existingRecord[0].young_group_cost) || 0;
        const oldOlderCost = parseFloat(existingRecord[0].older_group_cost) || 0;
        const oldKindergartenId = existingRecord[0].kindergarten_id;  // ✅ ДОДАНО
        const dateToUpdate = existingRecord[0].date;

        // ✅ ЗМІНЕНО: Перевірка дублікатів з урахуванням kindergarten_id
        if (updateData.date || updateData.kindergarten_id) {
            const newDate = updateData.date || existingRecord[0].date;
            const newKindergartenId = updateData.kindergarten_id || oldKindergartenId;

            const duplicateRecord = await KindergartenRepository.getDailyFoodCostByDateAndKindergarten(
                newDate,
                newKindergartenId,
                id  // excludeId
            );

            if (duplicateRecord && duplicateRecord.length > 0) {
                throw new Error('Вартість харчування на цю дату для цього садочка вже існує');
            }
        }

        const result = await KindergartenRepository.updateDailyFoodCost(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        // ✅ АВТООНОВЛЕННЯ: Додати/відняти різницю
        try {
            const updatedRecord = await KindergartenRepository.getDailyFoodCostById(id);
            const record = updatedRecord[0];

            const newYoungCost = parseFloat(record.young_group_cost) || 0;
            const newOlderCost = parseFloat(record.older_group_cost) || 0;
            const kindergartenId = record.kindergarten_id;  // ✅ ДОДАНО

            console.log('🔄 Оновлення вартості:', {
                date: record.date,
                kindergarten_id: kindergartenId,
                young: { old: oldYoungCost, new: newYoungCost, diff: newYoungCost - oldYoungCost },
                older: { old: oldOlderCost, new: newOlderCost, diff: newOlderCost - oldOlderCost }
            });

            // ✅ ДОДАНО: передаємо kindergarten_id
            await this.applyFoodCostToPayments(
                record.date,
                newYoungCost,
                newOlderCost,
                'update',
                oldYoungCost,
                oldOlderCost,
                kindergartenId  // ✅ ДОДАНО
            );
            console.log('✅ Payment_statements оновлено');
        } catch (error) {
            console.error('❌ Помилка оновлення payment_statements:', error);
        }

        return result;
    }

    async deleteDailyFoodCost(request) {
        const { id } = request.params;

        // Отримуємо вартість ДО видалення
        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const oldYoungCost = parseFloat(existingRecord[0].young_group_cost) || 0;
        const oldOlderCost = parseFloat(existingRecord[0].older_group_cost) || 0;
        const dateToUpdate = existingRecord[0].date;
        const kindergartenId = existingRecord[0].kindergarten_id;  // ✅ ДОДАНО

        const result = await KindergartenRepository.deleteDailyFoodCost(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        // ✅ АВТООНОВЛЕННЯ: Обнулити вартість
        try {
            console.log('🔄 Видалення вартості - обнуляємо payment_statements для дати:', dateToUpdate);
            await this.applyFoodCostToPayments(dateToUpdate, 0, 0, 'delete', oldYoungCost, oldOlderCost, kindergartenId);  // ✅ ДОДАНО kindergartenId
            console.log('✅ Payment_statements обнулено');
        } catch (error) {
            console.error('❌ Помилка оновлення payment_statements:', error);
        }

        return result;
    }

    // ===============================
    // ✅ ЗАВДАННЯ 2: BREAKDOWN ВАРТОСТІ
    // ===============================

    /**
     * Отримати breakdown вартості харчування по групах
     * Формат відповіді:
     * {
     *   date: "2025-01-15",
     *   groups: [...],
     *   summary: { total_cost, total_present_children, average_cost_per_child }
     * }
     */
    async getDailyCostBreakdown(request) {
        const { date, kindergarten_id } = request.body;

        if (!date) {
            throw new Error('Дата обов\'язкова');
        }

        // Отримуємо дані з Repository
        const groupsData = await KindergartenRepository.getDailyCostBreakdownByDate(date, kindergarten_id);

        // Формуємо відповідь з розрахунками
        const groups = groupsData.map(group => {
            const presentCount = parseInt(group.present_count) || 0;
            const totalGroupCost = parseFloat(group.total_group_cost) || 0;
            const costPerChild = presentCount > 0 ? totalGroupCost / presentCount : 0;

            return {
                group_id: group.group_id,
                group_name: group.group_name,
                group_type: group.group_type,
                kindergarten_id: group.kindergarten_id,
                kindergarten_name: group.kindergarten_name,
                present_count: presentCount,
                total_group_cost: totalGroupCost.toFixed(2),
                cost_per_child: costPerChild.toFixed(2)
            };
        });

        // Підсумки
        const totalCost = groups.reduce((sum, g) => sum + parseFloat(g.total_group_cost), 0);
        const totalPresentChildren = groups.reduce((sum, g) => sum + g.present_count, 0);
        const averageCostPerChild = totalPresentChildren > 0 ? totalCost / totalPresentChildren : 0;

        return {
            date,
            kindergarten_id: kindergarten_id || null,
            groups,
            summary: {
                total_cost: totalCost.toFixed(2),
                total_present_children: totalPresentChildren,
                average_cost_per_child: averageCostPerChild.toFixed(2)
            }
        };
    }

    /**
     * Отримати breakdown вартості для конкретної дитини
     * Формат відповіді:
     * {
     *   child_id, child_name, group_name, kindergarten_name,
     *   attendance_status, total_group_cost, present_count,
     *   cost_per_child, payment_amount
     * }
     */
    async getChildDailyCostBreakdown(request) {
        const { date, child_id } = request.body;

        if (!date || !child_id) {
            throw new Error('Дата та child_id обов\'язкові');
        }

        // Отримуємо дані з Repository
        const result = await KindergartenRepository.getChildDailyCostBreakdown(date, child_id);

        if (!result || result.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const data = result[0];
        const presentCount = parseInt(data.present_count) || 0;
        const totalGroupCost = parseFloat(data.total_group_cost) || 0;
        const costPerChild = presentCount > 0 ? totalGroupCost / presentCount : 0;
        const paymentAmount = parseFloat(data.payment_amount) || 0;

        return {
            date,
            child_id: data.child_id,
            child_name: data.child_name,
            parent_name: data.parent_name,
            group_id: data.group_id,
            group_name: data.group_name,
            group_type: data.group_type,
            kindergarten_id: data.kindergarten_id,
            kindergarten_name: data.kindergarten_name,
            attendance_status: data.attendance_status,
            total_group_cost: totalGroupCost.toFixed(2),
            present_count: presentCount,
            cost_per_child: costPerChild.toFixed(2),
            payment_amount: paymentAmount.toFixed(2)
        };
    }

    // ===============================
    // ✅ ЗАВДАННЯ 3: CHILD PROPOSALS (ПРОПОЗИЦІЇ ДІТЕЙ)
    // ===============================

    /**
     * Створити пропозицію дитини (вихователем)
     */
    async createChildProposal(request) {
        const {
            child_name,
            child_birth_date,
            parent_name,
            phone_number,
            email,
            address,
            group_id,
            benefit_percentage,
            benefit_reason
        } = request.body;

        // Перевірка чи існує група
        const group = await KindergartenRepository.getGroupById(group_id);
        if (!group || group.length === 0) {
            throw new Error('Групу не знайдено');
        }

        const proposalData = {
            child_name,
            child_birth_date: child_birth_date || null,
            parent_name: parent_name || null,
            phone_number: phone_number || null,
            email: email || null,
            address: address || null,
            group_id,
            benefit_percentage: benefit_percentage || 0,
            benefit_reason: benefit_reason || null,
            status: 'pending',
            // Примітка: proposed_by не використовуємо, бо user.id є BIGINT (snowflake ID),
            // а колонка proposed_by є INTEGER - несумісні типи
            proposed_at: new Date()
        };

        const result = await KindergartenRepository.createChildProposal(proposalData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            // uid не використовуємо - user.id є BIGINT, а колонка uid є INTEGER
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення пропозиції дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_proposals',
            oid: '16510',
        });

        return result;
    }

    /**
     * Отримати список пропозицій з фільтрацією
     */
    async findChildProposals(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'proposed_at',
            sort_direction = 'desc',
            status,
            group_id,
            proposed_by,
            child_name,
            kindergarten_id
        } = request.body;

        const { offset } = paginate(page, limit);

        const userData = await KindergartenRepository.findChildProposals({
            limit,
            offset,
            sort_by,
            sort_direction,
            status,
            group_id,
            proposed_by,
            child_name,
            kindergarten_id
        });

        return paginationData(userData[0], page, limit);
    }

    /**
     * Отримати пропозицію за ID
     */
    async getChildProposalById(request) {
        const { id } = request.params;
        const result = await KindergartenRepository.getChildProposalById(id);

        if (!result || result.length === 0) {
            throw new Error('Пропозицію не знайдено');
        }

        return result[0];
    }

    /**
     * Оновити пропозицію (редагування перед затвердженням)
     */
    async updateChildProposal(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевірка чи існує
        const existing = await KindergartenRepository.getChildProposalById(id);
        if (!existing || existing.length === 0) {
            throw new Error('Пропозицію не знайдено');
        }

        // Можна редагувати лише pending пропозиції
        if (existing[0].status !== 'pending') {
            throw new Error('Можна редагувати лише пропозиції зі статусом pending');
        }

        const result = await KindergartenRepository.updateChildProposal(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення пропозиції дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_proposals',
            oid: '16510',
        });

        return result;
    }

    /**
     * Видалити пропозицію
     */
    async deleteChildProposal(request) {
        const { id } = request.params;

        const existing = await KindergartenRepository.getChildProposalById(id);
        if (!existing || existing.length === 0) {
            throw new Error('Пропозицію не знайдено');
        }

        const result = await KindergartenRepository.deleteChildProposal(id);

        await logRepository.createLog({
            row_pk_id: id,
            // uid не використовуємо - user.id є BIGINT, а колонка uid є INTEGER
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення пропозиції дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_proposals',
            oid: '16510',
        });

        return result;
    }

    /**
     * Затвердити пропозицію (адміністратором) - створює дитину в children_roster
     */
    async approveChildProposal(request) {
        const { id } = request.params;
        const { review_notes } = request.body || {};

        // Перевірка чи існує пропозиція
        const proposal = await KindergartenRepository.getChildProposalById(id);
        if (!proposal || proposal.length === 0) {
            throw new Error('Пропозицію не знайдено');
        }

        const proposalData = proposal[0];

        // Перевірка статусу
        if (proposalData.status !== 'pending') {
            throw new Error('Можна затверджувати лише пропозиції зі статусом pending');
        }

        // Створюємо дитину в children_roster
        const childData = {
            child_name: proposalData.child_name,
            child_birth_date: proposalData.child_birth_date,
            parent_name: proposalData.parent_name,
            phone_number: proposalData.phone_number,
            email: proposalData.email,
            address: proposalData.address,
            group_id: proposalData.group_id,
            created_at: new Date()
        };

        const childResult = await KindergartenRepository.createChild(childData);
        const newChildId = childResult.insertId || childResult.id || childResult[0]?.id;

        // ✅ ЗАВДАННЯ 4: Якщо є пільги - створюємо запис в child_benefits
        if (proposalData.benefit_percentage && proposalData.benefit_percentage > 0) {
            const benefitData = {
                child_id: newChildId,
                benefit_percentage: proposalData.benefit_percentage,
                benefit_reason: proposalData.benefit_reason || 'Пільга з пропозиції',
                valid_from: new Date(),
                valid_to: null,  // Безстроково
                status: 'active',
                // created_by не використовуємо - user.id є BIGINT, а колонка INTEGER
                created_at: new Date()
            };

            await KindergartenRepository.createChildBenefit(benefitData);
            console.log(`✅ Створено пільгу ${proposalData.benefit_percentage}% для дитини #${newChildId}`);
        }

        // Оновлюємо пропозицію як затверджену
        // reviewed_by передаємо null - user.id є BIGINT, а колонка INTEGER
        await KindergartenRepository.approveChildProposal(
            id,
            null,
            review_notes || 'Затверджено',
            newChildId
        );

        await logRepository.createLog({
            row_pk_id: id,
            // uid не використовуємо - user.id є BIGINT, а колонка uid є INTEGER
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Затвердження пропозиції дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_proposals',
            oid: '16510',
        });

        return {
            message: 'Пропозицію затверджено',
            proposal_id: id,
            child_id: newChildId
        };
    }

    /**
     * Відхилити пропозицію (адміністратором)
     */
    async rejectChildProposal(request) {
        const { id } = request.params;
        const { review_notes } = request.body || {};

        // Перевірка чи існує пропозиція
        const proposal = await KindergartenRepository.getChildProposalById(id);
        if (!proposal || proposal.length === 0) {
            throw new Error('Пропозицію не знайдено');
        }

        const proposalData = proposal[0];

        // Перевірка статусу
        if (proposalData.status !== 'pending') {
            throw new Error('Можна відхиляти лише пропозиції зі статусом pending');
        }

        // reviewed_by передаємо null - user.id є BIGINT, а колонка INTEGER
        await KindergartenRepository.rejectChildProposal(
            id,
            null,
            review_notes || 'Відхилено'
        );

        await logRepository.createLog({
            row_pk_id: id,
            // uid не використовуємо - user.id є BIGINT, а колонка uid є INTEGER
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Відхилення пропозиції дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_proposals',
            oid: '16510',
        });

        return {
            message: 'Пропозицію відхилено',
            proposal_id: id
        };
    }

    // ===============================
    // ✅ ЗАВДАННЯ 4: CHILD BENEFITS (CRUD ДЛЯ ПІЛЬГ)
    // ===============================

    /**
     * Створити пільгу для дитини
     */
    async createChildBenefit(request) {
        const {
            child_id,
            benefit_percentage,
            benefit_reason,
            valid_from,
            valid_to,
            documents
        } = request.body;

        // Перевірка чи існує дитина
        const child = await KindergartenRepository.getChildById(child_id);
        if (!child || child.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const benefitData = {
            child_id,
            benefit_percentage,
            benefit_reason: benefit_reason || null,
            valid_from,
            valid_to: valid_to || null,
            documents: documents || null,
            status: 'active',
            created_at: new Date()
        };
        // Примітка: created_by не використовуємо, бо user.id є BIGINT, а колонка INTEGER

        const result = await KindergartenRepository.createChildBenefit(benefitData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення пільги для дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_benefits',
            oid: '16511',
        });

        return result;
    }

    /**
     * Отримати список пільг з фільтрацією
     */
    async findChildBenefits(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'created_at',
            sort_direction = 'desc',
            child_id,
            status,
            benefit_percentage_min,
            benefit_percentage_max,
            kindergarten_id
        } = request.body;

        const { offset } = paginate(page, limit);

        const userData = await KindergartenRepository.findChildBenefits({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_id,
            status,
            benefit_percentage_min,
            benefit_percentage_max,
            kindergarten_id
        });

        return paginationData(userData[0], page, limit);
    }

    /**
     * Отримати пільгу за ID
     */
    async getChildBenefitById(request) {
        const { id } = request.params;
        const result = await KindergartenRepository.getChildBenefitById(id);

        if (!result || result.length === 0) {
            throw new Error('Пільгу не знайдено');
        }

        return result[0];
    }

    /**
     * Оновити пільгу
     */
    async updateChildBenefit(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевірка чи існує
        const existing = await KindergartenRepository.getChildBenefitById(id);
        if (!existing || existing.length === 0) {
            throw new Error('Пільгу не знайдено');
        }

        // Примітка: updated_by не використовуємо, бо user.id є BIGINT, а колонка INTEGER
        const result = await KindergartenRepository.updateChildBenefit(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення пільги дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_benefits',
            oid: '16511',
        });

        return result;
    }

    /**
     * Видалити пільгу
     */
    async deleteChildBenefit(request) {
        const { id } = request.params;

        const existing = await KindergartenRepository.getChildBenefitById(id);
        if (!existing || existing.length === 0) {
            throw new Error('Пільгу не знайдено');
        }

        const result = await KindergartenRepository.deleteChildBenefit(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення пільги дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'child_benefits',
            oid: '16511',
        });

        return result;
    }

    // ===============================
    // УНІВЕРСАЛЬНИЙ МЕТОД ОНОВЛЕННЯ
    // ===============================

    async applyFoodCostToPayments(date, newYoungCost, newOlderCost, action, oldYoungCost = 0, oldOlderCost = 0, kindergartenId = null) {  // ✅ ДОДАНО kindergartenId
        const statements = await KindergartenRepository.getPaymentStatementsByDate(date);

        if (!statements || statements.length === 0) {
            console.log('ℹ️ Немає payment_statements для дати:', date);
            return;
        }

        console.log(`📊 Знайдено ${statements.length} записів для оновлення`);

        for (const statement of statements) {
            try {
                const child = await KindergartenRepository.getChildById(statement.child_id);

                if (!child || child.length === 0) {
                    console.warn(`⚠️ Дитину ${statement.child_id} не знайдено`);
                    continue;
                }

                const groupId = child[0].group_id;
                if (!groupId) {
                    console.warn(`⚠️ У дитини ${statement.child_id} немає group_id`);
                    continue;
                }

                const group = await KindergartenRepository.getGroupById(groupId);
                if (!group || group.length === 0) {
                    console.warn(`⚠️ Групу ${groupId} не знайдено`);
                    continue;
                }

                // ✅ ДОДАНО: Фільтр по kindergarten_id - оновлюємо тільки дітей з цього садочка
                const groupKindergartenId = group[0].kindergarten_id;
                if (kindergartenId && groupKindergartenId !== kindergartenId) {
                    console.log(`⏭️ Пропускаємо statement #${statement.id} - інший садочок (потрібно: ${kindergartenId}, є: ${groupKindergartenId})`);
                    continue;
                }

                const groupType = group[0].group_type;
                const currentAmount = parseFloat(statement.payment_amount) || 0;
                let newAmount = currentAmount;

                if (action === 'create') {
                    // При створенні: замінити поточну суму на нову вартість
                    if (groupType === 'young') {
                        newAmount = parseFloat(newYoungCost) || 0;
                    } else if (groupType === 'older') {
                        newAmount = parseFloat(newOlderCost) || 0;
                    }
                } else if (action === 'update') {
                    // При оновленні: додати різницю (нова - стара)
                    if (groupType === 'young') {
                        const diff = (parseFloat(newYoungCost) || 0) - (parseFloat(oldYoungCost) || 0);
                        newAmount = currentAmount + diff;
                    } else if (groupType === 'older') {
                        const diff = (parseFloat(newOlderCost) || 0) - (parseFloat(oldOlderCost) || 0);
                        newAmount = currentAmount + diff;
                    }
                } else if (action === 'delete') {
                    // При видаленні: обнулити або відняти стару вартість
                    if (groupType === 'young') {
                        newAmount = currentAmount - (parseFloat(oldYoungCost) || 0);
                    } else if (groupType === 'older') {
                        newAmount = currentAmount - (parseFloat(oldOlderCost) || 0);
                    }
                    // Не допускаємо від'ємних значень
                    if (newAmount < 0) newAmount = 0;
                }

                // Оновлюємо payment_statement
                await KindergartenRepository.updatePaymentStatement(statement.id, {
                    payment_amount: newAmount
                });

                console.log(`✅ [${action}] #${statement.id}: ${currentAmount} → ${newAmount} (group: ${groupType})`);

            } catch (error) {
                console.error(`❌ Помилка оновлення statement #${statement.id}:`, error);
            }
        }

        console.log('✅ Всі payment_statements оновлено');
    }

    // ===============================
    // МЕТОДИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
    // ===============================

    async findBillingByFilter(request) {
        const { 
            page = 1, 
            limit = 16,
            sort_by = 'payment_month',
            sort_direction = 'desc',
            payment_month_from,
            payment_month_to,
            payment_month,
            child_name,
            kindergarten_name,
            group_name,
            balance_min,
            balance_max,
            ...whereConditions
        } = request.body;

        const { offset } = paginate(page, limit);

        if (payment_month_from || payment_month_to || payment_month || child_name || kindergarten_name || group_name || balance_min || balance_max) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук батьківської плати',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_billing',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findBillingByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            payment_month_from,
            payment_month_to,
            payment_month,
            child_name,
            kindergarten_name,
            group_name,
            balance_min,
            balance_max,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }


    async getBillingById(request) {
        const { id } = request.params;
        
        const result = await KindergartenRepository.getBillingById(id);
        if (!result || result.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'SEARCH',
            client_addr: request?.ip,
            application_name: 'Перегляд батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_billing',
            oid: '16509',
        });

        return result[0];
    }

    async createBilling(request) {
        const {
            child_name,
            payment_month,
            current_debt,
            current_accrual,
            current_payment,
            notes
        } = request.body;

        let formattedMonth = payment_month;
        if (payment_month && !payment_month.match(/^\d{4}-\d{2}-\d{2}$/)) {
            formattedMonth = `${payment_month}-01`;
        }

        const existingBilling = await KindergartenRepository.getBillingByChildAndMonth(
            child_name,
            formattedMonth
        );
        
        if (existingBilling && existingBilling.length > 0) {
            const existing = existingBilling[0];
            
            console.log('🔍 Found existing billing:', existing);
            
            const error = new Error('DUPLICATE_BILLING');
            error.statusCode = 409;
            error.existingData = {
                id: existing.id,
                child_name: existing.child_name,
                payment_month: existing.payment_month,
                current_debt: parseFloat(existing.current_debt) || 0,
                current_accrual: parseFloat(existing.current_accrual) || 0,
                current_payment: parseFloat(existing.current_payment) || 0,
                balance: parseFloat(existing.balance) || 0,
                notes: existing.notes || ''
            };
            
            console.log('📤 Sending existingData:', error.existingData);
            throw error;
        }

        const billingData = {
            child_name,
            payment_month: formattedMonth,
            current_debt: parseFloat(current_debt) || 0,
            current_accrual: parseFloat(current_accrual) || 0,
            current_payment: parseFloat(current_payment) || 0,
            notes: notes || null,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createBilling(billingData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'billing',
            oid: '16508',
        });

        return result;
    }

    async updateBilling(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingBilling = await KindergartenRepository.getBillingById(id);
        if (!existingBilling || existingBilling.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        if (updateData.payment_month && !updateData.payment_month.match(/^\d{4}-\d{2}-\d{2}$/)) {
            updateData.payment_month = `${updateData.payment_month}-01`;
        }

        if (updateData.child_name || updateData.payment_month) {
            const checkName = updateData.child_name || existingBilling[0].child_name;
            const checkMonth = updateData.payment_month || existingBilling[0].payment_month;
            
            const duplicateBilling = await KindergartenRepository.getBillingByChildAndMonth(
                checkName,
                checkMonth,
                id
            );

            if (duplicateBilling && duplicateBilling.length > 0) {
                throw new Error('Запис для цієї дитини та місяця вже існує');
            }
        }

        if (updateData.current_debt !== undefined) {
            updateData.current_debt = parseFloat(updateData.current_debt) || 0;
        }
        if (updateData.current_accrual !== undefined) {
            updateData.current_accrual = parseFloat(updateData.current_accrual) || 0;
        }
        if (updateData.current_payment !== undefined) {
            updateData.current_payment = parseFloat(updateData.current_payment) || 0;
        }

        const result = await KindergartenRepository.updateBilling(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення запису батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'billing',
            oid: '16508',
        });

        return result;
    }

    async deleteBilling(request) {
        const { id } = request.params;

        const existingRecord = await KindergartenRepository.getBillingById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        const result = await KindergartenRepository.deleteBilling(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_billing',
            oid: '16509',
        });

        return result;
    }

    // ===============================
    // 🔥 ДОПОМІЖНИЙ МЕТОД ДЛЯ ОБРОБКИ PAYMENT_STATEMENT
    // ===============================

    async handlePaymentStatementForAttendance(date, child_id, oldStatus, newStatus, existingChild, request) {
        try {
            const existingPayment = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);

            // Якщо статус змінився з "present" на щось інше - ВИДАЛЯЄМО payment_statement
            if (oldStatus === 'present' && newStatus !== 'present') {
                console.log('🗑️ Дитина більше не присутня, видаляємо payment_statement');

                if (existingPayment && existingPayment.length > 0) {
                    const paymentId = existingPayment[0].id;
                    await KindergartenRepository.deletePaymentStatement(paymentId);

                    await logRepository.createLog({
                        row_pk_id: paymentId,
                        uid: request?.user?.id,
                        action: 'DELETE',
                        client_addr: request?.ip,
                        application_name: 'Автоматичне видалення виписки по оплаті (мобільний)',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'payment_statements',
                        oid: '16509',
                    });

                    console.log('✅ Payment statement видалено');

                    try {
                        const childData = await KindergartenRepository.getChildById(child_id);
                        if (childData && childData.length > 0) {
                            const child_name = childData[0].child_name;
                            const payment_month = typeof date === 'string' ? date.substring(0, 7) : date.toISOString().substring(0, 7);
                            await KindergartenRepository.syncBillingForMonth(child_name, payment_month);
                            console.log('✅ Billing синхронізовано після видалення');
                        }
                    } catch (syncError) {
                        console.error('⚠️ Помилка синхронізації:', syncError);
                    }
                }
            }

            // Якщо статус змінився на "present" - СТВОРЮЄМО payment_statement
            else if (newStatus === 'present' && oldStatus !== 'present') {
                console.log('✅ Дитина тепер присутня, створюємо payment_statement');

                if (!existingPayment || existingPayment.length === 0) {
                    const child = existingChild;
                    const groupId = child.group_id;
                    let payment_amount = 0;

                    if (groupId) {
                        const groupData = await KindergartenRepository.getGroupById(groupId);

                        if (groupData && groupData.length > 0) {
                            const groupType = groupData[0].group_type;
                            const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroupType(date, groupType);

                            if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
                                payment_amount = parseFloat(foodCostResult[0].cost);
                            } else {
                                console.warn(`⚠️ УВАГА: Не знайдено вартість харчування для дати ${date} та типу групи "${groupType}".`);
                            }
                        }
                    }

                    const paymentData = {
                        date,
                        child_id,
                        payment_amount,
                        created_at: new Date()
                    };

                    await KindergartenRepository.createPaymentStatement(paymentData);

                    await logRepository.createLog({
                        row_pk_id: null,
                        uid: request?.user?.id,
                        action: 'INSERT',
                        client_addr: request?.ip,
                        application_name: 'Автоматичне створення виписки по оплаті (мобільний)',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'payment_statements',
                        oid: '16509',
                    });

                    console.log('✅ Payment statement створено');

                    try {
                        const childData = await KindergartenRepository.getChildById(child_id);
                        if (childData && childData.length > 0) {
                            const child_name = childData[0].child_name;
                            const payment_month = typeof date === 'string' ? date.substring(0, 7) : date.toISOString().substring(0, 7);
                            await KindergartenRepository.syncBillingForMonth(child_name, payment_month);
                            console.log('✅ Billing синхронізовано після створення');
                        }
                    } catch (syncError) {
                        console.error('⚠️ Помилка синхронізації:', syncError);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Помилка при роботі з payment_statement:', {
                error: error.message,
                date,
                child_id
            });
        }
    }

    // ===============================
    // ✅ API ДЛЯ МОБІЛЬНОГО ДОДАТКУ (ВИПРАВЛЕНО - TOGGLE ЛОГІКА)
    // ===============================

    async getMobileAttendance(timestamp, request) {
        // Конвертуємо timestamp в дату
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        
        // Отримуємо всі групи з дітьми та їх відвідуваністю на цю дату
        const groups = await KindergartenRepository.getMobileAttendanceByDate(date);
        
        // Логування
        if (request?.user?.id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request.user.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Мобільний додаток - перегляд відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }
        
        // Формуємо відповідь у форматі для мобільного додатку
        const response = {
            date: timestamp,
            groups: groups.map(group => ({
                id: group.group_id,
                name: group.group_name,
                group: group.children.map(child => ({
                    id: child.child_id,
                    name: child.child_name,
                    selected: child.attendance_status === 'present'
                }))
            }))
        };
        
        return response;
    }
    
    // ✅ ВИПРАВЛЕНИЙ МЕТОД З TOGGLE ЛОГІКОЮ
    async saveMobileAttendance(request) {
        const { date, groups } = request.body;
        
        if (!date || !groups || !Array.isArray(groups)) {
            throw new Error("Невірний формат даних");
        }
        
        // Конвертуємо timestamp в дату
        const dateString = new Date(date * 1000).toISOString().split('T')[0];
        
        const results = [];
        const errors = [];
        
        // Обробляємо кожну групу
        for (const group of groups) {
            const groupName = group.name;
            
            // ✅ ПІДТРИМКА ОБОХ ФОРМАТІВ
            const childrenArray = group.children || group.group;
            
            if (!groupName || !childrenArray || !Array.isArray(childrenArray)) {
                errors.push({
                    group: groupName,
                    error: 'Невірний формат групи'
                });
                continue;
            }
            
            // Обробляємо кожну дитину в групі
            for (const child of childrenArray) {
                const childName = child.name;
                
                // ✅ ВИЗНАЧАЄМО ФОРМАТ: новий (status) чи старий (selected)
                let targetStatus;
                if (child.status) {
                    // Новий формат: status = "present" | "absent"
                    targetStatus = child.status;
                } else if (child.selected !== undefined) {
                    // Старий формат: selected = true | false
                    targetStatus = child.selected ? 'present' : 'absent';
                } else {
                    errors.push({
                        child: childName,
                        group: groupName,
                        error: 'Відсутній статус (status або selected)'
                    });
                    continue;
                }
                
                if (!childName) {
                    errors.push({
                        group: groupName,
                        error: 'Відсутнє ПІБ дитини'
                    });
                    continue;
                }
                
                try {
                    // ✅ ШУКАЄМО ДИТИНУ ПО ПІБ + ГРУПІ
                    const existingChild = await KindergartenRepository.getChildByNameAndGroup(
                        childName,
                        groupName
                    );
                    
                    if (!existingChild) {
                        errors.push({
                            child: childName,
                            group: groupName,
                            error: `Дитину не знайдено в групі`
                        });
                        continue;
                    }
                    
                    const childId = existingChild.id;
                    
                    // Перевіряємо чи існує запис відвідуваності
                    const existingAttendance = await KindergartenRepository.getAttendanceByDateAndChild(
                        dateString,
                        childId
                    );
                    
                    if (existingAttendance && existingAttendance.length > 0) {
                        // Є запис - оновлюємо статус
                        const currentStatus = existingAttendance[0].attendance_status;

                        if (currentStatus !== targetStatus) {
                            await KindergartenRepository.updateAttendance(
                                existingAttendance[0].id,
                                { attendance_status: targetStatus }
                            );

                            // 🔥 ДОДАНО: Логіка payment_statement при оновленні
                            await this.handlePaymentStatementForAttendance(
                                dateString,
                                childId,
                                currentStatus,
                                targetStatus,
                                existingChild,
                                request
                            );

                            results.push({
                                child: childName,
                                group: groupName,
                                action: 'updated',
                                old_status: currentStatus,
                                new_status: targetStatus
                            });
                        } else {
                            results.push({
                                child: childName,
                                group: groupName,
                                action: 'unchanged',
                                status: targetStatus
                            });
                        }
                    } else {
                        // Немає запису - створюємо
                        await KindergartenRepository.createAttendance({
                            date: dateString,
                            child_id: childId,
                            attendance_status: targetStatus,
                            notes: null,
                            created_at: new Date()
                        });

                        // 🔥 ДОДАНО: Логіка payment_statement при створенні
                        if (targetStatus === 'present') {
                            await this.handlePaymentStatementForAttendance(
                                dateString,
                                childId,
                                null,
                                targetStatus,
                                existingChild,
                                request
                            );
                        }

                        results.push({
                            child: childName,
                            group: groupName,
                            action: 'created',
                            new_status: targetStatus
                        });
                    }
                } catch (error) {
                    errors.push({
                        child: childName,
                        group: groupName,
                        error: error.message
                    });
                }
            }
        }
        
        // Логування
        if (request?.user?.id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request.user.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Мобільний додаток - збереження відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }
        
        return {
            success: results.length > 0,
            message: `Оброблено ${results.length} записів`,
            updated_count: results.length,
            error_count: errors.length,
            details: {
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    // ===============================
    // МЕТОДИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКА
    // ===============================

    async findAdminsByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            username,
            full_name,
            kindergarten_name,
            group_id,
            role,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (username || full_name || kindergarten_name || group_id || role) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук адміністраторів садочка',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_admins',
                oid: '16510',
            });
        }

        const userData = await KindergartenRepository.findAdminsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            username,
            full_name,
            kindergarten_name,
            group_id,
            role,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getAdminById(request) {
        const { id } = request.params;
        
        const adminData = await KindergartenRepository.getAdminById(id);
        if (!adminData || adminData.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        return adminData[0];
    }

    async createAdmin(request) {
        const {
            username,
            full_name,
            kindergarten_name,
            group_id,
            role = 'educator'
        } = request.body;

        // Перевірка на дублікат логіну
        const existingAdminByUsername = await KindergartenRepository.getAdminByUsername(username);
        if (existingAdminByUsername && existingAdminByUsername.length > 0) {
            throw new Error('Адміністратор з таким логіном вже існує');
        }

        // Валідація group_id
        if (group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Групу не знайдено');
            }

            if (existingGroup[0].kindergarten_name !== kindergarten_name) {
                throw new Error(`Група "${existingGroup[0].group_name}" не належить садочку "${kindergarten_name}"`);
            }
        }

        const adminData = {
            username: username.trim().toLowerCase(),
            full_name,
            kindergarten_name,
            group_id,
            role,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createAdmin(adminData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    async updateAdmin(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingAdmin = await KindergartenRepository.getAdminById(id);
        if (!existingAdmin || existingAdmin.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        // Перевірка на дублікат логіну
        if (updateData.username) {
            updateData.username = updateData.username.trim().toLowerCase();
            const duplicateUsername = await KindergartenRepository.getAdminByUsername(
                updateData.username,
                id
            );

            if (duplicateUsername && duplicateUsername.length > 0) {
                throw new Error('Адміністратор з таким логіном вже існує');
            }
        }

        // Валідація group_id
        if (updateData.group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(updateData.group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Групу не знайдено');
            }

            if (updateData.kindergarten_name && existingGroup[0].kindergarten_name !== updateData.kindergarten_name) {
                throw new Error(`Група "${existingGroup[0].group_name}" не належить садочку "${updateData.kindergarten_name}"`);
            }
        }

        const result = await KindergartenRepository.updateAdmin(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    async deleteAdmin(request) {
        const { id } = request.params;

        const existingAdmin = await KindergartenRepository.getAdminById(id);
        if (!existingAdmin || existingAdmin.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        const result = await KindergartenRepository.deleteAdmin(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    // ===============================
    // ОТРИМАННЯ ГРУП ПО САДОЧКУ
    // ===============================

    async getGroupsByKindergarten(request) {
        let kindergartenName = null;
        
        console.log('🎯 getGroupsByKindergarten викликано!');
        console.log('   URL:', request.url);
        console.log('   Body:', request.body);
        
        // Спроба 1: Отримати з body (для endpoint /groups/by-kindergarten)
        if (request.body && request.body.kindergarten_name) {
            kindergartenName = request.body.kindergarten_name;
            console.log('   ✅ kindergarten_name отримано з body:', kindergartenName);
        } else {
            // Спроба 2: Визначити з kindergarten_type параметра
            const kindergartenType = this.getKindergartenType(request);
            console.log('   kindergartenType з параметрів:', kindergartenType);

            if (kindergartenType) {
                kindergartenName = this.getKindergartenName(kindergartenType);
                console.log('   ✅ kindergarten_name визначено з kindergarten_type (' + kindergartenType + '):', kindergartenName);
            }
        }

        // Перевірка чи вдалось визначити садочок
        if (!kindergartenName) {
            console.log('   ❌ Не вдалося визначити садочок!');
            throw new Error('Не вдалося визначити садочок (не знайдено ні в body.kindergarten_name, ні в kindergarten_type)');
        }

        // Отримуємо групи з Repository
        const groups = await KindergartenRepository.getGroupsByKindergartenName(kindergartenName);

        console.log('   📊 Знайдено груп:', groups ? groups.length : 0);
        if (groups && groups.length > 0) {
            console.log('   Перша група:', groups[0]);
        }

        return groups;
    }

    // ===============================
    // ПЕРЕВІРКА ЧИ Є ВИХОВАТЕЛЕМ
    // ===============================

   async verifyEducator(request) {
        try {
            let { username } = request.body;

            // Перевірка наявності логіну
            if (!username) {
                throw new Error('Логін обов\'язковий');
            }

            console.log('[verifyEducator] Username:', username);

            // Нормалізація логіну (trim, toLowerCase)
            username = username.trim().toLowerCase();

            console.log('[verifyEducator] Normalized username:', username);

            // Пошук у БД
            let educator;
            try {
                educator = await KindergartenRepository.verifyEducatorByUsername(username);
                console.log('[verifyEducator] Database result:', educator);
            } catch (dbError) {
                console.error('[verifyEducator] Database error:', dbError);
                throw new Error(`Помилка запиту до бази даних: ${dbError.message}`);
            }

            // Логування (опціонально, якщо є user ID)
            if (request?.user?.id) {
                try {
                    await logRepository.createLog({
                        row_pk_id: educator ? educator.id : null,
                        uid: request.user.id,
                        action: 'SEARCH',
                        client_addr: request?.ip,
                        application_name: 'Перевірка вихователя по логіну (мобільний додаток)',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'kindergarten_admins',
                        oid: '16510',
                    });
                } catch (logError) {
                    console.error('[verifyEducator] Logging error (non-critical):', logError.message);
                }
            } else {
                console.info('[verifyEducator] No user.id - logging skipped (expected for unauthenticated requests)');
            }

            // Формуємо результат
            const result = {
                is_educator: educator !== null,
                educator: educator ? {
                    id: educator.id,
                    username: educator.username,
                    full_name: educator.full_name,
                    kindergarten_name: educator.kindergarten_name,
                    group_id: educator.group_id,
                    group_name: educator.group_name,
                    children: educator.children || []
                } : null
            };

            console.log('[verifyEducator] Final result:', JSON.stringify(result, null, 2));
            
            return result;

        } catch (error) {
            console.error('[verifyEducator] Fatal error:', error);
            throw error;
        }
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    async findPaymentStatementsByFilter(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'date',
            sort_direction = 'desc',
            date_from,
            date_to,
            month,
            child_name,
            group_id,
            group_name,
            ...whereConditions
        } = request.body;

        const { offset } = paginate(page, limit);

        if (date_from || date_to || month || child_name || group_id || group_name) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук виписки по оплаті',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'payment_statements',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findPaymentStatementsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            date_from,
            date_to,
            month,
            child_name,
            group_id,
            group_name,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getPaymentStatementById(request) {
        const { id } = request.params;

        const paymentStatement = await KindergartenRepository.getPaymentStatementById(id);
        
        if (!paymentStatement || paymentStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        return paymentStatement[0];
    }

    async createPaymentStatement(request) {
        const {
            date,
            child_id,
            payment_amount
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const existingStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
        if (existingStatement && existingStatement.length > 0) {
            throw new Error('Виписка для цієї дитини на цю дату вже існує');
        }

        const statementData = {
            date,
            child_id,
            payment_amount,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createPaymentStatement(statementData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async createPaymentStatementAuto(request) {
        const {
            date,
            child_id
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const child = existingChild[0];
        const groupName = child.group_name;

        const existingStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
        if (existingStatement && existingStatement.length > 0) {
            throw new Error('Виписка для цієї дитини на цю дату вже існує');
        }

        const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroup(date, groupName);
        
        let payment_amount = 0;
        if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
            payment_amount = parseFloat(foodCostResult[0].cost);
        }

        if (payment_amount === 0) {
            throw new Error(`Вартість харчування для групи "${groupName}" на дату ${date} не знайдена`);
        }

        const statementData = {
            date,
            child_id,
            payment_amount,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createPaymentStatement(statementData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення виписки по оплаті (автозаповнення)',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async updatePaymentStatement(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingStatement = await KindergartenRepository.getPaymentStatementById(id);
        if (!existingStatement || existingStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        if (updateData.child_id) {
            const existingChild = await KindergartenRepository.getChildById(updateData.child_id);
            if (!existingChild || existingChild.length === 0) {
                throw new Error('Дитину не знайдено');
            }
        }

        if (updateData.date || updateData.child_id) {
            const checkDate = updateData.date || existingStatement[0].date;
            const checkChildId = updateData.child_id || existingStatement[0].child_id;
            
            const duplicateStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(
                checkDate,
                checkChildId,
                id
            );

            if (duplicateStatement && duplicateStatement.length > 0) {
                throw new Error('Виписка для цієї дитини на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updatePaymentStatement(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async deletePaymentStatement(request) {
        const { id } = request.params;

        const existingStatement = await KindergartenRepository.getPaymentStatementById(id);
        if (!existingStatement || existingStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const result = await KindergartenRepository.deletePaymentStatement(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async findMonthlyPaymentStatements(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name',
            sort_direction = 'asc',
            month, // "2025-11"
            group_type, // 'young', 'older', або undefined
            group_name,
            child_name,
            ...whereConditions
        } = request.body;

        const { offset } = paginate(page, limit);

        // Якщо місяць не вказано, використовуємо поточний
        const currentMonth = month || new Date().toISOString().slice(0, 7);

        if (child_name || group_type || group_name) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук місячної виписки по оплаті',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'payment_statements',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findMonthlyPaymentStatements({
            limit,
            offset,
            sort_by,
            sort_direction,
            month: currentMonth,
            group_type,
            group_name,
            child_name,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    // Оновити метод updatePaymentStatement для підтримки місячного оновлення
    async updateMonthlyPaymentStatement(request) {
        const { id } = request.params; // це буде child_id
        const { total_amount, month } = request.body;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        // Отримуємо всі payment_statements для цієї дитини за місяць
        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        const existingStatements = await KindergartenRepository.getMonthlyPaymentStatement(
            month,
            id
        );

        if (!existingStatements || existingStatements.length === 0) {
            throw new Error('Записи за цей місяць не знайдено');
        }

        // Тут можна реалізувати логіку оновлення всіх записів за місяць
        // або створити новий підхід до зберігання місячних сум

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення місячної виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return { success: true, total_amount };
    }

    // ===============================
    // МЕТОДИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ
    // ===============================

    async getPastAttendanceById(request) {
        const { id } = request.params;

        const attendanceData = await KindergartenRepository.getPastAttendanceById(id);
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Архівний запис відвідуваності не знайдено');
        }

        return attendanceData[0];
    }

    async findPastAttendanceByFilter(request) {
        // Визначити тип садочка з URL
        const kindergartenType = this.getKindergartenType(request);

        const {
            page = 1,
            limit = 16,
            sort_by = 'child_name',
            sort_direction = 'asc',
            child_name,
            group_name,
            kindergarten_name,
            date,
            month,
            attendance_status,
            ...whereConditions
        } = request.body;

        const { offset } = paginate(page, limit);

        if (date || month || child_name || group_name || kindergarten_name || attendance_status) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук архівних відвідувань',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'past_attendance',
                oid: '16510',
            });
        }

        const userData = await KindergartenRepository.findPastAttendanceByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_name,
            group_name,
            kindergarten_name,
            date,
            month,
            attendance_status,
            ...whereConditions
        }, kindergartenType);

        return paginationData(userData[0], page, limit);
    }

    async getPastAttendanceById(request) {
        const { id } = request.params;
        
        const attendanceData = await KindergartenRepository.getPastAttendanceById(id);
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Запис архівної відвідуваності не знайдено');
        }

        return attendanceData[0];
    }

    async archiveYesterdayAttendance() {
        try {
            console.log('🗄️ Запуск архівування відвідувань за вчора...');
            await KindergartenRepository.archiveYesterdayAttendance();
            console.log('✅ Архівування завершено успішно');
            return { success: true, message: 'Архівування завершено' };
        } catch (error) {
            console.error('❌ Помилка архівування:', error);
            throw error;
        }
    }

    async syncAllBilling(request) {
        console.log('🔄 Запит на універсальну синхронізацію всіх billing записів');

        try {
            const result = await KindergartenRepository.syncAllBillingRecords();

            console.log('✅ Універсальна синхронізація завершена:', result);

            return result;
        } catch (error) {
            console.error('❌ Помилка універсальної синхронізації:', error);
            throw error;
        }
    }

    // ===============================
    // ГЕНЕРАЦІЯ РЕКВІЗИТІВ ДЛЯ САДОЧКА
    // ===============================

    async generateKindergartenRequisite(request, reply) {
        try {
            const billingId = request?.params?.id;
            console.log('🔍 Генерація реквізитів для ID:', billingId);

            if (!billingId) {
                throw new Error('ID запису батьківської плати не вказано');
            }

            // Отримуємо дані про батьківську плату
            const billingData = await KindergartenRepository.getBillingById(billingId);
            console.log('📊 Billing data:', billingData);

            if (!billingData || billingData.length === 0) {
                throw new Error('Запис батьківської плати не знайдено');
            }

            // Отримуємо реквізити (використовуємо загальні реквізити)
            const requisiteData = await debtorRepository.getRequisite();

            if (!requisiteData || requisiteData.length === 0) {
                console.warn('⚠️ Реквізити не знайдено, використовуємо значення за замовчуванням');
            }

            const requisite = requisiteData && requisiteData.length > 0 ? requisiteData[0] : {};
            console.log('📋 Requisite data:', requisite);

            // Генеруємо документ для садочка з кастомним текстом
            console.log('📝 Генерація документа для садочка...');
            let documentBuffer = await createKindergartenRequisiteWord(billingData[0], requisite);
            console.log('✅ Документ згенеровано, розмір:', documentBuffer ? documentBuffer.length : 0);

            if (!documentBuffer) {
                throw new Error('Не вдалося згенерувати документ');
            }

            // КРИТИЧНО: Конвертуємо в Buffer якщо це не Buffer!
            if (!Buffer.isBuffer(documentBuffer)) {
                console.log('⚠️ Документ не є Buffer, конвертуємо...');
                documentBuffer = Buffer.from(documentBuffer);
                console.log('✅ Сконвертовано в Buffer, розмір:', documentBuffer.length);
            }

            console.log('📊 Final Buffer info:', {
                length: documentBuffer.length,
                isBuffer: Buffer.isBuffer(documentBuffer),
                type: typeof documentBuffer
            });

            // Логування
            await logRepository.createLog({
                row_pk_id: billingId,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерація реквізитів для садочка',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_billing',
                oid: '16509',
            });

            // Встановлюємо заголовки для завантаження
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            reply.header('Content-Disposition', `attachment; filename=requisite_kindergarten_${billingId}.docx`);

            console.log('📤 Відправка документа...');
            return reply.send(documentBuffer);
        } catch (error) {
            console.error('❌ Помилка генерації документа:', error);
            throw error;
        }
    }
}

module.exports = new KindergartenService();