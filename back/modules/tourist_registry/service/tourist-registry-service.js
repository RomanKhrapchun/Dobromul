const touristRegistryRepository = require("../repository/tourist-registry-repository");
const { paginate, paginationData } = require("../../../utils/function");
const { allowedTouristSortFields, allowedTouristTableFilterFields } = require("../../../utils/constants");

class TouristRegistryService {

    async findTouristRegistryByFilter(request) {
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
        const isValidSortField = sort_by && allowedTouristSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());

        const validSortBy = isValidSortField ? sort_by : 'id';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        // Фільтрація дозволених полів для WHERE умов
        const allowedFields = {};
        Object.keys(whereConditions).forEach(key => {
            if (allowedTouristTableFilterFields.includes(key) && whereConditions[key] !== undefined && whereConditions[key] !== null) {
                allowedFields[key] = whereConditions[key];
            }
        });

        // Викликаємо repository
        const result = await touristRegistryRepository.findTouristsByFilter(
            limit, 
            offset, 
            title, 
            allowedFields, 
            [], // displayFields не використовуються, оскільки використовується жорстко закодований json_build_object
            validSortBy,
            validSortDirection
        );

        // Форматуємо відповідь
        return paginationData(result[0], page, limit);
    }

    async createTourist(request) {
        const touristData = { ...request.body };

        // Знаходимо host_id по host_name
        const hostId = await touristRegistryRepository.findHostIdByName(touristData.host_name);
        if (!hostId) {
            throw new Error(`Хост з назвою "${touristData.host_name}" не знайдено в базі даних`);
        }

        // Додаємо host_id до даних туриста
        touristData.host_id = hostId;

        // Встановлення значення за замовчуванням для is_paid
        if (touristData.is_paid === undefined || touristData.is_paid === null) {
            touristData.is_paid = true;
        }

        // Викликаємо repository
        const result = await touristRegistryRepository.createTourist(touristData);
        return result;
    }
}

module.exports = new TouristRegistryService();

