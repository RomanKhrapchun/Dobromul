const communitySettingsRepository = require('../repository/communitySettings-repository');
const redisClient = require('../../../helpers/redis');
const Logger = require('../../../utils/logger');

const CACHE_KEY = 'community_settings';
const REDIS_TTL = 3600; // 1 hour in seconds
const MEMORY_TTL = 60 * 1000; // 60 seconds in milliseconds

class CommunitySettingsService {
    constructor() {
        // In-memory cache (Level 1)
        this.memoryCache = null;
        this.memoryCacheTimestamp = null;
    }

    /**
     * Перевіряє чи in-memory кеш валідний
     */
    isMemoryCacheValid() {
        if (!this.memoryCache || !this.memoryCacheTimestamp) {
            return false;
        }
        return (Date.now() - this.memoryCacheTimestamp) < MEMORY_TTL;
    }

    async getSettings() {
        try {
            // Level 1: In-memory cache (найшвидший, без мережевих викликів)
            if (this.isMemoryCacheValid()) {
                return this.memoryCache;
            }

            // Level 2: Redis cache (швидкий, але мережевий виклик)
            const cached = await redisClient.get(CACHE_KEY);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                // Оновлюємо in-memory кеш
                this.memoryCache = parsedCache;
                this.memoryCacheTimestamp = Date.now();
                return parsedCache;
            }

            // Level 3: Database (найповільніший)
            Logger.info('[COMMUNITY_SETTINGS] Cache miss, loading from DB...');
            const settings = await communitySettingsRepository.getSettings();

            if (settings) {
                // Зберігаємо в обидва кеші
                this.memoryCache = settings;
                this.memoryCacheTimestamp = Date.now();
                await redisClient.setex(CACHE_KEY, REDIS_TTL, JSON.stringify(settings));
                Logger.info('[COMMUNITY_SETTINGS] Settings loaded from DB and cached', {
                    community_name: settings.community_name
                });
            }

            return settings;
        } catch (error) {
            Logger.error('[COMMUNITY_SETTINGS] Error getting community settings:', error);
            // Якщо є in-memory кеш (навіть застарілий) - повертаємо його
            if (this.memoryCache) {
                Logger.warn('[COMMUNITY_SETTINGS] Using stale memory cache due to error');
                return this.memoryCache;
            }
            // Інакше пробуємо напряму з БД
            return await communitySettingsRepository.getSettings();
        }
    }

    /**
     * Отримати community_name (часто використовується іншими сервісами)
     */
    async getCommunityName() {
        const settings = await this.getSettings();
        return settings?.community_name || null;
    }

    async updateSettings(settings) {
        try {
            const updated = await communitySettingsRepository.updateSettings(settings);

            if (updated) {
                await this.invalidateCache();
                Logger.info('[COMMUNITY_SETTINGS] Settings updated and cache invalidated');
            }

            return updated;
        } catch (error) {
            Logger.error('[COMMUNITY_SETTINGS] Error updating settings:', error);
            throw error;
        }
    }

    async createSettings(settings) {
        try {
            const created = await communitySettingsRepository.createSettings(settings);

            if (created) {
                await this.invalidateCache();
                Logger.info('[COMMUNITY_SETTINGS] Settings created and cache invalidated');
            }

            return created;
        } catch (error) {
            Logger.error('[COMMUNITY_SETTINGS] Error creating settings:', error);
            throw error;
        }
    }

    async invalidateCache() {
        try {
            // Очищаємо обидва рівні кешу
            this.memoryCache = null;
            this.memoryCacheTimestamp = null;
            await redisClient.del(CACHE_KEY);
            Logger.info('[COMMUNITY_SETTINGS] Cache invalidated (memory + Redis)');
        } catch (error) {
            Logger.error('[COMMUNITY_SETTINGS] Error invalidating cache:', error);
        }
    }

    /**
     * Попереднє завантаження кешу при старті сервера
     */
    async preload() {
        try {
            Logger.info('[COMMUNITY_SETTINGS] Preloading cache...');
            await this.getSettings();
            Logger.info('[COMMUNITY_SETTINGS] Cache preloaded successfully');
        } catch (error) {
            Logger.error('[COMMUNITY_SETTINGS] Error preloading cache:', error);
        }
    }

    // Transform DB fields to frontend format (camelCase)
    transformToFrontend(settings) {
        if (!settings) return null;

        return {
            id: settings.id,
            cityName: settings.city_name,
            cityCouncil: settings.city_council,
            altCityName: settings.alt_city_name,
            territoryTitle: settings.territory_title,
            territoryTitleInstrumental: settings.territory_title_instrumental,
            websiteName: settings.website_name,
            websiteUrl: settings.website_url,
            websiteUrlP4v: settings.website_url_p4v,
            telegramName: settings.telegram_name,
            telegramUrl: settings.telegram_url,
            phoneNumberGuDps: settings.phone_number_gu_dps,
            phoneNumberKindergarten: settings.phone_number_kindergarten,
            currentRegion: settings.current_region,
            guDpsRegion: settings.gu_dps_region,
            guDpsAddress: settings.gu_dps_address,
            debtChargeAccount: settings.debt_charge_account,
            communityName: settings.community_name,
            altQrCode: settings.alt_qr_code,
            createdAt: settings.created_at,
            updatedAt: settings.updated_at
        };
    }

    // Transform frontend format (camelCase) to DB fields (snake_case)
    transformToDb(settings) {
        if (!settings) return null;

        return {
            id: settings.id,
            city_name: settings.cityName,
            city_council: settings.cityCouncil,
            alt_city_name: settings.altCityName,
            territory_title: settings.territoryTitle,
            territory_title_instrumental: settings.territoryTitleInstrumental,
            website_name: settings.websiteName,
            website_url: settings.websiteUrl,
            website_url_p4v: settings.websiteUrlP4v,
            telegram_name: settings.telegramName,
            telegram_url: settings.telegramUrl,
            phone_number_gu_dps: settings.phoneNumberGuDps,
            phone_number_kindergarten: settings.phoneNumberKindergarten,
            current_region: settings.currentRegion,
            gu_dps_region: settings.guDpsRegion,
            gu_dps_address: settings.guDpsAddress,
            debt_charge_account: settings.debtChargeAccount,
            community_name: settings.communityName,
            alt_qr_code: settings.altQrCode
        };
    }
}

module.exports = new CommunitySettingsService();
