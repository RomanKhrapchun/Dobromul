const vstPaymentController = require('../controller/vstPaymentController');
const vstPaymentUnifiedController = require('../controller/vstPaymentUnifiedController');
const vstCallbackController = require('../controller/vstCallbackController');
const vstApiKeyMiddleware = require('./vstApiKeyMiddleware');

/**
 * VST Payment API Routes
 *
 * Endpoints:
 * - GET /vst-payment?identifier={identifier} - Універсальний endpoint для податків та адмін послуг
 * - GET /vst-payment/status?payment_id={id}&transaction_id={id} - Перевірка статусу платежу
 * - POST /vst-success - Callback endpoint для обробки відповіді від платіжного сервісу
 *
 * ІДЕМПОТЕНТНІСТЬ:
 * - Колбеки можна надсилати необмежену кількість разів
 * - При повторній відправці повертається success замість помилки
 * - Endpoint /vst-payment/status дозволяє перевірити стан перед відправкою колбеку
 *
 * Закоментовані окремі endpoints (залишені для зворотної сумісності):
 * - GET /vst-payment/taxes?identifier={identifier} - Тільки податкові платежі
 * - GET /vst-payment/services?identifier={identifier} - Тільки адміністративні послуги
 */
const routes = async (fastify) => {

  // ============================================================
  // УНІВЕРСАЛЬНИЙ ENDPOINT (рекомендований)
  // ============================================================

  /**
   * Універсальний endpoint для обох типів платежів
   * Автоматично визначає тип за форматом identifier:
   * - Податки: {ID_боржника} + цифра 1-5 (наприклад: 37883900210614120643)
   * - Адмін послуги: account_number (наприклад: ACC0001234)
   */
  fastify.get(
    '/',
    { preHandler: vstApiKeyMiddleware },
    vstPaymentUnifiedController.getPayment
  );

  // ============================================================
  // STATUS ENDPOINT
  // ============================================================

  /**
   * Endpoint для перевірки статусу платежу
   * Дозволяє VST перевіряти стан транзакції перед повторною відправкою колбеку
   *
   * Query params:
   * - payment_id: ідентифікатор платежу (account_number)
   * - transaction_id: (опціонально) ID транзакції
   *
   * Можливі статуси:
   * - initiated: платіж створений, очікує колбек
   * - success: платіж успішно оброблений
   * - failed: платіж не вдався
   */
  fastify.get(
    '/status',
    { preHandler: vstApiKeyMiddleware },
    vstCallbackController.getPaymentStatus
  );

  // ============================================================
  // CALLBACK ENDPOINT
  // ============================================================

  /**
   * Callback endpoint для обробки відповіді від VST платіжного сервісу
   * Приймає дані про успішний/неуспішний платіж та оновлює БД
   *
   * ІДЕМПОТЕНТНІСТЬ: При повторній відправці того самого колбеку
   * повертається success замість помилки "вже опрацьовано"
   *
   * Немає обмеження на кількість спроб - можна надсилати необмежено
   */
  fastify.post(
    '/vst-success',
    vstCallbackController.vstSuccessCallback
  );

  // ============================================================
  // CLEANUP ENDPOINT (для адміністраторів)
  // ============================================================

  /**
   * Ручний запуск очищення прострочених транзакцій
   * Змінює статус 'initiated' на 'expired' для транзакцій старших за 24 години
   *
   * Query params:
   * - hours: кількість годин (за замовч. 24)
   *
   * Приклад: GET /vst-payment/cleanup-expired?hours=24
   */
  fastify.get(
    '/cleanup-expired',
    { preHandler: vstApiKeyMiddleware },
    vstCallbackController.cleanupExpiredTransactions
  );

  // ============================================================
  // СТАРІ ОКРЕМІ ENDPOINTS (закоментовані, можна розкоментувати)
  // ============================================================

  /*
  // Податкові платежі (окремий endpoint)
  fastify.get(
    '/vst-payment/taxes',
    { preHandler: vstApiKeyMiddleware },
    vstPaymentController.getTaxPayment
  );

  // Адміністративні послуги (окремий endpoint)
  fastify.get(
    '/vst-payment/services',
    { preHandler: vstApiKeyMiddleware },
    vstPaymentController.getServicePayment
  );
  */
};

module.exports = routes;
