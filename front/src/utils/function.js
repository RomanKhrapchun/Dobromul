import API from "../http";
import * as yup from 'yup';
import {accessGroupItem, fetchTimeout} from "./constants";

export const debounce = (fn, ms) => {
    let timer
    return _ => {
        clearTimeout(timer)
        timer = setTimeout(_ => {
            timer = null
            fn()
        }, ms)
    };
}

export const DOTS = '...';

export const range = (start, end) => {
    let length = end - start + 1;
    return Array.from({length}, (_, idx) => idx + start);
}

export const handleKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
        e.preventDefault();
    }
}

export const uuid_v4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => {
            return ((c ^ crypto.getRandomValues(new Uint8Array(1))[0]) & (15 >> c / 4)).toString(16)
        }
    );
}

export const handlePhoneChange = (event) => {
    let formattedPhoneNumber = event.replace(/\D/g, '');
    if (formattedPhoneNumber.length > 10) {
        formattedPhoneNumber = formattedPhoneNumber.slice(0, 10);
    }
    if (formattedPhoneNumber.length > 3) {
        formattedPhoneNumber = `(${formattedPhoneNumber.slice(0, 3)}) ${formattedPhoneNumber.slice(3)}`;
    }
    if (formattedPhoneNumber.length >= 10) {
        formattedPhoneNumber = `${formattedPhoneNumber.slice(0, 9)}-${formattedPhoneNumber.slice(9)}`;
    }
    return formattedPhoneNumber;
};

export const validateFilters = (selectData) => {
    const { dateFrom, dateTo, year, month, groupNumber, periodType } = selectData;
    
    // Валідація дат (залишається без змін)
    if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return {
                error: true,
                message: 'Невірний формат дати'
            };
        }
        
        if (fromDate > toDate) {
            return {
                error: true,
                message: 'Дата "З" не може бути більшою за дату "По"'
            };
        }
        
        const diffInDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
        if (diffInDays > 730) {
            return {
                error: true,
                message: 'Діапазон дат не може перевищувати 2 роки'
            };
        }
    }
    
    // Валідація року (залишається без змін)
    if (year) {
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
            return {
                error: true,
                message: 'Рік має бути між 2020 та 2030'
            };
        }
    }

    // ВИПРАВЛЕННЯ: правильна валідація місяця (підтримка форматів: 1-12 та YYYY-MM)
    if (month) {
        let monthValue;

        // Якщо month це об'єкт з Select
        if (typeof month === 'object' && month.value) {
            monthValue = month.value;
        } else {
            monthValue = month;
        }

        // Перевіряємо формат YYYY-MM
        if (typeof monthValue === 'string' && monthValue.includes('-')) {
            const [year, monthPart] = monthValue.split('-');
            const monthNum = parseInt(monthPart, 10);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return {
                    error: true,
                    message: 'Невірний номер місяця'
                };
            }
        } else {
            // Простий формат 1-12
            const monthNum = parseInt(monthValue, 10);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return {
                    error: true,
                    message: 'Невірний номер місяця'
                };
            }
        }
    }

    // Повертаємо валідні дані
    const validatedData = {};

    if (dateFrom) validatedData.dateFrom = dateFrom;
    if (dateTo) validatedData.dateTo = dateTo;
    if (year) validatedData.year = parseInt(year);

    // ВИПРАВЛЕННЯ: правильно обробляємо month (підтримка YYYY-MM)
    if (month) {
        let monthValue;
        if (typeof month === 'object' && month.value) {
            monthValue = month.value;
        } else {
            monthValue = month;
        }

        // Якщо це формат YYYY-MM, залишаємо як є (рядок)
        if (typeof monthValue === 'string' && monthValue.includes('-')) {
            validatedData.month = monthValue;
        } else {
            // Інакше конвертуємо в число
            validatedData.month = parseInt(monthValue, 10);
        }
    }
    
    // Обробка groupNumber (залишається без змін)
    if (groupNumber) {
        if (typeof groupNumber === 'object' && groupNumber.value) {
            validatedData.groupNumber = groupNumber.value;
        } else if (typeof groupNumber === 'string') {
            validatedData.groupNumber = groupNumber;
        }
    }
    
    if (periodType) validatedData.periodType = periodType;

    const cleanedData = Object.entries(selectData).reduce((acc, [key, value]) => {
    // Видаляємо поле, якщо воно порожній рядок, null, або undefined
    if (value !== '' && value !== null && value !== undefined) {
        // Застосовуємо trim() до текстових полів перед відправкою
        // Це видалить зайві пробіли на початку та в кінці, але збереже пробіли всередині (для ПІБ)
        const processedValue = typeof value === 'string' ? value.trim() : value;

        // Пропускаємо порожні рядки після trim
        if (processedValue === '') {
            return acc;
        }

        if (key === 'identification') {
            console.log('identification', processedValue)
        }
        acc[key] = processedValue;
    }

    return acc;
  }, {});
    return {
        error: false,
        ...cleanedData
    };
};

export const isValidDate = (dateString) => {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }
    return true;
}

export const fetchFunction = (url, options = {}) => {
    return API({
        url,
        timeout: fetchTimeout,
        ...options,
    })
}

export const createValidationSchema = (fieldValidations) => {
    const schemaFields = {};

    fieldValidations.forEach(({fieldName, validationRule}) => {
        schemaFields[fieldName] = validationRule;
    });
    return yup.object().shape(schemaFields);
};

export const hasOnlyAllowedParams = (searchParams = {}, allowedKeys = []) => {
    if (!searchParams || Object.keys(searchParams).length === 0) {
        return false;
    }

    if (!Array.isArray(allowedKeys)) {
        return false;
    }
    for (const key in searchParams) {
        if (!allowedKeys.includes(key)) {
            return false;
        }
    }
    return true;
}

export const getKey = (key, items) => {
    return items?.reduce((acc, el) => {
        const children = el?.children && el.children.find(obj => obj.key === key)
        if (children) {
            return children?.['module_name']
        }
        return el.key === key ? el?.['module_name'] : acc
    }, '')
}

export const generateRole = (data) => {
    return data.reduce((acc, item) => {
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            item.children.forEach(child => {
                acc[child.module_id] = [];
            });
        }
        return acc;
    }, {});
}

export const generateBreadcrumb = (pathname, items) => {
    const paramsLocation = pathname.split("/").filter(v => v.length > 0);
    const crumbList = paramsLocation.map((name, index) => {
        const routeTo = paramsLocation[index]
        const nameCrumb = getKey(paramsLocation[index], items)
        if (routeTo === 'profile' && !nameCrumb) {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: 'Профіль'
            }
        } else if (routeTo === 'add' && !nameCrumb) {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: 'Додати'
            }
        } else if (routeTo === 'edit' && !nameCrumb) {
            return {
                breadcrumbName: 'Редагувати',
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
            }

        } else if (routeTo === 'access' && !nameCrumb) {
            return {
                breadcrumbName: 'Доступ',
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
            }

        } else {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: nameCrumb ? nameCrumb : routeTo
            }
        }
    })
    return [{path: "/", breadcrumbName: "Dashboard"}, ...crumbList]
}

export const cleanValue = (value, isMulti) => {
    const isValidOption = option => option && typeof option === 'object' && (option.value || typeof option.value === 'boolean') && option.label;
    if (value && !isMulti) {
        if (Array.isArray(value)) {
            return value.length > 0 && isValidOption(value[0]) ? value[0] : null;
        }
        return isValidOption(value) ? value : null;
    } else if (value && isMulti && !Array.isArray(value)) {
        return isValidOption(value) ? [value] : [];
    } else if (isMulti && value && Array.isArray(value) && value.length > 0) {
        return value.filter(isValidOption)
    } else {
        return isMulti ? [] : null
    }
}

export const transformPermissionsToSelectFormat = (permissions) => {
    if (!permissions || Object.keys(permissions).length === 0) {
        return {}
    }

    const selectFormat = {};
    Object.keys(permissions).forEach(key => {
        selectFormat[key] = permissions[key].map(value => {
            const option = accessGroupItem?.find(item => item?.value === value);
            return option || {label: value, value};
        });
    });
    return selectFormat;
};

export const transformSelectFormatToPermissions = (listMenu) => {
    if (!listMenu || Object.keys(listMenu).length === 0) {
        return {}
    }
    const permissions = {};
    Object.keys(listMenu).forEach(key => {
        permissions[key] = listMenu[key].map(item => item.value);
    });
    return permissions;
};

export const transformData = (data = {}) => {
    return Object.entries(data).reduce((acc, [key, value]) => {
        if (Array.isArray(value)) {
            if (key === 'photo') {
                if (value.length > 0) {
                    acc[key] = value[0];
                } else {
                    acc[key] = {};
                }
            } else if (value.length === 0) {
                acc[key] = value;
            } else {
                const isValueLabelArray = value.every(
                    (item) =>
                        typeof item === 'object' &&
                        item !== null &&
                        'value' in item &&
                        'label' in item
                );

                if (isValueLabelArray && value.length === 2) {
                    acc[key] = value.reduce((accumulator, current, index, array) => {
                        return index === array.length - 1
                            ? accumulator + current.value
                            : accumulator + current.value + ',';
                    }, '');
                } else {
                    acc[key] = value;
                }
            }
        } else if (value && !Array.isArray(value) && typeof value === 'object') {
            const valueKeys = Object.keys(value);
            if (value?.label && value?.value && valueKeys.length === 2) {
                acc[key] = value?.value
            } else {
                acc[key] = value
            }
        } else {
            acc[key] = value
        }
        return acc;
    }, {});
}

export const formatDateUa = (date) => new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(new Date(date))

/**
 * Конвертує українські літери у латинські аналоги для номерів машин
 * Приклад: "АА1234ВВ" → "AA1234BB"
 */
export const convertUkrToLat = (text) => {
    if (!text) return '';

    const ukrToLatMap = {
        'А': 'A', 'а': 'A',
        'В': 'B', 'в': 'B',
        'Е': 'E', 'е': 'E',
        'І': 'I', 'і': 'I',
        'К': 'K', 'к': 'K',
        'М': 'M', 'м': 'M',
        'Н': 'H', 'н': 'H',
        'О': 'O', 'о': 'O',
        'Р': 'P', 'р': 'P',
        'С': 'C', 'с': 'C',
        'Т': 'T', 'т': 'T',
        'Х': 'X', 'х': 'X'
    };

    return text
        .split('')
        .map(char => ukrToLatMap[char] || char.toUpperCase())
        .join('');
};

export const MessageForPush = () => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(0,0,0,.35);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        width: min(520px, 92vw);
        background: #fff; color: inherit;
        border: 1px solid rgba(0,0,0,.08);
        border-radius: 12px; padding: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,.15);
        font: inherit;
    `;

    // заголовок
    const title = document.createElement('div');
    title.textContent = 'Повідомлення';
    title.style.cssText = 'font-size:18px;font-weight:600;margin-bottom:8px;';

    // текст
    const p = document.createElement('p');
    p.textContent =
        'Для активації даного сервісу, будь ласка, зверніться до служби підтримки проекту для укладання угоди про обробку персональних даних:';
    p.style.cssText = 'margin:6px 0 14px;line-height:1.35;';

    // номер
    const phone = document.createElement('div');
    phone.textContent = '+380 (98) 300 90 50';
    phone.style.cssText = `
        font-size:22px;font-weight:700;letter-spacing:.3px;
        padding:10px 12px;text-align:center;
        border:1px dashed #e5e7eb;border-radius:8px;
        user-select:text;cursor:pointer;margin-bottom:14px;
    `;
    phone.onclick = () => navigator.clipboard?.writeText(phone.textContent || '');

    // кнопка
    const btn = document.createElement('button');
    btn.textContent = 'Закрити';
    btn.style.cssText = `
        display:block;width:100%;padding:10px 14px;
        border-radius:8px;border:none;background:#1677ff;color:#fff;
        font-weight:600;cursor:pointer;
    `;
    btn.onclick = close;

    function close() {
        document.body.style.overflow = prevOverflow;
        overlay.remove();
    }

    card.append(title, p, phone, btn);
    overlay.append(card);
    overlay.addEventListener('click', (e) => {
    if (e.target === overlay) return;
});
document.body.appendChild(overlay);
}
