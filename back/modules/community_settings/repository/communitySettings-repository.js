const { sqlRequest } = require("../../../helpers/database");

class CommunitySettingsRepository {

    async getSettings() {
        const sql = `
            SELECT
                id,
                city_name,
                city_council,
                alt_city_name,
                territory_title,
                territory_title_instrumental,
                website_name,
                website_url,
                website_url_p4v,
                telegram_name,
                telegram_url,
                phone_number_gu_dps,
                phone_number_kindergarten,
                current_region,
                gu_dps_region,
                gu_dps_address,
                debt_charge_account,
                community_name,
                alt_qr_code,
                last_telegram_notification_at,
                created_at,
                updated_at
            FROM config.community_settings
            LIMIT 1
        `;
        const result = await sqlRequest(sql);
        return result && result.length > 0 ? result[0] : null;
    }

    async updateSettings(settings) {
        const sql = `
            UPDATE config.community_settings
            SET
                city_name = $1,
                city_council = $2,
                alt_city_name = $3,
                territory_title = $4,
                territory_title_instrumental = $5,
                website_name = $6,
                website_url = $7,
                website_url_p4v = $8,
                telegram_name = $9,
                telegram_url = $10,
                phone_number_gu_dps = $11,
                phone_number_kindergarten = $12,
                current_region = $13,
                gu_dps_region = $14,
                gu_dps_address = $15,
                debt_charge_account = $16,
                community_name = $17,
                alt_qr_code = $18
            WHERE id = $19
            RETURNING *
        `;

        const params = [
            settings.city_name,
            settings.city_council,
            settings.alt_city_name,
            settings.territory_title,
            settings.territory_title_instrumental,
            settings.website_name,
            settings.website_url,
            settings.website_url_p4v,
            settings.telegram_name,
            settings.telegram_url,
            settings.phone_number_gu_dps,
            settings.phone_number_kindergarten,
            JSON.stringify(settings.current_region),
            settings.gu_dps_region,
            settings.gu_dps_address,
            settings.debt_charge_account,
            settings.community_name,
            settings.alt_qr_code,
            settings.id
        ];

        const result = await sqlRequest(sql, params);
        return result && result.length > 0 ? result[0] : null;
    }

    async createSettings(settings) {
        const sql = `
            INSERT INTO config.community_settings (
                city_name,
                city_council,
                alt_city_name,
                territory_title,
                territory_title_instrumental,
                website_name,
                website_url,
                website_url_p4v,
                telegram_name,
                telegram_url,
                phone_number_gu_dps,
                phone_number_kindergarten,
                current_region,
                gu_dps_region,
                gu_dps_address,
                debt_charge_account,
                community_name,
                alt_qr_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `;

        const params = [
            settings.city_name,
            settings.city_council,
            settings.alt_city_name,
            settings.territory_title,
            settings.territory_title_instrumental,
            settings.website_name,
            settings.website_url,
            settings.website_url_p4v,
            settings.telegram_name,
            settings.telegram_url,
            settings.phone_number_gu_dps,
            settings.phone_number_kindergarten,
            JSON.stringify(settings.current_region || {}),
            settings.gu_dps_region,
            settings.gu_dps_address,
            settings.debt_charge_account,
            settings.community_name,
            settings.alt_qr_code
        ];

        const result = await sqlRequest(sql, params);
        return result && result.length > 0 ? result[0] : null;
    }

    async updateLastTelegramNotification() {
        const sql = `
            UPDATE config.community_settings
            SET last_telegram_notification_at = CURRENT_TIMESTAMP
            RETURNING last_telegram_notification_at
        `;
        const result = await sqlRequest(sql);
        return result?.[0]?.last_telegram_notification_at ?? null;
    }

    async getLastTelegramNotification() {
        const sql = `
            SELECT last_telegram_notification_at
            FROM config.community_settings
            LIMIT 1
        `;
        const result = await sqlRequest(sql);
        return result?.[0]?.last_telegram_notification_at ?? null;
    }
}

module.exports = new CommunitySettingsRepository();
