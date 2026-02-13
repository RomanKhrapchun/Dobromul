// Factory function for creating parameter schemas
const createParamSchema = (paramName) => ({
    params: {
        [paramName]: {
            type: 'string'
        }
    }
});

// Схема для пагінації в query параметрах
const paginationQuerySchema = {
    querystring: {
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
                maximum: 10000,
                default: 50
            }
        },
        additionalProperties: false
    }
};

// Схеми для різних endpoints
const taxpayerDataSchema = createParamSchema('taxpayerCode');
const taxTypeDataSchema = createParamSchema('incomeCode');
const periodDataSchema = createParamSchema('period');

module.exports = {
    paginationQuerySchema,
    taxpayerDataSchema,
    taxTypeDataSchema,
    periodDataSchema
};