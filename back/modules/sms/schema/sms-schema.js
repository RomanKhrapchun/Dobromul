const templateCreateSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'text'],
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                text: { type: 'string', minLength: 1, maxLength: 670 },
                description: { type: 'string', maxLength: 500 },
                placeholders: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

const templateUpdateSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                text: { type: 'string', minLength: 1, maxLength: 670 },
                description: { type: 'string', maxLength: 500 },
                placeholders: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

const sendSmsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['phone'],
            properties: {
                phone: { type: 'string', minLength: 10, maxLength: 15 },
                text: { type: 'string', maxLength: 670 },
                templateId: { type: 'integer' },
                debtor: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        non_residential_debt: { type: 'number' },
                        residential_debt: { type: 'number' },
                        land_debt: { type: 'number' },
                        orenda_debt: { type: 'number' },
                        mpz: { type: 'number' }
                    }
                }
            }
        }
    }
};

const sendSmsBatchSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['debtors'],
            properties: {
                debtors: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 500,
                    items: {
                        type: 'object',
                        required: ['id', 'phone'],
                        properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                            phone: { type: 'string' },
                            address: { type: 'string' },
                            non_residential_debt: { type: 'number' },
                            residential_debt: { type: 'number' },
                            land_debt: { type: 'number' },
                            orenda_debt: { type: 'number' },
                            mpz: { type: 'number' }
                        }
                    }
                },
                templateId: { type: 'integer' },
                text: { type: 'string', maxLength: 670 }
            }
        }
    }
};

const historyFilterSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                phones: {
                    type: 'array',
                    items: { type: 'string' }
                },
                status: { type: 'string' },
                dateFrom: { type: 'string', format: 'date' },
                dateTo: { type: 'string', format: 'date' },
                limit: { type: 'integer', minimum: 1, maximum: 500 },
                offset: { type: 'integer', minimum: 0 }
            }
        }
    }
};

const previewSmsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['templateId', 'debtor'],
            properties: {
                templateId: { type: 'integer' },
                debtor: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        non_residential_debt: { type: 'number' },
                        residential_debt: { type: 'number' },
                        land_debt: { type: 'number' },
                        orenda_debt: { type: 'number' },
                        mpz: { type: 'number' }
                    }
                }
            }
        }
    }
};

module.exports = {
    templateCreateSchema,
    templateUpdateSchema,
    sendSmsSchema,
    sendSmsBatchSchema,
    historyFilterSchema,
    previewSmsSchema
};
