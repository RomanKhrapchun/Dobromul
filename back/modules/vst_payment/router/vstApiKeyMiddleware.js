/**
 * Middleware для перевірки API ключа VST Payment API
 */
function vstApiKeyMiddleware(req, reply, done) {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];

    if (!apiKey) {
      return reply.code(401).send({
        success: false,
        message: 'API ключ не надано',
        error: 'MISSING_API_KEY'
      });
    }

    // Отримуємо API ключ з .env
    const validApiKey = process.env.VST_API_KEY;

    if (!validApiKey) {
      console.error('VST_API_KEY не налаштовано у .env файлі');
      return reply.code(500).send({
        success: false,
        message: 'Конфігурація сервера не завершена',
        error: 'SERVER_CONFIGURATION_ERROR'
      });
    }

    // Перевірка API ключа
    // Підтримуємо формати: "Bearer {key}" або просто "{key}"
    const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '').trim();

    if (cleanApiKey !== validApiKey) {
      return reply.code(401).send({
        success: false,
        message: 'Невалідний API ключ',
        error: 'INVALID_API_KEY'
      });
    }

    // API ключ валідний, продовжуємо виконання
    done();
  } catch (error) {
    console.error('Error in vstApiKeyMiddleware:', error);
    return reply.code(500).send({
      success: false,
      message: 'Внутрішня помилка сервера',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

module.exports = vstApiKeyMiddleware;
