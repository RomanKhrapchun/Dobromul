// Схема для фільтрації реєстру туристів
const touristRegistryFilterSchema = {
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
            enum: ['id', 'host_name', 'full_name', 'arrival', 'departure', 'rental_days', 'tax', 'is_paid']
        },
        sort_direction: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc'
        },
        // Фільтри (опціональні)
        host_name: {
            type: 'string'
        },
        full_name: {
            type: 'string'
        },
        arrival: {
            type: 'string'
        },
        departure: {
            type: 'string'
        },
        is_paid: {
            type: 'boolean'
        }
    },
    additionalProperties: false
};

// Схема для створення туриста
const createTouristSchema = {
    body: {
        host_name: {
            type: 'string',
            min: 1,
            trim: true
        },
        full_name: {
            type: 'string',
            min: 1,
            trim: true
        },
        arrival: {
            type: 'custom',
            check(value, errors) {
                // Перевірка на відсутність значення
                if (value === undefined || value === null || value === '') {
                    errors.push({ 
                        type: "required", 
                        field: "arrival",
                        message: "Поле 'arrival' є обов'язковим" 
                    });
                    return value;
                }

                // Перевірка формату дати
                const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                if (!datePattern.test(value)) {
                    errors.push({ 
                        type: "pattern", 
                        field: "arrival",
                        message: "Невірний формат дати arrival. Очікується формат YYYY-MM-DD" 
                    });
                    return value;
                }

                // Перевірка валідності дати
                const arrivalDate = new Date(value);
                if (isNaN(arrivalDate.getTime())) {
                    errors.push({ 
                        type: "dateInvalid", 
                        field: "arrival",
                        message: "Невірний формат дати arrival" 
                    });
                }

                return value;
            }
        },
        departure: {
            type: 'custom',
            check(value, errors, schema, path, parent) {
                // Перевірка на відсутність значення
                if (value === undefined || value === null || value === '') {
                    errors.push({ 
                        type: "required", 
                        field: "departure",
                        message: "Поле 'departure' є обов'язковим" 
                    });
                    return value;
                }

                // Перевірка формату дати
                const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                if (!datePattern.test(value)) {
                    errors.push({ 
                        type: "pattern", 
                        field: "departure",
                        message: "Невірний формат дати departure. Очікується формат YYYY-MM-DD" 
                    });
                    return value;
                }

                // Перевірка валідності дати
                const departureDate = new Date(value);
                if (isNaN(departureDate.getTime())) {
                    errors.push({ 
                        type: "dateInvalid", 
                        field: "departure",
                        message: "Невірний формат дати departure" 
                    });
                    return value;
                }

                // Перевірка через rental_days (якщо передано з фронтенду)
                if (parent && parent.rental_days !== undefined && parent.rental_days !== null) {
                    if (parent.rental_days < 1) {
                        errors.push({ 
                            type: "dateRange", 
                            field: "departure",
                            message: "departure не може бути раніше або дорівнювати arrival. Мінімум 1 ніч" 
                        });
                    }
                }

                return value;
            }
        },
        rental_days: {
            type: 'custom',
            check(value, errors) {
                // Перевірка на відсутність значення
                if (value === undefined || value === null) {
                    errors.push({ 
                        type: "required", 
                        field: "rental_days",
                        message: "Поле 'rental_days' є обов'язковим" 
                    });
                    return value;
                }

                // Перевірка типу
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push({ 
                        type: "number", 
                        field: "rental_days",
                        message: "Поле 'rental_days' має бути числом" 
                    });
                    return value;
                }

                // Перевірка мінімального значення
                if (value < 1) {
                    errors.push({ 
                        type: "minimum", 
                        field: "rental_days",
                        message: "Поле 'rental_days' має бути мінімум 1" 
                    });
                }

                return value;
            }
        },
        tax: {
            type: 'custom',
            check(value, errors) {
                // Перевірка на відсутність значення
                if (value === undefined || value === null) {
                    errors.push({ 
                        type: "required", 
                        field: "tax",
                        message: "Поле 'tax' є обов'язковим" 
                    });
                    return value;
                }

                // Перевірка типу
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push({ 
                        type: "number", 
                        field: "tax",
                        message: "Поле 'tax' має бути числом" 
                    });
                    return value;
                }

                // Перевірка мінімального значення
                if (value < 0) {
                    errors.push({ 
                        type: "minimum", 
                        field: "tax",
                        message: "Поле 'tax' не може бути негативним" 
                    });
                }

                return value;
            }
        },
        is_paid: {
            type: 'boolean',
            optional: true,
            default: true
        }
    },
    additionalProperties: false
};

module.exports = {
    touristRegistryFilterSchema,
    createTouristSchema
};

