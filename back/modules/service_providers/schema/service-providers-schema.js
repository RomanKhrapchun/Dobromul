// Схема для фільтрації надавачів послуг
const serviceProvidersFilterSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'number',
            minimum: 1,
            default: 1
        },
        limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 16
        },
        title: {
            type: 'string'
        },
        sort_by: {
            type: 'string',
            enum: ['id', 'location_name', 'type', 'places', 'host_name', 'host_ipn']
        },
        sort_direction: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc'
        },
        // Фільтри (опціональні)
        location_name: {
            type: 'string'
        },
        type: {
            type: 'string'
        },
        host_name: {
            type: 'string'
        },
        host_ipn: {
            type: 'string'
        }
    },
    additionalProperties: false
};

// Схема для створення надавача послуг
const createServiceProviderSchema = {
    body: {
        location_name: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        type: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        places: {
            type: 'number',
            minimum: 1,
        },
        host_name: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        host_ipn: {
            type: 'string',
            minLength: 8,
            maxLength: 12,
            pattern: '^[0-9]+$',
        },
        location_address: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        host_legal_address: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        host_phone: {
            type: 'string',
            minLength: 1,
            trim: true,
        },
        reception_phone: {
            type: 'string',
            trim: true,
            optional: true,
        },
        website: {
            type: 'string',
            format: 'uri',
            optional: true,
        },
    },
    additionalProperties: false
};

module.exports = {
    serviceProvidersFilterSchema,
    createServiceProviderSchema
};

