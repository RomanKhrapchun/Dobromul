const { sqlRequest } = require('../../../helpers/database');

// Поля для відображення
const displayBookingFields = [
    'id', 'car_number', 'start_date', 'start_time',
    'end_date', 'end_time', 'amount', 'status',
    'created_at', 'updated_at'
];

// Функція для безпечного вибору поля сортування
const getSafeBookingSortField = (sortBy) => {
    const allowedBookingSortFields = [
        'car_number', 'start_date', 'start_time',
        'end_date', 'end_time', 'amount', 'status',
        'created_at', 'updated_at'
    ];
    return allowedBookingSortFields.includes(sortBy) ? sortBy : 'created_at';
};

// Функція для валідації напрямку сортування
const validateBookingSortDirection = (sortDirection) => {
    return ['asc', 'desc'].includes(sortDirection?.toLowerCase())
        ? sortDirection.toLowerCase()
        : 'desc';
};

// Побудова WHERE умов для фільтрації
function buildBookingWhereConditions(whereConditions = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Фільтр по номеру машини (ILIKE для часткового співпадіння)
    if (whereConditions.car_number && whereConditions.car_number.trim()) {
        conditions.push(`car_number ILIKE $${paramIndex}`);
        values.push(`%${whereConditions.car_number.trim()}%`);
        paramIndex++;
    }

    // Фільтр по статусу
    if (whereConditions.status && whereConditions.status.trim()) {
        conditions.push(`status = $${paramIndex}`);
        values.push(whereConditions.status.trim());
        paramIndex++;
    }

    // Фільтр по даті початку (діапазон)
    if (whereConditions.start_date_from && whereConditions.start_date_from.trim()) {
        conditions.push(`start_date >= $${paramIndex}`);
        values.push(whereConditions.start_date_from.trim());
        paramIndex++;
    }

    if (whereConditions.start_date_to && whereConditions.start_date_to.trim()) {
        conditions.push(`start_date <= $${paramIndex}`);
        values.push(whereConditions.start_date_to.trim());
        paramIndex++;
    }

    // Фільтр по даті закінчення (діапазон)
    if (whereConditions.end_date_from && whereConditions.end_date_from.trim()) {
        conditions.push(`end_date >= $${paramIndex}`);
        values.push(whereConditions.end_date_from.trim());
        paramIndex++;
    }

    if (whereConditions.end_date_to && whereConditions.end_date_to.trim()) {
        conditions.push(`end_date <= $${paramIndex}`);
        values.push(whereConditions.end_date_to.trim());
        paramIndex++;
    }

    // Фільтр по сумі (діапазон)
    if (whereConditions.amount_from !== undefined &&
        whereConditions.amount_from !== null &&
        whereConditions.amount_from !== '') {
        const amountFromValue = parseFloat(whereConditions.amount_from);
        if (!isNaN(amountFromValue) && amountFromValue >= 0) {
            conditions.push(`amount >= $${paramIndex}`);
            values.push(amountFromValue);
            paramIndex++;
        }
    }

    if (whereConditions.amount_to !== undefined &&
        whereConditions.amount_to !== null &&
        whereConditions.amount_to !== '') {
        const amountToValue = parseFloat(whereConditions.amount_to);
        if (!isNaN(amountToValue) && amountToValue >= 0) {
            conditions.push(`amount <= $${paramIndex}`);
            values.push(amountToValue);
            paramIndex++;
        }
    }

    // Фільтр по даті створення (діапазон)
    if (whereConditions.created_at_from && whereConditions.created_at_from.trim()) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(whereConditions.created_at_from.trim());
        paramIndex++;
    }

    if (whereConditions.created_at_to && whereConditions.created_at_to.trim()) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(whereConditions.created_at_to.trim());
        paramIndex++;
    }

    return {
        text: conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '',
        values,
        nextParamIndex: paramIndex
    };
}

// Отримання списку заявок парковки
async function getBookingsList(limit, offset, whereConditions = {}, displayFields = [], sortBy = 'created_at', sortDirection = 'desc') {
    const safeSortField = getSafeBookingSortField(sortBy);
    const safeSortDirection = validateBookingSortDirection(sortDirection);

    const jsonFields = displayFields.map(field => `'${field}', ${field}`).join(', ');

    let sql = `
        SELECT
            json_agg(
                json_build_object(${jsonFields})
            ) as data,
            max(cnt) as count,
            max(total_amount_calc) as total_amount
        FROM (
            SELECT *,
            count(*) over () as cnt,
            SUM(amount) over () as total_amount_calc
            FROM parking.bookings
            WHERE 1=1
    `;

    const whereData = buildBookingWhereConditions(whereConditions);
    sql += whereData.text;

    // Сортування
    sql += ` ORDER BY ${safeSortField} ${safeSortDirection.toUpperCase()}`;

    // Пагінація
    const nextParam = whereData.nextParamIndex;
    sql += ` LIMIT $${nextParam} OFFSET $${nextParam + 1}`;
    sql += ` ) q`;

    const values = [...whereData.values, limit, offset];
    return await sqlRequest(sql, values);
}

// Отримання заявки по ID
async function getBookingById(bookingId, displayFields = []) {
    const jsonFields = displayFields.map(field => `'${field}', ${field}`).join(', ');

    const sql = `
        SELECT json_build_object(${jsonFields}) as data
        FROM parking.bookings
        WHERE id = $1
    `;

    return await sqlRequest(sql, [bookingId]);
}

// Отримання заявки по номеру машини
async function getBookingByCarNumber(carNumber) {
    const sql = `
        SELECT *
        FROM parking.bookings
        WHERE car_number = $1
        LIMIT 1
    `;

    const result = await sqlRequest(sql, [carNumber]);
    return result && result.length > 0 ? result[0] : null;
}

// Створення нової заявки
async function createBooking(bookingData) {
    const sql = `
        INSERT INTO parking.bookings (
            car_number, start_date, start_time,
            end_date, end_time, amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const values = [
        bookingData.car_number,
        bookingData.start_date,
        bookingData.start_time,
        bookingData.end_date,
        bookingData.end_time,
        bookingData.amount,
        bookingData.status || 'paid'
    ];

    const result = await sqlRequest(sql, values);
    return result && result.length > 0 ? result[0] : null;
}

// Оновлення заявки
async function updateBooking(bookingId, updateData) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.car_number !== undefined) {
        updateFields.push(`car_number = $${paramIndex}`);
        values.push(updateData.car_number);
        paramIndex++;
    }

    if (updateData.start_date !== undefined) {
        updateFields.push(`start_date = $${paramIndex}`);
        values.push(updateData.start_date);
        paramIndex++;
    }

    if (updateData.start_time !== undefined) {
        updateFields.push(`start_time = $${paramIndex}`);
        values.push(updateData.start_time);
        paramIndex++;
    }

    if (updateData.end_date !== undefined) {
        updateFields.push(`end_date = $${paramIndex}`);
        values.push(updateData.end_date);
        paramIndex++;
    }

    if (updateData.end_time !== undefined) {
        updateFields.push(`end_time = $${paramIndex}`);
        values.push(updateData.end_time);
        paramIndex++;
    }

    if (updateData.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex}`);
        values.push(updateData.amount);
        paramIndex++;
    }

    if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(updateData.status);
        paramIndex++;
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    if (updateFields.length === 1) { // Тільки updated_at
        throw new Error('Немає полів для оновлення');
    }

    values.push(bookingId);

    const sql = `
        UPDATE parking.bookings
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    const result = await sqlRequest(sql, values);
    return result && result.length > 0 ? result[0] : null;
}

// Експорт заявок (без пагінації)
async function exportBookings(filters = {}) {
    let sql = `
        SELECT *
        FROM parking.bookings
        WHERE 1=1
    `;

    const whereData = buildBookingWhereConditions(filters);
    sql += whereData.text;
    sql += ` ORDER BY created_at DESC`;

    return await sqlRequest(sql, whereData.values);
}

// Отримання статистики
async function getBookingStats() {
    const sql = `
        SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount), 0) as total_amount,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM parking.bookings
    `;

    const result = await sqlRequest(sql);
    return result && result.length > 0 ? result[0] : null;
}

// ==================== CHECK ACTIVITY METHODS ====================

// Поля для відображення історії перевірок
const displayCheckActivityFields = [
    'id', 'booking_id', 'car_number', 'check_location',
    'status_at_check_time', 'start_date', 'start_time',
    'end_date', 'end_time', 'amount', 'check_date', 'created_at'
];

// Побудова WHERE умов для фільтрації історії перевірок
function buildCheckActivityWhereConditions(whereConditions = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Фільтр по номеру машини
    if (whereConditions.car_number && whereConditions.car_number.trim()) {
        conditions.push(`car_number ILIKE $${paramIndex}`);
        values.push(`%${whereConditions.car_number.trim()}%`);
        paramIndex++;
    }

    // Фільтр по місцю перевірки
    if (whereConditions.check_location && whereConditions.check_location.trim()) {
        conditions.push(`check_location ILIKE $${paramIndex}`);
        values.push(`%${whereConditions.check_location.trim()}%`);
        paramIndex++;
    }

    // Фільтр по статусу на момент перевірки
    if (whereConditions.status_at_check_time && whereConditions.status_at_check_time.trim()) {
        conditions.push(`status_at_check_time = $${paramIndex}`);
        values.push(whereConditions.status_at_check_time.trim());
        paramIndex++;
    }

    // Фільтр по даті перевірки (діапазон)
    if (whereConditions.check_date_from && whereConditions.check_date_from.trim()) {
        conditions.push(`check_date >= $${paramIndex}`);
        values.push(whereConditions.check_date_from.trim());
        paramIndex++;
    }

    if (whereConditions.check_date_to && whereConditions.check_date_to.trim()) {
        conditions.push(`check_date <= $${paramIndex}`);
        values.push(whereConditions.check_date_to.trim());
        paramIndex++;
    }

    return {
        text: conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '',
        values,
        nextParamIndex: paramIndex
    };
}

// Отримання списку історії перевірок
async function getCheckActivityList(limit, offset, whereConditions = {}, displayFields = [], sortBy = 'check_date', sortDirection = 'desc') {
    const safeSortField = ['check_date', 'car_number', 'check_location', 'status_at_check_time', 'created_at'].includes(sortBy)
        ? sortBy
        : 'check_date';
    const safeSortDirection = validateBookingSortDirection(sortDirection);

    const jsonFields = displayFields.map(field => `'${field}', ${field}`).join(', ');

    let sql = `
        SELECT
            json_agg(
                json_build_object(${jsonFields})
            ) as data,
            max(cnt) as count
        FROM (
            SELECT *,
            count(*) over () as cnt
            FROM parking.check_activity
            WHERE 1=1
    `;

    const whereData = buildCheckActivityWhereConditions(whereConditions);
    sql += whereData.text;

    // Сортування
    sql += ` ORDER BY ${safeSortField} ${safeSortDirection.toUpperCase()}`;

    // Пагінація
    const nextParam = whereData.nextParamIndex;
    sql += ` LIMIT $${nextParam} OFFSET $${nextParam + 1}`;
    sql += ` ) q`;

    const values = [...whereData.values, limit, offset];
    return await sqlRequest(sql, values);
}

// Створення запису перевірки
async function createCheckActivity(checkData) {
    const sql = `
        INSERT INTO parking.check_activity (
            booking_id, car_number, check_location,
            status_at_check_time, start_date, start_time,
            end_date, end_time, amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;

    const values = [
        checkData.booking_id,
        checkData.car_number,
        checkData.check_location,
        checkData.status_at_check_time,
        checkData.start_date || null,
        checkData.start_time || null,
        checkData.end_date || null,
        checkData.end_time || null,
        checkData.amount || null
    ];

    const result = await sqlRequest(sql, values);
    return result && result.length > 0 ? result[0] : null;
}

// Експорт історії перевірок
async function exportCheckActivity(filters = {}) {
    let sql = `
        SELECT *
        FROM parking.check_activity
        WHERE 1=1
    `;

    const whereData = buildCheckActivityWhereConditions(filters);
    sql += whereData.text;
    sql += ` ORDER BY check_date DESC`;

    return await sqlRequest(sql, whereData.values);
}

module.exports = {
    displayBookingFields,
    getSafeBookingSortField,
    validateBookingSortDirection,
    getBookingsList,
    getBookingById,
    getBookingByCarNumber,
    createBooking,
    updateBooking,
    exportBookings,
    getBookingStats,
    // Check Activity
    displayCheckActivityFields,
    getCheckActivityList,
    createCheckActivity,
    exportCheckActivity
};
