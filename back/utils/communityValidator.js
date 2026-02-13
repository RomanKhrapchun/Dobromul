/**
 * Утиліта для валідації community_name
 *
 * Перевіряє чи існує community_name в базі даних config.community_settings
 * та чи є він валідним для використання в системі
 */

const { pool } = require('../helpers/database');
const Logger = require('./logger');

class CommunityValidator {
    constructor() {
        // Кеш для зберігання валідних community_name
        // Ключ: community_name, Значення: { isValid: boolean, timestamp: number }
        this.validationCache = new Map();
        // Час життя кешу: 5 хвилин
        this.CACHE_TTL = 5 * 60 * 1000;
    }

    /**
     * Валідує community_name
     *
     * @param {string} communityName - Назва громади для перевірки
     * @param {boolean} useCache - Чи використовувати кеш (за замовчуванням true)
     * @returns {Promise<{isValid: boolean, error: string|null, communityName: string|null}>}
     */
    async validate(communityName, useCache = true) {
        Logger.info('[VALIDATOR] validate: Отримано для валідації', {
            communityName,
            type: typeof communityName,
            length: communityName?.length,
            useCache
        });

        try {
            // Перевірка 1: Значення не повинно бути null/undefined/порожнім
            if (!communityName || typeof communityName !== 'string') {
                Logger.warn('[VALIDATOR] community_name не вказано або має невірний формат', {
                    communityName,
                    type: typeof communityName
                });
                return {
                    isValid: false,
                    error: 'community_name не вказано або має невірний формат',
                    communityName: null
                };
            }

            // Нормалізуємо назву
            const normalizedName = communityName.trim();
            Logger.info('[VALIDATOR] validate: Нормалізована назва', {
                original: communityName,
                normalized: normalizedName
            });

            // Перевірка 2: Значення не повинно бути 'default'
            if (normalizedName.toLowerCase() === 'default') {
                return {
                    isValid: false,
                    error: 'community_name не може бути "default". Потрібно вказати конкретну назву громади',
                    communityName: null
                };
            }

            // Перевірка кешу (якщо увімкнено)
            if (useCache) {
                const cached = this.validationCache.get(normalizedName);
                Logger.info('[VALIDATOR] Перевірка кешу', {
                    normalizedName,
                    hasCached: !!cached,
                    cachedValue: cached,
                    cacheAge: cached ? Date.now() - cached.timestamp : null,
                    cacheTTL: this.CACHE_TTL
                });

                if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
                    Logger.info('[VALIDATOR] Використано кешовану валідацію для community_name', {
                        communityName: normalizedName,
                        isValid: cached.isValid
                    });
                    return {
                        isValid: cached.isValid,
                        error: cached.isValid ? null : 'community_name не знайдено в базі даних',
                        communityName: cached.isValid ? normalizedName : null
                    };
                }
            }

            // Перевірка 3: Перевірка існування в БД
            Logger.info('[VALIDATOR] Запит до БД для перевірки community_name', { normalizedName });
            const dbResult = await this.checkInDatabase(normalizedName);
            Logger.info('[VALIDATOR] Результат перевірки в БД', {
                normalizedName,
                exists: dbResult.exists,
                settings: dbResult.settings
            });

            // Зберігаємо в кеш
            this.validationCache.set(normalizedName, {
                isValid: dbResult.exists,
                timestamp: Date.now()
            });

            if (!dbResult.exists) {
                return {
                    isValid: false,
                    error: `community_name "${normalizedName}" не знайдено в базі даних config.community_settings`,
                    communityName: null
                };
            }

            // Все гаразд
            Logger.info('community_name успішно валідовано', {
                communityName: normalizedName
            });

            return {
                isValid: true,
                error: null,
                communityName: normalizedName
            };

        } catch (error) {
            Logger.error('Помилка валідації community_name', {
                error: error.message,
                stack: error.stack,
                communityName
            });

            return {
                isValid: false,
                error: `Помилка валідації: ${error.message}`,
                communityName: null
            };
        }
    }

    /**
     * Перевіряє існування community_name в базі даних
     *
     * @param {string} communityName - Назва громади
     * @returns {Promise<{exists: boolean, settings: object|null}>}
     */
    async checkInDatabase(communityName) {
        try {
            const query = `
                SELECT
                    id,
                    community_name,
                    city_name,
                    territory_title
                FROM config.community_settings
                WHERE community_name = $1
                LIMIT 1
            `;

            const result = await pool.query(query, [communityName]);

            if (result.rows.length > 0) {
                Logger.info('community_name знайдено в БД', {
                    communityName,
                    cityName: result.rows[0].city_name
                });

                return {
                    exists: true,
                    settings: result.rows[0]
                };
            }

            Logger.warn('community_name не знайдено в БД', {
                communityName
            });

            return {
                exists: false,
                settings: null
            };

        } catch (error) {
            Logger.error('Помилка перевірки community_name в БД', {
                error: error.message,
                communityName
            });
            throw error;
        }
    }

    /**
     * Отримує список всіх доступних community_name з БД
     *
     * @returns {Promise<string[]>} Масив назв громад
     */
    async getAvailableCommunities() {
        try {
            const query = `
                SELECT
                    community_name,
                    city_name,
                    territory_title
                FROM config.community_settings
                ORDER BY community_name
            `;

            const result = await pool.query(query);

            return result.rows.map(row => ({
                communityName: row.community_name,
                cityName: row.city_name,
                territoryTitle: row.territory_title
            }));

        } catch (error) {
            Logger.error('Помилка отримання списку громад', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Очищає кеш валідації
     */
    clearCache() {
        this.validationCache.clear();
        Logger.info('Кеш валідації community_name очищено');
    }

    /**
     * Видаляє з кешу конкретний community_name
     *
     * @param {string} communityName - Назва громади
     */
    invalidateCache(communityName) {
        if (communityName) {
            const normalized = communityName.trim();
            this.validationCache.delete(normalized);
            Logger.info('Кеш валідації очищено для community_name', {
                communityName: normalized
            });
        }
    }
}

// Експортуємо singleton інстанс
const communityValidator = new CommunityValidator();

module.exports = communityValidator;
