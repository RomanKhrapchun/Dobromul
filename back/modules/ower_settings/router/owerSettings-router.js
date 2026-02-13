const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const owerSettingsController = require('../controller/owerSettings-controller');
const { updateSettingsSchema } = require('../schema/owerSettings-schema');

const routes = async (fastify) => {
    // Public endpoint - no auth required (for frontend initial load)
    fastify.get("/public", owerSettingsController.getPublicSettings);

    // Protected endpoints - require admin access
    fastify.get("/",
        { preParsing: RouterGuard({ permissionLevel: "settings/requisites", permissions: accessLevel.VIEW }) },
        owerSettingsController.getSettings
    );

    fastify.put("/",
        {
            schema: updateSettingsSchema,
            preParsing: RouterGuard({ permissionLevel: "settings/requisites", permissions: accessLevel.EDIT })
        },
        owerSettingsController.updateSettings
    );

    fastify.post("/invalidate-cache",
        { preParsing: RouterGuard({ permissionLevel: "settings/requisites", permissions: accessLevel.EDIT }) },
        owerSettingsController.invalidateCache
    );
};

module.exports = routes;
