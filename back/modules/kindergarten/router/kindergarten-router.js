const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const kindergartenController = require('../controller/kindergarten-controller');
const {
    kindergartenFilterSchema,
    kindergartenInfoSchema,
    kindergartenGroupFilterSchema,
    kindergartenGroupCreateSchema,
    kindergartenGroupUpdateSchema,
    kindergartenGroupDeleteSchema,
    childrenFilterSchema,
    childrenCreateSchema,
    childrenUpdateSchema,
    childrenDeleteSchema,
    childrenInfoSchema,
    attendanceFilterSchema,
    attendanceCreateSchema,
    attendanceUpdateSchema,
    attendanceDeleteSchema,
    attendanceInfoSchema,
    kindergartensListSchema,  // ✅ ДОДАНО
    dailyFoodCostFilterSchema,
    dailyFoodCostCreateSchema,
    dailyFoodCostUpdateSchema,
    dailyFoodCostDeleteSchema,
    dailyCostBreakdownSchema,  // ✅ ЗАВДАННЯ 2
    childDailyCostBreakdownSchema,  // ✅ ЗАВДАННЯ 2
    childProposalFilterSchema,  // ✅ ЗАВДАННЯ 3
    childProposalCreateSchema,  // ✅ ЗАВДАННЯ 3
    childProposalUpdateSchema,  // ✅ ЗАВДАННЯ 3
    childProposalDeleteSchema,  // ✅ ЗАВДАННЯ 3
    childProposalInfoSchema,  // ✅ ЗАВДАННЯ 3
    childProposalApproveSchema,  // ✅ ЗАВДАННЯ 3
    childProposalRejectSchema,  // ✅ ЗАВДАННЯ 3
    childBenefitFilterSchema,  // ✅ ЗАВДАННЯ 4
    childBenefitCreateSchema,  // ✅ ЗАВДАННЯ 4
    childBenefitUpdateSchema,  // ✅ ЗАВДАННЯ 4
    childBenefitDeleteSchema,  // ✅ ЗАВДАННЯ 4
    childBenefitInfoSchema,  // ✅ ЗАВДАННЯ 4
    billingFilterSchema,
    billingInfoSchema,
    billingCreateSchema,
    billingUpdateSchema,
    billingDeleteSchema,
    mobileAttendanceGetSchema,
    mobileAttendanceSaveSchema,
    adminsInfoSchema,
    adminsFilterSchema,
    adminsCreateSchema,
    adminsUpdateSchema,
    adminsDeleteSchema,
    verifyEducatorSchema,
    validateMobileAttendanceFormat,
    paymentStatementFilterSchema,
    paymentStatementCreateSchema,
    paymentStatementCreateAutoSchema,
    paymentStatementUpdateSchema,
    paymentStatementDeleteSchema,
    paymentStatementInfoSchema,
    paymentStatementMonthlyFilterSchema,
    pastAttendanceFilterSchema,
    pastAttendanceInfoSchema,
    groupsByKindergartenSchema,
    attendanceDatesSchema,
} = require('../schema/kindergarten-schema');


const routes = async (fastify) => {
    // Роути для основної функціональності садочків
    fastify.post("/filter", { 
        schema: kindergartenFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }) 
    }, kindergartenController.findDebtByFilter);
    
    fastify.get("/info/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, kindergartenController.getDebtByDebtorId);
    
    fastify.get("/generate/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }) 
    }, kindergartenController.generateWordByDebtId);
    
    fastify.get("/print/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }) 
    }, kindergartenController.printDebtId);

    // Роути для груп садочків
    fastify.post("/groups/filter", { 
        schema: kindergartenGroupFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findGroupsByFilter);

    fastify.post("/groups", { 
        schema: kindergartenGroupCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createGroup);

    fastify.put("/groups/:id", { 
        schema: kindergartenGroupUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateGroup);

    fastify.delete("/groups/:id", { 
        schema: kindergartenGroupDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteGroup);

    // Роути для дітей садочку
    fastify.post("/childrenRoster/filter", { 
        schema: childrenFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findChildrenByFilter);

    fastify.get("/childrenRoster/:id", { 
        schema: childrenInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getChildById);

    fastify.post("/childrenRoster", { 
        schema: childrenCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createChild);

    fastify.put("/childrenRoster/:id", { 
        schema: childrenUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateChild);

    fastify.delete("/childrenRoster/:id", { 
        schema: childrenDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteChild);

    // ===============================
    // РОУТИ ДЛЯ ВІДВІДУВАНОСТІ САДОЧКУ
    // ===============================
    
    fastify.post("/attendance/filter", { 
        schema: attendanceFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findAttendanceByFilter);

    fastify.get("/attendance/:id", { 
        schema: attendanceInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getAttendanceById);

    fastify.post("/attendance", { 
        schema: attendanceCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createAttendance);

    fastify.put("/attendance/:id", { 
        schema: attendanceUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateAttendance);

    fastify.delete("/attendance/:id", {
        schema: attendanceDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteAttendance);

    // ===============================
    // РОУТ ДЛЯ ДОВІДНИКА САДОЧКІВ
    // ===============================

    // ✅ ДОДАНО: Отримати список всіх садочків
    fastify.get("/kindergartens", {
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.getAllKindergartens);

    // ===============================
    // РОУТИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
    // ===============================

    fastify.post("/daily_food_cost/filter", { 
        schema: dailyFoodCostFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findDailyFoodCostByFilter);

    fastify.post("/daily_food_cost", { 
        schema: dailyFoodCostCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createDailyFoodCost);

    fastify.put("/daily_food_cost/:id", { 
        schema: dailyFoodCostUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateDailyFoodCost);

    fastify.delete("/daily_food_cost/:id", {
        schema: dailyFoodCostDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteDailyFoodCost);

    // ===============================
    // ✅ ЗАВДАННЯ 2: РОУТИ ДЛЯ BREAKDOWN ВАРТОСТІ
    // ===============================

    // Отримати breakdown вартості по групах за дату
    fastify.post("/daily_food_cost/breakdown", {
        schema: dailyCostBreakdownSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.getDailyCostBreakdown);

    // Отримати breakdown вартості для конкретної дитини
    fastify.post("/daily_food_cost/breakdown/child", {
        schema: childDailyCostBreakdownSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.getChildDailyCostBreakdown);

    // ===============================
    // ✅ ЗАВДАННЯ 3: РОУТИ ДЛЯ CHILD PROPOSALS
    // ===============================

    // Фільтрація пропозицій
    fastify.post("/proposals/filter", {
        schema: childProposalFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findChildProposals);

    // Отримати пропозицію за ID
    fastify.get("/proposals/:id", {
        schema: childProposalInfoSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.getChildProposalById);

    // Створити пропозицію (вихователь)
    fastify.post("/proposals", {
        schema: childProposalCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createChildProposal);

    // Оновити пропозицію (редагування перед затвердженням)
    fastify.put("/proposals/:id", {
        schema: childProposalUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateChildProposal);

    // Видалити пропозицію
    fastify.delete("/proposals/:id", {
        schema: childProposalDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteChildProposal);

    // Затвердити пропозицію (адміністратор)
    fastify.post("/proposals/:id/approve", {
        schema: childProposalApproveSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.approveChildProposal);

    // Відхилити пропозицію (адміністратор)
    fastify.post("/proposals/:id/reject", {
        schema: childProposalRejectSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.rejectChildProposal);

    // ===============================
    // ✅ ЗАВДАННЯ 4: РОУТИ ДЛЯ ПІЛЬГ (CHILD BENEFITS)
    // ===============================

    // Створити пільгу
    fastify.post("/benefits", {
        schema: childBenefitCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createChildBenefit);

    // Отримати список пільг з фільтрами
    fastify.post("/benefits/filter", {
        schema: childBenefitFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findChildBenefits);

    // Отримати пільгу за ID
    fastify.get("/benefits/:id", {
        schema: childBenefitInfoSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit
    }, kindergartenController.getChildBenefitById);

    // Оновити пільгу
    fastify.put("/benefits/:id", {
        schema: childBenefitUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateChildBenefit);

    // Видалити пільгу
    fastify.delete("/benefits/:id", {
        schema: childBenefitDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteChildBenefit);

    // ===============================
    // РОУТИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
    // ===============================

    fastify.post("/billing/filter", { 
        schema: billingFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findBillingByFilter);

    fastify.get("/billing/:id", { 
        schema: billingInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getBillingById);

    fastify.post("/billing", { 
        schema: billingCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createBilling);

    fastify.put("/billing/:id", { 
        schema: billingUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateBilling);

    fastify.delete("/billing/:id", {
        schema: billingDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteBilling);

    fastify.get("/billing/generate/:id", {
        schema: billingInfoSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.generateKindergartenRequisite);

    // ===============================
    // РОУТИ ДЛЯ МОБІЛЬНОГО ДОДАТКУ
    // ===============================

    fastify.post("/attendance/mobile/dates", { 
        schema: attendanceDatesSchema,
        //preParsing: RouterGuard()
    }, kindergartenController.getAttendanceDates);

    fastify.get("/attendance/mobile/:date", { 
        schema: mobileAttendanceGetSchema,
        //preParsing: RouterGuard()
    }, kindergartenController.getMobileAttendance);

    fastify.post("/attendance/mobile", { 
        schema: mobileAttendanceSaveSchema,
        preHandler: [
            //RouterGuard(),
            validateMobileAttendanceFormat
        ]
    }, kindergartenController.saveMobileAttendance);

    //PUT метод для мобільного додатку
    fastify.put("/attendance/mobile", { 
        schema: mobileAttendanceSaveSchema,
        preHandler: [
            //RouterGuard(),
            validateMobileAttendanceFormat
        ]
    }, kindergartenController.saveMobileAttendance);

    // ===============================
    // РОУТИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКУ
    // ===============================
    
    fastify.post("/admins/filter", { 
        schema: adminsFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findAdminsByFilter);

    fastify.get("/admins/:id", { 
        schema: adminsInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getAdminById);

    fastify.post("/admins", { 
        schema: adminsCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createAdmin);

    fastify.put("/admins/:id", { 
        schema: adminsUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updateAdmin);

    fastify.delete("/admins/:id", { 
        schema: adminsDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deleteAdmin);

    // ===============================
    // РОУТ ДЛЯ ПЕРЕВІРКИ ВИХОВАТЕЛЯ
    // ===============================

    fastify.post("/admins/verify", { 
        schema: verifyEducatorSchema,
        //preParsing: RouterGuard()
    }, kindergartenController.verifyEducator);

    // ===============================
    // РОУТИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    fastify.post("/payment_statements/filter", { 
        schema: paymentStatementFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findPaymentStatementsByFilter);

    fastify.get("/payment_statements/:id", { 
        schema: paymentStatementInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getPaymentStatementById);

    fastify.post("/payment_statements", { 
        schema: paymentStatementCreateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createPaymentStatement);

    fastify.post("/payment_statements/auto", { 
        schema: paymentStatementCreateAutoSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.createPaymentStatementAuto);

    fastify.put("/payment_statements/:id", { 
        schema: paymentStatementUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.updatePaymentStatement);

    fastify.delete("/payment_statements/:id", { 
        schema: paymentStatementDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.DELETE })
    }, kindergartenController.deletePaymentStatement);

    // POST метод для парсингу PDF квитанції
    fastify.post("/billing/parse-pdf", { 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.INSERT })
    }, kindergartenController.parseBillingPDF);

    fastify.post("/payment_statements/monthly", { 
        schema: paymentStatementMonthlyFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findMonthlyPaymentStatements);

    // ===============================
    // РОУТИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ
    // ===============================

    fastify.post("/past_attendance/filter", { 
        schema: pastAttendanceFilterSchema,
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW })
    }, kindergartenController.findPastAttendanceByFilter);

    fastify.get("/past_attendance/:id", { 
        schema: pastAttendanceInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getPastAttendanceById);

    // Роут для ручного запуску архівування (для адмінів)
    fastify.post("/past_attendance/archive", { 
        preParsing: RouterGuard({ permissionLevel: "admin", permissions: accessLevel.EDIT })
    }, kindergartenController.archiveYesterdayAttendance);

    // ===============================
    // РОУТ ДЛЯ ОТРИМАННЯ ГРУП ПО САДОЧКУ
    // ===============================
    fastify.post("/groups/by-kindergarten", { 
        schema: groupsByKindergartenSchema,
        preParsing: RouterGuard()
    }, kindergartenController.getGroupsByKindergarten);

    fastify.post("/billing/sync-all", { 
        preParsing: RouterGuard({ permissionLevel: ["debtor", "kindergarten/"], permissions: accessLevel.EDIT })
    }, kindergartenController.syncAllBilling);
}

module.exports = routes;