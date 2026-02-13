// ===============================
// СХЕМИ ДЛЯ ГРУП САДОЧКА
// ===============================

const kindergartenGroupFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        kindergarten_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_type: {
            type: 'string',
            optional: true,
            enum: ['young', 'older'],
        },
    }
};

const kindergartenGroupCreateSchema = {
    body: { 
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        group_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        group_type: {
            type: 'string',
            enum: ['young', 'older'],
        },
    }
};

const kindergartenGroupUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        group_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        group_type: {
            type: 'string',
            enum: ['young', 'older'],
            optional: true,
        },
    }
};

const kindergartenGroupDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const kindergartenGroupInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ ДІТЕЙ САДОЧКА
// ===============================

const childrenInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true
        }
    }
};

const childrenFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
            enum: ['id', 'child_name', 'parent_name', 'created_at']
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc']
        },
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1
        },
        parent_name: {
            type: 'string',
            optional: true,
            min: 1
        },
        phone_number: {
            type: 'string',
            optional: true,
            min: 1
        },
        group_id: {
            type: 'number',
            optional: true
        }
    }
};

const childrenCreateSchema = {
    body: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
            trim: true
        },
        parent_name: {
            type: 'string',
            min: 1,
            max: 100,
            trim: true
        },
        phone_number: {
            type: 'string',
            min: 10,
            max: 20,
            optional: true
        },
        group_id: {
            type: 'number',
            positive: true
        }
    }
};

const childrenUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true
        }
    },
    body: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
            trim: true,
            optional: true
        },
        parent_name: {
            type: 'string',
            min: 1,
            max: 100,
            trim: true,
            optional: true
        },
        phone_number: {
            type: 'string',
            min: 10,
            max: 20,
            optional: true
        },
        group_id: {
            type: 'number',
            positive: true,
            optional: true
        }
    }
};

const childrenDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true
        }
    },
    query: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ ВІДВІДУВАНОСТІ
// ===============================

const attendanceInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
};

const attendanceFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        kindergarten_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        date: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        attendance_status: {
            type: 'string',
            optional: true,
            enum: ['present', 'absent', 'sick', 'vacation'],
        },
        child_id: {
            type: 'number',
            optional: true,
        },
    }
};

const attendanceCreateSchema = {
    body: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        date: {
            type: 'string',
            format: 'date',
        },
        child_id: {
            type: 'number',
            minimum: 1,
        },
        attendance_status: {
            type: 'string',
            enum: ['present', 'absent', 'sick', 'vacation'],
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
};

const attendanceUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    },
    body: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        child_id: {
            type: 'number',
            minimum: 1,
            optional: true,
        },
        attendance_status: {
            type: 'string',
            enum: ['present', 'absent', 'sick', 'vacation'],
            optional: true,
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
};

const attendanceDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    query: {
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        }
    }
};

const attendanceByDateSchema = {
    params: {
        date: {
            type: 'string',
        }
    }
};

const saveMobileAttendanceSchema = {
    body: {
        date: {
            type: 'number',
            positive: true,
        },
        groups: {
            type: 'array',
            items: {
                type: 'object',
                props: {
                    id: { type: 'number', positive: true, optional: true }, // ✅ ДОДАВ optional: true
                    name: { type: 'string', min: 1 }, // ✅ Обов'язкове
                    children: { // ✅ ПІДТРИМКА НОВОГО ФОРМАТУ
                        type: 'array',
                        optional: true,
                        items: {
                            type: 'object',
                            props: {
                                id: { type: 'number', positive: true, optional: true }, // ✅ ДОДАВ optional: true
                                name: { type: 'string', min: 1 }, // ✅ Обов'язкове
                                status: { type: 'string', enum: ['present', 'absent'] } // ✅ Замість selected
                            }
                        }
                    },
                    group: { // ✅ ПІДТРИМКА СТАРОГО ФОРМАТУ (для сумісності)
                        type: 'array',
                        optional: true,
                        items: {
                            type: 'object',
                            props: {
                                id: { type: 'number', positive: true, optional: true },
                                name: { type: 'string', optional: true },
                                selected: { type: 'boolean', optional: true }
                            }
                        }
                    }
                }
            }
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ САДОЧКІВ (ДОВІДНИК)
// ===============================

// ✅ ДОДАНО: Схема для отримання списку всіх садочків
const kindergartensListSchema = {
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                    address: { type: 'string' },
                    created_at: { type: 'string' }
                }
            }
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
// ===============================

// ✅ ПЕРЕЙМЕНОВАНО: foodCost → dailyFoodCost для відповідності з router
const dailyFoodCostInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
};

const dailyFoodCostFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        date: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        kindergarten_type: {  // ✅ ЗМІНЕНО: використовуємо type замість id
            type: 'string',
            optional: true,
            enum: ['1', '2'],
        },
        food_cost_min: {
            type: 'number',
            optional: true,
        },
        food_cost_max: {
            type: 'number',
            optional: true,
        },
    }
};

const dailyFoodCostCreateSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        kindergarten_type: {  // ✅ ЗМІНЕНО: kindergarten_id → kindergarten_type
            type: 'string',
            enum: ['1', '2'],
        },
        young_group_cost: {  // ✅ ЗМІНЕНО: food_cost → young_group_cost
            type: 'number',
            min: 0,  // дозволяємо 0
        },
        older_group_cost: {  // ✅ ДОДАНО
            type: 'number',
            min: 0,  // дозволяємо 0
        },
    }
};

const dailyFoodCostUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    },
    body: {
        date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        kindergarten_type: {  // ✅ ЗМІНЕНО: kindergarten_id → kindergarten_type
            type: 'string',
            enum: ['1', '2'],
            optional: true,
        },
        young_group_cost: {  // ✅ ЗМІНЕНО: food_cost → young_group_cost
            type: 'number',
            min: 0,
            optional: true,
        },
        older_group_cost: {  // ✅ ДОДАНО
            type: 'number',
            min: 0,
            optional: true,
        },
    }
};

const dailyFoodCostDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
// ===============================

const billingInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
};

const billingFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        payment_month_from: {
            type: 'string',
            optional: true,
        },
        payment_month_to: {
            type: 'string',
            optional: true,
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        kindergarten_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        balance_min: {
            type: 'number',
            optional: true,
        },
        balance_max: {
            type: 'number',
            optional: true,
        },
    }
};

const billingCreateSchema = {
    body: {
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        payment_month: {
            type: 'string',
        },
        current_debt: {
            type: 'number',
            optional: true,
        },
        current_accrual: {
            type: 'number',
            optional: true,
        },
        current_payment: {
            type: 'number',
            optional: true,
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
};

const billingUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    },
    body: {
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        payment_month: {
            type: 'string',
            optional: true,
        },
        current_debt: {
            type: 'number',
            optional: true,
        },
        current_accrual: {
            type: 'number',
            optional: true,
        },
        current_payment: {
            type: 'number',
            optional: true,
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
};

const billingDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

// ===============================
// СХЕМИ ДЛЯ АДМІНІСТРАТОРІВ
// ===============================

const adminsFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        username: {
            type: 'string',
            optional: true,
            min: 3,
            max: 50,
        },
        full_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        group_id: {
            type: 'number',
            positive: true,
            optional: true,
        },
        role: {
            type: 'string',
            enum: ['educator', 'admin'],
            optional: true,
        },
    }
};

const adminsCreateSchema = {
    body: {
        username: {
            type: 'string',
            min: 3,
            max: 50,
            pattern: '^[a-zA-Z0-9_.-]+$',
        },
        full_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        group_id: {
            type: 'number',
            positive: true,
            optional: true,
        },
        role: {
            type: 'string',
            enum: ['educator', 'admin'],
            optional: true,
        },
    }
};

const adminsUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        username: {
            type: 'string',
            min: 3,
            max: 50,
            pattern: '^[a-zA-Z0-9_.-]+$',
            optional: true,
        },
        full_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        group_id: {
            type: 'number',
            positive: true,
            optional: true,
            nullable: true,
        },
        role: {
            type: 'string',
            enum: ['educator', 'admin'],
            optional: true,
        },
    }
};

const adminsDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const adminsInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

// ===============================
// СХЕМА ДЛЯ ОТРИМАННЯ ГРУП ПО САДОЧКУ
// ===============================

const groupsByKindergartenSchema = {
    body: {
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
        }
    }
};

const verifyEducatorSchema = {
    body: {
        username: {
            type: 'string',
            min: 3,
            max: 50,
            pattern: '^[a-zA-Z0-9_.-]+$',
        }
    }
};


// Middleware для валідації формату мобільної відвідуваності
const validateMobileAttendanceFormat = async (request, reply) => {
    const { date, groups } = request.body;

    if (!date || typeof date !== 'number') {
        return reply.code(400).send({
            error: true,
            message: 'Поле "date" обов\'язкове і має бути числом'
        });
    }

    if (!Array.isArray(groups)) {
        return reply.code(400).send({
            error: true,
            message: 'Поле "groups" має бути масивом'
        });
    }

    if (groups.length === 0) {
        return reply.code(400).send({
            error: true,
            message: 'Масив "groups" не може бути порожнім'
        });
    }

    // Валідація структури groups
    for (const group of groups) {
        // ✅ ID тепер optional
        if (group.id !== undefined && typeof group.id !== 'number') {
            return reply.code(400).send({
                error: true,
                message: 'Поле "id" групи має бути числом'
            });
        }

        // ✅ name обов'язковий
        if (!group.name || typeof group.name !== 'string') {
            return reply.code(400).send({
                error: true,
                message: 'Кожна група має мати поле "name" типу string'
            });
        }

        // ✅ Підтримка ОБОХ форматів: children (новий) і group (старий)
        const childrenArray = group.children || group.group;

        if (!Array.isArray(childrenArray)) {
            return reply.code(400).send({
                error: true,
                message: 'Кожна група має мати масив "children" або "group" з дітьми'
            });
        }

        // Валідація дітей у групі
        for (const child of childrenArray) {
            // ✅ ID тепер optional
            if (child.id !== undefined && typeof child.id !== 'number') {
                return reply.code(400).send({
                    error: true,
                    message: 'Поле "id" дитини має бути числом'
                });
            }

            // ✅ name обов'язковий
            if (!child.name || typeof child.name !== 'string') {
                return reply.code(400).send({
                    error: true,
                    message: 'Кожна дитина має мати поле "name" типу string'
                });
            }

            // ✅ Підтримка ОБОХ форматів: status (новий) і selected (старий)
            if (child.status) {
                if (!['present', 'absent'].includes(child.status)) {
                    return reply.code(400).send({
                        error: true,
                        message: 'Поле "status" має бути "present" або "absent"'
                    });
                }
            } else if (child.selected !== undefined) {
                if (typeof child.selected !== 'boolean') {
                    return reply.code(400).send({
                        error: true,
                        message: 'Поле "selected" має бути boolean'
                    });
                }
            } else {
                return reply.code(400).send({
                    error: true,
                    message: 'Кожна дитина має мати поле "status" або "selected"'
                });
            }
        }
    }
};

const paymentStatementInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
};

const paymentStatementFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_id: {
            type: 'number',
            optional: true,
        },
    }
};

const paymentStatementCreateSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        child_id: {
            type: 'number',
            positive: true,
        },
        payment_amount: {
            type: 'number',
            positive: true,
        },
    }
};

const paymentStatementCreateAutoSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        child_id: {
            type: 'number',
            positive: true,
        },
    }
};

const paymentStatementUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    },
    body: {
        date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        child_id: {
            type: 'number',
            positive: true,
            optional: true,
        },
        payment_amount: {
            type: 'number',
            positive: true,
            optional: true,
        },
    }
};

const paymentStatementDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const paymentStatementMonthlyFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        month: {
            type: 'string',
            optional: true,
            pattern: '^\\d{4}-\\d{2}$', // формат: "2025-11"
        },
        group_type: {
            type: 'string',
            optional: true,
            enum: ['young', 'older'],
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
    }
};

// ===============================
// СХЕМИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ
// ===============================

const pastAttendanceInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
};

const pastAttendanceFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        kindergarten_type: {
            type: 'string',
            optional: true,
            enum: ['1', '2']
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        kindergarten_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        attendance_status: {
            type: 'string',
            optional: true,
            enum: ['present', 'absent', 'sick', 'vacation'],
        },
    }
};

// ===============================
// ✅ ЗАВДАННЯ 2: СХЕМИ ДЛЯ BREAKDOWN
// ===============================

const dailyCostBreakdownSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        kindergarten_id: {
            type: 'number',
            optional: true,
        }
    }
};

const childDailyCostBreakdownSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        child_id: {
            type: 'number',
            positive: true,
        }
    }
};

// ===============================
// ✅ ЗАВДАННЯ 3: СХЕМИ ДЛЯ CHILD PROPOSALS
// ===============================

const childProposalFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
            optional: true,
        },
        group_id: {
            type: 'number',
            optional: true,
        },
        proposed_by: {
            type: 'number',
            optional: true,
        },
        child_name: {
            type: 'string',
            optional: true,
        },
        kindergarten_id: {
            type: 'number',
            optional: true,
        }
    }
};

const childProposalCreateSchema = {
    body: {
        child_name: {
            type: 'string',
            minLength: 1,
        },
        child_birth_date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        parent_name: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        },
        email: {
            type: 'string',
            format: 'email',
            optional: true,
        },
        address: {
            type: 'string',
            optional: true,
        },
        group_id: {
            type: 'number',
            positive: true,
        },
        benefit_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            optional: true,
        },
        benefit_reason: {
            type: 'string',
            optional: true,
        }
    }
};

const childProposalUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    },
    body: {
        child_name: {
            type: 'string',
            minLength: 1,
            optional: true,
        },
        child_birth_date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        parent_name: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        },
        email: {
            type: 'string',
            format: 'email',
            optional: true,
        },
        address: {
            type: 'string',
            optional: true,
        },
        group_id: {
            type: 'number',
            positive: true,
            optional: true,
        },
        benefit_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            optional: true,
        },
        benefit_reason: {
            type: 'string',
            optional: true,
        }
    }
};

const childProposalDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const childProposalInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const childProposalApproveSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
    // body не потрібен - review_notes опціональний і по замовчуванню 'Затверджено'
};

const childProposalRejectSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        review_notes: {
            type: 'string',
            optional: true,
        }
    }
};

// ===============================
// ✅ ЗАВДАННЯ 4: ПІЛЬГИ (CHILD BENEFITS)
// ===============================

const childBenefitFilterSchema = {
    body: {
        child_id: {
            type: 'number',
            optional: true,
            positive: true,
        },
        status: {
            type: 'string',
            optional: true,
            enum: ['active', 'inactive'],
        },
        valid_from: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        valid_to: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        page: {
            type: 'number',
            optional: true,
            positive: true,
        },
        limit: {
            type: 'number',
            optional: true,
            positive: true,
        }
    }
};

const childBenefitCreateSchema = {
    body: {
        child_id: {
            type: 'number',
            positive: true,
        },
        benefit_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
        },
        benefit_reason: {
            type: 'string',
            optional: true,
        },
        valid_from: {
            type: 'string',
            format: 'date',
        },
        valid_to: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        documents: {
            type: 'string',
            optional: true,
        }
    }
};

const childBenefitUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        benefit_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            optional: true,
        },
        benefit_reason: {
            type: 'string',
            optional: true,
        },
        valid_from: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        valid_to: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        status: {
            type: 'string',
            enum: ['active', 'inactive'],
            optional: true,
        },
        documents: {
            type: 'string',
            optional: true,
        }
    }
};

const childBenefitDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const childBenefitInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
};

const billingSyncAllSchema = {
    schema: {
        summary: 'Універсальна синхронізація всіх billing записів',
        description: 'Знаходить ВСІ payment_statements і синхронізує їх у billing. Не потребує параметрів - синхронізує все автоматично.',
        tags: ['kindergarten'],
        body: {
            type: 'object',
            properties: {}
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    total_count: { type: 'integer' },
                    synced_count: { type: 'integer' },
                    created_count: { type: 'integer' },
                    updated_count: { type: 'integer' },
                    error_count: { type: 'integer' }
                }
            }
        }
    }
};

// ===============================
// СХЕМА ДЛЯ ОТРИМАННЯ ДАТ З ВІДВІДУВАНІСТЮ
// ===============================

const attendanceDatesSchema = {
    body: {
        group_id: {
            type: 'number',
            optional: true,
            positive: true,
        }
    }
};

module.exports = {
    // Групи
    kindergartenGroupFilterSchema,
    kindergartenGroupCreateSchema,
    kindergartenGroupUpdateSchema,
    kindergartenGroupDeleteSchema,
    kindergartenGroupInfoSchema,
    
    // Діти
    childrenFilterSchema,
    childrenCreateSchema,
    childrenUpdateSchema,
    childrenDeleteSchema,
    childrenInfoSchema,
    
    // Відвідуваність
    attendanceFilterSchema,
    attendanceCreateSchema,
    attendanceUpdateSchema,
    attendanceDeleteSchema,
    attendanceInfoSchema,
    attendanceByDateSchema,
    saveMobileAttendanceSchema,
    
    // ✅ ДОДАНО: Довідник садочків
    kindergartensListSchema,

    // ✅ ЗМІНЕНО: Вартість харчування (перейменовано foodCost → dailyFoodCost)
    dailyFoodCostFilterSchema,
    dailyFoodCostCreateSchema,
    dailyFoodCostUpdateSchema,
    dailyFoodCostDeleteSchema,
    dailyFoodCostInfoSchema,

    // ✅ ЗАВДАННЯ 2: Breakdown вартості
    dailyCostBreakdownSchema,
    childDailyCostBreakdownSchema,

    // ✅ ЗАВДАННЯ 3: Пропозиції дітей
    childProposalFilterSchema,
    childProposalCreateSchema,
    childProposalUpdateSchema,
    childProposalDeleteSchema,
    childProposalInfoSchema,
    childProposalApproveSchema,
    childProposalRejectSchema,

    // ✅ ЗАВДАННЯ 4: Пільги
    childBenefitFilterSchema,
    childBenefitCreateSchema,
    childBenefitUpdateSchema,
    childBenefitDeleteSchema,
    childBenefitInfoSchema,

    // Батьківська плата
    billingFilterSchema,
    billingCreateSchema,
    billingUpdateSchema,
    billingDeleteSchema,
    billingInfoSchema,
    
    // Адміністратори
    adminsFilterSchema,
    adminsCreateSchema,
    adminsUpdateSchema,
    adminsDeleteSchema,
    adminsInfoSchema,
    verifyEducatorSchema,
    validateMobileAttendanceFormat,
    groupsByKindergartenSchema,

    //Виписки по оплаті
    paymentStatementFilterSchema,
    paymentStatementCreateSchema,
    paymentStatementCreateAutoSchema,
    paymentStatementUpdateSchema,
    paymentStatementDeleteSchema,
    paymentStatementInfoSchema,
    paymentStatementMonthlyFilterSchema,
    
    //Архівні відвідування
    pastAttendanceInfoSchema,
    pastAttendanceFilterSchema,

    billingSyncAllSchema,
    
    // Дати з відвідуваністю
    attendanceDatesSchema,
};