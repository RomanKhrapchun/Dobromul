// services/taxReportsApi.js
import { fetchFunction } from "../utils/function";

/**
 * Валідація communityName
 * @param {string} communityName - назва громади
 * @throws {Error} якщо communityName невалідний
 */
const validateCommunityName = (communityName) => {
    if (!communityName || typeof communityName !== 'string') {
        throw new Error('communityName є обов\'язковим параметром');
    }
};

/**
 * Отримати попередній перегляд даних з віддаленої БД (статистика юридичних осіб)
 * @param {string} communityName - назва громади
 * @param {string|null} date - дата реєстру (YYYY-MM-DD) або null для останньої дати
 */
export const previewTaxReportsUpdate = async (communityName, date = null) => {
    validateCommunityName(communityName);

    let url = `/api/tax-reports/database/preview?community_name=${encodeURIComponent(communityName)}`;

    if (date) {
        url += `&date=${encodeURIComponent(date)}`;
    }

    const response = await fetchFunction(url, { method: 'GET' });

    if (!response.data.success) {
        throw new Error(response.data.error || 'Помилка отримання попереднього перегляду');
    }

    return response.data;
};

/**
 * Отримати список доступних дат реєстрів юридичних осіб з віддаленої БД
 * @param {string} communityName - назва громади
 * @param {number} limit - кількість дат (за замовчуванням 3)
 */
export const getTaxReportsAvailableDates = async (communityName, limit = 3) => {
    validateCommunityName(communityName);

    const response = await fetchFunction(
        `/api/tax-reports/database/available-dates?community_name=${encodeURIComponent(communityName)}&limit=${limit}`,
        { method: 'GET' }
    );

    if (!response.data.success) {
        throw new Error(response.data.error || 'Помилка отримання списку дат');
    }

    return response.data;
};

/**
 * Виконати оновлення локальної бази даних юридичних осіб
 * @param {string} communityName - назва громади
 */
export const updateTaxReportsDatabase = async (communityName) => {
    validateCommunityName(communityName);

    const response = await fetchFunction('/api/tax-reports/update-database-execute', {
        method: 'POST',
        data: { community_name: communityName }
    });

    if (!response.data.success) {
        throw new Error(response.data.error || 'Помилка оновлення БД');
    }

    return response.data.data;
};
