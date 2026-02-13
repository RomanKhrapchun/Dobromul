const { getTaxByIdentifier } = require('../../../utils/vstTaxCodes');
const { sqlRequest } = require('../../../helpers/database');
const crypto = require('crypto');

/**
 * Форматування дати у форматі YYYY-MM-DD HH:mm:ss
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Перевірка чи це податковий identifier
 * Податковий identifier: {ID_боржника} + цифра від 1 до 5
 */
function isTaxIdentifier(identifier) {
  const lastChar = identifier.charAt(identifier.length - 1);
  const lastDigit = parseInt(lastChar);

  // Перевіряємо чи остання цифра від 1 до 5
  if (isNaN(lastDigit) || lastDigit < 1 || lastDigit > 5) {
    return false;
  }

  // Перевіряємо чи решта це числовий ID
  const possibleId = identifier.slice(0, -1);
  return /^\d+$/.test(possibleId) && possibleId.length > 0;
}

/**
 * Отримати налаштування з ower.settings
 */
async function getOwerSettings() {
  const query = `
    SELECT
      residential_debt_purpose,
      residential_debt_account,
      residential_debt_edrpou,
      residential_debt_recipientname,
      non_residential_debt_purpose,
      non_residential_debt_account,
      non_residential_debt_edrpou,
      non_residential_debt_recipientname,
      land_debt_purpose,
      land_debt_account,
      land_debt_edrpou,
      land_debt_recipientname,
      orenda_debt_purpose,
      orenda_debt_account,
      orenda_debt_edrpou,
      orenda_debt_recipientname,
      mpz_purpose,
      mpz_account,
      mpz_edrpou,
      mpz_recipientname,
      callback_url,
      callback_pay_success
    FROM ower.settings
    ORDER BY date DESC
    LIMIT 1
  `;

  const result = await sqlRequest(query);
  return result[0] || null;
}

/**
 * Отримати реквізити для типу податку з налаштувань
 */
function getRequisitesFromSettings(settings, settingsPrefix) {
  if (!settings || !settingsPrefix) {
    return null;
  }

  return {
    account: settings[`${settingsPrefix}_account`],
    edrpou: settings[`${settingsPrefix}_edrpou`],
    recipientName: settings[`${settingsPrefix}_recipientname`],
    purpose: settings[`${settingsPrefix}_purpose`]
  };
}

/**
 * Обробка податкового платежу
 */
async function processTaxPayment(identifier) {
  // Витягуємо останню цифру (тип податку 1-5)
  const lastDigit = parseInt(identifier.charAt(identifier.length - 1));

  // Видаляємо останню цифру щоб отримати справжній ID боржника
  const debtorId = identifier.slice(0, -1);

  // Отримуємо налаштування з БД
  const settings = await getOwerSettings();

  if (!settings) {
    console.error('Не вдалося отримати налаштування з ower.settings');
    return null;
  }

  // Отримуємо дані боржника з БД за id
  const query = `
    SELECT
      id,
      name,
      identification,
      non_residential_debt,
      residential_debt,
      land_debt,
      orenda_debt,
      mpz,
      date
    FROM ower.ower
    WHERE id = $1
  `;

  const result = await sqlRequest(query, [debtorId]);

  if (!result || result.length === 0) {
    return null;
  }

  const debtor = result[0];

  // Отримуємо інформацію про податок (код, назва, тип, settingsPrefix)
  const taxInfo = getTaxByIdentifier(identifier);

  if (!taxInfo) {
    return null;
  }

  // Отримуємо реквізити з налаштувань
  const requisites = getRequisitesFromSettings(settings, taxInfo.settingsPrefix);

  if (!requisites || !requisites.account || !requisites.edrpou) {
    console.error(`Не налаштовані реквізити для типу податку: ${taxInfo.settingsPrefix}`);
    return null;
  }

  // Визначаємо суму боргу в залежності від типу податку
  let debtAmount = 0;
  let taxTypeName = '';
  switch (lastDigit) {
    case 1: // Житлова нерухомість
      debtAmount = debtor.residential_debt || 0;
      taxTypeName = 'residential_debt';
      break;
    case 2: // Нежитлова нерухомість
      debtAmount = debtor.non_residential_debt || 0;
      taxTypeName = 'non_residential_debt';
      break;
    case 3: // Земельний податок
      debtAmount = debtor.land_debt || 0;
      taxTypeName = 'land_debt';
      break;
    case 4: // Орендна плата
      debtAmount = debtor.orenda_debt || 0;
      taxTypeName = 'orenda_debt';
      break;
    case 5: // МПЗ
      debtAmount = debtor.mpz || 0;
      taxTypeName = 'mpz';
      break;
    default:
      debtAmount = 0;
      taxTypeName = 'unknown';
  }

  // Конвертуємо суму в копійки
  const sumInKopecks = Math.round(debtAmount * 100);

  // Генеруємо UUID для транзакції
  const transactionUUID = crypto.randomUUID();
  const currentDateTime = formatDate(new Date());

  // Створюємо запис в debtor.transaction
  const insertQuery = `
    INSERT INTO debtor.transaction (
      uuid,
      payment_person,
      person_id,
      account_number,
      account_type,
      operation_status,
      operation_date,
      info,
      cdate
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
    RETURNING id
  `;

  const transactionInfo = {
    identifier: identifier,
    debtorId: debtorId,
    debtorName: debtor.name,
    taxCode: taxInfo.code,
    taxName: taxInfo.name,
    taxType: lastDigit,
    taxTypeName: taxTypeName,
    amount: sumInKopecks,
    amountUAH: debtAmount
  };

  await sqlRequest(insertQuery, [
    transactionUUID,
    debtor.name,
    debtor.identification,
    identifier,
    'debtor',
    'initiated',
    transactionInfo
  ]);

  // Формування відповіді - реквізити з ower.settings
  return {
    AccountPayment: {
      ID: identifier,
      Code: taxInfo.code,
      Name: taxInfo.name,
      Sum: sumInKopecks,
      Type: taxInfo.type,
      Account: requisites.account,
      EDRPOU: requisites.edrpou,
      RecipientName: requisites.recipientName,
      SenderName: debtor.name
    },
    CallBackURL: settings.callback_url || process.env.VST_CALLBACK_URL || 'https://admin.test.skydatagroup.com/vst-success',
    Transaction: {
      TerminalID: '1',
      DateTime: currentDateTime,
      TransactionID: transactionUUID
    }
  };
}

/**
 * Обробка платежу за адміністративні послуги
 */
async function processServicePayment(identifier) {
  // Отримуємо дані рахунку з БД разом з інформацією про послугу
  const query = `
    SELECT
      a.id,
      a.account_number,
      a.service_id,
      a.administrator,
      a.date,
      a.time,
      a.payer,
      a.amount,
      a.enabled,
      s.identifier as service_code,
      s.name as service_name,
      s.price as service_price,
      s.edrpou,
      s.iban
    FROM admin.cnap_accounts a
    LEFT JOIN admin.cnap_services s ON s.identifier = a.service_id
    WHERE a.account_number = $1 AND a.enabled = true
  `;

  const result = await sqlRequest(query, [identifier]);

  if (!result || result.length === 0) {
    return null;
  }

  const account = result[0];

  // Перевірка чи послуга існує
  if (!account.service_code || !account.service_name) {
    return null;
  }

  // Конвертація суми у копійки
  const sumInKopecks = Math.round(account.amount * 100);

  // Генеруємо UUID для транзакції
  const transactionUUID = crypto.randomUUID();
  const currentDateTime = formatDate(new Date());

  // Створюємо запис в debtor.transaction
  const insertQuery = `
    INSERT INTO debtor.transaction (
      uuid,
      payment_person,
      account_number,
      account_type,
      operation_status,
      operation_date,
      info,
      cdate
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
    RETURNING id
  `;

  const transactionInfo = {
    identifier: identifier,
    accountNumber: account.account_number,
    payer: account.payer,
    serviceCode: account.service_code,
    serviceName: account.service_name,
    amount: sumInKopecks,
    amountUAH: account.amount,
    administrator: account.administrator
  };

  await sqlRequest(insertQuery, [
    transactionUUID,
    account.payer,
    identifier,
    'cnap',
    'initiated',
    transactionInfo
  ]);

  // Формування відповіді
  return {
    AccountPayment: {
      ID: identifier,
      Code: account.service_code,
      Name: account.service_name,
      Sum: sumInKopecks,
      Type: '101',
      Account: account.iban,
      EDRPOU: account.edrpou,
      RecipientName: `Одержувач/${account.service_name}/${account.service_code}`,
      SenderName: account.payer
    },
    CallBackURL: process.env.VST_CALLBACK_URL || 'https://admin.test.skydatagroup.com/vst-success',
    Transaction: {
      TerminalID: '1',
      DateTime: currentDateTime,
      TransactionID: transactionUUID
    }
  };
}

/**
 * GET /vst-payment?identifier={identifier}
 * Універсальний endpoint для податків та адміністративних послуг
 *
 * Автоматично визначає тип платежу:
 * - Якщо identifier закінчується на 1-5 і решта це число - податковий платіж
 * - Інакше - адміністративна послуга (account_number)
 */
async function getPayment(req, reply) {
  try {
    const { identifier } = req.query;

    // Валідація параметрів
    if (!identifier || typeof identifier !== 'string') {
      return reply.code(400).send({
        success: false,
        message: 'Некоректний запит: відсутній або невалідний параметр identifier',
        error: 'MISSING_IDENTIFIER'
      });
    }

    let response = null;

    // Спочатку перевіряємо чи це податковий identifier
    if (isTaxIdentifier(identifier)) {
      response = await processTaxPayment(identifier);

      // Якщо знайдено податковий платіж, повертаємо його
      if (response) {
        return reply.code(200).send(response);
      }
    }

    // Якщо не знайдено як податок, пробуємо як адміністративну послугу
    response = await processServicePayment(identifier);

    if (response) {
      return reply.code(200).send(response);
    }

    // Якщо не знайдено ні як податок, ні як адмін послугу
    return reply.code(404).send({
      success: false,
      message: 'Платіж/послугу з вказаним identifier не знайдено',
      error: 'PAYMENT_NOT_FOUND'
    });

  } catch (error) {
    console.error('Error in getPayment:', error);
    return reply.code(500).send({
      success: false,
      message: 'Внутрішня помилка сервера',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

module.exports = {
  getPayment
};
