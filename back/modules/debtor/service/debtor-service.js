
const debtorRepository = require("../repository/debtor-repository");
const { fieldsListMissingError, NotFoundErrorMessage } = require("../../../utils/messages")
const { paginate, paginationData, addRequisiteToLandDebt, formatIPN } = require("../../../utils/function");
const { displayDebtorFields, displayDebtorFieldsDobromyl, displayFieldsPhone, allowedDebtorTableFilterFields, allowedSortFields } = require("../../../utils/constants");
const { createRequisiteWord } = require("../../../utils/generateDocx");
const logRepository = require("../../log/repository/log-repository");
const adminSearchRepository = require("../../admin_search_details/repository/admin-search-repository");
const Logger = require("../../../utils/logger")
const axios = require('axios')
const rabbitmqClient = require('../../../helpers/rabbitmq');
const communityValidator = require('../../../utils/communityValidator');
const communitySettingsRepository = require('../../community_settings/repository/communitySettings-repository');

const EDR_CONFIG = {
    BASE_URL: process.env.REMOTE_SERVER_ADDRESS, // Ваша IP адреса Windows
    TIMEOUT: 5000,
    ENABLED: true
};
class DebtorService {
    /**
     * Отримує community_name з БД (пріоритет) або з .env (fallback)
     * @returns {Promise<string>}
     */
    async getCommunityName() {
        try {
            // Спочатку пробуємо взяти з БД
            const settings = await communitySettingsRepository.getSettings();
            if (settings && settings.community_name) {
                Logger.info('community_name отримано з БД', { communityName: settings.community_name });
                return settings.community_name;
            }
        } catch (error) {
            Logger.warn('Не вдалося отримати community_name з БД, використовуємо .env', {
                error: error.message
            });
        }

        // Fallback до .env
        const envCommunityName = process.env.COMMUNITY_NAME;
        Logger.info('community_name отримано з .env', { communityName: envCommunityName });
        return envCommunityName;
    }

    async getDebtByDebtorId(request) {
        // Валідація
        if (!Object.keys([displayDebtorFields]).length) {
            throw new Error(fieldsListMissingError)
        }

        const debtorId = request?.params?.id;
        if (!debtorId) {
            throw new Error('ID боржника не вказано')
        }

        // Визначаємо набір полів залежно від громади
        const communityName = await this.getCommunityName();
        const isDobromyl = communityName?.toLowerCase() === 'dobromyl';
        const fieldsToFetch = isDobromyl ? displayDebtorFieldsDobromyl : displayDebtorFields;

        Logger.info('getDebtByDebtorId - визначення полів', {
            communityName,
            isDobromyl,
            fieldsToFetch
        });

        // Отримання основних даних
        const fetchData = await debtorRepository.getDebtByDebtorId(debtorId, fieldsToFetch)

        if (!fetchData?.length) {
            throw new Error('Дані боржника не знайдено')
        }

        const debtor = fetchData[0];

        await this.enrichPhone(debtor);

        return [debtor];
    }

    async enrichPhoneFromLocalDB(phonenumber, debtorId) {
        const result = {
            success: false,
            data: null,
            error: null,
            metadata: {
                debtorId,
                phonenumber,
                timestamp: new Date().toISOString()
            }
        };

        try {
            const debtor = await debtorRepository.getDebtByDebtorId(debtorId, displayDebtorFields);
            console.log('debtor', debtor)
            if (!debtor[0].name || !debtor[0].identification) {
                Logger.warn('enrichPhone: відсутні обовʼязкові поля', {
                    debtorId,
                    hasName: !!debtor[0].name,
                    hasIdentification: !!debtor[0].identification
                });

                result.error = {
                    code: 'MISSING_REQUIRED_FIELDS',
                    message: 'Відсутні обовʼязкові поля для боржника',
                    details: {
                        missingFields: [
                            !debtor[0].name && 'name',
                            !debtor[0].identification && 'identification'
                        ].filter(Boolean)
                    }
                };
                return result;
            }

            // Виконуємо вставку в базу даних
            const insertResult = await debtorRepository.insertPhoneByDebtor(phonenumber, debtor[0]);

            result.success = true;
            result.data = {
                phoneNumber: phonenumber?.trim() || null,
                debtorName: debtor[0].name,
                debtorIdentification: debtor[0].identification,
                isChecked: true,
                databaseResult: insertResult, // Повний результат з БД
                // Якщо sqlRequest повертає щось специфічне (наприклад, insertId, rowCount тощо)
                insertId: insertResult?.insertId || insertResult?.id,
                rowsAffected: insertResult?.rowsAffected || insertResult?.affectedRows || 1
            };

            Logger.info('enrichPhone: успішно додано/оновлено телефон', {
                debtorId,
                debtorName: debtor[0].name,
                hasPhone: !!phonenumber?.trim()
            });

            return result;

        } catch (error) {
            Logger.error('enrichPhone: помилка при додаванні номера', {
                debtorId,
                phonenumber,
                error: error.message,
                stack: error.stack
            });

            result.error = {
                code: 'DATABASE_ERROR',
                message: error.message,
                details: {
                    originalError: error.code || error.name,
                    sqlState: error.sqlState // Якщо є специфічні помилки БД
                }
            };
            return result;
        }
    }

    async deletePhoneFromLocalDB(phonenumber, debtorId) {
        const result = {
            success: false,
            data: null,
            error: null,
            metadata: {
                debtorId,
                phonenumber,
                timestamp: new Date().toISOString()
            }
        };

        try {
            // Перевіряємо чи існує боржник
            const debtor = await debtorRepository.getDebtByDebtorId(debtorId, displayDebtorFields);

            if (!debtor || debtor.length === 0) {
                Logger.warn('deletePhone: боржник не знайдений', { debtorId });

                result.error = {
                    code: 'DEBTOR_NOT_FOUND',
                    message: 'Боржника не знайдено',
                    details: { debtorId }
                };
                return result;
            }

            // Виконуємо видалення з бази даних
            const deleteResult = await debtorRepository.deletePhoneByDebtor(phonenumber, debtorId);

            result.success = true;
            result.data = {
                phoneNumber: phonenumber?.trim() || null,
                debtorName: debtor[0].name,
                debtorIdentification: debtor[0].identification,
                databaseResult: deleteResult,
                rowsAffected: deleteResult?.rowsAffected || deleteResult?.affectedRows || 1
            };

            Logger.info('deletePhone: успішно видалено телефон', {
                debtorId,
                debtorName: debtor[0].name,
                phoneNumber: phonenumber
            });

            return result;

        } catch (error) {
            Logger.error('deletePhone: помилка при видаленні номера', {
                debtorId,
                phonenumber,
                error: error.message,
                stack: error.stack
            });

            result.error = {
                code: 'DATABASE_ERROR',
                message: error.message,
                details: {
                    originalError: error.code || error.name,
                    sqlState: error.sqlState
                }
            };
            return result;
        }
    }

    async enrichPhone(debtor) {
        // ❌ Guard clause 1: Відсутні базові дані
    if (!debtor.name || !debtor.identification) {
        Logger.warn('enrichPhone: відсутні обовʼязкові поля', { debtor: debtor.name });
        return;
    }

    // ❌ Guard clause 2: Не налаштовано віддалену БД
    if (!this.isRemoteDbConfigured()) {
        Logger.warn('enrichPhone: віддалена БД не налаштована');
        return;
    }

    try {
        // ========== КРОК 1: ПЕРЕВІРКА ЛОКАЛЬНОЇ БД ower.phone ==========
        Logger.info(`enrichPhone: перевіряємо локальну БД для ${debtor.name}`);
        
        const localPhones = await this.getLocalPhones(null, debtor); // clientId = null, шукаємо тільки по debtor
        
        // ✅ Знайдено телефони в локальній БД
        if (localPhones.found && localPhones.phones.length > 0) {
            debtor.phone = localPhones.phones;
            debtor.phoneCount = localPhones.phones.length;
            Logger.info(`enrichPhone: використано телефон з локальної БД ${localPhones.phones} для ${debtor.name}`);
            return;
        }

        // ✅ Вже перевірено, але телефонів немає
        if (localPhones.found && localPhones.ischecked) {
            debtor.phone = null;
            debtor.phoneCount = 0;
            Logger.info(`enrichPhone: клієнт ${debtor.name} вже перевірений в локальній БД, телефонів немає`);
            return;
        }

        // ========== КРОК 2: ОТРИМАННЯ CLIENT_ID З ВІДДАЛЕНОГО СЕРВЕРА ==========
        Logger.info(`enrichPhone: локальних даних немає, отримуємо clientId для ${debtor.name}`);
        
        const clientRecord = await this.getClientRecord(debtor);
        
        // ❌ Guard clause 3: Не знайдено clientId
        if (!clientRecord || !clientRecord.id) {
            Logger.info(`enrichPhone: clientId не знайдено для ${debtor.name}`);
            // Позначаємо як перевірений навіть якщо не знайшли
            await this.saveEdrPhonesToDb(null, null, debtor);
            return;
        }

        const clientId = clientRecord.id;
        const fullCode = clientRecord.identification?.toString().trim();

        // ❌ Guard clause 4: Код не підходить для ЄДР
        if (!fullCode || fullCode.length < 8 || fullCode.length > 10 || !/^\d+$/.test(fullCode)) {
            Logger.info(`enrichPhone: невалідний код для ЄДР: "${fullCode}" (довжина: ${fullCode?.length})`);
            return;
        }

        // ========== КРОК 3: ПЕРЕВІРКА ТЕЛЕФОНІВ ПО CLIENT_ID В ЛОКАЛЬНІЙ БД ==========
        const phonesByClientId = await this.getLocalPhones(clientId, debtor);
        
        // ✅ Знайдено телефони по clientId в локальній БД
        if (phonesByClientId.found && phonesByClientId.phones.length > 0) {
            debtor.phone = phonesByClientId.phones;
            debtor.phoneCount = phonesByClientId.phones.length;
            Logger.info(`enrichPhone: використано телефон з локальної БД по clientId ${phonesByClientId.phones} для ${debtor.name}`);
            return;
        }

        // ✅ Вже перевірено по clientId, але телефонів немає
        if (phonesByClientId.found && phonesByClientId.ischecked) {
            debtor.phone = null;
            debtor.phoneCount = 0;
            Logger.info(`enrichPhone: клієнт ${debtor.name} вже перевірений по clientId, телефонів немає`);
            return;
        }

        // ========== КРОК 4: ЗАПИТ ДО ЄДР ==========
        Logger.info(`enrichPhone: пошук в ЄДР для ${debtor.name}, код: ${fullCode}`);
        
        const edrData = await this.fetchFromEDR(fullCode);
        // ❌ Guard clause 5: Не знайдено в ЄДР
        if (!edrData) {
            Logger.info(`enrichPhone: субʼєкт не знайдено в ЄДР для коду ${fullCode}`);
            // Позначаємо як перевірений навіть якщо не знайшли
            await this.saveEdrPhonesToDb(clientId, null, debtor);
            return;
        }

        // ========== ✅ УСПІШНИЙ ШЛЯХ - ЗБЕРЕЖЕННЯ ТЕЛЕФОНІВ ==========
        Logger.info(`enrichPhone: знайдено субʼєкт в ЄДР: ${edrData.name || 'Без назви'}`);
        
        const result = await this.saveEdrPhonesToDb(clientId, edrData, debtor);
        
        // Встановлюємо результат в debtor
        if (result.phones.length > 0) {
            debtor.phone = result.phones;
            debtor.phoneCount = result.phones.length;
            Logger.info(`enrichPhone: встановлено телефон ${result.phones} (всього: ${result.phones.length}) для ${debtor.name}`);
        } else {
            debtor.phone = null;
            debtor.phoneCount = 0;
            Logger.info(`enrichPhone: телефонів не знайдено в ЄДР для ${debtor.name}`);
        }

    } catch (error) {
        Logger.error('enrichPhone: глобальна помилка', {
            message: error.message,
            debtorName: debtor?.name
        });
        
        debtor.phone = null;
        debtor.phoneCount = 0;
    }
}
    
    // ========== ДОПОМІЖНІ ФУНКЦІЇ ==========

/**
 * Отримує clientId з локальної БД
 * Спочатку шукає за повним кодом, потім за коротким через getFullIPN
 */
async getClientRecord(debtor) {
    const fullIPNCode = debtor.identification.toString().trim();

    // Спочатку пробуємо знайти за повним кодом (якщо код має 8+ символів)
    if (fullIPNCode.length >= 8) {
        try {
            const localData = await debtorRepository.getPhoneByIPN(fullIPNCode, displayFieldsPhone);
            if (localData && localData.length > 0) {
                Logger.info(`enrichPhone: знайдено clientId за повним кодом для ${debtor.name}`);
                return localData[0];
            }
        } catch (error) {
            Logger.warn('enrichPhone: помилка пошуку за повним кодом', {
                message: error.message,
                fullIPNCode
            });
        }
    }

    // Якщо не знайшли або код короткий, шукаємо через getFullIPN
    try {
        // Отримуємо community_name з БД або .env
        const communityName = await this.getCommunityName();

        // Валідуємо COMMUNITY_NAME
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            Logger.warn('enrichPhone: COMMUNITY_NAME не валідний', {
                debtorName: debtor?.name,
                error: validation.error
            });
            return null;
        }

        const result = await rabbitmqClient.sendTaskWithReply(
            'get_full_ipn',
            {
                community_name: communityName,
                name: debtor.name,
                identification: debtor.identification
            },
            30000
        );

        Logger.info('enrichPhone: отримано відповідь від worker', {
            resultType: typeof result,
            isArray: Array.isArray(result),
            resultKeys: result ? Object.keys(result) : null,
            resultPreview: result ? JSON.stringify(result).substring(0, 200) : 'null'
        });

        // Worker повертає {success: true, data: [...], executed_at: ...}
        // Перевіряємо структуру відповіді
        if (!result) {
            Logger.info(`enrichPhone: запис не знайдено через getFullIPN для ${debtor.name} (result is null)`);
            return null;
        }

        // Якщо result - це об'єкт з помилкою від worker
        if (result.success === false && result.error) {
            Logger.warn(`enrichPhone: помилка від worker при пошуку для ${debtor.name}`, {
                error: result.error,
                communityName: result.community_name || 'unknown'
            });
            return null;
        }

        // Якщо result - це об'єкт з полем data (формат від worker)
        if (result.success && result.data) {
            const records = result.data;
            if (!Array.isArray(records) || records.length === 0) {
                Logger.info(`enrichPhone: запис не знайдено через getFullIPN для ${debtor.name} (empty data array)`);
                return null;
            }

            const record = records[0];

            if (!record.identification || record.identification.toString().trim().length < 8) {
                Logger.info(`enrichPhone: повний ІПН не знайдено для ${debtor.name}`);
                return null;
            }

            Logger.info(`enrichPhone: знайдено повний ІПН через getFullIPN: ${record.identification} для ${debtor.name}`);
            return record;
        }

        // Якщо result - це масив (старий формат для зворотної сумісності)
        if (Array.isArray(result)) {
            if (result.length === 0) {
                Logger.info(`enrichPhone: запис не знайдено через getFullIPN для ${debtor.name} (empty array)`);
                return null;
            }

            const record = result[0];

            if (!record.identification || record.identification.toString().trim().length < 8) {
                Logger.info(`enrichPhone: повний ІПН не знайдено для ${debtor.name}`);
                return null;
            }

            Logger.info(`enrichPhone: знайдено повний ІПН через getFullIPN: ${record.identification} для ${debtor.name}`);
            return record;
        }

        // Якщо формат відповіді невідомий
        Logger.warn(`enrichPhone: невідомий формат відповіді від worker`, {
            resultType: typeof result,
            resultKeys: Object.keys(result)
        });
        return null;

    } catch (error) {
        Logger.error('enrichPhone: помилка пошуку через getFullIPN', {
            message: error.message,
            debtorName: debtor?.name
        });
        return null;
    }
}

/**
 * Шукає телефони в локальній БД (owner.phone таблиця)
 */
async getLocalPhones(clientId, debtor) {
    let phones = [];
    let ischecked = false;
    let phoneRecords = [];
    try {
        if (!clientId) {
            //Logger.info(`getLocalPhones: немає clientId, шукаємо по debtor.name ${debtor.name}`);
            phoneRecords = await debtorRepository.getPhoneByDebtor(debtor, displayFieldsPhone);
            if (phoneRecords.length > 0) {
                // Знайшли телефони по debtor, продовжуємо
                for (const record of phoneRecords) {
                    if (record.ischecked) {
                        ischecked = true;
                    }
                }
            } 
        } else {
            //Logger.info(`getLocalPhones: Є clientId, шукаємо по ньому`);
            phoneRecords = await debtorRepository.getPhoneByClientId(clientId, displayFieldsPhone);
            
            // Немає записів про телефони по clientId
            if (!phoneRecords || phoneRecords.length === 0) {
                Logger.info(`getLocalPhones: записів про телефони не знайдено для clientId ${clientId}`);
                phoneRecords = await debtorRepository.getPhoneByDebtor(debtor, displayFieldsPhone);
                
                if (phoneRecords.length > 0) {
                    // Знайшли телефони по debtor, продовжуємо
                    for (const record of phoneRecords) {
                        if (record.ischecked) {
                            ischecked = true;
                        }
                    }
                } 
            } 
        }

        // Витягуємо телефони з записів
        for (const record of phoneRecords) {
            if (record.ischecked) {
                ischecked = true;
            }
            
            if (record.hasnumber && record.phone && record.phone.trim() !== '') {
                phones.push(record.phone.trim());
            }
        }

        if (phones.length > 0) {
            Logger.info(`enrichPhone: знайдено ${phones.length} телефонів в локальній БД для ${debtor.name}: ${phones.join(', ')}`);
            return { found: true, phones: phones, ischecked: true };
        }

        if (ischecked) {
            //Logger.info(`enrichPhone: клієнт ${debtor.name} вже перевірений, але телефонів немає`);
            return { found: true, phones: [], ischecked: true };
        }

        Logger.info(`enrichPhone: телефони не знайдено, потрібно перевірити в ЄДР для ${debtor.name}`);
        return { found: false, phones: [], ischecked: false };

    } catch (error) {
        Logger.error('enrichPhone: помилка пошуку локальних телефонів', {
            message: error.message,
            clientId: clientId
        });
        return { found: false, phones: [], ischecked: false };
    }
}

async fetchFromEDR(fullCode) {
    try {
        const response = await axios.get(`${EDR_CONFIG.BASE_URL}/subjects`, {
            params: {
                code: fullCode,
                limit: 1
            },
            timeout: EDR_CONFIG.TIMEOUT
        });

        // ❌ Guard: Порожня відповідь з ЄДР
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return null;
        }

        return response.data[0];

    } catch (error) {
        Logger.info(`${EDR_CONFIG.BASE_URL}/subjects`)
        Logger.error('enrichPhone: помилка запиту до ЄДР', {
            message: error.message,
            fullCode: fullCode
        });
        throw error;
    }
}

async saveEdrPhonesToDb(clientId, edrData,debtor) {
    try {
        // Якщо edrData === null, це означає що запис не знайдено в ЄДР
        if (edrData === null) {
            if(clientId === null) {
                await debtorRepository.insertPhoneByDebtor(null,debtor);
                console.log(`Клієнт ${debtor.name}: записи в ЄДР та в локальній БД не знайдено, позначено як перевірений`);
                return { saved: 0, phones: [] };
            }
            await debtorRepository.insertPhoneByClientId(clientId, null,debtor);
            console.log(`Клієнт ${clientId}: записи в ЄДР не знайдено, позначено як перевірений`);
            return { saved: 0, phones: [] };
        }

        // Отримуємо масив телефонів
        const phones = this.extractPhoneFromEdrData(edrData);
        
        console.log(`Клієнт ${clientId}: знайдено ${phones.length} телефонів`, phones);
        
        if (phones.length === 0) {
            // Немає телефонів - позначаємо як перевірений
            await debtorRepository.insertPhoneByClientId(clientId, null,debtor);
            console.log(`Клієнт ${clientId}: телефонів не знайдено в ЄДР, позначено як перевірений`);
            return { saved: 0, phones: [] };
        }
        
        // Зберігаємо всі знайдені телефони
        const savedPhones = [];
        for (const phone of phones) {
            if (phone && phone.trim() !== '') {
                await debtorRepository.insertPhoneByClientId(clientId, phone,debtor);
                savedPhones.push(phone);
                console.log(`Клієнт ${clientId}: збережено телефон ${phone}`);
            }
        }
        
        return { saved: savedPhones.length, phones: savedPhones };
        
    } catch (error) {
        console.error(`Помилка збереження телефонів для клієнта ${clientId}:`, error);
        throw error;
    }
}

// Допоміжний метод для витягування телефону
extractPhoneFromEdrData(edrData) {
    const phones = [];
    
    console.log('edrData.contacts.tel', edrData.contacts?.tel);
    
    // В контактах
    if (edrData.contacts) {
        // Якщо contacts.tel - це масив
        if (edrData.contacts.tel && Array.isArray(edrData.contacts.tel)) {
            for (const phone of edrData.contacts.tel) {
                if (phone && phone.trim() !== '') {
                    phones.push(phone.trim());
                }
            }
        }
        
        // Якщо contacts.tel - це рядок
        if (edrData.contacts.tel && typeof edrData.contacts.tel === 'string') {
            phones.push(edrData.contacts.tel.trim());
        }
        
        // Інші поля в контактах
        if (edrData.contacts.phone) {
            phones.push(edrData.contacts.phone.trim());
        }
    }
    
    // Пошук в масиві контактів
    if (edrData.contact && Array.isArray(edrData.contact)) {
        for (const contact of edrData.contact) {
            if (contact.phone) phones.push(contact.phone.trim());
            if (contact.tel) phones.push(contact.tel.trim());
        }
    }
    
    return phones;
}
    
    // Перевірка конфігурації віддаленої БД
    isRemoteDbConfigured() {
        return !!(
            process.env.REMOTE_DB_HOST && 
            process.env.REMOTE_DB_USERNAME && 
            process.env.REMOTE_DB_PASSWORD &&
            process.env.REMOTE_DB_DATABASE
        );
    }

    async findDebtByFilter(request) {
        const {
            page = 1,
            limit = 16,
            title,
            sort_by = null,
            sort_direction = 'asc',
            ...whereConditions
        } = request.body;
        const { offset } = paginate(page, limit)
        const isValidSortField = sort_by && allowedSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());

        const validSortBy = isValidSortField ? sort_by : 'name';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        // Перевіряємо чи це громада Добромиль для вибору полів (case-insensitive)
        const communityName = await this.getCommunityName();
        const isDobromyl = communityName?.toLowerCase() === 'dobromyl';
        // Fallback на displayDebtorFields якщо displayDebtorFieldsDobromyl не існує
        const debtorFields = (isDobromyl && displayDebtorFieldsDobromyl) ? displayDebtorFieldsDobromyl : displayDebtorFields;

        console.log('[DEBUG findDebtByFilter] communityName:', communityName, 'isDobromyl:', isDobromyl, 'debtorFields length:', debtorFields?.length);

        const allowedFields = allowedDebtorTableFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const userData = await debtorRepository.findDebtByFilter(
            limit,
            offset,
            title,
            allowedFields,
            debtorFields,       // Використовуємо поля залежно від громади
            validSortBy,
            validSortDirection
        );
        if (title || whereConditions?.identification) {
            try {
            const logEntryId = await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук боржника',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })

            await adminSearchRepository.create({
                logger_id: logEntryId[0].id,
                //username: request?.user?.username,
                searched_person_name: title || 'Unknown',
                searched_person_id: whereConditions?.identification || userData[0].data?.identification || null,
                search_type: 'debtor_search',
                search_result: userData[0]?.count > 0 ? 'found' : 'not_found',
                created_at: new Date()
            });
            } catch (logError) {
                console.error('❌ Помилка логування пошуку боржника:', logError);
            }
        }
        const paginatedData = paginationData(userData[0], page, limit);
    
        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    async getAllDebtorsWithPhones() {
        // Перевіряємо чи це громада Добромиль для вибору полів (case-insensitive)
        const communityName = await this.getCommunityName();
        const isDobromyl = communityName?.toLowerCase() === 'dobromyl';
        // Fallback на displayDebtorFields якщо displayDebtorFieldsDobromyl не існує
        const debtorFields = (isDobromyl && displayDebtorFieldsDobromyl) ? displayDebtorFieldsDobromyl : displayDebtorFields;

        // Отримуємо всіх боржників
        const result = await debtorRepository.findDebtByFilter(
            10000,  // великий limit
            0,      // offset
            null,   // title
            {},     // whereConditions - без фільтрів, відфільтруємо потім
            debtorFields,
            'total_debt',  // sortBy
            'desc'         // sortDirection
        );

        // result[0].data містить масив боржників
        const allDebtors = result[0]?.data || [];

        console.log('📊 Всього боржників отримано:', allDebtors.length);

        // Фільтруємо тільки тих, у кого є телефон
        const debtorsWithPhones = allDebtors.filter(debtor =>
            debtor.phone_status === 'has_phone' && debtor.phone
        );

        console.log('📊 Відфільтровано боржників з телефонами:', debtorsWithPhones.length);
        console.log('📊 Боржники з телефонами (деталі):');
        debtorsWithPhones.forEach(d => {
            console.log(`   - ${d.name} (ІПН: ${d.identification}) → ${d.phone}`);
        });

        return debtorsWithPhones;
    }

    async generateWordByDebtId(request, reply) {
        if (!Object.keys([displayDebtorFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        const fetchData = await debtorRepository.getDebtByDebtorId(request?.params?.id, displayDebtorFields)
        if (!fetchData.length) {
            throw new Error(NotFoundErrorMessage)
        }
        const fetchRequisite = await debtorRepository.getRequisite()
        if (!fetchRequisite.length) {
            throw new Error(NotFoundErrorMessage)
        }

        if (fetchData[0].non_residential_debt || fetchData[0].residential_debt || fetchData[0].land_debt > 0 || fetchData[0].orenda_debt || fetchData[0].mpz) {
            // Отримуємо повний ІПН через Worker та форматуємо
            const formattedIPN = await this._getFormattedFullIPN(fetchData[0].name, fetchData[0].identification);

            // Отримуємо адресу боржника з ower.address
            const addressData = await debtorRepository.getAddressByDebtor(fetchData[0].name, fetchData[0].identification);
            const debtorAddress = addressData?.address || '';

            // Оновлюємо дані боржника з форматованим ІПН та адресою
            const debtorDataWithFullIPN = {
                ...fetchData[0],
                identification: formattedIPN,
                address: debtorAddress
            };

            const result = await createRequisiteWord(debtorDataWithFullIPN, fetchRequisite[0])
            await logRepository.createLog({
                session_user_name: fetchData[0].name,
                row_pk_id: fetchData[0].id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерування документа для боржника',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            reply.header('Content-Disposition', 'attachment; filename=generated.docx');
            return reply.send(result);
        }

        throw new Error("Немає даних для формування документу.")

    }

    /**
     * Отримує повний ІПН через Worker та форматує до 10 символів
     * @param {string} debtorName - ПІБ боржника
     * @param {string} debtorIdentification - Локальний ІПН (може бути частковий)
     * @returns {Promise<string>} - Форматований ІПН (10 символів)
     */
    async _getFormattedFullIPN(debtorName, debtorIdentification) {
        let fullIPN = debtorIdentification;

        try {
            const communityName = await this.getCommunityName();
            const validation = await communityValidator.validate(communityName);

            if (validation.isValid) {
                const workerResult = await rabbitmqClient.sendTaskWithReply(
                    'get_full_ipn',
                    {
                        community_name: communityName,
                        name: debtorName,
                        identification: debtorIdentification
                    },
                    30000
                );

                // Перевіряємо результат від Worker
                if (workerResult?.success && workerResult.data?.length > 0) {
                    const record = workerResult.data[0];
                    if (record.identification?.toString().trim().length >= 8) {
                        fullIPN = record.identification.toString().trim();
                        Logger.info('_getFormattedFullIPN: отримано повний ІПН з Worker', {
                            name: debtorName,
                            fullIPN
                        });
                    }
                }
            }
        } catch (error) {
            Logger.warn('_getFormattedFullIPN: не вдалося отримати повний ІПН з Worker, використовуємо локальний', {
                error: error.message,
                name: debtorName
            });
        }

        // Форматуємо ІПН до 10 символів
        return formatIPN(fullIPN);
    }

    async printDebtId(request, reply) {
        if (!Object.keys([displayDebtorFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        const fetchData = await debtorRepository.getDebtByDebtorId(request?.params?.id, displayDebtorFields)
        if (!fetchData.length) {
            throw new Error(NotFoundErrorMessage)
        }
        const fetchRequisite = await debtorRepository.getRequisite()
        if (!fetchRequisite.length) {
            throw new Error(NotFoundErrorMessage)
        }

        if (fetchData[0].non_residential_debt || fetchData[0].residential_debt || fetchData[0].land_debt > 0 || fetchData[0].orenda_debt || fetchData[0].mpz) {
            const result = addRequisiteToLandDebt(fetchData[0], fetchRequisite[0]);

            // Додаємо спеціальні повідомлення для певних громад
            const communityName = await this.getCommunityName();
            const isDobromyl = communityName?.toLowerCase() === 'dobromyl';
            const isSlavsk = communityName?.toLowerCase() === 'slavsk';
            
            // Для Добромиля - текст про Самбірську податкову
            if (isDobromyl && result.length > 0) {
                result[result.length - 1].sambir_notice = "Увага! Нарахування сум податків здійснює Центр обслуговування платників Самбірської податкової інспекції, місто Самбір, вулиця Чорновола, 2а";
            }
            
            // Для Славська - змінюємо назву відправника
            if (isSlavsk && result.length > 0) {
                result[result.length - 1].custom_sender = "Фінансовий відділ Славської селищної ради";
            }

            // Отримуємо повний ІПН через Worker та форматуємо
            const formattedIPN = await this._getFormattedFullIPN(fetchData[0].name, fetchData[0].identification);

            // Отримуємо адресу боржника з ower.address тільки для dobromyl
            const isDobromylAddress = communityName?.toLowerCase() === 'dobromyl';
            let debtorAddress = '';
            if (isDobromylAddress) {
                const addressData = await debtorRepository.getAddressByDebtor(fetchData[0].name, fetchData[0].identification);
                debtorAddress = addressData?.address || '';
            }

            await logRepository.createLog({
                session_user_name: fetchData[0].name,
                row_pk_id: fetchData[0].id,
                uid: request?.user?.id,
                action: 'PRINT',
                client_addr: request?.ip,
                application_name: 'Друк документа',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })
            return reply.send({
                name: fetchData[0].name,
                date: fetchData[0].date,
                identification: formattedIPN,
                address: debtorAddress,
                debt: result
            });
        }

        throw new Error("Немає даних для формування документу.")
    }


    // Створити новий дзвінок по ower.id або ПІБ
    async createDebtorCallByIdentifier(request) {
        const identifier = request?.params?.id || request?.params?.personName || request?.params?.identifier;
        const { call_date, call_topic } = request.body;
        
        if (!identifier) {
            throw new Error('Debtor ID or person name is required');
        }
        
        if (!call_date || !call_topic) {
            throw new Error('All fields (call_date, call_topic) are required');
        }

        try {
            // Створюємо дзвінок через repository
            const result = await debtorRepository.createCallByIdentifier(identifier, {
                call_date,
                call_topic
            });
            
            // Логуємо дію
            if (request) {
                try {
                    await logRepository.createLog({
                        row_pk_id: result.id,
                        uid: request?.user?.id,
                        action: 'INSERT',
                        client_addr: request?.ip,
                        application_name: 'Створення дзвінка боржника',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'debtor_calls',
                        oid: '16504',
                    });
                } catch (logError) {
                    console.error('❌ Помилка логування створення дзвінка:', logError);
                }
            }

            return result;
        } catch (error) {
            console.error('Error in createDebtorCallByIdentifier:', error);
            throw error;
        }
    }

    async updateCall(request) {
        const { call_date, call_topic } = request.body;
        const callId = request.params.id;
        
        return await debtorRepository.updateCall(callId, {
            call_date,
            call_topic
        });
    }

    async getDebtorReceiptInfoByIdentifier(request) {
        const identifier = request?.params?.id || request?.params?.personName;
    
        if (!identifier) {
            throw new Error('Debtor ID or person name is required');
        }

        try {
            return await debtorRepository.getReceiptMessagesByIdentifier(identifier);
        } catch (error) {
            console.error('Error in getReceiptInfoByIdentifier:', error);
            throw error;
        }
    }


    // Створити новий дзвінок по ower.id або ПІБ
    async createDebtorReceiptInfoByIdentifier(request) {
        const identifier = request?.params?.id || request?.params?.personName || request?.params?.identifier;
        const { date, topic } = request.body;
        
        if (!identifier) {
            throw new Error('Debtor ID or person name is required');
        }

        if (!date || !topic) {
            throw new Error('All fields (date, topic) are required');
        }
        try {
            // Створюємо дзвінок через repository
            const result = await debtorRepository.createReceiptMessagesByIdentifier(identifier, {
                date,
                topic
            });
            
            // Логуємо дію
            if (request) {
                try {
                    await logRepository.createLog({
                        row_pk_id: result.id,
                        uid: request?.user?.id,
                        action: 'INSERT',
                        client_addr: request?.ip,
                        application_name: 'Запис інформації щодо квитанції боржника',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'debtor_receipt_messages',
                        oid: '16504',
                    });
                } catch (logError) {
                    console.error('❌ Помилка логування створення дзвінка:', logError);
                }
            }

            return result;
        } catch (error) {
            console.error('Error in createDebtorReceiptInfoByIdentifier:', error);
            throw error;
        }
    }

    async getDebtorStats(request) {
        try {
            return await debtorRepository.getDebtorStats();
        } catch (error) {
            console.error('Error in getDebtorStats:', error);
            throw error;
        }
    }

    // Оновити адресу боржника
    async updateDebtorAddress(request) {
        try {
            const { debtorId } = request.params;
            const { address } = request.body;

            if (!debtorId) {
                throw { statusCode: 400, message: 'ID боржника обов\'язковий' };
            }

            if (!address || !address.trim()) {
                throw { statusCode: 400, message: 'Адреса обов\'язкова' };
            }

            const result = await debtorRepository.updateDebtorAddress(debtorId, address.trim());
            return result;
        } catch (error) {
            console.error('Error in updateDebtorAddress:', error);
            throw error;
        }
    }

    // Видалити адресу боржника
    async deleteDebtorAddress(request) {
        try {
            const { debtorId } = request.params;

            if (!debtorId) {
                throw { statusCode: 400, message: 'ID боржника обов\'язковий' };
            }

            const result = await debtorRepository.deleteDebtorAddress(debtorId);
            return result;
        } catch (error) {
            console.error('Error in deleteDebtorAddress:', error);
            throw error;
        }
    }

}


module.exports = new DebtorService();