/**
 * Маппер кодів бюджетної класифікації для адміністративних послуг
 * Червоноградська територіальна громада
 */

const SERVICE_CODES = {
  // Адміністративний збір за реєстрацію змін
  '22010300': {
    budgetCode: '22010300',
    categoryName: 'Адміністративний збір за реєстрацію змін',
    type: '101',
    account: 'UA248999980314070617000013913',
    edrpou: '38008294',
    variants: {
      '01': {
        name: 'Реєстрація змін до відомостей про ЮО (24 год)',
        sum: 910.00
      },
      '02': {
        name: 'Реєстрація змін до відомостей про ЮО (6 год)',
        sum: 2730.00
      },
      '03': {
        name: 'Реєстрація змін до відомостей про ЮО (2 год)',
        sum: 5450.00
      },
      '04': {
        name: 'Реєстрація змін до відомостей про ФОП (24 год)',
        sum: 300.00
      },
      '05': {
        name: 'Реєстрація змін до відомостей про ФОП (6 год)',
        sum: 910.00
      },
      '06': {
        name: 'Реєстрація змін до відомостей про ФОП (2 год)',
        sum: 1810.00
      },
      '07': {
        name: 'Виправлення помилки з вини заявника (ЮО)',
        sum: 270.00
      },
      '08': {
        name: 'Виправлення помилки з вини заявника (ФОП)',
        sum: 90.00
      }
    }
  },

  // Адміністративний збір за реєстрацію/зняття з реєстрації місця проживання
  '22012500': {
    budgetCode: '22012500',
    categoryName: 'Адміністративний збір за реєстрацію/зняття з реєстрації місця проживання',
    type: '101',
    account: 'UA248999980314070617000013913',
    edrpou: '38008294',
    variants: {
      '01': {
        name: 'Зняття з задекларованого/зареєстрованого місця проживання',
        sum: 45.42
      },
      '02': {
        name: 'Реєстрація місця проживання (перебування) особи',
        sum: 45.42
      },
      '03': {
        name: 'Реєстрація місця проживання (перебування) особи (прискорена)',
        sum: 75.70
      },
      '04': {
        name: 'Реєстрація місця проживання дитини до 14 років',
        sum: 45.42
      },
      '05': {
        name: 'Реєстрація місця проживання дитини до 14 років (прискорена)',
        sum: 75.70
      },
      '06': {
        name: 'Надання відомостей з ДЗК у формі витягу',
        sum: 151.40
      },
      '07': {
        name: 'Видача експлуатаційного дозволу оператора ринку',
        sum: 1360.00
      }
    }
  },

  // Адміністративний збір за державну реєстрацію речових прав
  '22012600': {
    budgetCode: '22012600',
    categoryName: 'Адміністративний збір за державну реєстрацію речових прав',
    type: '101',
    account: 'UA248999980314070617000013913',
    edrpou: '38008294',
    variants: {
      '01': {
        name: 'Державна реєстрація права власності',
        sum: 300.00
      },
      '02': {
        name: 'Державна реєстрація інших речових прав',
        sum: 150.00
      },
      '03': {
        name: 'Державна реєстрація обтяжень речових прав',
        sum: 150.00
      },
      '04': {
        name: 'Виправлення технічної помилки',
        sum: 120.00
      },
      '05': {
        name: 'Реєстрація спеціального права на незавершене будівництво',
        sum: 300.00
      },
      '06': {
        name: 'Реєстрація спеціального права на майбутній об\'єкт',
        sum: 355.00
      },
      '07': {
        name: 'Реєстрація обтяження майбутніх об\'єктів',
        sum: 71.00
      }
    }
  },

  // За надання інформації з державних реєстрів
  '22012700': {
    budgetCode: '22012700',
    categoryName: 'За надання інформації з державних реєстрів',
    type: '101',
    account: 'UA248999980314070617000013913',
    edrpou: '38008294',
    variants: {
      '01': {
        name: 'Надання відомостей з ДЗК у формі витягу про земельну ділянку',
        sum: 80.00
      },
      '02': {
        name: 'Отримання інформації з реєстру речових прав',
        sum: 80.00
      },
      '03': {
        name: 'Витяг з ЄДР у паперовій формі',
        sum: 150.00
      },
      '04': {
        name: 'Надання документа у паперовій формі (за кожен документ)',
        sum: 210.00
      }
    }
  },

  // Плата за скорочення термінів надання послуг реєстрації
  '22012900': {
    budgetCode: '22012900',
    categoryName: 'Плата за скорочення термінів надання послуг реєстрації',
    type: '101',
    account: 'UA248999980314070617000013913',
    edrpou: '38008294',
    variants: {
      '01': {
        name: 'Державна реєстрація права власності (2 робочі дні)',
        sum: 3030.00
      },
      '02': {
        name: 'Державна реєстрація права власності (1 робочий день)',
        sum: 6060.00
      },
      '03': {
        name: 'Державна реєстрація права власності (2 години)',
        sum: 15140.00
      },
      '04': {
        name: 'Державна реєстрація інших речових прав (2 робочі дні)',
        sum: 1510.00
      },
      '05': {
        name: 'Державна реєстрація інших речових прав (1 робочий день)',
        sum: 3030.00
      },
      '06': {
        name: 'Державна реєстрація інших речових прав (2 години)',
        sum: 7570.00
      }
    }
  }
};

/**
 * Парсинг identifier формату {ID}_{Код_бюджету}_{Варіант}
 * @param {string} identifier - Ідентифікатор у форматі XXXXXXXX_22012900_01
 * @returns {object|null} { payerId, budgetCode, variant } або null
 */
function parseServiceIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const parts = identifier.split('_');

  if (parts.length !== 3) {
    return null;
  }

  const [payerId, budgetCode, variant] = parts;

  // Валідація
  if (!payerId || !budgetCode || !variant) {
    return null;
  }

  if (!/^\d{8}$/.test(payerId)) {
    return null;
  }

  if (!/^\d{8}$/.test(budgetCode)) {
    return null;
  }

  if (!/^\d{2}$/.test(variant)) {
    return null;
  }

  return {
    payerId,
    budgetCode,
    variant
  };
}

/**
 * Отримати інформацію про послугу за identifier
 * @param {string} identifier - Ідентифікатор у форматі XXXXXXXX_22012900_01
 * @returns {object|null} Повна інформація про послугу або null
 */
function getServiceByIdentifier(identifier) {
  const parsed = parseServiceIdentifier(identifier);

  if (!parsed) {
    return null;
  }

  const { payerId, budgetCode, variant } = parsed;

  const serviceCategory = SERVICE_CODES[budgetCode];

  if (!serviceCategory) {
    return null;
  }

  const serviceVariant = serviceCategory.variants[variant];

  if (!serviceVariant) {
    return null;
  }

  return {
    payerId,
    budgetCode: serviceCategory.budgetCode,
    categoryName: serviceCategory.categoryName,
    serviceName: serviceVariant.name,
    sum: serviceVariant.sum,
    type: serviceCategory.type,
    account: serviceCategory.account,
    edrpou: serviceCategory.edrpou,
    variant
  };
}

/**
 * Перевірити чи є identifier валідним для адміністративних послуг
 * @param {string} identifier - Ідентифікатор для перевірки
 * @returns {boolean}
 */
function isValidServiceIdentifier(identifier) {
  const parsed = parseServiceIdentifier(identifier);

  if (!parsed) {
    return false;
  }

  const serviceCategory = SERVICE_CODES[parsed.budgetCode];

  if (!serviceCategory) {
    return false;
  }

  return !!serviceCategory.variants[parsed.variant];
}

module.exports = {
  SERVICE_CODES,
  parseServiceIdentifier,
  getServiceByIdentifier,
  isValidServiceIdentifier
};
