// Кастомний контент фільтрів для заявок парковки (для передачі через children)
import React, { useState } from 'react';
import Input from "../Input/Input";
import { convertUkrToLat } from "../../../utils/function";

const BookingFilterContent = ({ filterData, onFilterChange, searchIcon }) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    const statusOptions = [
        { value: '', label: 'Всі статуси' },
        { value: 'paid', label: 'Оплачено' },
        { value: 'pending', label: 'Очікує' },
        { value: 'cancelled', label: 'Скасовано' }
    ];

    const selectedStatus = statusOptions.find(option => option.value === (filterData?.status || ''));

    const handleStatusSelect = (value) => {
        onFilterChange('status', value);
        setIsStatusOpen(false);
    };

    const handleCarNumberChange = (name, value) => {
        const convertedValue = convertUkrToLat(value);
        onFilterChange(name, convertedValue);
    };

    return (
        <>
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

            {/* Статус */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Статус</label>
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
                                        (filterData?.status || '') === option.value ? 'selected' : ''
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

            {/* Дата початку */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата початку</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="start_date_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.start_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="start_date_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.start_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Дата закінчення */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата закінчення</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="end_date_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.end_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="end_date_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.end_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Сума */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Сума (₴)</label>
                <div className="filter-dropdown__range">
                    <Input
                        icon={searchIcon}
                        name="amount_from"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Від"
                        value={filterData?.amount_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        icon={searchIcon}
                        name="amount_to"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="До"
                        value={filterData?.amount_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Дата створення */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата створення</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="created_at_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.created_at_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="created_at_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.created_at_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>
        </>
    );
};

export default BookingFilterContent;
