/**
 * Роутер для вибору правильного генератора документів на основі COMMUNITY_NAME
 *
 * Автоматично визначає який файл використовувати для генерації документів
 * залежно від назви громади з бази даних
 */

const { pool } = require('../helpers/database');

// Кешування для community_name, щоб не запитувати БД кожного разу
let cachedCommunityName = null;

/**
 * Отримує назву громади з бази даних
 * @returns {Promise<string>} Назва громади
 */
async function getCommunityName() {
    // Якщо є в кеші, повертаємо
    if (cachedCommunityName !== null) {
        return cachedCommunityName;
    }

    try {
        const result = await pool.query(
            'SELECT community_name FROM config.community_settings LIMIT 1'
        );

        if (result.rows.length > 0) {
            cachedCommunityName = result.rows[0].community_name || '';
            console.log('📍 Community name from DB:', cachedCommunityName);
        } else {
            cachedCommunityName = '';
            console.warn('⚠️ Community settings not found in database');
        }

        return cachedCommunityName;
    } catch (error) {
        console.error('❌ Error fetching community name:', error.message);
        // Повертаємо порожній рядок у разі помилки
        return '';
    }
}

/**
 * Визначає який файл використовувати для генерації документів
 * @param {string} communityName - Назва громади
 * @returns {string} Шлях до файлу генератора
 */
function selectGeneratorFile(communityName) {
    // Нормалізуємо назву для перевірки (toLowerCase для case-insensitive порівняння)
    const normalizedName = (communityName || '').toLowerCase();

    // Список громад, які використовують спеціальний файл
    // Додайте сюди назви громад, які потребують generateDocxVelukiMostu.js
    const specialCommunities = [
        'davydiv',
        'velykimosty',
        // Додайте інші назви за потреби
    ];

    // Перевіряємо чи містить назва громади одну з спеціальних назв
    const useSpecialGenerator = specialCommunities.some(special =>
        normalizedName.includes(special.toLowerCase())
    );

    if (useSpecialGenerator) {
        console.log('✅ Using special generator: generateDocxVelukiMostu.js');
        return './generateDocxVelukiMostu';
    } else {
        console.log('✅ Using default generator: generateDocx.js');
        return './generateDocx';
    }
}

/**
 * Динамічно завантажує та повертає функції з відповідного генератора
 * @returns {Promise<Object>} Об'єкт з функціями генерації документів
 */
async function getGeneratorFunctions() {
    try {
        const communityName = await getCommunityName();
        const generatorPath = selectGeneratorFile(communityName);

        // Динамічно підключаємо потрібний файл
        const generator = require(generatorPath);

        // Повертаємо всі експортовані функції з генератора
        // Це дозволяє різним генераторам мати різний набір функцій
        return {
            createRequisiteWord: generator.createRequisiteWord,
            createUtilitiesRequisiteWord: generator.createUtilitiesRequisiteWord,
            createTaxNotificationWord: generator.createTaxNotificationWord,
            determineTaxType: generator.determineTaxType,
            getRequisitesForTaxType: generator.getRequisitesForTaxType,
            formatPaymentPurpose: generator.formatPaymentPurpose,
            convertNumberToWords: generator.convertNumberToWords,
            formatDebtAmount: generator.formatDebtAmount,
            formatDate: generator.formatDate,
            // Опціональні функції (можуть бути відсутні в деяких генераторах)
            ...(generator.createTaxChargesTableRows && {
                createTaxChargesTableRows: generator.createTaxChargesTableRows
            })
        };
    } catch (error) {
        console.error('❌ Error loading generator:', error.message);
        // У разі помилки, використовуємо базовий генератор
        console.log('⚠️ Falling back to default generator');
        return require('./generateDocx');
    }
}

/**
 * Очищує кеш назви громади (для тестування або оновлення)
 */
function clearCache() {
    cachedCommunityName = null;
    console.log('🔄 Community name cache cleared');
}

module.exports = {
    getGeneratorFunctions,
    getCommunityName,
    clearCache
};
