const updateSettingsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['id', 'cityName', 'cityCouncil', 'territoryTitle', 'communityName'],
            properties: {
                id: { type: 'number' },
                cityName: { type: 'string', minLength: 1, maxLength: 100 },
                cityCouncil: { type: 'string', minLength: 1, maxLength: 100 },
                altCityName: { type: 'string', maxLength: 200 },
                territoryTitle: { type: 'string', minLength: 1, maxLength: 200 },
                territoryTitleInstrumental: { type: 'string', maxLength: 200 },
                websiteName: { type: 'string', maxLength: 200 },
                websiteUrl: { type: 'string', maxLength: 255 },
                websiteUrlP4v: { type: 'string', maxLength: 255 },
                telegramName: { type: 'string', maxLength: 200 },
                telegramUrl: { type: 'string', maxLength: 255 },
                phoneNumberGuDps: { type: 'string', maxLength: 50 },
                phoneNumberKindergarten: { type: 'string', maxLength: 50 },
                currentRegion: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        genitive: { type: 'string' },
                        dative: { type: 'string' },
                        accusative: { type: 'string' },
                        instrumental: { type: 'string' },
                        locative: { type: 'string' }
                    }
                },
                guDpsRegion: { type: 'string', maxLength: 200 },
                guDpsAddress: { type: 'string', maxLength: 500 },
                debtChargeAccount: { type: 'string', maxLength: 50 },
                communityName: { type: 'string', minLength: 1, maxLength: 100 },
                altQrCode: { type: 'string', maxLength: 200 }
            }
        }
    }
};

const createSettingsSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['cityName', 'cityCouncil', 'territoryTitle', 'communityName'],
            properties: {
                cityName: { type: 'string', minLength: 1, maxLength: 100 },
                cityCouncil: { type: 'string', minLength: 1, maxLength: 100 },
                altCityName: { type: 'string', maxLength: 200 },
                territoryTitle: { type: 'string', minLength: 1, maxLength: 200 },
                territoryTitleInstrumental: { type: 'string', maxLength: 200 },
                websiteName: { type: 'string', maxLength: 200 },
                websiteUrl: { type: 'string', maxLength: 255 },
                websiteUrlP4v: { type: 'string', maxLength: 255 },
                telegramName: { type: 'string', maxLength: 200 },
                telegramUrl: { type: 'string', maxLength: 255 },
                phoneNumberGuDps: { type: 'string', maxLength: 50 },
                phoneNumberKindergarten: { type: 'string', maxLength: 50 },
                currentRegion: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        genitive: { type: 'string' },
                        dative: { type: 'string' },
                        accusative: { type: 'string' },
                        instrumental: { type: 'string' },
                        locative: { type: 'string' }
                    }
                },
                guDpsRegion: { type: 'string', maxLength: 200 },
                guDpsAddress: { type: 'string', maxLength: 500 },
                debtChargeAccount: { type: 'string', maxLength: 50 },
                communityName: { type: 'string', minLength: 1, maxLength: 100 },
                altQrCode: { type: 'string', maxLength: 200 }
            }
        }
    }
};

module.exports = {
    updateSettingsSchema,
    createSettingsSchema
};
