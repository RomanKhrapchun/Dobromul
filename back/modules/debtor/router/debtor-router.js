const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit,insertLimit } = require('../../../utils/ratelimit');
const debtorController = require('../controller/debtor-controller');
const { debtorFilterSchema, debtorInfoSchema } = require('../schema/debtor-schema');

const routes = async (fastify) => {
    fastify.post("/filter", { schema: debtorFilterSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, debtorController.findDebtByFilter);
    fastify.get("/info/:id", { schema: debtorInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), config: viewLimit }, debtorController.getDebtByDebtorId);
    fastify.get("/generate/:id", { schema: debtorInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, debtorController.generateWordByDebtId);
    fastify.get("/print/:id", { schema: debtorInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, debtorController.printDebtId);
    fastify.post("/list", { 
        schema: debtorFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, debtorController.findDebtByFilter);
    fastify.get("/calls/:id", { 
        //schema: debtorCallsListSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, debtorController.getDebtorCallsByIdentifier);
    fastify.post("/calls/:id", { 
        //schema: debtorCallsListSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT }), 
        config: insertLimit 
    }, debtorController.createDebtorCallByIdentifier);
    fastify.put("/calls/:id", { 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT }) 
    }, debtorController.updateCall);
    fastify.get("/receipts/:id", { 
        //schema: debtorCallsListSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, debtorController.getDebtorReceiptInfoByIdentifier);
    fastify.post("/receipts/:id", { 
        //schema: debtorCallsListSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT }), 
        config: insertLimit 
    }, debtorController.createDebtorReceiptInfoByIdentifier);
    fastify.post("/enrich-phone/:id", { preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT }) }, debtorController.addPhoneToDebtor);
    fastify.delete("/phone/:id", { preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE }) }, debtorController.deletePhoneFromDebtor);
    fastify.get("/stats", { preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, debtorController.getDebtorStats);
    fastify.get("/with-phones", {
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, debtorController.getDebtorsWithPhones);

    // Роути для адреси боржника
    fastify.put("/address/:debtorId", {
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, debtorController.updateDebtorAddress);
    fastify.delete("/address/:debtorId", {
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, debtorController.deleteDebtorAddress);

}

module.exports = routes;