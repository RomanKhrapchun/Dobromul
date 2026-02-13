const { sqlRequest, withTransaction } = require('../../../helpers/database');
const Logger = require('../../../utils/logger');

/**
 * Перевірка чи це податковий identifier
 */
function isTaxPaymentId(paymentId) {
  const lastChar = paymentId.charAt(paymentId.length - 1);
  const lastDigit = parseInt(lastChar);

  // Перевіряємо чи остання цифра від 1 до 5
  if (isNaN(lastDigit) || lastDigit < 1 || lastDigit > 5) {
    return false;
  }

  // Перевіряємо чи решта це числовий ID
  const possibleId = paymentId.slice(0, -1);
  return /^\d+$/.test(possibleId) && possibleId.length > 0;
}

/**
 * Обробка успішного податкового платежу
 */
async function processTaxPaymentCallback(paymentId, amount, transactionId) {
  // Витягуємо останню цифру (тип податку 1-5)
  const lastDigit = parseInt(paymentId.charAt(paymentId.length - 1));

  // Видаляємо останню цифру щоб отримати справжній ID боржника
  const debtorId = paymentId.slice(0, -1);

  // Отримуємо дані боржника з БД
  const query = `
    SELECT
      id,
      name,
      identification,
      non_residential_debt,
      residential_debt,
      land_debt,
      orenda_debt,
      mpz
    FROM ower.ower
    WHERE id = $1
  `;

  const result = await sqlRequest(query, [debtorId]);

  if (!result || result.length === 0) {
    throw new Error(`Боржника з ID ${debtorId} не знайдено`);
  }

  const debtor = result[0];

  // Конвертуємо суму з копійок в гривні
  const amountInUAH = amount / 100;

  // Визначаємо поле для оновлення та поточний борг
  let fieldToUpdate = '';
  let currentDebt = 0;

  switch (lastDigit) {
    case 1: // Житлова нерухомість
      fieldToUpdate = 'residential_debt';
      currentDebt = debtor.residential_debt || 0;
      break;
    case 2: // Нежитлова нерухомість
      fieldToUpdate = 'non_residential_debt';
      currentDebt = debtor.non_residential_debt || 0;
      break;
    case 3: // Земельний податок
      fieldToUpdate = 'land_debt';
      currentDebt = debtor.land_debt || 0;
      break;
    case 4: // Орендна плата
      fieldToUpdate = 'orenda_debt';
      currentDebt = debtor.orenda_debt || 0;
      break;
    case 5: // МПЗ
      fieldToUpdate = 'mpz';
      currentDebt = debtor.mpz || 0;
      break;
    default:
      throw new Error(`Невідомий тип податку: ${lastDigit}`);
  }

  // Розраховуємо новий борг (не менше 0)
  const newDebt = Math.max(0, currentDebt - amountInUAH);

  // Оновлюємо борг в БД
  const updateQuery = `
    UPDATE ower.ower
    SET ${fieldToUpdate} = $1
    WHERE id = $2
    RETURNING id, name, ${fieldToUpdate}
  `;

  const updateResult = await sqlRequest(updateQuery, [newDebt, debtorId]);

  // Оновлюємо запис в debtor.transaction
  const updateTransactionQuery = `
    UPDATE debtor.transaction
    SET
      operation_id = $1,
      operation_status = $2,
      response_status = $3,
      response_info = $4,
      editor_date = NOW()
    WHERE account_number = $5 AND operation_status IN ('initiated', 'expired')
    RETURNING id
  `;

  const responseInfo = {
    transactionId: transactionId,
    oldDebt: currentDebt,
    paidAmount: amountInUAH,
    newDebt: newDebt,
    fieldUpdated: fieldToUpdate
  };

  await sqlRequest(updateTransactionQuery, [
    transactionId,
    'success',
    'SUCCESS',
    responseInfo,
    paymentId
  ]);

  Logger.info('Tax payment processed', {
    debtorId,
    debtorName: debtor.name,
    taxType: lastDigit,
    fieldUpdated: fieldToUpdate,
    oldDebt: currentDebt,
    paidAmount: amountInUAH,
    newDebt: newDebt,
    transactionId
  });

  return {
    success: true,
    debtor: {
      id: debtorId,
      name: debtor.name,
      taxType: lastDigit,
      fieldUpdated: fieldToUpdate,
      oldDebt: currentDebt,
      paidAmount: amountInUAH,
      newDebt: newDebt
    }
  };
}

/**
 * Обробка успішного платежу за адміністративну послугу
 */
async function processServicePaymentCallback(accountNumber, amount, transactionId) {
  // Отримуємо дані рахунку з БД
  const query = `
    SELECT
      a.id,
      a.account_number,
      a.payer,
      a.amount,
      a.enabled,
      s.name as service_name
    FROM admin.cnap_accounts a
    LEFT JOIN admin.cnap_services s ON s.identifier = a.service_id
    WHERE a.account_number = $1 AND a.enabled = true
  `;

  const result = await sqlRequest(query, [accountNumber]);

  if (!result || result.length === 0) {
    throw new Error(`Рахунок ${accountNumber} не знайдено або вже оплачений`);
  }

  const account = result[0];

  // Конвертуємо суму з копійок в гривні
  const amountInUAH = amount / 100;

  // Перевіряємо чи сума збігається
  if (Math.abs(account.amount - amountInUAH) > 0.01) {
    Logger.warn('Payment amount mismatch', {
      accountNumber,
      expectedAmount: account.amount,
      paidAmount: amountInUAH,
      transactionId
    });
  }

  // // Встановлюємо enabled = false (рахунок оплачений)
  // const updateQuery = `
  //   UPDATE admin.cnap_accounts
  //   SET enabled = false
  //   WHERE account_number = $1
  //   RETURNING id, account_number, payer, amount
  // `;

  // const updateResult = await sqlRequest(updateQuery, [accountNumber]);

  // Оновлюємо запис в debtor.transaction
  const updateTransactionQuery = `
    UPDATE debtor.transaction
    SET
      operation_id = $1,
      operation_status = $2,
      response_status = $3,
      response_info = $4,
      editor_date = NOW()
    WHERE account_number = $5 AND operation_status IN ('initiated', 'expired')
    RETURNING id
  `;

  const responseInfo = {
    transactionId: transactionId,
    accountNumber: accountNumber,
    payer: account.payer,
    serviceName: account.service_name,
    amount: amountInUAH,
    accountDisabled: true
  };

  await sqlRequest(updateTransactionQuery, [
    transactionId,
    'success',
    'SUCCESS',
    responseInfo,
    accountNumber
  ]);

  Logger.info('Service payment processed', {
    accountNumber,
    payer: account.payer,
    serviceName: account.service_name,
    amount: amountInUAH,
    transactionId
  });

  return {
    success: true,
    account: {
      accountNumber: accountNumber,
      payer: account.payer,
      serviceName: account.service_name,
      amount: amountInUAH
    }
  };
}

/**
 * Транзакційна версія обробки податкового платежу
 * Використовує переданий клієнт для атомарної обробки
 */
async function processTaxPaymentCallbackTx(client, paymentId, amount, transactionId) {
  const lastDigit = parseInt(paymentId.charAt(paymentId.length - 1));
  const debtorId = paymentId.slice(0, -1);

  const query = `
    SELECT
      id, name, identification,
      non_residential_debt, residential_debt,
      land_debt, orenda_debt, mpz
    FROM ower.ower
    WHERE id = $1
  `;

  const result = await client.query(query, [debtorId]);

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Боржника з ID ${debtorId} не знайдено`);
  }

  const debtor = result.rows[0];
  const amountInUAH = amount / 100;

  let fieldToUpdate = '';
  let currentDebt = 0;

  switch (lastDigit) {
    case 1:
      fieldToUpdate = 'residential_debt';
      currentDebt = debtor.residential_debt || 0;
      break;
    case 2:
      fieldToUpdate = 'non_residential_debt';
      currentDebt = debtor.non_residential_debt || 0;
      break;
    case 3:
      fieldToUpdate = 'land_debt';
      currentDebt = debtor.land_debt || 0;
      break;
    case 4:
      fieldToUpdate = 'orenda_debt';
      currentDebt = debtor.orenda_debt || 0;
      break;
    case 5:
      fieldToUpdate = 'mpz';
      currentDebt = debtor.mpz || 0;
      break;
    default:
      throw new Error(`Невідомий тип податку: ${lastDigit}`);
  }

  const newDebt = Math.max(0, currentDebt - amountInUAH);

  // АТОМАРНО: Оновлюємо борг в БД
  const updateQuery = `
    UPDATE ower.ower
    SET ${fieldToUpdate} = $1
    WHERE id = $2
    RETURNING id, name, ${fieldToUpdate}
  `;

  await client.query(updateQuery, [newDebt, debtorId]);

  // АТОМАРНО: Оновлюємо запис в debtor.transaction
  const responseInfo = {
    transactionId: transactionId,
    oldDebt: currentDebt,
    paidAmount: amountInUAH,
    newDebt: newDebt,
    fieldUpdated: fieldToUpdate
  };

  const updateTransactionQuery = `
    UPDATE debtor.transaction
    SET
      operation_id = $1,
      operation_status = $2,
      response_status = $3,
      response_info = $4,
      editor_date = NOW()
    WHERE account_number = $5 AND operation_status IN ('initiated', 'expired')
    RETURNING id
  `;

  await client.query(updateTransactionQuery, [
    transactionId,
    'success',
    'SUCCESS',
    JSON.stringify(responseInfo),
    paymentId
  ]);

  Logger.info('Tax payment processed (TX)', {
    debtorId,
    debtorName: debtor.name,
    taxType: lastDigit,
    fieldUpdated: fieldToUpdate,
    oldDebt: currentDebt,
    paidAmount: amountInUAH,
    newDebt: newDebt,
    transactionId
  });

  return {
    success: true,
    debtor: {
      id: debtorId,
      name: debtor.name,
      taxType: lastDigit,
      fieldUpdated: fieldToUpdate,
      oldDebt: currentDebt,
      paidAmount: amountInUAH,
      newDebt: newDebt
    }
  };
}

/**
 * Транзакційна версія обробки платежу за адмін послугу
 * Використовує переданий клієнт для атомарної обробки
 * Примітка: enabled = false НЕ встановлюється (за вимогою)
 */
async function processServicePaymentCallbackTx(client, accountNumber, amount, transactionId) {
  const query = `
    SELECT
      a.id, a.account_number, a.payer, a.amount, a.enabled,
      s.name as service_name
    FROM admin.cnap_accounts a
    LEFT JOIN admin.cnap_services s ON s.identifier = a.service_id
    WHERE a.account_number = $1 AND a.enabled = true
  `;

  const result = await client.query(query, [accountNumber]);

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Рахунок ${accountNumber} не знайдено або вже оплачений`);
  }

  const account = result.rows[0];
  const amountInUAH = amount / 100;

  if (Math.abs(account.amount - amountInUAH) > 0.01) {
    Logger.warn('Payment amount mismatch', {
      accountNumber,
      expectedAmount: account.amount,
      paidAmount: amountInUAH,
      transactionId
    });
  }

  // Примітка: enabled = false НЕ встановлюється (закоментовано за вимогою)
  // const updateAccountQuery = `
  //   UPDATE admin.cnap_accounts SET enabled = false WHERE account_number = $1
  // `;
  // await client.query(updateAccountQuery, [accountNumber]);

  const responseInfo = {
    transactionId: transactionId,
    accountNumber: accountNumber,
    payer: account.payer,
    serviceName: account.service_name,
    amount: amountInUAH,
    accountDisabled: false // false бо не оновлюємо
  };

  const updateTransactionQuery = `
    UPDATE debtor.transaction
    SET
      operation_id = $1,
      operation_status = $2,
      response_status = $3,
      response_info = $4,
      editor_date = NOW()
    WHERE account_number = $5 AND operation_status IN ('initiated', 'expired')
    RETURNING id
  `;

  await client.query(updateTransactionQuery, [
    transactionId,
    'success',
    'SUCCESS',
    JSON.stringify(responseInfo),
    accountNumber
  ]);

  Logger.info('Service payment processed (TX)', {
    accountNumber,
    payer: account.payer,
    serviceName: account.service_name,
    amount: amountInUAH,
    transactionId
  });

  return {
    success: true,
    account: {
      accountNumber: accountNumber,
      payer: account.payer,
      serviceName: account.service_name,
      amount: amountInUAH
    }
  };
}

/**
 * Перевірка чи платіж вже був оброблений І захоплення блокування
 * Використовує SELECT FOR UPDATE SKIP LOCKED для атомарного блокування
 *
 * @param {object} client - PostgreSQL client в транзакції
 * @param {string} paymentId - ID платежу
 * @param {string} transactionId - ID транзакції (опціонально)
 * @returns {object} - { alreadyProcessed, data, locked, skipped }
 */
async function checkAndLockTransaction(client, paymentId, transactionId) {
  // Перевіряємо чи вже успішно оброблено ТІЛЬКИ за transaction_id (унікальний ідентифікатор колбеку)
  // НЕ перевіряємо за payment_id, бо може бути багато транзакцій з однаковим payment_id
  if (transactionId) {
    const querySuccess = `
      SELECT id, account_number, operation_status, response_status, response_info, editor_date
      FROM debtor.transaction
      WHERE operation_id = $1 AND operation_status = 'success'
      LIMIT 1
    `;
    const resultSuccess = await client.query(querySuccess, [transactionId]);
    if (resultSuccess.rows && resultSuccess.rows.length > 0) {
      return { alreadyProcessed: true, data: resultSuccess.rows[0], locked: null, skipped: false };
    }
  }

  // Блокуємо найновіший initiated або expired запис для обробки (SKIP LOCKED уникає deadlock)
  // expired транзакції можуть бути повторно оброблені якщо VST надсилає колбек пізніше
  const lockQuery = `
    SELECT id, account_number, operation_status
    FROM debtor.transaction
    WHERE account_number = $1 AND operation_status IN ('initiated', 'expired')
    ORDER BY cdate DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;
  const lockResult = await client.query(lockQuery, [paymentId]);

  if (!lockResult.rows || lockResult.rows.length === 0) {
    // Немає initiated/expired запису або вже заблоковано іншим процесом
    return { alreadyProcessed: false, data: null, locked: null, skipped: true };
  }

  return { alreadyProcessed: false, data: null, locked: lockResult.rows[0], skipped: false };
}

/**
 * POST /vst-success
 * Callback endpoint для обробки відповіді від VST платіжного сервісу
 *
 * ІДЕМПОТЕНТНІСТЬ: Якщо колбек вже був оброблений, повертає success
 * замість помилки, що дозволяє необмежену кількість повторних спроб
 *
 * АТОМАРНІСТЬ: Використовує транзакції та FOR UPDATE SKIP LOCKED
 * для захисту від race conditions
 */
async function vstSuccessCallback(req, reply) {
  try {
    const {
      transaction_id,
      payment_id,
      status,
      timestamp,
      amount,
      commission,
      total_amount,
      payer_name,
      payment_method,
      card_mask
    } = req.body;

    // Логування вхідного запиту
    Logger.info('VST callback received', {
      transaction_id,
      payment_id,
      status,
      amount,
      timestamp
    });

    // ========== ВАЛІДАЦІЯ ВХІДНИХ ДАНИХ ==========

    // Перевірка обов'язкових полів
    if (!payment_id || !status || amount === undefined || amount === null) {
      return reply.code(400).send({
        success: false,
        message: 'Відсутні обов\'язкові поля: payment_id, status, amount',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Валідація payment_id
    if (typeof payment_id !== 'string' || payment_id.length === 0 || payment_id.length > 100) {
      return reply.code(400).send({
        success: false,
        message: 'Невалідний payment_id: має бути непустим рядком до 100 символів',
        error: 'INVALID_PAYMENT_ID'
      });
    }

    // Валідація amount
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return reply.code(400).send({
        success: false,
        message: 'Невалідна сума: amount має бути невід\'ємним числом',
        error: 'INVALID_AMOUNT'
      });
    }

    if (numericAmount === 0) {
      Logger.warn('Zero amount payment received', { payment_id, transaction_id });
    }

    // Валідація transaction_id (опціональний)
    const validTransactionId = transaction_id && typeof transaction_id === 'string'
      ? transaction_id
      : null;

    // Перевіряємо статус платежу (регістронезалежно)
    const normalizedStatus = status.toUpperCase();

    if (normalizedStatus !== 'SUCCESS') {
      Logger.warn('Payment not successful', {
        transaction_id: validTransactionId,
        payment_id,
        status,
        normalizedStatus
      });

      return reply.code(200).send({
        success: true,
        message: `Платіж не успішний. Статус: ${status}`,
        processed: false,
        status: normalizedStatus
      });
    }

    // ========== АТОМАРНА ОБРОБКА З ТРАНЗАКЦІЄЮ ==========
    const result = await withTransaction(async (client) => {
      // Крок 1: Перевірка та блокування
      const lockResult = await checkAndLockTransaction(client, payment_id, validTransactionId);

      // Якщо вже оброблено - повертаємо інформацію
      if (lockResult.alreadyProcessed) {
        return {
          type: 'already_processed',
          data: lockResult.data
        };
      }

      // Якщо skipped (інший процес обробляє або не знайдено) - повертаємо спеціальний статус
      if (lockResult.skipped) {
        return {
          type: 'skipped',
          message: 'Транзакція вже обробляється іншим процесом або не знайдена'
        };
      }

      // Крок 2: Обробка платежу в тій же транзакції
      let paymentResult;
      if (isTaxPaymentId(payment_id)) {
        paymentResult = await processTaxPaymentCallbackTx(client, payment_id, numericAmount, validTransactionId);
      } else {
        paymentResult = await processServicePaymentCallbackTx(client, payment_id, numericAmount, validTransactionId);
      }

      return {
        type: 'processed',
        data: paymentResult
      };
    });

    // ========== ФОРМУВАННЯ ВІДПОВІДІ ==========
    if (result.type === 'already_processed') {
      Logger.info('Callback already processed, returning success (idempotent)', {
        transaction_id: validTransactionId,
        payment_id,
        originalProcessedAt: result.data.editor_date
      });

      return reply.code(200).send({
        success: true,
        message: 'Платіж вже був успішно оброблений раніше',
        processed: true,
        already_processed: true,
        transaction_id: validTransactionId,
        original_processed_at: result.data.editor_date,
        response_info: result.data.response_info
      });
    }

    if (result.type === 'skipped') {
      Logger.warn('Transaction locked by another process or not found', {
        transaction_id: validTransactionId,
        payment_id
      });

      return reply.code(200).send({
        success: true,
        message: result.message,
        processed: false,
        reason: 'concurrent_processing'
      });
    }

    // Успішна відповідь
    return reply.code(200).send({
      success: true,
      message: 'Платіж успішно оброблений',
      processed: true,
      already_processed: false,
      transaction_id: validTransactionId,
      ...result.data
    });

  } catch (error) {
    Logger.error('Error in vstSuccessCallback', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    return reply.code(500).send({
      success: false,
      message: 'Помилка обробки платежу',
      error: error.message
    });
  }
}

/**
 * GET /vst-payment/status
 * Отримання статусу платежу за його ідентифікатором
 *
 * Query params:
 * - payment_id: ідентифікатор платежу (account_number)
 * - transaction_id: (опціонально) ID транзакції
 *
 * Дозволяє VST перевіряти стан транзакції перед повторною відправкою колбеку
 */
async function getPaymentStatus(req, reply) {
  try {
    const { payment_id, transaction_id } = req.query;

    // Валідація - потрібен хоча б один ідентифікатор
    if (!payment_id && !transaction_id) {
      return reply.code(400).send({
        success: false,
        message: 'Потрібен хоча б один параметр: payment_id або transaction_id',
        error: 'MISSING_IDENTIFIER'
      });
    }

    Logger.info('Payment status check requested', {
      payment_id,
      transaction_id
    });

    let query = '';
    let params = [];

    if (transaction_id) {
      // Пошук за transaction_id (зберігається в operation_id)
      query = `
        SELECT
          id,
          uuid,
          account_number as payment_id,
          operation_id as transaction_id,
          operation_status,
          response_status,
          response_info,
          operation_date,
          editor_date,
          info
        FROM debtor.transaction
        WHERE operation_id = $1
        ORDER BY cdate DESC
        LIMIT 1
      `;
      params = [transaction_id];
    } else {
      // Пошук за payment_id (account_number)
      query = `
        SELECT
          id,
          uuid,
          account_number as payment_id,
          operation_id as transaction_id,
          operation_status,
          response_status,
          response_info,
          operation_date,
          editor_date,
          info
        FROM debtor.transaction
        WHERE account_number = $1
        ORDER BY cdate DESC
        LIMIT 1
      `;
      params = [payment_id];
    }

    const result = await sqlRequest(query, params);

    if (!result || result.length === 0) {
      return reply.code(404).send({
        success: false,
        message: 'Транзакцію не знайдено',
        error: 'TRANSACTION_NOT_FOUND',
        payment_id: payment_id,
        transaction_id: transaction_id
      });
    }

    const transaction = result[0];

    // Формуємо відповідь зі статусом
    return reply.code(200).send({
      success: true,
      status: transaction.operation_status,
      data: {
        payment_id: transaction.payment_id,
        transaction_id: transaction.transaction_id,
        internal_uuid: transaction.uuid,
        operation_status: transaction.operation_status,
        response_status: transaction.response_status,
        operation_date: transaction.operation_date,
        processed_date: transaction.editor_date,
        info: transaction.info,
        response_info: transaction.response_info
      }
    });

  } catch (error) {
    Logger.error('Error in getPaymentStatus', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });

    return reply.code(500).send({
      success: false,
      message: 'Помилка отримання статусу платежу',
      error: error.message
    });
  }
}

/**
 * Очищення прострочених транзакцій
 * Змінює статус 'initiated' на 'expired' для транзакцій старших за вказану кількість годин
 *
 * @param {number} hoursThreshold - Кількість годин після яких транзакція вважається простроченою (за замовч. 24)
 * @returns {object} - Результат операції з кількістю оновлених записів
 */
async function expireOldTransactions(hoursThreshold = 24) {
  try {
    Logger.info('Starting expired transactions cleanup', { hoursThreshold });

    const query = `
      UPDATE debtor.transaction
      SET
        operation_status = 'expired',
        response_status = 'TIMEOUT',
        response_info = jsonb_build_object(
          'expired_at', NOW(),
          'reason', 'Transaction timeout after ' || $1 || ' hours',
          'original_status', 'initiated'
        ),
        editor_date = NOW()
      WHERE
        operation_status = 'initiated'
        AND cdate < NOW() - INTERVAL '1 hour' * $1
      RETURNING id, uuid, account_number, cdate
    `;

    const result = await sqlRequest(query, [hoursThreshold]);
    const expiredCount = result ? result.length : 0;

    Logger.info('Expired transactions cleanup completed', {
      expiredCount,
      hoursThreshold,
      expiredIds: result ? result.map(r => r.id) : []
    });

    return {
      success: true,
      expiredCount,
      expiredTransactions: result || []
    };
  } catch (error) {
    Logger.error('Error in expireOldTransactions', {
      error: error.message,
      stack: error.stack,
      hoursThreshold
    });

    throw error;
  }
}

/**
 * GET /vst-payment/cleanup-expired
 * Ручний запуск очищення прострочених транзакцій (для адміністраторів)
 */
async function cleanupExpiredTransactions(req, reply) {
  try {
    const { hours } = req.query;
    const hoursThreshold = hours ? parseInt(hours) : 24;

    if (isNaN(hoursThreshold) || hoursThreshold < 1) {
      return reply.code(400).send({
        success: false,
        message: 'Параметр hours має бути цілим числом >= 1',
        error: 'INVALID_HOURS_PARAMETER'
      });
    }

    const result = await expireOldTransactions(hoursThreshold);

    return reply.code(200).send({
      success: true,
      message: `Очищено ${result.expiredCount} прострочених транзакцій`,
      ...result
    });
  } catch (error) {
    Logger.error('Error in cleanupExpiredTransactions endpoint', {
      error: error.message,
      stack: error.stack
    });

    return reply.code(500).send({
      success: false,
      message: 'Помилка очищення прострочених транзакцій',
      error: error.message
    });
  }
}

module.exports = {
  vstSuccessCallback,
  getPaymentStatus,
  expireOldTransactions,
  cleanupExpiredTransactions
};
