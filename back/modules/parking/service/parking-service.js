const parkingRepository = require("../repository/parking-repository");
const { fieldsListMissingError } = require("../../../utils/messages");
const { paginate, paginationData } = require("../../../utils/function");
const Logger = require("../../../utils/logger");

/**
 * Конвертує українські літери у латинські аналоги для номерів машин
 * Приклад: "АА1234ВВ" → "AA1234BB"
 */
const convertUkrToLat = (text) => {
    if (!text) return text;

    const ukrToLatMap = {
        'А': 'A', 'а': 'A',
        'В': 'B', 'в': 'B',
        'Е': 'E', 'е': 'E',
        'І': 'I', 'і': 'I',
        'К': 'K', 'к': 'K',
        'М': 'M', 'м': 'M',
        'Н': 'H', 'н': 'H',
        'О': 'O', 'о': 'O',
        'Р': 'P', 'р': 'P',
        'С': 'C', 'с': 'C',
        'Т': 'T', 'т': 'T',
        'Х': 'X', 'х': 'X'
    };

    return text
        .split('')
        .map(char => ukrToLatMap[char] || char.toUpperCase())
        .join('');
};

// Допустимі поля для фільтрації
const allowedBookingFilterFields = [
    'car_number', 'status', 'start_date_from', 'start_date_to',
    'end_date_from', 'end_date_to', 'amount_from', 'amount_to',
    'created_at_from', 'created_at_to'
];

// Поля для відображення
const displayBookingFields = [
    'id', 'car_number', 'start_date', 'start_time',
    'end_date', 'end_time', 'amount', 'status',
    'created_at', 'updated_at'
];

// Допустимі поля для сортування
const allowedBookingSortFields = [
    'car_number', 'start_date', 'start_time',
    'end_date', 'end_time', 'amount', 'status',
    'created_at', 'updated_at'
];

const getSafeBookingSortField = (sortBy) => {
    return allowedBookingSortFields.includes(sortBy) ? sortBy : 'created_at';
};

const validateBookingSortDirection = (sortDirection) => {
    return ['asc', 'desc'].includes(sortDirection?.toLowerCase())
        ? sortDirection.toLowerCase()
        : 'desc';
};

class ParkingService {

    // Отримання списку заявок парковки
    async getBookingsList(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'created_at',
            sort_direction = 'desc',
            ...whereConditions
        } = request.body;

        // Валідація пагінації
        const { offset, validPage, validLimit } = paginate(page, limit);
        const validSortBy = getSafeBookingSortField(sort_by);
        const validSortDirection = validateBookingSortDirection(sort_direction);

        // Фільтрація дозволених полів
        const allowedFields = allowedBookingFilterFields
            .filter(el => whereConditions.hasOwnProperty(el))
            .reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Виклик репозиторію
        const bookingData = await parkingRepository.getBookingsList(
            validLimit, offset, allowedFields, displayBookingFields,
            validSortBy, validSortDirection
        );

        // Формування відповіді
        const paginatedData = paginationData(bookingData[0], validPage, validLimit);

        return {
            ...paginatedData,
            totalAmount: parseFloat(bookingData[0]?.total_amount) || 0,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    // Отримання конкретної заявки за ID
    async getBookingById(request) {
        // Валідація
        if (!Object.keys(displayBookingFields).length) {
            throw new Error(fieldsListMissingError);
        }

        const bookingId = request?.params?.id;
        if (!bookingId) {
            throw new Error('ID заявки не вказано');
        }

        // Отримання даних
        const fetchData = await parkingRepository.getBookingById(bookingId, displayBookingFields);

        if (!fetchData || !fetchData.length || !fetchData[0]?.data) {
            throw new Error('Заявку не знайдено');
        }

        return {
            success: true,
            data: fetchData[0].data
        };
    }

    // Створення нової заявки
    async createBooking(request) {
        let {
            car_number, start_date, start_time,
            end_date, end_time, amount, status
        } = request.body;

        // Валідація обов'язкових полів
        if (!car_number || !start_date || !start_time || !end_date || !end_time || !amount) {
            throw new Error('Поля car_number, start_date, start_time, end_date, end_time та amount є обов\'язковими');
        }

        // Конвертація українських літер у латинські
        car_number = convertUkrToLat(car_number);

        // Валідація номера машини (формат AA1234BB)
        if (!/^[A-Z]{2}\d{4}[A-Z]{2}$/i.test(car_number)) {
            throw new Error('Номер машини має бути у форматі AA1234BB');
        }

        // Валідація суми
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            throw new Error('Сума має бути додатнім числом');
        }

        // Валідація дат
        const startDateTime = new Date(`${start_date} ${start_time}`);
        const endDateTime = new Date(`${end_date} ${end_time}`);

        if (endDateTime <= startDateTime) {
            throw new Error('Дата та час закінчення мають бути пізніше за дату та час початку');
        }

        // Створення заявки
        const newBooking = await parkingRepository.createBooking({
            car_number,
            start_date,
            start_time,
            end_date,
            end_time,
            amount: parsedAmount,
            status: status || 'paid'
        });

        return {
            success: true,
            message: "Заявку успішно створено",
            data: newBooking
        };
    }

    // Оновлення заявки
    async updateBooking(request) {
        const bookingId = request.params?.id;
        let {
            car_number, start_date, start_time,
            end_date, end_time, amount, status
        } = request.body;

        if (!bookingId) {
            throw new Error('ID заявки не вказано');
        }

        // Перевірка існування заявки
        const existingBooking = await parkingRepository.getBookingById(
            bookingId, displayBookingFields
        );
        if (!existingBooking || !existingBooking.length) {
            throw new Error('Заявку не знайдено');
        }

        // Конвертація українських літер у латинські якщо номер передано
        if (car_number !== undefined) {
            car_number = convertUkrToLat(car_number);
        }

        // Валідація номера машини якщо змінюється
        if (car_number && !/^[A-Z]{2}\d{4}[A-Z]{2}$/i.test(car_number)) {
            throw new Error('Номер машини має бути у форматі AA1234BB');
        }

        // Підготовка даних для оновлення
        const updateData = {};
        if (car_number !== undefined) updateData.car_number = car_number;
        if (start_date !== undefined) updateData.start_date = start_date;
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_date !== undefined) updateData.end_date = end_date;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (amount !== undefined) {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                throw new Error('Сума має бути додатнім числом');
            }
            updateData.amount = parsedAmount;
        }
        if (status !== undefined) updateData.status = status;

        // Валідація дат якщо обидві присутні
        if ((updateData.start_date || updateData.start_time || updateData.end_date || updateData.end_time)) {
            const currentData = existingBooking[0].data;
            const newStartDate = updateData.start_date || currentData.start_date;
            const newStartTime = updateData.start_time || currentData.start_time;
            const newEndDate = updateData.end_date || currentData.end_date;
            const newEndTime = updateData.end_time || currentData.end_time;

            const startDateTime = new Date(`${newStartDate} ${newStartTime}`);
            const endDateTime = new Date(`${newEndDate} ${newEndTime}`);

            if (endDateTime <= startDateTime) {
                throw new Error('Дата та час закінчення мають бути пізніше за дату та час початку');
            }
        }

        // Оновлення
        const updatedBooking = await parkingRepository.updateBooking(bookingId, updateData);

        return {
            success: true,
            message: "Заявку успішно оновлено",
            data: updatedBooking
        };
    }

    // Експорт заявок
    async exportBookings(request) {
        const {
            car_number, status, start_date_from, start_date_to,
            end_date_from, end_date_to, amount_from, amount_to,
            created_at_from, created_at_to
        } = request.body;

        // Підготовка фільтрів
        const filters = {
            car_number,
            status,
            start_date_from,
            start_date_to,
            end_date_from,
            end_date_to,
            amount_from: amount_from !== undefined ? parseFloat(amount_from) : undefined,
            amount_to: amount_to !== undefined ? parseFloat(amount_to) : undefined,
            created_at_from,
            created_at_to
        };

        // Отримання всіх даних для експорту
        const bookings = await parkingRepository.exportBookings(filters);

        return {
            success: true,
            items: bookings
        };
    }

    // Отримання статистики
    async getBookingStats(request) {
        const stats = await parkingRepository.getBookingStats();

        return {
            success: true,
            data: {
                totalCount: parseInt(stats?.total_count) || 0,
                totalAmount: parseFloat(stats?.total_amount) || 0,
                paidCount: parseInt(stats?.paid_count) || 0,
                pendingCount: parseInt(stats?.pending_count) || 0,
                cancelledCount: parseInt(stats?.cancelled_count) || 0
            }
        };
    }

    // Перевірка заявки по номеру машини
    async checkBookingByCarNumber(request) {
        let { car_number } = request.body;

        // Валідація
        if (!car_number) {
            throw new Error('Не передано номер машини (car_number)');
        }

        // Конвертація українських літер у латинські
        car_number = convertUkrToLat(car_number);

        if (!/^[A-Z]{2}\d{4}[A-Z]{2}$/i.test(car_number)) {
            throw new Error('Номер машини має бути у форматі AA1234BB');
        }

        // Пошук заявки
        const booking = await parkingRepository.getBookingByCarNumber(car_number);

        if (!booking) {
            return {
                success: false,
                message: "Заявку з таким номером машини не знайдено",
                error: "Інформація за цим номером відсутня в базі даних",
                data: null
            };
        }

        return {
            success: true,
            message: "Заявку успішно знайдено",
            data: booking
        };
    }

    // ==================== CHECK ACTIVITY METHODS ====================

    // Отримання списку історії перевірок
    async getCheckActivityList(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'check_date',
            sort_direction = 'desc',
            ...whereConditions
        } = request.body;

        // Валідація пагінації
        const { offset, validPage, validLimit } = paginate(page, limit);

        const validSortBy = ['check_date', 'car_number', 'check_location', 'status_at_check_time', 'created_at'].includes(sort_by)
            ? sort_by
            : 'check_date';
        const validSortDirection = validateBookingSortDirection(sort_direction);

        // Дозволені поля для фільтрації
        const allowedCheckActivityFilterFields = [
            'car_number', 'check_location', 'status_at_check_time',
            'check_date_from', 'check_date_to'
        ];

        // Фільтрація дозволених полів
        const allowedFields = allowedCheckActivityFilterFields
            .filter(el => whereConditions.hasOwnProperty(el))
            .reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Виклик репозиторію
        const { displayCheckActivityFields } = parkingRepository;
        const checkActivityData = await parkingRepository.getCheckActivityList(
            validLimit, offset, allowedFields, displayCheckActivityFields,
            validSortBy, validSortDirection
        );

        // Формування відповіді
        const paginatedData = paginationData(checkActivityData[0], validPage, validLimit);

        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    // Створення запису перевірки
    async createCheckActivity(request) {
        const {
            booking_id, car_number, check_location,
            status_at_check_time, start_date, start_time,
            end_date, end_time, amount
        } = request.body;

        // Валідація обов'язкових полів
        if (!booking_id || !car_number || !check_location || !status_at_check_time) {
            throw new Error('Поля booking_id, car_number, check_location та status_at_check_time є обов\'язковими');
        }

        // Створення запису
        const newCheckActivity = await parkingRepository.createCheckActivity({
            booking_id,
            car_number: car_number.toUpperCase(),
            check_location,
            status_at_check_time,
            start_date,
            start_time,
            end_date,
            end_time,
            amount: amount ? parseFloat(amount) : null
        });

        return {
            success: true,
            message: "Запис перевірки успішно створено",
            data: newCheckActivity
        };
    }

    // Експорт історії перевірок
    async exportCheckActivity(request) {
        const {
            car_number, check_location, status_at_check_time,
            check_date_from, check_date_to
        } = request.body;

        // Підготовка фільтрів
        const filters = {
            car_number,
            check_location,
            status_at_check_time,
            check_date_from,
            check_date_to
        };

        // Отримання всіх даних для експорту
        const checkActivities = await parkingRepository.exportCheckActivity(filters);

        return {
            success: true,
            items: checkActivities
        };
    }
}

module.exports = new ParkingService();
