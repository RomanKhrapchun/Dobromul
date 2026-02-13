const axios = require('axios');

/**
 * Модуль для запуску сесії з Telegram ботом для відправки повідомлень
 */
class TelegramSession {
    /**
     * @param {string} botToken - BOT_TOKEN з .env
     * @param {Function} sqlRequest - Функція для виконання SQL запитів
     * @param {Object} logger - Logger instance (опціонально)
     */
    constructor(botToken, sqlRequest, logger = console) {
        if (!botToken || typeof botToken !== 'string') {
            throw new Error('BOT_TOKEN має бути непорожнім рядком');
        }

        this.botToken = botToken;
        this.sqlRequest = sqlRequest;
        this.logger = logger;
    }

    /**
     * Внутрішній метод для відправки повідомлення
     * @private
     */
    async _sendMessage(chatId, text, options = {}) {
        try {
            const response = await axios.post(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    chat_id: chatId,
                    text: text,
                    parse_mode: options.parse_mode || 'HTML',
                    ...(options.protect_content && { protect_content: true }),
                    ...(options.reply_markup && { reply_markup: options.reply_markup })
                }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Відправляє повідомлення всім користувачам з бази даних
     * @param {string} messageText - Текст повідомлення для відправки
     * @param {Object} options - Опції для відправки повідомлення
     * @param {string} options.parse_mode - Режим парсингу (default: "HTML")
     * @param {boolean} options.protect_content - Захист контенту від пересилання
     * @param {Function} options.onProgress - Callback для відстеження прогресу
     * @param {Function} options.onComplete - Callback після завершення відправки
     * @param {Function} options.onError - Callback при виникненні помилки
     * @returns {Promise<Object>} Статистика відправки
     */
    async sendToAll(messageText, options = {}) {
        const {
            parse_mode = "HTML",
            protect_content = false,
            onProgress = null,
            onComplete = null,
            onError = null
        } = options;

        try {
            // Отримуємо список користувачів з бази даних
            const userData = await this.sqlRequest('select acc_chat_id from ower.account');

            if (!userData || !Array.isArray(userData) || userData.length === 0) {
                this.logger.warn('No users found in database for notification');
                return {
                    success: false,
                    notifiedCount: 0,
                    totalUsers: 0,
                    errors: [],
                    message: 'Не знайдено користувачів для відправки повідомлень'
                };
            }

            const totalUsers = userData.length;
            let notifiedCount = 0;
            const errors = [];

            this.logger.info(`Starting message delivery to ${totalUsers} users`);

            // Створюємо масив промісів для відправки
            const sendPromises = userData.map((item, index) => {
                return this._sendMessage(
                    item['acc_chat_id'],
                    messageText,
                    {
                        parse_mode,
                        protect_content
                    }
                )
                .then(() => {
                    notifiedCount++;

                    // Викликаємо callback прогресу
                    if (onProgress && typeof onProgress === 'function') {
                        onProgress({
                            current: notifiedCount,
                            total: totalUsers,
                            percentage: Math.round((notifiedCount / totalUsers) * 100)
                        });
                    }

                    return { success: true, chatId: item['acc_chat_id'] };
                })
                .catch(e => {
                    const error = {
                        chatId: item['acc_chat_id'],
                        error: e.message,
                        code: e.code
                    };
                    errors.push(error);

                    // Логуємо помилку (ігноруємо 403 - користувач заблокував бота)
                    if (e.response && e.response.error_code === 403) {
                        this.logger.warn(`User ${item['acc_chat_id']} blocked the bot`);
                    } else {
                        this.logger.error(`Error sending notification to ${item['acc_chat_id']}: ${e.message}`);
                    }

                    return { success: false, chatId: item['acc_chat_id'], error: e.message };
                });
            });

            // Чекаємо на результати всіх відправлень
            const results = await Promise.allSettled(sendPromises);

            // Підраховуємо успішні відправлення
            notifiedCount = results.filter(result =>
                result.status === 'fulfilled' && result.value.success === true
            ).length;

            const stats = {
                success: true,
                notifiedCount,
                totalUsers,
                failedCount: totalUsers - notifiedCount,
                successRate: ((notifiedCount / totalUsers) * 100).toFixed(2),
                errors: errors.length > 0 ? errors : null
            };

            this.logger.info(`Message delivery completed: ${notifiedCount}/${totalUsers} users notified`);

            // Викликаємо callback завершення
            if (onComplete && typeof onComplete === 'function') {
                onComplete(stats);
            }

            return stats;

        } catch (error) {
            this.logger.error(`Overall notification process error: ${error.message}`);

            const errorResult = {
                success: false,
                notifiedCount: 0,
                totalUsers: 0,
                error: error.message,
                stack: error.stack
            };

            // Викликаємо callback помилки
            if (onError && typeof onError === 'function') {
                onError(errorResult);
            }

            throw error;
        }
    }

    /**
     * Відправляє повідомлення конкретному користувачу
     * @param {number|string} chatId - ID чату користувача
     * @param {string} messageText - Текст повідомлення
     * @param {Object} options - Опції для відправки
     * @returns {Promise<Object>} Результат відправки
     */
    async sendToUser(chatId, messageText, options = {}) {
        const {
            parse_mode = "HTML",
            protect_content = false,
            reply_markup = null
        } = options;

        try {
            const result = await this._sendMessage(
                chatId,
                messageText,
                {
                    parse_mode,
                    protect_content,
                    ...(reply_markup && { reply_markup })
                }
            );

            this.logger.info(`Message sent successfully to user ${chatId}`);

            return {
                success: true,
                chatId,
                messageId: result.message_id
            };

        } catch (error) {
            this.logger.error(`Error sending message to ${chatId}: ${error.message}`);

            return {
                success: false,
                chatId,
                error: error.message
            };
        }
    }

    /**
     * Відправляє повідомлення групі користувачів за їх chat_id
     * @param {Array<number|string>} chatIds - Масив ID чатів
     * @param {string} messageText - Текст повідомлення
     * @param {Object} options - Опції для відправки
     * @returns {Promise<Object>} Статистика відправки
     */
    async sendToGroup(chatIds, messageText, options = {}) {
        if (!Array.isArray(chatIds) || chatIds.length === 0) {
            throw new Error('chatIds має бути непорожнім масивом');
        }

        const {
            parse_mode = "HTML",
            protect_content = false,
            onProgress = null
        } = options;

        const totalUsers = chatIds.length;
        let notifiedCount = 0;
        const errors = [];

        this.logger.info(`Starting message delivery to ${totalUsers} selected users`);

        const sendPromises = chatIds.map(chatId => {
            return this._sendMessage(
                chatId,
                messageText,
                { parse_mode, protect_content }
            )
            .then(() => {
                notifiedCount++;

                if (onProgress && typeof onProgress === 'function') {
                    onProgress({
                        current: notifiedCount,
                        total: totalUsers,
                        percentage: Math.round((notifiedCount / totalUsers) * 100)
                    });
                }

                return { success: true, chatId };
            })
            .catch(e => {
                errors.push({ chatId, error: e.message });
                this.logger.error(`Error sending to ${chatId}: ${e.message}`);
                return { success: false, chatId, error: e.message };
            });
        });

        await Promise.allSettled(sendPromises);

        return {
            success: true,
            notifiedCount,
            totalUsers,
            failedCount: totalUsers - notifiedCount,
            successRate: ((notifiedCount / totalUsers) * 100).toFixed(2),
            errors: errors.length > 0 ? errors : null
        };
    }

    /**
     * Отримує кількість активних користувачів в боті
     * @returns {Promise<number>} Кількість користувачів
     */
    async getUserCount() {
        try {
            const result = await this.sqlRequest('select count(*) from ower.account');
            return result[0]?.count || 0;
        } catch (error) {
            this.logger.error(`Error getting user count: ${error.message}`);
            return 0;
        }
    }

    /**
     * Отримує список всіх chat_id користувачів
     * @returns {Promise<Array>} Масив chat_id
     */
    async getAllChatIds() {
        try {
            const userData = await this.sqlRequest('select acc_chat_id from ower.account');
            return userData.map(user => user.acc_chat_id);
        } catch (error) {
            this.logger.error(`Error getting chat IDs: ${error.message}`);
            return [];
        }
    }
}

module.exports = TelegramSession;
