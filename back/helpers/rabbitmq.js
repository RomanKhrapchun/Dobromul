// helpers/rabbitmq.js
const amqp = require('amqplib');
const crypto = require('crypto');
const Logger = require('../utils/logger');

class RabbitMQClient {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.replyQueue = null;
        this.pendingRequests = new Map(); // correlation_id -> resolve/reject
        
        this.config = {
            host: process.env.RABBITMQ_HOST || 'localhost',
            port: parseInt(process.env.RABBITMQ_PORT) || 5672,
            username: process.env.RABBITMQ_USER || 'guest',
            password: process.env.RABBITMQ_PASS || 'guest',
            vhost: process.env.RABBITMQ_VHOST || '/',
            queue: process.env.RABBITMQ_QUEUE || 'debtor_tasks'
        };
    }

    /**
     * Підключення до RabbitMQ та створення reply черги
     */
    async connect() {
        if (this.connection && this.channel) {
            return;
        }

        try {
            const connectionUrl = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}${this.config.vhost}`;
            
            Logger.info('Підключення до RabbitMQ...', {
                host: this.config.host,
                port: this.config.port
            });

            this.connection = await amqp.connect(connectionUrl);
            this.channel = await this.connection.createChannel();

            // Оголошуємо основну чергу
            await this.channel.assertQueue(this.config.queue, { durable: true });

            // Створюємо ексклюзивну чергу для отримання відповідей (RPC)
            const q = await this.channel.assertQueue('', { exclusive: true });
            this.replyQueue = q.queue;

            // Слухаємо відповіді від Worker
            this.channel.consume(this.replyQueue, (msg) => {
                Logger.info('Отримано повідомлення з RabbitMQ', {
                    correlationId: msg.properties.correlationId,
                    contentType: msg.properties.contentType,
                    messageLength: msg.content.length,
                    properties: msg.properties,
                    pendingRequestsCount: this.pendingRequests.size,
                    pendingKeys: Array.from(this.pendingRequests.keys())
                });

                const correlationId = msg.properties.correlationId;
                const request = this.pendingRequests.get(correlationId);

                if (request) {
                    try {
                        const content = msg.content.toString();
                        Logger.info('Обробка відповіді', {
                            correlationId,
                            contentPreview: content.substring(0, 200)
                        });
                        const result = JSON.parse(content);
                        Logger.info('Відповідь успішно розпарсена', {
                            correlationId,
                            resultType: typeof result,
                            isArray: Array.isArray(result)
                        });
                        request.resolve(result);
                    } catch (error) {
                        Logger.error('Помилка обробки відповіді', {
                            correlationId,
                            error: error.message,
                            content: msg.content.toString()
                        });
                        request.reject(error);
                    } finally {
                        this.pendingRequests.delete(correlationId);
                    }
                } else {
                    Logger.warn('Отримано відповідь для невідомого correlationId', {
                        correlationId,
                        availableCorrelationIds: Array.from(this.pendingRequests.keys())
                    });
                }

                this.channel.ack(msg);
            }, { noAck: false });

            Logger.info('Успішно підключено до RabbitMQ', {
                queue: this.config.queue,
                replyQueue: this.replyQueue
            });

            // Обробка помилок
            this.connection.on('error', (err) => {
                Logger.error('RabbitMQ connection error', { error: err.message });
            });

            this.connection.on('close', () => {
                Logger.warn('RabbitMQ connection closed');
                this.connection = null;
                this.channel = null;
                this.replyQueue = null;
            });

        } catch (error) {
            Logger.error('Не вдалося підключитися до RabbitMQ', {
                error: error.message,
                host: this.config.host
            });
            throw error;
        }
    }

    /**
     * Відправка завдання з очікуванням відповіді (RPC)
     */
    async sendTaskWithReply(taskType, payload, timeout = 60000) {
        await this.connect();

        return new Promise((resolve, reject) => {
            //const correlationId = uuidv4();
            const correlationId = crypto.randomUUID();
            const message = {
                type: taskType,
                payload: payload,
                timestamp: new Date().toISOString()
            };

            // Таймаут для запиту
            const timer = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error('Timeout: Worker не відповів вчасно'));
            }, timeout);

            // Зберігаємо promise
            this.pendingRequests.set(correlationId, {
                resolve: (result) => {
                    clearTimeout(timer);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            });

            // Відправляємо повідомлення
            this.channel.sendToQueue(
                this.config.queue,
                Buffer.from(JSON.stringify(message)),
                {
                    correlationId: correlationId,
                    replyTo: this.replyQueue,
                    persistent: true,
                    contentType: 'application/json'
                }
            );

            Logger.info('Завдання відправлено в RabbitMQ', {
                correlationId,
                taskType,
                communityName: payload.community_name
            });
        });
    }

    /**
     * Простий fire-and-forget (без очікування відповіді)
     */
    async sendTask(taskType, payload) {
        await this.connect();

        const message = {
            type: taskType,
            payload: payload,
            timestamp: new Date().toISOString()
        };

        this.channel.sendToQueue(
            this.config.queue,
            Buffer.from(JSON.stringify(message)),
            {
                persistent: true,
                contentType: 'application/json'
            }
        );

        Logger.info('Завдання відправлено (fire-and-forget)', {
            taskType,
            communityName: payload.community_name
        });
    }

    /**
     * Закриття підключення
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            Logger.info('RabbitMQ підключення закрито');
        } catch (error) {
            Logger.error('Помилка закриття RabbitMQ', { error: error.message });
        }
        this.connection = null;
        this.channel = null;
        this.replyQueue = null;
    }
}

module.exports = new RabbitMQClient();