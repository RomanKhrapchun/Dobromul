const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const smsController = require('../controller/sms-controller');
const {
    templateCreateSchema,
    templateUpdateSchema,
    sendSmsSchema,
    sendSmsBatchSchema,
    historyFilterSchema,
    previewSmsSchema
} = require('../schema/sms-schema');

const routes = async (fastify) => {
    // === ШАБЛОНИ ===

    // Отримати всі шаблони
    fastify.get("/templates",
        { preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.VIEW }) },
        smsController.getTemplates
    );

    // Отримати шаблон за ID
    fastify.get("/templates/:id",
        { preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.VIEW }) },
        smsController.getTemplateById
    );

    // Створити шаблон
    fastify.post("/templates",
        {
            schema: templateCreateSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.INSERT })
        },
        smsController.createTemplate
    );

    // Оновити шаблон
    fastify.put("/templates/:id",
        {
            schema: templateUpdateSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.EDIT })
        },
        smsController.updateTemplate
    );

    // Видалити шаблон
    fastify.delete("/templates/:id",
        { preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.DELETE }) },
        smsController.deleteTemplate
    );

    // === ПОПЕРЕДНІЙ ПЕРЕГЛЯД ===

    fastify.post("/preview",
        {
            schema: previewSmsSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.VIEW })
        },
        smsController.previewSms
    );

    // === ВІДПРАВКА SMS ===

    // Одиночна відправка
    fastify.post("/send",
        {
            schema: sendSmsSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.INSERT })
        },
        smsController.sendSms
    );

    // Масова відправка
    fastify.post("/send-batch",
        {
            schema: sendSmsBatchSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.INSERT })
        },
        smsController.sendSmsBatch
    );

    // === ІСТОРІЯ ТА СТАТИСТИКА ===

    // Історія SMS
    fastify.post("/history",
        {
            schema: historyFilterSchema,
            preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.VIEW })
        },
        smsController.getHistory
    );

    // Статистика SMS
    fastify.get("/stats",
        { preParsing: RouterGuard({ permissionLevel: "sms", permissions: accessLevel.VIEW }) },
        smsController.getStats
    );
};

module.exports = routes;
