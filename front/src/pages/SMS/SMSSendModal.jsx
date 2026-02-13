import React, { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal/Modal';
import Button from '../../components/common/Button/Button';
import FormItem from '../../components/common/FormItem/FormItem';
import { useNotification } from '../../hooks/useNotification';
import SmsService from '../../services/SmsService';
import './SMS.css';

const SMSSendModal = ({ isOpen, onClose, debtor, debtors, onSuccess }) => {
    const notification = useNotification();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [customText, setCustomText] = useState('');
    const [preview, setPreview] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const isBatch = Array.isArray(debtors) && debtors.length > 0;
    const targetDebtor = isBatch ? debtors[0] : debtor;

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            setSelectedTemplateId('');
            setCustomText('');
            setPreview(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedTemplateId && targetDebtor) {
            loadPreview();
        } else {
            setPreview(null);
        }
    }, [selectedTemplateId, targetDebtor]);

    const loadTemplates = async () => {
        try {
            const response = await SmsService.getTemplates();
            if (response.data && !response.data.error) {
                setTemplates(response.data.data || []);
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        }
    };

    const loadPreview = async () => {
        if (!selectedTemplateId || !targetDebtor) return;

        try {
            setIsLoadingPreview(true);
            const response = await SmsService.previewSms(parseInt(selectedTemplateId), targetDebtor);
            if (response.data && !response.data.error) {
                setPreview(response.data.data);
            }
        } catch (err) {
            console.error('Error loading preview:', err);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSend = async () => {
        const text = selectedTemplateId ? preview?.text : customText;

        if (!text) {
            notification({ type: 'warning', title: 'Помилка', message: 'Виберіть шаблон або введіть текст' });
            return;
        }

        try {
            setIsSending(true);

            if (isBatch) {
                // Масова відправка
                const response = await SmsService.sendSmsBatch(
                    debtors,
                    selectedTemplateId ? parseInt(selectedTemplateId) : null,
                    selectedTemplateId ? null : customText
                );

                // Перевіряємо успішність через response.data.data.success
                if (response.data?.data?.success) {
                    notification({
                        type: 'success',
                        title: 'Успіх',
                        message: `Відправлено ${response.data.data.total_sent} з ${response.data.data.total_count} SMS`
                    });
                    onSuccess && onSuccess(response.data.data);
                    onClose();
                } else {
                    // Виводимо реальну помилку з worker
                    const errorMessage = response.data?.data?.error || response.data?.message || 'Помилка відправки';
                    throw new Error(errorMessage);
                }
            } else {
                // Одиночна відправка
                if (!debtor?.phone) {
                    notification({ type: 'warning', title: 'Помилка', message: 'Телефон не вказано' });
                    return;
                }

                const response = await SmsService.sendSms(
                    debtor.phone,
                    text,
                    selectedTemplateId ? parseInt(selectedTemplateId) : null,
                    selectedTemplateId ? debtor : null
                );

                // Перевіряємо успішність через response.data.data.success
                if (response.data?.data?.success) {
                    notification({ type: 'success', title: 'Успіх', message: 'SMS успішно відправлено' });
                    onSuccess && onSuccess(response.data.data);
                    onClose();
                } else {
                    // Виводимо реальну помилку з worker
                    const errorMessage = response.data?.data?.error || response.data?.message || 'Помилка відправки';
                    throw new Error(errorMessage);
                }
            }
        } catch (err) {
            notification({
                type: 'warning',
                title: 'Помилка',
                message: err?.response?.data?.message || err.message || 'Помилка відправки SMS'
            });
        } finally {
            setIsSending(false);
        }
    };

    const calculateSegments = (text) => {
        if (!text) return 0;
        const hasUnicode = /[^\x00-\x7F]/.test(text);
        const maxLength = hasUnicode ? 70 : 160;
        const concatMaxLength = hasUnicode ? 67 : 153;
        if (text.length <= maxLength) return 1;
        return Math.ceil(text.length / concatMaxLength);
    };

    const currentText = selectedTemplateId ? preview?.text : customText;
    const segmentsCount = calculateSegments(currentText);

    console.log('SMSSendModal render:', { isOpen, debtor, debtors, isBatch });

    return (
        <Modal
            className={isOpen ? "modal-window-wrapper--active" : ""}
            onClose={onClose}
            onOk={handleSend}
            title={isBatch ? `Відправити SMS (${debtors.length} боржників)` : 'Відправити SMS'}
            okText={isSending ? 'Відправка...' : isBatch ? `Відправити ${debtors.length} SMS` : 'Відправити SMS'}
            cancelText="Скасувати"
            confirmLoading={isSending}
        >
            <div className="sms-send-modal">
                {/* Info */}
                <div className="sms-send-info">
                    {isBatch ? (
                        <p>Обрано боржників: <strong>{debtors.length}</strong></p>
                    ) : (
                        <>
                            <p>Боржник: <strong>{debtor?.name}</strong></p>
                            <p>Телефон: <strong>{debtor?.phone || 'Не вказано'}</strong></p>
                        </>
                    )}
                </div>

                {/* Template Select */}
                <FormItem label="Шаблон повідомлення" fullWidth>
                    <select
                        className="sms-select"
                        style={{ width: '100%' }}
                        value={selectedTemplateId}
                        onChange={(e) => {
                            setSelectedTemplateId(e.target.value);
                            if (e.target.value) setCustomText('');
                        }}
                    >
                        <option value="">-- Виберіть шаблон або введіть текст вручну --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </FormItem>

                {/* Custom Text (if no template) */}
                {!selectedTemplateId && (
                    <FormItem label="Текст SMS" fullWidth>
                        <textarea
                            className="sms-textarea"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder="Введіть текст повідомлення"
                            rows={4}
                            maxLength={670}
                        />
                    </FormItem>
                )}

                {/* Preview */}
                {currentText && (
                    <div className="sms-preview">
                        <h4>Попередній перегляд:</h4>
                        <p className="sms-preview-text">{currentText}</p>
                        <div className="sms-preview-info">
                            <span>Символів: {currentText.length}</span>
                            <span>Сегментів: {segmentsCount}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SMSSendModal;
