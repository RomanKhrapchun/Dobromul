const courtOrderRepository = require("../repository/courtOrder-repository");
const { paginate, paginationData } = require("../../../utils/function");
const logRepository = require("../../log/repository/log-repository");
const Logger = require("../../../utils/logger");
const { patchDocument, PatchType, TextRun } = require('docx');
const fs = require('fs').promises;
const { numberToWordsUkr } = require('../../../utils/ukrainianNumberFormatter');
const { FONT, SIZE } = require('../constants/documentStyles');

class CourtOrderService {

    validateId(id) {
        if (!id) {
            throw new Error('ID не вказано');
        }
        return id;
    }

    validateResult(result, errorMessage = 'Заяву не знайдено') {
        if (!result.length) {
            throw new Error(errorMessage);
        }
        return result;
    }

    async createLog(request, rowId, action, applicationName) {
        return await logRepository.createLog({
            row_pk_id: rowId,
            uid: request?.user?.id,
            action: action,
            client_addr: request?.ip,
            application_name: applicationName,
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'court_orders',
            oid: null,
        });
    }

    async create(request) {
        const data = request.body;
        const result = await courtOrderRepository.create(data);
        await this.createLog(request, result[0]?.id, 'INSERT', 'Створення заяви про видачу судового наказу');
        return result[0];
    }

    async getById(request) {
        const id = this.validateId(request?.params?.id);
        const result = await courtOrderRepository.getById(id);
        this.validateResult(result);
        return result[0];
    }

    async findByFilter(request) {
        const {
            page = 1,
            limit = 16,
            title,
            sort_by = null,
            sort_direction = 'desc',
        } = request.body;

        const numericPage = parseInt(page) || 1;
        const numericLimit = parseInt(limit) || 16;
        const { offset } = paginate(numericPage, numericLimit);

        const validSortBy = sort_by || 'created_at';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase())
            ? sort_direction.toLowerCase()
            : 'desc';

        const data = await courtOrderRepository.findByFilter(
            numericLimit,
            offset,
            title,
            validSortBy,
            validSortDirection
        );

        const paginatedData = paginationData(data[0], numericPage, numericLimit);

        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    async generateDocument(request, reply) {
        const id = this.validateId(request?.params?.id);
        const result = await courtOrderRepository.getById(id);
        this.validateResult(result);
        const courtOrder = result[0];

        // Генерація DOCX документу
        const docBuffer = await this.buildCourtOrderDocx(courtOrder);

        if (!docBuffer) {
            throw new Error('Не вдалося згенерувати документ');
        }

        await this.createLog(request, courtOrder.id, 'GENERATE_DOC', 'Генерування заяви про видачу судового наказу');

        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        reply.header('Content-Disposition', `attachment; filename=court-order-${courtOrder.id}.docx`);

        return reply.send(docBuffer);
    }

    async buildCourtOrderDocx(courtOrder) {
        const formatAmount = (val) => {
            const num = parseFloat(val) || 0;
            return num.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const today = new Date();
        const formattedDate = new Intl.DateTimeFormat('uk-UA', {
            day: '2-digit', month: 'long', year: 'numeric'
        }).format(today);

        const debtFormatted = formatAmount(courtOrder.debt_amount);
        const feeFormatted = formatAmount(courtOrder.court_fee);

        const textPatch = (text) => ({
            type: PatchType.PARAGRAPH,
            children: [new TextRun({ text: text || '', font: FONT, size: SIZE })],
        });

        const docBuffer = await fs.readFile("./files/courtOrder.docx");

        const patches = {
            court_name:        textPatch(courtOrder.court_name),
            court_address:     textPatch(courtOrder.court_address),
            community_name:    textPatch(courtOrder.community_name),
            community_address: textPatch(courtOrder.community_address),
            community_edrpou:  textPatch(courtOrder.community_edrpou),
            community_phone:   textPatch(courtOrder.community_phone),
            community_email:   textPatch(courtOrder.community_email),
            debtor_name:       textPatch(courtOrder.debtor_name),
            debtor_address:    textPatch(courtOrder.debtor_address),
            debtor_edrpou:     textPatch(courtOrder.debtor_edrpou),
            debtor_contacts:   textPatch(courtOrder.debtor_contacts),

            body_paragraph_1: {
                type: PatchType.PARAGRAPH,
                children: [new TextRun({
                    text: `          ${courtOrder.community_name || ''} (далі - Стягувач), адреса: ${courtOrder.council_address || courtOrder.community_address || ''}, ЄДРПОУ: ${courtOrder.community_edrpou || ''}, звертається до суду із заявою про видачу судового наказу про стягнення з ${courtOrder.debtor_name || ''} (далі - Боржник), адреса: ${courtOrder.debtor_address || ''}, ЄДРПОУ/ІПН: ${courtOrder.debtor_edrpou || ''}, заборгованості у розмірі ${debtFormatted} грн.`,
                    font: FONT, size: SIZE
                })],
            },

            body_paragraph_2: {
                type: PatchType.PARAGRAPH,
                children: [new TextRun({
                    text: `          Відповідно до наявних документів, Боржник має непогашену заборгованість перед Стягувачем у сумі ${debtFormatted} грн (${numberToWordsUkr(courtOrder.debt_amount)}).`,
                    font: FONT, size: SIZE
                })],
            },

            request_paragraph: {
                type: PatchType.PARAGRAPH,
                children: [new TextRun({
                    text: `          Видати судовий наказ про стягнення з ${courtOrder.debtor_name || ''} (ЄДРПОУ/ІПН: ${courtOrder.debtor_edrpou || ''}, адреса: ${courtOrder.debtor_address || ''}) на користь ${courtOrder.community_name || ''} (ЄДРПОУ: ${courtOrder.community_edrpou || ''}) заборгованості у розмірі ${debtFormatted} грн.`,
                    font: FONT, size: SIZE
                })],
            },

            court_fee_paragraph: {
                type: PatchType.PARAGRAPH,
                children: [new TextRun({
                    text: `          Судовий збір у розмірі ${feeFormatted} грн сплачено.`,
                    font: FONT, size: SIZE
                })],
            },

            current_date: {
                type: PatchType.PARAGRAPH,
                children: [new TextRun({
                    text: `"___" ${formattedDate}`,
                    font: FONT, size: SIZE
                })],
            },
        };

        return await patchDocument(docBuffer, { patches });
    }

    async deleteById(request) {
        const id = this.validateId(request?.params?.id);
        const result = await courtOrderRepository.deleteById(id);
        this.validateResult(result);
        await this.createLog(request, id, 'DELETE', 'Видалення заяви про видачу судового наказу');
        return { message: 'Заяву видалено' };
    }
}

module.exports = new CourtOrderService();
