/**
 * Маппер кодів бюджетної класифікації для податків
 * Визначення типу податку за останньою цифрою identifier'а
 *
 * Реквізити (IBAN, ЄДРПОУ, назва одержувача) беруться з ower.settings
 */

const TAX_CODES = {
  1: {
    code: '18010200',
    name: 'Податок на нерухоме майно, відмінне від земельної ділянки, сплачений фізичними особами, які є власниками об\'єктів житлової нерухомості',
    type: '101',
    settingsPrefix: 'residential_debt'
  },
  2: {
    code: '18010300',
    name: 'Податок на нерухоме майно, відмінне від земельної ділянки, сплачений фізичними особами, які є власниками об\'єктів нежитлової нерухомості',
    type: '101',
    settingsPrefix: 'non_residential_debt'
  },
  3: {
    code: '18010700',
    name: 'Земельний податок з фізичних осіб',
    type: '101',
    settingsPrefix: 'land_debt'
  },
  4: {
    code: '18010900',
    name: 'Орендна плата з фізичних осіб',
    type: '101',
    settingsPrefix: 'orenda_debt'
  },
  5: {
    code: '11011300',
    name: 'Податок на доходи фізичних осіб у вигляді мінімального податкового зобов\'язання, що підлягає сплаті фізичними особами',
    type: '101',
    settingsPrefix: 'mpz'
  }
};

/**
 * Отримати інформацію про податок за identifier
 * @param {string} identifier - Унікальний ідентифікатор платежу
 * @returns {object|null} Інформація про податок або null
 */
function getTaxByIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const lastDigit = parseInt(identifier.charAt(identifier.length - 1));

  if (!TAX_CODES[lastDigit]) {
    return null;
  }

  return TAX_CODES[lastDigit];
}

/**
 * Перевірити чи є identifier валідним для податків
 * @param {string} identifier - Ідентифікатор для перевірки
 * @returns {boolean}
 */
function isValidTaxIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  const lastDigit = parseInt(identifier.charAt(identifier.length - 1));
  return lastDigit >= 1 && lastDigit <= 5;
}

module.exports = {
  TAX_CODES,
  getTaxByIdentifier,
  isValidTaxIdentifier
};
