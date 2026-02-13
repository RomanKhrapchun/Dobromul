// Схема для отримання інформації за ID
const requisiteInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

// Схема для фільтрації реквізитів
const filterRequisitesSchema = {
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
            enum: ['id', 'kved', 'iban', 'edrpou', 'group_name']
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc']
        },
        kved: {
            type: 'string',
            optional: true,
        },
        iban: {
            type: 'string',
            optional: true,
        },
        edrpou: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для фільтрації послуг басейну
const filterPoolServicesSchema = {
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
            enum: ['name', 'lesson_count', 'price']
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc']
        },
        name: {
            type: 'string',
            optional: true,
        },
        lesson_count: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для створення послуги
const createServiceSchema = {
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        lesson_count: {
            type: 'number',
            min: 1,
        },
        price: {
            type: 'number',
            min: 0,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для створення реквізитів
const createRequisiteSchema = {
    body: {
        kved: {
            type: 'string',
            min: 1,
        },
        iban: {
            type: 'string',
            min: 1,
        },
        edrpou: {
            type: 'string',
            min: 1,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// ✅ ОНОВЛЕНА СХЕМА ДЛЯ ФІЛЬТРАЦІЇ РАХУНКІВ З УСІМА ПОЛЯМИ СОРТУВАННЯ
const filterBillsSchema = {
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
            enum: ['membership_number', 'client_name', 'phone_number', 'service_group', 'service_name', 'visit_count', 'total_price']
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc']
        },
        client_name: {
            type: 'string',
            optional: true,
        },
        membership_number: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        },
        service_name: {
            type: 'string',
            optional: true,
        },
        service_group: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для створення рахунку
const createBillSchema = {
    body: {
        membership_number: {
            type: 'string',
            min: 1,
        },
        client_name: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        service_id: {
            type: 'number',
            numeric: true,
        },
        discount_type: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для редагування рахунку
const updateBillSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        membership_number: {
            type: 'string',
            min: 1,
        },
        client_name: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        service_id: {
            type: 'number',
            numeric: true,
        },
        discount_type: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для пошуку клієнтів
const searchClientsSchema = {
    body: {
        name: {
            type: 'string',
            min: 3,
        }
    }
}

// Схема для створення групи послуг
const createServiceGroupSchema = {
    body: {
        name: {
            type: 'string',
            minLength: 1,
        }
    }
}

// Схема для отримання групи послуг за ID
const getServiceGroupSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

// Схема для оновлення реквізитів
const updateRequisiteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        kved: {
            type: 'string',
            min: 1,
        },
        iban: {
            type: 'string',
            min: 1,
        },
        edrpou: {
            type: 'string',
            min: 1,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

const updateServiceSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        lesson_count: {
            type: 'number',
            minimum: 1,
        },
        price: {
            type: 'number',
            minimum: 0,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// ✅ ОНОВЛЕНА СХЕМА ДЛЯ ФІЛЬТРАЦІЇ КЛІЄНТІВ З УСІМА ПОЛЯМИ СОРТУВАННЯ
const filterClientsSchema = {
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
            enum: ['name', 'membership_number', 'phone_number', 'current_service_name', 'remaining_visits']
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc']
        },
        name: {
            type: 'string',
            optional: true,
        },
        membership_number: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        }
    }
}

const createClientSchema = {
    body: {
        name: {
            type: 'string',
            minLength: 2,
            maxLength: 100
        },
        phone_number: {
            type: 'string',
            minLength: 13,
            maxLength: 17,
            pattern: '^\\+38\\s?0(50|63|66|67|68|91|92|93|94|95|96|97|98|99)\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$'
        },
        membership_number: {
            type: 'string',
            optional: true,
            minLength: 5,
            maxLength: 20
        }
    }
}

// Схема для редагування клієнта
const updateClientSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        name: {
            type: 'string',
            minLength: 2,
            maxLength: 100
        },
        phone_number: {
            type: 'string',
            minLength: 13,
            maxLength: 17,
            pattern: '^\\+38\\s?0(50|63|66|67|68|91|92|93|94|95|96|97|98|99)\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$'
        },
        membership_number: {
            type: 'string',
            minLength: 5,
            maxLength: 20
        },
        subscription_duration: {
            type: 'string',
            optional: true
        }
    }
}

// Нова схема для оновлення абонемента
const renewSubscriptionSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

const searchClientByMembershipSchema = {
    body: {
        membership_number: {
            type: 'string',
            min: 5,
        }
    }
}

const getBillsReportSchema = {
    body: {
        membership_number: {
            type: 'string',
            optional: true,
        },
        client_name: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        },
        date: {
            type: 'string',
            optional: true,
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        }
    }
}

// Схема для експорту в Word
const exportBillsToWordSchema = {
    body: {
        type: 'array',
        items: {
            type: 'object',
            required: ['id', 'membership_number', 'client_name'],
            properties: {
                id: { type: 'number' },
                membership_number: { type: 'string' },
                client_name: { type: 'string' },
                phone_number: { type: 'string' },
                service_group: { type: 'string' },
                service_name: { type: 'string' },
                visit_count: { type: 'number' },
                total_price: { type: 'number' },
                original_price: { type: 'number' },
                discount_type: { type: 'string' },
                discount_applied: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
}

// Нова схема для початку заняття
const startLessonSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

module.exports = {
    filterRequisitesSchema,
    filterPoolServicesSchema,
    requisiteInfoSchema,
    createServiceSchema,
    createRequisiteSchema,
    filterBillsSchema,
    createBillSchema,
    updateBillSchema,
    searchClientsSchema,
    createServiceGroupSchema,
    getServiceGroupSchema,
    updateRequisiteSchema,
    updateServiceSchema,
    filterClientsSchema,
    createClientSchema,
    updateClientSchema,
    renewSubscriptionSchema,
    searchClientByMembershipSchema,
    getBillsReportSchema,
    exportBillsToWordSchema,
    startLessonSchema
}   