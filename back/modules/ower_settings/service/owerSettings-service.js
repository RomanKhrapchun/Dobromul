const owerSettingsRepository = require('../repository/owerSettings-repository');
const redisClient = require('../../../helpers/redis');

const CACHE_KEY = 'ower_settings';
const CACHE_TTL = 3600; // 1 hour

// Transform snake_case to camelCase
function transformToCamelCase(data) {
    if (!data) return null;

    return {
        id: data.id,
        date: data.date,
        file: data.file,
        nonResidentialDebtPurpose: data.non_residential_debt_purpose,
        nonResidentialDebtAccount: data.non_residential_debt_account,
        nonResidentialDebtEdrpou: data.non_residential_debt_edrpou,
        nonResidentialDebtRecipientname: data.non_residential_debt_recipientname,
        residentialDebtPurpose: data.residential_debt_purpose,
        residentialDebtAccount: data.residential_debt_account,
        residentialDebtEdrpou: data.residential_debt_edrpou,
        residentialDebtRecipientname: data.residential_debt_recipientname,
        landDebtPurpose: data.land_debt_purpose,
        landDebtAccount: data.land_debt_account,
        landDebtEdrpou: data.land_debt_edrpou,
        landDebtRecipientname: data.land_debt_recipientname,
        orendaDebtPurpose: data.orenda_debt_purpose,
        orendaDebtAccount: data.orenda_debt_account,
        orendaDebtEdrpou: data.orenda_debt_edrpou,
        orendaDebtRecipientname: data.orenda_debt_recipientname,
        callbackPaySuccess: data.callback_pay_success,
        callbackUrl: data.callback_url,
        mpzPurpose: data.mpz_purpose,
        mpzAccount: data.mpz_account,
        mpzEdrpou: data.mpz_edrpou,
        mpzRecipientname: data.mpz_recipientname
    };
}

class OwerSettingsService {
    async getSettings() {
        try {
            // Try to get from cache
            const cached = await redisClient.get(CACHE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }

            // Get from database
            const settings = await owerSettingsRepository.getSettings();
            const transformed = transformToCamelCase(settings);

            // Save to cache
            if (transformed) {
                await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(transformed));
            }

            return transformed;
        } catch (error) {
            console.error('Error getting ower settings:', error);
            throw error;
        }
    }

    async updateSettings(settings) {
        try {
            const updated = await owerSettingsRepository.updateSettings(settings);
            const transformed = transformToCamelCase(updated);

            // Update cache
            await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(transformed));

            return transformed;
        } catch (error) {
            console.error('Error updating ower settings:', error);
            throw error;
        }
    }

    async invalidateCache() {
        try {
            await redisClient.del(CACHE_KEY);
            return true;
        } catch (error) {
            console.error('Error invalidating ower settings cache:', error);
            throw error;
        }
    }
}

module.exports = new OwerSettingsService();
