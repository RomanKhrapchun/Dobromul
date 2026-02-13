// components/ControlSumsModal/ControlSumsModal.jsx
import React, { useRef } from 'react';
import { Transition } from 'react-transition-group';
import Modal from '../common/Modal/Modal';
import './ControlSumsModal.css';

const ControlSumsModal = ({ 
    isOpen, 
    onClose, 
    controlSums, 
    onConfirm, 
    isLoading,
    communityName 
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

    // Мапінг бюджетних кодів на назви
    const budgetCodeNames = {
        11011300: 'МПЗ 100%',
        18010200: 'Житлова нерухомість',
        18010300: 'Нежитлова нерухомість',
        18010700: 'Земельний податок',
        18010900: 'Орендна плата'
    };


    return (
        <Transition in={isOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
            {state => (
                <Modal
                    className={`control-sums-modal ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                    onClose={onClose}
                    onOk={onConfirm}
                    confirmLoading={isLoading}
                    cancelText="Скасувати"
                    okText="Підтвердити та відправити"
                    title="Контрольні суми обробки реєстру">
            
                    <div className="control-sums-content">
                        {controlSums ? (
                            <>
                                <div className="control-sums-header">
                                    <h3>Результати обробки</h3>
                                    <p className="community-name">
                                        Громада: <strong>{controlSums.community_name || communityName}</strong>
                                    </p>
                                    {controlSums.file_date && (
                                        <p className="community-name">
                                            Станом на: <strong>{formatDate(controlSums.file_date)}</strong>
                                        </p>
                                    )}
                                </div>

                                <div className="control-sums-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Всього боржників:</span>
                                        <span className="stat-value">{controlSums.total_people || 0}</span>
                                    </div>
                            
                                    <div className="stat-item">
                                        <span className="stat-label">Всього записів:</span>
                                        <span className="stat-value">{controlSums.total_records || 0}</span>
                                    </div>

                                    <div className="stat-item">
                                        <span className="stat-label">Загальна сума боргу:</span>
                                        <span className="stat-value stat-value--amount">
                                            {formatAmount(controlSums.total_amount)} ₴
                                        </span>
                                    </div>

                                    <div className="stat-item">
                                        <span className="stat-label">Типів податків:</span>
                                        <span className="stat-value">{controlSums.unique_budget_codes || 0}</span>
                                    </div>
                            
                                    {controlSums.processed_at && (
                                    <div className="stat-item">
                                        <span className="stat-label">Дата обробки:</span>
                                        <span className="stat-value">{formatDate(controlSums.processed_at)}</span>
                                    </div>
                                )}
                            </div>

                        {controlSums.data && controlSums.data.length > 0 && (
                            <div className="control-sums-details">
                                <h4>Деталізація по типах податків:</h4>
                                <div className="budget-codes-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Тип податку</th>
                                                <th>Код</th>
                                                <th>Записів</th>
                                                <th>Сума (₴)</th>
                                                <th>Одержувач</th>
                                                <th>IBAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {controlSums.data.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="budget-name">
                                                        {budgetCodeNames[item.budget_code] || 'Інше'}
                                                    </td>
                                                    <td className="budget-code">{item.budget_code}</td>
                                                    <td className="records-count">{item.records_count}</td>
                                                    <td className="amount">{formatAmount(item.total_amount)}</td>
                                                    <td className="amount">{item.recipient}</td>
                                                    <td className="amount">{item.iban}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="total-row">
                                                <td colSpan="2"><strong>Разом:</strong></td>
                                                <td><strong>{controlSums.total_records}</strong></td>
                                                <td><strong>{formatAmount(controlSums.total_amount)}</strong></td>
                                                <td colSpan="2" className="empty-cell"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="control-sums-footer">
                            <p className="warning-text">
                                ⚠️ Після підтвердження буде відправлено email з результатами до ПриватБанку
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Обробка реєстру...</p>
                    </div>
                )}
            </div>
        </Modal>
            )}
        </Transition>
    );
};

export default ControlSumsModal;