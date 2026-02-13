// routes/tasks-routes.js
const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const tasksController = require('../controller/tasks-controller');

const routes = async (fastify) => {
    /**
     * POST /api/taskss/process-register
     * Обробити реєстр боржників та отримати контрольні суми
     */
    fastify.post(
        "/process-register",
        {
            //schema: processRegisterSchema,
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.VIEW
            })
        },
        tasksController.processDebtorRegister
    );

    /**
     * POST /api/taskss/send-email
     * Відправити email з результатами
     */
    fastify.post(
        "/send-email",
        {
            //schema: sendEmailSchema,
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.INSERT
            })
        },
        tasksController.sendEmail
    );

    /**
     * POST /api/taskss/update-database-check
     * Отримати контрольні суми для оновлення бази даних
     */
    fastify.post(
        "/update-database-check",
        {
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.VIEW
            })
        },
        tasksController.updateDatabaseCheck
    );

    /**
     * GET /api/tasks/database/preview
     * Отримати попередній перегляд даних з віддаленої БД
     */
    fastify.get(
        "/database/preview",
        {
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.VIEW
            })
        },
        tasksController.previewDatabaseUpdate
    );

    /**
     * GET /api/tasks/database/available-dates
     * Отримати список доступних дат реєстрів
     */
    fastify.get(
        "/database/available-dates",
        {
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.VIEW
            })
        },
        tasksController.getAvailableDates
    );

    /**
     * POST /api/taskss/update-database-execute
     * Виконати оновлення локальної бази даних
     */
    fastify.post(
        "/update-database-execute",
        {
            preParsing: RouterGuard({
                permissionLevel: "debtor",
                permissions: accessLevel.INSERT
            })
        },
        tasksController.updateDatabaseExecute
    );
};

module.exports = routes;