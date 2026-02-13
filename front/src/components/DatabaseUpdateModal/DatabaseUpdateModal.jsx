// components/DatabaseUpdateModal/DatabaseUpdateModal.jsx
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Transition } from 'react-transition-group';
import Modal from '../common/Modal/Modal';
import '../ControlSumsModal/ControlSumsModal.css';

const DatabaseUpdateModal = ({
    isOpen,
    onClose,
    controlSums,
    onConfirm,
    isLoading,
    communityName,
    availableDates,
    selectedDate,
    onDateChange,
    isLoadingDates
}) => {
    const nodeRef = useRef(null);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('uk-UA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    };

    const formatAmount = (amount) => {
        if (typeof amount !== 'number') return '0.00';
        return amount.toLocaleString('uk-UA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Податкові поля
    const taxFields = [
        { key: 'residential_debt', label: 'Житлова нерухомість' },
        { key: 'non_residential_debt', label: 'Нежитлова нерухомість' },
        { key: 'land_debt', label: 'Земельний податок' },
        { key: 'orenda_debt', label: 'Оренда землі' },
        { key: 'mpz', label: 'МПЗ' }
    ];

    // Отримуємо статистику з response
    const statistics = useMemo(() => {
        if (!controlSums?.data) {
            return null;
        }

        return controlSums.data;
    }, [controlSums]);

    return (
        <Transition in={isOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
            {state => (
                <Modal
                    className={`control-sums-modal ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                    onClose={onClose}
                    onOk={onConfirm}
                    confirmLoading={isLoading}
                    cancelText="Скасувати"
                    okText="Оновити базу даних"
                    title="Попередній перегляд оновлення реєстру">

                    <div className="control-sums-content">
                        {controlSums && statistics ? (
                            <>
                                <div className="control-sums-header">
                                    <h3>Дані з віддаленого сервера</h3>
                                    <p className="community-name">
                                        Громада: <strong>{controlSums.community_name || communityName}</strong>
                                    </p>

                                    {/* Dropdown для вибору дати */}
                                    {availableDates && availableDates.length > 0 && (
                                        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                                            <label htmlFor="date-select" style={{
                                                display: 'block',
                                                marginBottom: '6px',
                                                fontWeight: '500',
                                                color: '#495057'
                                            }}>
                                                Оберіть дату реєстру:
                                            </label>
                                            <select
                                                id="date-select"
                                                value={selectedDate || ''}
                                                onChange={(e) => onDateChange && onDateChange(e.target.value)}
                                                disabled={isLoading || isLoadingDates}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    cursor: isLoading || isLoadingDates ? 'not-allowed' : 'pointer',
                                                    backgroundColor: isLoading || isLoadingDates ? '#e9ecef' : 'white'
                                                }}
                                            >
                                                <option value="">Остання дата</option>
                                                {availableDates.map((date) => (
                                                    <option key={date} value={date}>
                                                        {formatDate(date)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {statistics.latest_date && (
                                        <p className="community-name">
                                            Станом на: <strong>{formatDate(statistics.latest_date)}</strong>
                                        </p>
                                    )}
                                    {controlSums.is_up_to_date && (
                                        <div className="warning-notice" style={{
                                            backgroundColor: '#fff3cd',
                                            border: '1px solid #ffc107',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            marginTop: '12px',
                                            color: '#856404'
                                        }}>
                                            <strong>ℹ️ Увага:</strong> Локальна база даних вже містить актуальні дані станом на {formatDate(statistics.latest_date)}. Оновлення не потрібне.
                                        </div>
                                    )}
                                </div>

                                <div className="control-sums-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Всього боржників:</span>
                                        <span className="stat-value">{statistics.total_debtors || 0}</span>
                                    </div>

                                    <div className="stat-item">
                                        <span className="stat-label">Загальна сума боргу:</span>
                                        <span className="stat-value stat-value--amount">
                                            {formatAmount(statistics.total_debt || 0)} ₴
                                        </span>
                                    </div>
                                </div>

                                <div className="control-sums-details">
                                    <h4>Деталізація по типах податків:</h4>
                                    <div className="budget-codes-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Тип податку</th>
                                                    <th>Сума (₴)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {taxFields.map((field) => (
                                                    <tr key={field.key}>
                                                        <td className="budget-name">{field.label}</td>
                                                        <td className="amount">{formatAmount(statistics[field.key] || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="total-row">
                                                    <td><strong>Разом:</strong></td>
                                                    <td className="amount"><strong>{formatAmount(statistics.total_debt || 0)}</strong></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                        <div className="control-sums-footer">
                            <p className="warning-text">
                                {controlSums.is_up_to_date ? (
                                    <>⚠️ Увага: Дані вже актуальні. Повторне оновлення перезапише існуючі дані тими самими записами.</>
                                ) : (
                                    <>⚠️ Після підтвердження буде виконано оновлення локальної бази даних</>
                                )}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Перевірка оновлень...</p>
                    </div>
                )}
            </div>
        </Modal>
            )}
        </Transition>
    );
};

export default DatabaseUpdateModal;
