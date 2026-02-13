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
 * GET /vst-payment/taxes?identifier={identifier}
 * Отримання інформації про податкові платежі з БД
 * identifier - це id боржника з таблиці ower.ower
 */
async function getTaxPayment(req, reply) {
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

    // Витягуємо останню цифру (тип податку 1-5)
    const lastDigit = parseInt(identifier.charAt(identifier.length - 1));

    // Перевіряємо чи остання цифра від 1 до 5
    if (isNaN(lastDigit) || lastDigit < 1 || lastDigit > 5) {
      return reply.code(400).send({
        success: false,
        message: 'Некоректний identifier: остання цифра має бути від 1 до 5',
        error: 'INVALID_TAX_CODE'
      });
    }

    // Видаляємо останню цифру щоб отримати справжній ID боржника
    const debtorId = identifier.slice(0, -1);

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
      return reply.code(404).send({
        success: false,
        message: 'Боржника з вказаним identifier не знайдено',
        error: 'DEBTOR_NOT_FOUND'
      });
    }

    const debtor = result[0];

    // Отримуємо інформацію про податок за останньою цифрою
    const taxInfo = getTaxByIdentifier(identifier);

    if (!taxInfo) {
      return reply.code(404).send({
        success: false,
        message: 'Платіж з вказаним identifier не знайдено',
        error: 'TAX_NOT_FOUND'
      });
    }

    // Визначаємо суму боргу в залежності від типу податку
    let debtAmount = 0;
    switch (lastDigit) {
      case 1: // Житлова нерухомість
        debtAmount = debtor.residential_debt || 0;
        break;
      case 2: // Нежитлова нерухомість
        debtAmount = debtor.non_residential_debt || 0;
        break;
      case 3: // Земельний податок
        debtAmount = debtor.land_debt || 0;
        break;
      case 4: // Орендна плата
        debtAmount = debtor.orenda_debt || 0;
        break;
      case 5: // МПЗ
        debtAmount = debtor.mpz || 0;
        break;
      default:
        debtAmount = 0;
    }

    // Конвертуємо суму в копійки
    const sumInKopecks = Math.round(debtAmount * 100);

    // Формування відповіді
    const response = {
      AccountPayment: {
        ID: identifier,
        Code: taxInfo.code,
        Name: taxInfo.name,
        Sum: sumInKopecks,
        Type: taxInfo.type,
        Account: taxInfo.account,
        EDRPOU: taxInfo.edrpou,
        RecipientName: taxInfo.recipientName,
        SenderName: debtor.name
      },
      CallBackURL: process.env.VST_CALLBACK_URL || 'https://admin.test.skydatagroup.com/vst-success',
      Transaction: {
        TerminalID: '1',
        DateTime: formatDate(new Date()),
        TransactionID: crypto.randomUUID()
      }
    };

    return reply.code(200).send(response);
  } catch (error) {
    console.error('Error in getTaxPayment:', error);
    return reply.code(500).send({
      success: false,
      message: 'Внутрішня помилка сервера',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * GET /vst-payment/services?identifier={identifier}
 * Отримання інформації про адміністративні послуги з БД
 * identifier - це account_number з таблиці admin.cnap_accounts
 */
async function getServicePayment(req, reply) {
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
      return reply.code(404).send({
        success: false,
        message: 'Рахунок з вказаним identifier не знайдено або вже оплачено',
        error: 'ACCOUNT_NOT_FOUND'
      });
    }

    const account = result[0];

    // Перевірка чи послуга існує
    if (!account.service_code || !account.service_name) {
      return reply.code(404).send({
        success: false,
        message: 'Послугу для цього рахунку не знайдено',
        error: 'SERVICE_NOT_FOUND'
      });
    }

    // Конвертація суми у копійки
    const sumInKopecks = Math.round(account.amount * 100);

    // Формування відповіді
    const response = {
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
        DateTime: formatDate(new Date()),
        TransactionID: crypto.randomUUID()
      }
    };

    return reply.code(200).send(response);
  } catch (error) {
    console.error('Error in getServicePayment:', error);
    return reply.code(500).send({
      success: false,
      message: 'Внутрішня помилка сервера',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

module.exports = {
  getTaxPayment,
  getServicePayment
};
