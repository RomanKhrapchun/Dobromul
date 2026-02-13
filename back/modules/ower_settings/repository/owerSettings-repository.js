const { sqlRequest } = require('../../../helpers/database');

class OwerSettingsRepository {
    async getSettings() {
        const sql = `
            SELECT
                id,
                date,
                file,
                non_residential_debt_purpose,
                non_residential_debt_account,
                non_residential_debt_edrpou,
                non_residential_debt_recipientname,
                residential_debt_purpose,
                residential_debt_account,
                residential_debt_edrpou,
                residential_debt_recipientname,
                land_debt_purpose,
                land_debt_account,
                land_debt_edrpou,
                land_debt_recipientname,
                orenda_debt_purpose,
                orenda_debt_account,
                orenda_debt_edrpou,
                orenda_debt_recipientname,
                callback_pay_success,
                callback_url,
                mpz_purpose,
                mpz_account,
                mpz_edrpou,
                mpz_recipientname
            FROM ower.settings
            ORDER BY date DESC
            LIMIT 1
        `;
        const result = await sqlRequest(sql);
        return result[0] || null;
    }

    async updateSettings(settings) {
        const sql = `
            UPDATE ower.settings
            SET
                file = $1,
                non_residential_debt_purpose = $2,
                non_residential_debt_account = $3,
                non_residential_debt_edrpou = $4,
                non_residential_debt_recipientname = $5,
                residential_debt_purpose = $6,
                residential_debt_account = $7,
                residential_debt_edrpou = $8,
                residential_debt_recipientname = $9,
                land_debt_purpose = $10,
                land_debt_account = $11,
                land_debt_edrpou = $12,
                land_debt_recipientname = $13,
                orenda_debt_purpose = $14,
                orenda_debt_account = $15,
                orenda_debt_edrpou = $16,
                orenda_debt_recipientname = $17,
                callback_pay_success = $18,
                callback_url = $19,
                mpz_purpose = $20,
                mpz_account = $21,
                mpz_edrpou = $22,
                mpz_recipientname = $23,
                date = NOW()
            WHERE id = $24
            RETURNING *
        `;

        const params = [
            settings.file,
            settings.nonResidentialDebtPurpose,
            settings.nonResidentialDebtAccount,
            settings.nonResidentialDebtEdrpou,
            settings.nonResidentialDebtRecipientname,
            settings.residentialDebtPurpose,
            settings.residentialDebtAccount,
            settings.residentialDebtEdrpou,
            settings.residentialDebtRecipientname,
            settings.landDebtPurpose,
            settings.landDebtAccount,
            settings.landDebtEdrpou,
            settings.landDebtRecipientname,
            settings.orendaDebtPurpose,
            settings.orendaDebtAccount,
            settings.orendaDebtEdrpou,
            settings.orendaDebtRecipientname,
            settings.callbackPaySuccess,
            settings.callbackUrl,
            settings.mpzPurpose,
            settings.mpzAccount,
            settings.mpzEdrpou,
            settings.mpzRecipientname,
            settings.id
        ];

        const result = await sqlRequest(sql, params);
        return result[0];
    }
}

module.exports = new OwerSettingsRepository();
