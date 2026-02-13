// SportsFilterDropdown.jsx - спеціальний компонент для спорткомплексу
import React, { useRef, useEffect } from 'react';
import Input from "../Input/Input";
import Button from "../Button/Button";
import './SportsFilterDropdown.css';

const SportsFilterDropdown = ({ 
    isOpen, 
    onClose, 
    filterData, 
    onFilterChange, 
    onApplyFilter, 
    onResetFilters, 
    searchIcon,
    customFields = null
}) => {
    const dropdownRef = useRef(null);

    // Закриття по кліку поза межами
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Закриття по Escape
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Динамічне визначення полів для фільтрації
    const getFilterFields = () => {
        // Якщо передані customFields, використовуємо їх
        if (customFields && Array.isArray(customFields)) {
            return customFields;
        }

        // Інакше визначаємо на основі поточної сторінки
        const currentPath = window.location.pathname;
        
        // Фільтри для рахунків (Bills)
        if (currentPath.includes('/sportscomplex/bills') || currentPath.includes('/bills')) {
            return [
                { key: 'client_name', label: 'ПІБ клієнта', placeholder: 'Введіть ПІБ клієнта' },
                { key: 'membership_number', label: 'Номер абонемента', placeholder: 'Введіть номер абонемента' },
                { key: 'phone_number', label: 'Номер телефону', placeholder: 'Введіть номер телефону' },
                { key: 'service_name', label: 'Послуга', placeholder: 'Введіть назву послуги' },
                { key: 'service_group', label: 'Група послуг', placeholder: 'Введіть назву групи послуг' }
            ];
        }
        
        // Фільтри для послуг (Services)
        if (currentPath.includes('/sportscomplex/services') || currentPath.includes('/services')) {
            return [
                { key: 'name', label: 'Назва послуги', placeholder: 'Введіть назву послуги' },
                { 
                    key: 'price_range', 
                    label: 'Ціновий діапазон (₴)', 
                    type: 'range',
                    fields: [
                        { key: 'price_min', placeholder: 'Від', type: 'number' },
                        { key: 'price_max', placeholder: 'До', type: 'number' }
                    ]
                }
            ];
        }
        
        // Фільтри для клієнтів (Clients)
        if (currentPath.includes('/sportscomplex/clients') || currentPath.includes('/clients')) {
            return [
                { key: 'name', label: 'ПІБ клієнта', placeholder: 'Введіть ПІБ клієнта' },
                { key: 'membership_number', label: 'Номер абонемента', placeholder: 'Введіть номер абонемента' },
                { key: 'phone_number', label: 'Номер телефону', placeholder: 'Введіть номер телефону' }
            ];
        }
        
        // Фільтри для реквізитів (Requisite)
        if (currentPath.includes('/sportscomplex/requisite') || currentPath.includes('/requisite')) {
            return [
                { key: 'kved', label: 'КВЕД', placeholder: 'Введіть КВЕД' },
                { key: 'iban', label: 'IBAN', placeholder: 'Введіть IBAN' },
                { key: 'edrpou', label: 'ЄДРПОУ', placeholder: 'Введіть ЄДРПОУ' },
                { key: 'group_name', label: 'Група послуг', placeholder: 'Введіть назву групи послуг' }
            ];
        }
        
        // Стандартні поля для боржників (модуль податків)
        if (currentPath.includes('/debtor')) {
            return [
                { key: 'title', label: 'ПІБ', placeholder: 'Введіть ПІБ' },
                { key: 'identification', label: 'ІПН', placeholder: 'Введіть 3 останні цифри ІПН' },
                { 
                    key: 'debt_amount_range', 
                    label: 'Сума боргу (₴)', 
                    type: 'range',
                    fields: [
                        { key: 'debt_amount_min', placeholder: 'Від', type: 'number', step: '0.01' },
                        { key: 'debt_amount_max', placeholder: 'До', type: 'number', step: '0.01' }
                    ]
                },
                { key: 'debt_amount', label: 'Точна сума боргу (₴)', placeholder: 'Напр. 5000', type: 'number', step: '0.01' }
            ];
        }
        
        // Fallback - якщо шлях не розпізнано, повертаємо базові поля
        return [
            { key: 'name', label: 'Назва/ПІБ', placeholder: 'Введіть назву або ПІБ' }
        ];
    };

    const filterFields = getFilterFields();

    if (!isOpen) return null;

    const renderField = (field) => {
        // Рендер діапазону (наприклад, ціновий діапазон)
        if (field.type === 'range' && field.fields) {
            return (
                <div key={field.key} className="sports-filter-dropdown__item">
                    <label className="sports-filter-dropdown__label">{field.label}</label>
                    <div className="sports-filter-dropdown__range">
                        {field.fields.map((rangeField, index) => (
                            <React.Fragment key={rangeField.key}>
                                {index > 0 && (
                                    <span className="sports-filter-dropdown__range-separator">-</span>
                                )}
                                <Input
                                    icon={searchIcon}
                                    name={rangeField.key}
                                    type={rangeField.type || 'text'}
                                    step={rangeField.step}
                                    placeholder={rangeField.placeholder}
                                    value={filterData[rangeField.key] || ''}
                                    onChange={onFilterChange}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            );
        }

        // Рендер звичайного поля
        return (
            <div key={field.key} className="sports-filter-dropdown__item">
                <label className="sports-filter-dropdown__label">{field.label}</label>
                <Input
                    icon={searchIcon}
                    name={field.key}
                    type={field.type || 'text'}
                    step={field.step}
                    placeholder={field.placeholder}
                    value={filterData[field.key] || ''}
                    onChange={onFilterChange}
                />
            </div>
        );
    };

    return (
        <div className="sports-filter-dropdown" ref={dropdownRef}>
            {/* Стрілочка що вказує на кнопку */}
            <div className="sports-filter-dropdown__arrow"></div>
            
            {/* Контент фільтра */}
            <div className="sports-filter-dropdown__content">
                <div className="sports-filter-dropdown__header">
                    <h3 className="sports-filter-dropdown__title">Фільтри</h3>
                    <button 
                        className="sports-filter-dropdown__close"
                        onClick={onClose}
                        title="Закрити"
                    >
                        ✕
                    </button>
                </div>

                <div className="sports-filter-dropdown__body">
                    {filterFields.map(field => renderField(field))}
                </div>

                {/* Кнопки дій */}
                <div className="sports-filter-dropdown__footer">
                    <button 
                        className="sports-filter-dropdown__apply"
                        onClick={() => {
                            onApplyFilter();
                            onClose();
                        }}
                    >
                        Застосувати
                    </button>
                    <button 
                        className="sports-filter-dropdown__reset"
                        onClick={() => {
                            onResetFilters();
                            onClose();
                        }}
                    >
                        Скинути
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SportsFilterDropdown;