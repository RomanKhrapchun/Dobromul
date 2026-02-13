const { sqlRequest, withTransaction } = require("../../../helpers/database");
const Logger = require("../../../utils/logger");

class TaxReportsRepository {
    // Виведення списку платників податків у випадному меню
    async getTaxpayers() {
        const sql = `
            SELECT DISTINCT taxpayer_code, taxpayer_name FROM ower.tax_records
            UNION
            SELECT DISTINCT taxpayer_code, taxpayer_name FROM ower.tax_records_history
            ORDER BY taxpayer_name
        `;
        return await sqlRequest(sql);
    }

    // Виведення списку податків у випадному меню
    async getTaxTypes() {
        const sql = `
            SELECT DISTINCT income_code, income_name FROM ower.tax_records
            UNION
            SELECT DISTINCT income_code, income_name FROM ower.tax_records_history
            ORDER BY income_name
        `;
        return await sqlRequest(sql);
    }

    // Виведення списку періодів у випадному меню
    async getPeriods() {
        const sql = `
            SELECT DISTINCT report_period FROM ower.tax_records
            UNION
            SELECT DISTINCT report_period FROM ower.tax_records_history
            ORDER BY report_period DESC
        `;
        return await sqlRequest(sql);
    }

    async findByTaxpayer(taxpayerCode, limit, offset) {
        const values = [];
        const sql = `
            select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(
                'period', report_period,
                'tax_type', income_name,
                'tax_code', income_code,
                'accrued', accrued,
                'received', received,
                'debt', debt,
                'overpaid', overpaid
            ) as rw,
            count(*) over () as cnt
            from (
                SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records
                UNION
                SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records_history
            ) combined
            where taxpayer_code = $1
            ORDER BY report_period DESC, income_code ASC
            LIMIT $2 OFFSET $3
            ) q
        `;

        values.push(taxpayerCode);
        values.push(limit);
        values.push(offset);

        return await sqlRequest(sql, values);
    }

    async findByTaxType(incomeCode, limit, offset) {
        const values = [];
        const sql = `
        select json_agg(rw) as data,
        max(cnt) as count
        from (
        select json_build_object(
            'period', report_period,
            'taxpayer_code', taxpayer_code,
            'taxpayer_name', taxpayer_name,
            'accrued', accrued,
            'received', received,
            'debt', debt,
            'overpaid', overpaid
        ) as rw,
        count(*) over () as cnt
        from (
            SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records
            UNION
            SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records_history
        ) combined
        where income_code = $1
        ORDER BY report_period DESC, taxpayer_name ASC
        LIMIT $2 OFFSET $3
        ) q
    `;

        values.push(incomeCode);
        values.push(limit);
        values.push(offset);

        return await sqlRequest(sql, values);
    }

    async findByPeriod(period, limit, offset) {
        const values = [];
        const sql = `
            select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(
                'taxpayer_code', taxpayer_code,
                'taxpayer_name', taxpayer_name,
                'tax_type', income_name,
                'tax_code', income_code,
                'accrued', accrued,
                'received', received,
                'debt', debt,
                'overpaid', overpaid
            ) as rw,
            count(*) over () as cnt
            from (
                SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records
                UNION
                SELECT taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid FROM ower.tax_records_history
            ) combined
            where report_period = $1
            ORDER BY taxpayer_name ASC, income_code ASC
            LIMIT $2 OFFSET $3
            ) q
        `;

        values.push(period);
        values.push(limit);
        values.push(offset);

        return await sqlRequest(sql, values);
    }

    // =====================================================
    // МЕТОДИ ДЛЯ ОНОВЛЕННЯ РЕЄСТРУ ЮРИДИЧНИХ ОСІБ
    // =====================================================

    /**
     * Отримати дату останнього реєстру з локальної БД
     */
    async getLatestRegistryDate() {
        try {
            const sql = `
                SELECT MAX(latest) as latest_date FROM (
                    SELECT MAX(report_period) as latest FROM ower.tax_records
                    UNION ALL
                    SELECT MAX(report_period) as latest FROM ower.tax_records_history
                ) combined
            `;
            const result = await sqlRequest(sql);

            if (!result || result.length === 0 || !result[0].latest_date) {
                Logger.info('TaxReportsRepository: Локальна БД порожня або не має дати реєстру');
                return null;
            }

            Logger.info('TaxReportsRepository: Отримано дату останнього локального реєстру', {
                latestDate: result[0].latest_date
            });

            return result[0].latest_date;
        } catch (error) {
            Logger.error('TaxReportsRepository: Помилка при отриманні дати останнього реєстру', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Очистити таблицю ower.tax_records (TRUNCATE)
     */
    async flushTable() {
        try {
            Logger.info('TaxReportsRepository: Початок очищення таблиці ower.tax_records');

            const sql = `TRUNCATE TABLE ower.tax_records RESTART IDENTITY CASCADE`;
            await sqlRequest(sql);

            Logger.info('TaxReportsRepository: Таблиця ower.tax_records успішно очищена');
            return { success: true, message: 'Таблиця очищена' };
        } catch (error) {
            Logger.error('TaxReportsRepository: Помилка при очищенні таблиці ower.tax_records', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Масове завантаження даних у таблицю ower.tax_records
     * Мапінг полів з віддаленого сервера:
     * - tax_number -> taxpayer_code
     * - taxpayer_name -> taxpayer_name
     * - report_date -> report_period
     * - revenue_code -> income_code
     * - revenue_name -> income_name
     * - accrued -> accrued
     * - received -> received
     * - tax_debt -> debt
     * - overpaid -> overpaid
     */
    async bulkInsertRecords(records) {
        try {
            if (!Array.isArray(records) || records.length === 0) {
                Logger.warn('TaxReportsRepository: bulkInsertRecords: Немає записів для вставки');
                return { success: false, inserted: 0 };
            }

            Logger.info('TaxReportsRepository: Початок масового завантаження даних', {
                recordsCount: records.length
            });

            // Розбиваємо на батчі для уникнення перевищення ліміту параметрів PostgreSQL
            const BATCH_SIZE = 500;
            let totalInserted = 0;

            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);

                const values = [];
                const placeholders = [];

                batch.forEach((record, index) => {
                    const baseIndex = index * 9;
                    placeholders.push(
                        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`
                    );

                    values.push(
                        record.tax_number || record.taxpayer_code || '',  // taxpayer_code
                        record.taxpayer_name || '',                        // taxpayer_name
                        record.report_date || record.report_period || null, // report_period
                        record.revenue_code || record.income_code || '',   // income_code
                        record.revenue_name || record.income_name || '',   // income_name
                        Number(record.accrued) || 0,                       // accrued
                        Number(record.received) || 0,                      // received
                        Number(record.tax_debt) || Number(record.debt) || 0, // debt
                        Number(record.overpaid) || 0                       // overpaid
                    );
                });

                const sql = `
                    INSERT INTO ower.tax_records
                    (taxpayer_code, taxpayer_name, report_period, income_code, income_name, accrued, received, debt, overpaid)
                    VALUES ${placeholders.join(', ')}
                `;

                await sqlRequest(sql, values);
                totalInserted += batch.length;

                Logger.info('TaxReportsRepository: Батч успішно завантажено', {
                    batchNumber: Math.floor(i / BATCH_SIZE) + 1,
                    batchSize: batch.length,
                    totalInserted: totalInserted,
                    remaining: records.length - totalInserted
                });
            }

            Logger.info('TaxReportsRepository: Дані успішно завантажені в ower.tax_records', {
                insertedRecords: totalInserted
            });

            return {
                success: true,
                inserted: totalInserted,
                totalSourceRecords: records.length
            };

        } catch (error) {
            Logger.error('TaxReportsRepository: Помилка при масовому завантаженні даних', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Імпорт даних в таблицю історії ower.tax_records_history
     * @param {string} date - дата реєстру для імпорту
     */
    async importToHistory(date) {
        try {
            Logger.info('TaxReportsRepository: Початок імпорту в історію', { date });

            const result = await withTransaction(async (client) => {
                // Спочатку видаляємо існуючі записи за цю дату, щоб уникнути дублікатів
                await client.query(
                    `DELETE FROM ower.tax_records_history WHERE report_period = $1`,
                    [date]
                );

                // Копіюємо поточні дані з tax_records в tax_records_history
                const insertResult = await client.query(
                    `INSERT INTO ower.tax_records_history
                    (taxpayer_name, taxpayer_code, report_period, income_code, income_name, accrued, received, debt, overpaid, imported_at)
                    SELECT
                        taxpayer_name,
                        taxpayer_code,
                        report_period,
                        income_code,
                        income_name,
                        accrued,
                        received,
                        debt,
                        overpaid,
                        NOW()
                    FROM ower.tax_records
                    WHERE report_period = $1`,
                    [date]
                );

                return insertResult;
            });

            Logger.info('TaxReportsRepository: Імпорт в історію завершено', {
                date,
                rowCount: result?.rowCount || 0
            });

            return {
                success: true,
                date,
                importedRecords: result?.rowCount || 0
            };

        } catch (error) {
            Logger.error('TaxReportsRepository: Помилка імпорту в історію', {
                error: error.message,
                stack: error.stack,
                date
            });
            throw error;
        }
    }

    /**
     * Отримати статистику з таблиці tax_records
     */
    async getStatistics() {
        try {
            const sql = `
                SELECT
                    COUNT(DISTINCT taxpayer_code) as total_taxpayers,
                    COUNT(*) as total_records,
                    MAX(report_period) as latest_date,
                    CAST(SUM(accrued) AS NUMERIC(15,2)) as total_accrued,
                    CAST(SUM(received) AS NUMERIC(15,2)) as total_received,
                    CAST(SUM(debt) AS NUMERIC(15,2)) as total_debt,
                    CAST(SUM(overpaid) AS NUMERIC(15,2)) as total_overpaid
                FROM ower.tax_records
            `;

            const result = await sqlRequest(sql);
            return result[0] || null;
        } catch (error) {
            Logger.error('TaxReportsRepository: Помилка отримання статистики', {
                error: error.message
            });
            throw error;
        }
    }
}


module.exports = new TaxReportsRepository();