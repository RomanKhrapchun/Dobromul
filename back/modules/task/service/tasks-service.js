const rabbitmqClient = require('../../../helpers/rabbitmq');
const Logger = require('../../../utils/logger');
const debtorRepository = require('../../debtor/repository/debtor-repository');
const { sqlRequest } = require('../../../helpers/database');
const communityValidator = require('../../../utils/communityValidator');
const TelegramSession = require('../../../utils/telegram-session');
const communitySettingsRepository = require('../../community_settings/repository/communitySettings-repository');
const communitySettingsService = require('../../community_settings/service/communitySettings-service');

// Період блокування повторних сповіщень (в днях)
const NOTIFICATION_COOLDOWN_DAYS = parseInt(process.env.TELEGRAM_COOLDOWN_DAYS || '20', 10);

class tasksService {
    /**
     * Обчислює кількість днів з моменту timestamp
     * @param {string|Date} timestamp
     * @returns {number}
     */
    _getDaysSince(timestamp) {
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diffMs = now - then;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Форматує дату для повідомлення (перше число місяця у форматі YYYY-MM-DD)
     * @param {Array} records
     * @returns {string}
     */
    _formatNotificationDate(records) {
        if (!records || records.length === 0 || !records[0].date) {
            const now = new Date();
            now.setDate(1);
            return now.toISOString().split('T')[0];
        }

        const dateObj = new Date(records[0].date);
        dateObj.setDate(1);
        return dateObj.toISOString().split('T')[0];
    }

    /**
     * Відправляє Telegram сповіщення про оновлення БД з перевіркою cooldown
     * @param {Array} records - записи з БД
     * @returns {Promise<{notifiedCount: number, cooldownActive: boolean}>}
     */
    async _sendDatabaseUpdateNotifications(records) {
        const BOT_TOKEN = process.env.BOT_TOKEN;

        if (!BOT_TOKEN) {
            Logger.warn('BOT_TOKEN не знайдено, пропускаємо відправку повідомлень');
            return { notifiedCount: 0, cooldownActive: false };
        }

        // Перевіряємо cooldown
        const lastNotification = await communitySettingsRepository.getLastTelegramNotification();

        if (lastNotification) {
            const daysSinceLastNotification = this._getDaysSince(lastNotification);

            Logger.info('Перевірка cooldown Telegram сповіщень', {
                lastNotification: new Date(lastNotification).toISOString(),
                daysSinceLastNotification,
                cooldownDays: NOTIFICATION_COOLDOWN_DAYS,
                cooldownActive: daysSinceLastNotification < NOTIFICATION_COOLDOWN_DAYS
            });

            if (daysSinceLastNotification < NOTIFICATION_COOLDOWN_DAYS) {
                const daysRemaining = NOTIFICATION_COOLDOWN_DAYS - daysSinceLastNotification;
                Logger.info('Пропускаємо відправку сповіщень - cooldown активний', {
                    daysRemaining
                });
                return { notifiedCount: 0, cooldownActive: true };
            }
        } else {
            Logger.info('Перевірка cooldown Telegram сповіщень', {
                lastNotification: null,
                message: 'Перше сповіщення - cooldown не застосовується'
            });
        }

        // Відправляємо сповіщення
        const telegramSession = new TelegramSession(BOT_TOKEN, sqlRequest, Logger);
        const formattedDate = this._formatNotificationDate(records);
        const messageText = `Базу з боржниками успішно оновлено. Інформація станом на: ${formattedDate}`;

        const notifyResult = await telegramSession.sendToAll(messageText, {
            parse_mode: "HTML",
            onProgress: (progress) => {
                Logger.info('Прогрес відправки сповіщень', {
                    current: progress.current,
                    total: progress.total,
                    percentage: progress.percentage
                });
            }
        });

        // Оновлюємо дату останнього сповіщення
        await communitySettingsRepository.updateLastTelegramNotification();

        Logger.info('Сповіщення відправлено', {
            notifiedCount: notifyResult.notifiedCount,
            totalUsers: notifyResult.totalUsers,
            successRate: notifyResult.successRate,
            failedCount: notifyResult.failedCount
        });

        return { notifiedCount: notifyResult.notifiedCount, cooldownActive: false };
    }

    /**
     * Отримує community_name з кешованих налаштувань або .env (fallback)
     * @returns {Promise<string>}
     */
    async getCommunityName() {
        const communityName = await communitySettingsService.getCommunityName();
        if (communityName) {
            return communityName;
        }
        // Fallback до .env
        return process.env.COMMUNITY_NAME;
    }

    /**
     * Відправити завдання на обробку реєстру боржників
     * Чекає на відповідь від Worker (RPC)
     */
    async processDebtorRegister(communityName) {
        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            Logger.info('Відправка завдання process_debtor_register', {
                communityName
            });

            // Відправляємо завдання та чекаємо на відповідь (60 секунд таймаут)
            const result = await rabbitmqClient.sendTaskWithReply(
                'process_debtor_register',
                { community_name: communityName },
                60000 // 60 секунд
            );

            // Перевіряємо чи успішний результат
            if (!result.success) {
                throw new Error(result.error || 'Помилка обробки на стороні Worker');
            }

            Logger.info('Завдання process_debtor_register виконано', {
                communityName,
                totalRecords: result.total_records
            });

            return result;

        } catch (error) {
            Logger.error('Помилка виконання process_debtor_register', {
                error: error.message,
                communityName
            });
            throw error;
        }
    }

    /**
     * Відправити завдання на відправку email
     * Чекає на відповідь від Worker (RPC)
     */
    async sendEmail(communityName) {
        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            Logger.info('Відправка завдання send_email', {
                communityName
            });

            // Відправляємо завдання та чекаємо на відповідь (120 секунд таймаут)
            const result = await rabbitmqClient.sendTaskWithReply(
                'send_email',
                { community_name: communityName },
                120000 // 120 секунд для email
            );

            // Перевіряємо чи успішний результат
            if (!result.success) {
                throw new Error(result.error || 'Помилка відправки email на стороні Worker');
            }

            Logger.info('Завдання send_email виконано', {
                communityName,
                recipientEmail: result.recipient_email
            });

            return result;

        } catch (error) {
            Logger.error('Помилка виконання send_email', {
                error: error.message,
                communityName
            });
            throw error;
        }
    }
    /**
     * Виконати оновлення локальної бази даних
     * 1. Запит до віддаленої БД (тип "all")
     * 2. Очистити локальну таблицю ower.ower
     * 3. Завантажити дані у локальну БД
     */
    async updateDatabaseExecute(communityName) {
        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            Logger.info('Початок оновлення локальної бази даних', {
                communityName
            });

            // Крок 1: Отримати останню дату з віддаленої БД
            Logger.info('Крок 1: Отримання останньої дати');
            const dateResult = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                {
                    community_name: communityName,
                    query_type: 'get_sums'
                },
                30000
            );

            if (!dateResult.success || !dateResult.data || !dateResult.data.latest_date) {
                throw new Error('Не вдалося отримати останню дату з віддаленої БД');
            }

            const latestDate = dateResult.data.latest_date;
            Logger.info('Отримано останню дату', { latestDate });

            // Крок 2: Отримати всі дані за цією датою з віддаленої БД
            Logger.info('Крок 2: Запит даних за датою', { date: latestDate });
            const remoteDataResult = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                {
                    community_name: communityName,
                    query_type: 'all_by_date',
                    date: latestDate
                },
                120000
            );

            if (!remoteDataResult.success) {
                throw new Error(remoteDataResult.error || 'Помилка отримання даних з віддаленої БД');
            }

            if (!remoteDataResult.data || !remoteDataResult.data.records) {
                throw new Error('Немає даних для оновлення');
            }

            const records = remoteDataResult.data.records;
            Logger.info('Отримано записів з віддаленої БД', {
                recordsCount: records.length,
                totalCount: remoteDataResult.data.total_count
            });

            // Крок 3: Очистити локальну таблицю
            Logger.info('Крок 3: Очищення таблиці ower.ower');
            await debtorRepository.flushOwerTable();

            // Крок 4: Завантажити дані
            Logger.info('Крок 4: Масове завантаження даних');
            const insertResult = await debtorRepository.bulkInsertDebtors(records);

            // Крок 5: Імпорт в історію
            Logger.info('Крок 5: Імпорт реєстру в історію');
            let importDate;
            if (records && records.length > 0 && records[0].date) {
                const dateObj = new Date(records[0].date);
                importDate = dateObj.toISOString().split('T')[0];
            } else {
                importDate = new Date().toISOString().split('T')[0];
            }

            Logger.info('Виконання import_registry_to_history', { importDate });
            await sqlRequest('SELECT import_registry_to_history($1)', [importDate]);
            Logger.info('import_registry_to_history виконано успішно');

            // Крок 6: Відправка повідомлень через Telegram Bot API (не частіше 1 раз на 20 днів)
            Logger.info('Крок 6: Перевірка можливості відправки сповіщень користувачам');
            let notifiedCount = 0;
            let notificationSkipped = false;
            try {
                const notificationResult = await this._sendDatabaseUpdateNotifications(records);
                notifiedCount = notificationResult.notifiedCount;
                notificationSkipped = notificationResult.cooldownActive;
            } catch (notifyError) {
                Logger.error('Помилка відправки сповіщень (не критична)', {
                    error: notifyError.message
                });
            }

            Logger.info('Оновлення бази даних завершено успішно', {
                communityName,
                insertedRecords: insertResult.inserted,
                totalSourceRecords: insertResult.totalSourceRecords,
                importDate
            });

            return {
                success: true,
                community_name: communityName,
                remote_total_count: remoteDataResult.data.total_count,
                source_records: insertResult.totalSourceRecords,
                inserted_debtors: insertResult.inserted,
                import_date: importDate,
                notified_users: notifiedCount,
                notification_skipped: notificationSkipped,
                executed_at: new Date().toISOString()
            };

        } catch (error) {
            Logger.error('Помилка виконання оновлення БД', {
                error: error.message,
                stack: error.stack,
                communityName
            });
            throw error;
        }
    }

    /**
     * Отримати попередній перегляд даних з віддаленої БД
     * Запит типу "get_sums" для отримання статистики
     * @param {string} communityName - назва громади
     * @param {string|null} date - дата реєстру (YYYY-MM-DD) або null для останньої дати
     */
    async previewDatabaseUpdate(communityName, date = null) {
        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            Logger.info('Запит попереднього перегляду оновлення БД', {
                communityName,
                date: date || 'latest'
            });

            // Формуємо параметри запиту
            const queryParams = {
                community_name: communityName,
                query_type: 'get_sums'
            };

            // Додаємо параметр дати, якщо він вказаний
            if (date) {
                queryParams.params = { date };
            }

            // Запит до віддаленої БД для отримання статистики (тип "get_sums")
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                queryParams,
                30000 // 30 секунд для отримання статистики
            );

            if (!result.success) {
                throw new Error(result.error || 'Помилка отримання даних з віддаленої БД');
            }

            // Отримуємо дату останнього реєстру з локальної БД
            const localLatestDate = await debtorRepository.getLatestRegistryDate();
            const remoteLatestDate = result.data?.latest_date;

            // Порівнюємо дати для визначення актуальності
            let isUpToDate = false;
            if (localLatestDate && remoteLatestDate) {
                // Приводимо обидві дати до формату рядка для порівняння
                const localDateStr = new Date(localLatestDate).toISOString().split('T')[0];
                const remoteDateStr = new Date(remoteLatestDate).toISOString().split('T')[0];

                isUpToDate = localDateStr === remoteDateStr;

                Logger.info('Порівняння дат реєстрів', {
                    localDate: localDateStr,
                    remoteDate: remoteDateStr,
                    isUpToDate
                });
            }

            Logger.info('Попередній перегляд отримано успішно', {
                communityName,
                totalDebtors: result.data?.total_debtors,
                isUpToDate
            });

            // Додаємо інформацію про актуальність до результату
            return {
                ...result,
                is_up_to_date: isUpToDate,
                local_latest_date: localLatestDate
            };

        } catch (error) {
            Logger.error('Помилка отримання попереднього перегляду', {
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
        // Валідація community_name
        const validation = await communityValidator.validate(communityName);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            Logger.info('Запит списку доступних дат', {
                communityName,
                limit
            });

            // Запит до віддаленої БД для отримання списку дат
            const result = await rabbitmqClient.sendTaskWithReply(
                'query_database',
                {
                    community_name: communityName,
                    query_type: 'get_available_dates',
                    params: { limit }
                },
                10000 // 10 секунд
            );

            Logger.info('Отримано відповідь від worker', {
                communityName,
                resultType: typeof result,
                resultKeys: result ? Object.keys(result) : null,
                success: result?.success,
                dataType: typeof result?.data,
                isArray: Array.isArray(result?.data),
                dataLength: result?.data?.length
            });

            if (!result.success) {
                Logger.error('Worker повернув помилку', {
                    communityName,
                    error: result.error
                });
                throw new Error(result.error || 'Помилка отримання списку дат');
            }

            Logger.info('Список доступних дат отримано', {
                communityName,
                datesCount: result.data?.length || 0,
                dates: result.data
            });

            return result;

        } catch (error) {
            Logger.error('Помилка отримання списку доступних дат', {
                error: error.message,
                stack: error.stack,
                communityName
            });
            throw error;
        }
    }
}

module.exports = new tasksService();