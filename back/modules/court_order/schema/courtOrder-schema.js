const courtOrderCreateSchema = {
    body: {
        communityName: {
            type: 'string',
            min: 1,
        },
        communityAddress: {
            type: 'string',
            optional: true,
        },
        communityPhone: {
            type: 'string',
            optional: true,
        },
        communityEmail: {
            type: 'string',
            optional: true,
        },
        communityEdrpou: {
            type: 'string',
            optional: true,
        },
        councilAddress: {
            type: 'string',
            optional: true,
        },
        courtName: {
            type: 'string',
            min: 1,
        },
        courtAddress: {
            type: 'string',
            optional: true,
        },
        debtorName: {
            type: 'string',
            min: 1,
        },
        debtorAddress: {
            type: 'string',
            optional: true,
        },
        debtorEdrpou: {
            type: 'string',
            optional: true,
        },
        debtorContacts: {
            type: 'string',
            optional: true,
        },
        debtAmount: {
            type: 'number',
            positive: true,
        },
        courtFee: {
            type: 'number',
            positive: true,
        },
    }
}

const courtOrderInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

const courtOrderFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        title: {
            type: 'string',
            optional: true,
            min: 1,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
            enum: ['asc', 'desc'],
        },
    }
}

module.exports = {
    courtOrderCreateSchema,
    courtOrderInfoSchema,
    courtOrderFilterSchema,
};
