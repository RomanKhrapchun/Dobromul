const updateSettingsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' },
                file: { type: 'string' },
                nonResidentialDebtPurpose: { type: 'string' },
                nonResidentialDebtAccount: { type: 'string' },
                nonResidentialDebtEdrpou: { type: 'string' },
                nonResidentialDebtRecipientname: { type: 'string' },
                residentialDebtPurpose: { type: 'string' },
                residentialDebtAccount: { type: 'string' },
                residentialDebtEdrpou: { type: 'string' },
                residentialDebtRecipientname: { type: 'string' },
                landDebtPurpose: { type: 'string' },
                landDebtAccount: { type: 'string' },
                landDebtEdrpou: { type: 'string' },
                landDebtRecipientname: { type: 'string' },
                orendaDebtPurpose: { type: 'string' },
                orendaDebtAccount: { type: 'string' },
                orendaDebtEdrpou: { type: 'string' },
                orendaDebtRecipientname: { type: 'string' },
                callbackPaySuccess: { type: 'string' },
                callbackUrl: { type: 'string' },
                mpzPurpose: { type: 'string' },
                mpzAccount: { type: 'string' },
                mpzEdrpou: { type: 'string' },
                mpzRecipientname: { type: 'string' }
            }
        }
    }
};

module.exports = {
    updateSettingsSchema
};
