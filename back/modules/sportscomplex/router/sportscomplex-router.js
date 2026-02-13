const sportsComplexController = require("../controller/sportscomplex-controller");
const {
    filterRequisitesSchema,
    filterPoolServicesSchema,
    filterBillsSchema,
    filterClientsSchema, 
    createServiceGroupSchema,
    getServiceGroupSchema,
    updateRequisiteSchema,
    updateServiceSchema,
    updateClientSchema, 
    updateBillSchema,
    createClientSchema, 
    createBillSchema,
    searchClientsSchema,
    renewSubscriptionSchema,
    searchClientByMembershipSchema,
    getBillsReportSchema,
    exportBillsToWordSchema,
    startLessonSchema
} = require("../schema/sportscomplex-schema");

async function sportsComplexRoutes(fastify, options) {
    // Реквізити
    fastify.post("/filter-requisites", {
        schema: filterRequisitesSchema,
        handler: sportsComplexController.findRequisitesByFilter
    });

    fastify.post("/requisites", {
        handler: sportsComplexController.createRequisite
    });

    fastify.put("/requisites/:id", {
        schema: updateRequisiteSchema,
        handler: sportsComplexController.updateRequisite
    });

    fastify.get("/info/:id", sportsComplexController.getById);
    fastify.get("/generate/:id", sportsComplexController.generateWordById);
    fastify.get("/print/:id", sportsComplexController.printById);

    // Послуги
    fastify.post("/filter-pool", {
        schema: filterPoolServicesSchema,
        handler: sportsComplexController.findPoolServicesByFilter
    });

    fastify.post("/services", {
        handler: sportsComplexController.createPoolService
    });

    fastify.get("/service/:id", {
        handler: sportsComplexController.getServiceById
    });

    fastify.put("/service/:id", {
        schema: updateServiceSchema,
        handler: sportsComplexController.updateService
    });

    // Групи послуг
    fastify.post("/service-groups", {
        schema: createServiceGroupSchema,
        handler: sportsComplexController.createServiceGroup
    });
    
    fastify.get("/service-groups", {
        handler: sportsComplexController.getServiceGroups
    });
    
    fastify.get("/services-by-group/:id", {
        schema: getServiceGroupSchema,
        handler: sportsComplexController.getServicesByGroup
    });

    //Пошук клієнта по номеру абонемента
    fastify.post("/clients/search-by-membership", {
        schema: searchClientByMembershipSchema,
        handler: sportsComplexController.searchClientByMembership
    });

    fastify.post("/clients/search", {
        schema: searchClientsSchema,
        handler: sportsComplexController.searchClients
    });

    fastify.post("/clients", {
        schema: createClientSchema,
        handler: sportsComplexController.createClient
    });

    // 2. GET routes - СПЕЦИФІЧНІ ПЕРЕД ПАРАМЕТРИЧНИМИ!
    fastify.post("/clients/filter", {
        schema: filterClientsSchema,
        handler: sportsComplexController.findClientsByFilter
    });

    // 3. PUT routes з специфічними шляхами ПЕРЕД загальним PUT
    fastify.put("/clients/:id/renew-subscription", {
        schema: renewSubscriptionSchema,
        handler: sportsComplexController.renewSubscription
    });

    fastify.put("/clients/:id/start-lesson", {
        schema: startLessonSchema,
        handler: sportsComplexController.startLesson
    });

    fastify.put("/clients/:id", {
        schema: updateClientSchema,
        handler: sportsComplexController.updateClient
    });

    // 4. DELETE та параметричний GET в кінці
    fastify.delete("/clients/:id", sportsComplexController.deleteClient);
    fastify.get("/clients/:id", sportsComplexController.getClientById);

    // Рахунки
    fastify.post("/bills/filter", {
        schema: filterBillsSchema,
        handler: sportsComplexController.findBillsByFilter
    });

    fastify.post("/bills", {
        schema: createBillSchema,
        handler: sportsComplexController.createBill
    });

    fastify.post("/bills/report", {
        schema: getBillsReportSchema,
        handler: sportsComplexController.getBillsReport
    });

    fastify.post("/bills/export-word", {
        schema: exportBillsToWordSchema,
        handler: sportsComplexController.exportBillsToWord
    });

    fastify.get("/bills/:id", sportsComplexController.getBillById);

    fastify.put("/bills/:id", {
        schema: updateBillSchema,
        handler: sportsComplexController.updateBill
    });
    
    fastify.get("/bills/:id/download", sportsComplexController.downloadBill);
}

module.exports = sportsComplexRoutes;