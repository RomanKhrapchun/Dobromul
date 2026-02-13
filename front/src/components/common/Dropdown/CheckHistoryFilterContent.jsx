// Кастомний контент фільтрів для історії перевірок парковки (для передачі через children)
import React, { useState } from 'react';
import Input from "../Input/Input";
import { convertUkrToLat } from "../../../utils/function";

const CheckHistoryFilterContent = ({ filterData, onFilterChange, searchIcon }) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    const statusOptions = [
        { value: '', label: 'Всі статуси' },
        { value: 'paid', label: 'Оплачено' },
        { value: 'pending', label: 'Очікує' },
        { value: 'cancelled', label: 'Скасовано' }
    ];

    const selectedStatus = statusOptions.find(option => option.value === (filterData?.status_at_check_time || ''));

    const handleStatusSelect = (value) => {
        onFilterChange('status_at_check_time', value);
        setIsStatusOpen(false);
    };

    const handleCarNumberChange = (name, value) => {
        const convertedValue = convertUkrToLat(value);
        onFilterChange(name, convertedValue);
    };

    return (
        <>
            {/* Місце перевірки */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Хто/Де перевірив</label>
                <Input
                    icon={searchIcon}
                    name="check_location"
                    type="text"
                    placeholder="Пошук по місцю перевірки"
                    value={filterData?.check_location || ''}
                    onChange={onFilterChange}
                />
            </div>

            {/* Номер машини */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Номер машини</label>
                <Input
                    icon={searchIcon}
                    name="car_number"
                    type="text"
                    placeholder="AA1234BB"
                    maxLength="8"
                    value={filterData?.car_number || ''}
                    onChange={handleCarNumberChange}
                />
            </div>

            {/* Статус на момент перевірки */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Статус на момент перевірки</label>
                <div className="filter-dropdown__custom-select">
                    <div
                        className="filter-dropdown__select-input"
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                    >
                        <span>{selectedStatus?.label || 'Всі статуси'}</span>
                        <span className={`filter-dropdown__select-arrow ${isStatusOpen ? 'open' : ''}`}>▼</span>
                    </div>
                    {isStatusOpen && (
                        <div className="filter-dropdown__select-options">
                            {statusOptions.map(option => (
                                <div
                                    key={option.value}
                                    className={`filter-dropdown__select-option ${
                                        (filterData?.status_at_check_time || '') === option.value ? 'selected' : ''
                                    }`}
                                    onClick={() => handleStatusSelect(option.value)}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Дата перевірки */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата перевірки</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="check_date_from"
                        type="datetime-local"
                        placeholder="Від"
                        value={filterData?.check_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="check_date_to"
                        type="datetime-local"
                        placeholder="До"
                        value={filterData?.check_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>
        </>
    );
};

export default CheckHistoryFilterContent;
