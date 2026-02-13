const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const communitySettingsController = require('../controller/communitySettings-controller');
const { updateSettingsSchema, createSettingsSchema } = require('../schema/communitySettings-schema');

const routes = async (fastify) => {
    // Public endpoint - no auth required (for frontend initial load)
    fastify.get("/public", communitySettingsController.getPublicSettings);

    // Protected endpoints - require admin access
    fastify.get("/",
        { preParsing: RouterGuard({ permissionLevel: "settings/community", permissions: accessLevel.VIEW }) },
        communitySettingsController.getSettings
    );

    fastify.put("/",
        {
            schema: updateSettingsSchema,
            preParsing: RouterGuard({ permissionLevel: "settings/community", permissions: accessLevel.EDIT })
        },
        communitySettingsController.updateSettings
    );

    fastify.post("/",
        {
            schema: createSettingsSchema,
            preParsing: RouterGuard({ permissionLevel: "settings/community", permissions: accessLevel.INSERT })
        },
        communitySettingsController.createSettings
    );

    fastify.post("/invalidate-cache",
        { preParsing: RouterGuard({ permissionLevel: "settings/community", permissions: accessLevel.EDIT }) },
        communitySettingsController.invalidateCache
    );
};

module.exports = routes;
