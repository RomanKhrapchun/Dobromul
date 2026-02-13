const taxReportsRepository = require("../repository/tax-reports-repository");
const { paginate, paginationData } = require("../../../utils/function");
const rabbitmqClient = require('../../../helpers/rabbitmq');
const Logger = require('../../../utils/logger');
const communityValidator = require('../../../utils/communityValidator');

class TaxReportsService {
    /**
     * Приватний метод для валідації community_name
     * @param {string} communityName - назва громади
     * @throws {Error} якщо валідація не пройшла
     */
    async _validateCommunityName(communityName) {
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }
    }

    /**
     * Generic method to fetch paginated data
     * Extracts common pagination pattern used across all data endpoints
     * @param {Object} request - Fastify request object containing params and query
     * @param {Function} repositoryMethod - Repository method to call for data
     * @param {any} filterParam - Parameter to pass to repository method (code/period)
     */
    async getPaginatedData(request, repositoryMethod, filterParam) {
        const { page = 1, limit = 16 } = request.query || request.body || {};
        const { offset } = paginate(page, limit);

        const result = await repositoryMethod(filterParam, limit, offset);
        return paginationData(result[0], page, limit);
    }

    // Отримання списку платників для випадаючого меню
    async getTaxpayers() {
        return await taxReportsRepository.getTaxpayers();
    }

    // Отримання списку типів податків для випадаючого меню
    async getTaxTypes() {
        return await taxReportsRepository.getTaxTypes();
    }

    // Отримання списку періодів для випадаючого меню
    async getPeriods() {
        return await taxReportsRepository.getPeriods();
    }

    // Отримання даних таблиці по платнику з пагінацією
    async getDataByTaxpayer(request) {
        const { taxpayerCode } = request.params;
        return this.getPaginatedData(
            request,
            taxReportsRepository.findByTaxpayer.bind(taxReportsRepository),
            taxpayerCode
        );
    }

    // Отримання даних таблиці по типу податку з пагінацією
    async getDataByTaxType(request) {
        const { incomeCode } = request.params;
        return this.getPaginatedData(
            request,
            taxReportsRepository.findByTaxType.bind(taxReportsRepository),
            incomeCode
        );
    }

    // Отримання даних таблиці по періоду з пагінацією
    async getDataByPeriod(request) {
        const { period } = request.params;
        return this.getPaginatedData(
            request,
            taxReportsRepository.findByPeriod.bind(taxReportsRepository),
            period
        );
    }

    // =====================================================
    // МЕТОДИ ДЛЯ ОНОВЛЕННЯ РЕЄСТРУ ЮРИДИЧНИХ ОСІБ
    // =====================================================

    /**
     * Отримати попередній перегляд даних з віддаленої БД (статистика)
     * @param {string} communityName - назва громади
     * @param {string|null} date - дата реєстру (YYYY-MM-DD) або null для останньої дати
     */
    async previewDatabaseUpdate(communityName, date = null) {
        await this._validateCommunityName(communityName);

        try {
            Logger.info('TaxReportsService: Запит попереднього перегляду оновлення БД юридичних осіб', {
                communityName,
                date: date || 'latest'
            });

            // Формуємо параметри запиту
            const queryParams = {
                community_name: communityName,
                query_type: 'legal_get_sums'
            };

            // Додаємо параметр дати, якщо він вказаний
            if (date) {
                queryParams.params = { date };
            }

            // Запит до віддаленої БД для отримання статистики
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_legal_database',
                queryParams,
                30000 // 30 секунд
            );

            if (!result.success) {
                throw new Error(result.error || 'Помилка отримання даних з віддаленої БД');
            }

            // Отримуємо дату останнього реєстру з локальної БД
            const localLatestDate = await taxReportsRepository.getLatestRegistryDate();
            const remoteLatestDate = result.data?.latest_date;

            // Порівнюємо дати для визначення актуальності
            let isUpToDate = false;
            if (localLatestDate && remoteLatestDate) {
                const localDateStr = new Date(localLatestDate).toISOString().split('T')[0];
                const remoteDateStr = new Date(remoteLatestDate).toISOString().split('T')[0];

                isUpToDate = localDateStr === remoteDateStr;

                Logger.info('TaxReportsService: Порівняння дат реєстрів', {
                    localDate: localDateStr,
                    remoteDate: remoteDateStr,
                    isUpToDate
                });
            }

            Logger.info('TaxReportsService: Попередній перегляд отримано успішно', {
                communityName,
                totalRecords: result.data?.total_count,
                isUpToDate
            });

            return {
                ...result,
                is_up_to_date: isUpToDate,
                local_latest_date: localLatestDate
            };

        } catch (error) {
            Logger.error('TaxReportsService: Помилка отримання попереднього перегляду', {
                error: error.message,
                stack: error.stack,
                communityName
            });
            throw error;
        }
    }

    /**
     * Отримати список доступних дат реєстрів з віддаленої БД
     * @param {string} communityName - назва громади
     * @param {number} limit - кількість дат для повернення (за замовчуванням 3)
     */
    async getAvailableDates(communityName, limit = 3) {
        await this._validateCommunityName(communityName);

        try {
            Logger.info('TaxReportsService: Запит списку доступних дат (юр. особи)', {
                communityName,
                limit
            });

            // Запит до віддаленої БД
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_legal_database',
                {
                    community_name: communityName,
                    query_type: 'legal_available_dates',
                    params: { limit }
                },
                10000 // 10 секунд
            );

            if (!result.success) {
                Logger.error('TaxReportsService: Worker повернув помилку', {
                    communityName,
                    error: result.error
                });
                throw new Error(result.error || 'Помилка отримання списку дат');
            }

            Logger.info('TaxReportsService: Список доступних дат отримано', {
                communityName,
                datesCount: result.data?.length || 0,
                dates: result.data
            });

            return result;

        } catch (error) {
            Logger.error('TaxReportsService: Помилка отримання списку доступних дат', {
                error: error.message,
                stack: error.stack,
                communityName
            });
            throw error;
        }
    }

    /**
     * Виконати оновлення локальної бази даних юридичних осіб
     * 1. Запит до віддаленої БД (тип "legal_all")
     * 2. Очистити локальну таблицю ower.tax_records
     * 3. Завантажити дані у локальну БД
     * 4. Імпорт в історію
     */
    async updateDatabaseExecute(communityName) {
        await this._validateCommunityName(communityName);

        try {
            Logger.info('TaxReportsService: Початок оновлення локальної бази даних юридичних осіб', {
                communityName
            });

            // Крок 1: Отримати останню дату з віддаленої БД
            Logger.info('TaxReportsService: Крок 1: Отримання останньої дати');
            const dateResult = await rabbitmqClient.sendTaskWithReply(
                'query_legal_database',
                {
                    community_name: communityName,
                    query_type: 'legal_get_sums'
                },
                30000
            );

            if (!dateResult.success || !dateResult.data || !dateResult.data.latest_date) {
                throw new Error('Не вдалося отримати останню дату з віддаленої БД');
            }

            const latestDate = dateResult.data.latest_date;
            Logger.info('TaxReportsService: Отримано останню дату', { latestDate });

            // Крок 2: Отримати всі дані за цією датою з віддаленої БД
            Logger.info('TaxReportsService: Крок 2: Запит даних за датою', { date: latestDate });
            const remoteDataResult = await rabbitmqClient.sendTaskWithReply(
                'query_legal_database',
                {
                    community_name: communityName,
                    query_type: 'legal_all',
                    params: { date: latestDate }
                },
                120000 // 2 хвилини для великих обсягів даних
            );

            if (!remoteDataResult.success) {
                throw new Error(remoteDataResult.error || 'Помилка отримання даних з віддаленої БД');
            }

            if (!remoteDataResult.data || !remoteDataResult.data.records) {
                throw new Error('Немає даних для оновлення');
            }

            const records = remoteDataResult.data.records;
            Logger.info('TaxReportsService: Отримано записів з віддаленої БД', {
                recordsCount: records.length,
                totalCount: remoteDataResult.data.total_count
            });

            // Крок 3: Очистити локальну таблицю
            Logger.info('TaxReportsService: Крок 3: Очищення таблиці ower.tax_records');
            await taxReportsRepository.flushTable();

            // Крок 4: Завантажити дані
            Logger.info('TaxReportsService: Крок 4: Масове завантаження даних');
            const insertResult = await taxReportsRepository.bulkInsertRecords(records);

            // Крок 5: Імпорт в історію
            let historyImported = 0;
            try {
                let importDate = latestDate;
                if (records && records.length > 0) {
                    const recordDate = records[0].report_date || records[0].report_period;
                    if (recordDate) {
                        const dateObj = new Date(recordDate);
                        if (!isNaN(dateObj.getTime())) {
                            importDate = dateObj.toISOString().split('T')[0];
                        } else {
                            Logger.warn('TaxReportsService: Невалідна дата в записі, використовуємо latestDate', {
                                recordDate, latestDate
                            });
                        }
                    }
                }
                Logger.info('TaxReportsService: Крок 5: Імпорт реєстру в історію', { importDate });
                const historyResult = await taxReportsRepository.importToHistory(importDate);
                historyImported = historyResult.importedRecords || 0;
                Logger.info('TaxReportsService: Імпорт в історію завершено', { importDate, historyImported });
            } catch (historyError) {
                Logger.warn('TaxReportsService: Помилка імпорту в історію (не критична)', {
                    error: historyError.message
                });
            }

            Logger.info('TaxReportsService: Оновлення бази даних завершено успішно', {
                communityName,
                insertedRecords: insertResult.inserted,
                totalSourceRecords: insertResult.totalSourceRecords
            });

            return {
                success: true,
                community_name: communityName,
                remote_total_count: remoteDataResult.data.total_count,
                source_records: insertResult.totalSourceRecords,
                inserted_records: insertResult.inserted,
                history_imported: historyImported,
                executed_at: new Date().toISOString()
            };

        } catch (error) {
            Logger.error('TaxReportsService: Помилка виконання оновлення БД', {
                error: error.message,
                stack: error.stack,
                communityName
            });
            throw error;
        }
    }
}

module.exports = new TaxReportsService();