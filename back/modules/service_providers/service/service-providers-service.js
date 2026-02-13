const serviceProvidersRepository = require("../repository/service-providers-repository");
const { paginate, paginationData, filterRequestBody, filterData } = require("../../../utils/function");
const { getSafeSortField, validateSortDirection } = require("../../../utils/constants");

// Поля для відображення з таблиці tourism.hosts
const displayHostFields = [
    'id', 
    'location_name', 
    'type', 
    'places', 
    'host_name', 
    'host_ipn',
    'location_address',
    'host_legal_address',
    'host_phone',
    'reception_phone',
    'website'
];

// Дозволені поля для сортування
const allowedHostSortFields = [
    'id', 'location_name', 'type', 'places', 'host_name', 'host_ipn'
];

// Дозволені поля для фільтрації
const allowedHostTableFilterFields = [
    'location_name', 'type', 'host_name', 'host_ipn'
];

// Дозволені поля для вставки/оновлення
const allowInsertOrUpdateHostFields = [
    'location_name',
    'type',
    'places',
    'host_name',
    'host_ipn',
    'location_address',
    'host_legal_address',
    'host_phone',
    'reception_phone',
    'website'
];

class ServiceProvidersService {

    async findServiceProvidersByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            title, 
            sort_by = null, 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);

        // Валідація сортування
        const isValidSortField = sort_by && allowedHostSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());

        const validSortBy = isValidSortField ? sort_by : 'id';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        // Фільтрація дозволених полів для WHERE умов
        const allowedFields = allowedHostTableFilterFields
            .filter(el => whereConditions.hasOwnProperty(el))
            .reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Викликаємо repository
        const result = await serviceProvidersRepository.findHostsByFilter(
            limit, 
            offset, 
            title, 
            allowedFields, 
            displayHostFields,
            validSortBy,
            validSortDirection
        );

        // Форматуємо відповідь
        return paginationData(result[0], page, limit);
    }

    async addServiceProvider(request) {
        const hostData = filterRequestBody(request.body);
        const data = filterData(hostData, allowInsertOrUpdateHostFields);
        await serviceProvidersRepository.addHost(data);
    }
}

module.exports = new ServiceProvidersService();

