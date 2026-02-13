/**
 * Утиліти для форматування дат
 * Централізоване місце для всіх функцій форматування дат
 */

/**
 * Форматує дату у вигляді "Місяць Рік" (українською)
 * @param {string|Date} dateString - дата для форматування
 * @returns {string} - відформатована дата або оригінальний рядок
 */
export const formatPeriod = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];

        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
        return dateString;
    }
};

/**
 * Конвертує дату в формат YYYY-MM-DD для URL
 * @param {string|Date} dateValue - дата для конвертації
 * @returns {string} - дата у форматі YYYY-MM-DD
 */
export const formatDateForUrl = (dateValue) => {
    if (!dateValue) return '';
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch {
        return dateValue;
    }
};

/**
 * Форматує дату з часом у локалізованому форматі
 * @param {string|Date} dateString - дата для форматування
 * @returns {string} - відформатована дата з часом
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleString('uk-UA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return dateString;
    }
};

/**
 * Форматує дату у вигляді "день місяць рік" (українською, тільки дата)
 * @param {string|Date} dateString - дата для форматування
 * @returns {string} - відформатована дата
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
};

/**
 * Форматує дату у короткому форматі DD.MM.YYYY
 * @param {string|Date} dateString - дата для форматування
 * @returns {string} - відформатована дата
 */
export const formatDateShort = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}.${month}.${year}`;
    } catch {
        return dateString;
    }
};
