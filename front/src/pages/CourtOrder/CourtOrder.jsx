import React, { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { useNotification } from '../../hooks/useNotification';
import { fetchFunction } from '../../utils/function';
import { Context } from '../../main';
import './CourtOrder.css';

const defaultFormData = {
    // Заявник (громада)
    communityName: '',
    communityAddress: '',
    communityPhone: '',
    communityEmail: '',
    communityEdrpou: '',
    councilAddress: '',

    // Суд
    courtName: '',
    courtAddress: '',

    // Боржник
    debtorName: '',
    debtorAddress: '',
    debtorEdrpou: '',
    debtorContacts: '',

    // Фінансові дані
    debtAmount: '',
    courtFee: '',
};

const REQUIRED_FIELDS = [
    { key: 'communityName', label: 'Територіальна громада' },
    { key: 'courtName', label: 'Назва суду' },
    { key: 'debtorName', label: 'Найменування боржника' },
    { key: 'debtAmount', label: 'Сума боргу' },
    { key: 'courtFee', label: 'Судовий збір' }
];

const CourtOrder = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const [formData, setFormData] = useState(defaultFormData);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = useCallback((name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleAuthError = useCallback(() => {
        notification({
            type: 'warning',
            placement: 'top',
            title: 'Помилка',
            message: 'Не авторизований',
        });
        store.logOff();
        navigate('/');
    }, [notification, store, navigate]);

    const handleGenerate = async () => {
        const missingFields = REQUIRED_FIELDS
            .filter(({ key }) => !String(formData[key] ?? '').trim())
            .map(({ label }) => label);

        if (missingFields.length > 0) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Заповніть обов\'язкові поля',
                message: missingFields.join(', '),
                duration: 4
            });
            return;
        }

        try {
            setIsLoading(true);

            // 1. Зберігаємо заяву
            const createResponse = await fetchFunction('api/court-order/create', {
                method: 'post',
                data: formData
            });

            const courtOrderId = createResponse.data?.id;
            if (!courtOrderId) {
                throw new Error('Не вдалося зберегти заяву');
            }

            notification({
                type: 'success',
                placement: 'top',
                title: 'Збережено',
                message: 'Заяву збережено. Генерується документ...',
                duration: 2
            });

            // 2. Завантажуємо згенерований документ
            const docResponse = await fetchFunction(`api/court-order/generate/${courtOrderId}`, {
                method: 'get',
                responseType: 'blob'
            });

            // Створюємо посилання для завантаження
            const blob = new Blob([docResponse.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `court-order-${courtOrderId}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notification({
                type: 'success',
                placement: 'top',
                title: 'Готово',
                message: 'Документ успішно сформовано та завантажено',
                duration: 3
            });

        } catch (error) {
            if (error?.response?.status === 401) {
                return handleAuthError();
            }

            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error?.response?.data?.message || error.message || 'Не вдалося сформувати заяву',
                duration: 5
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFormData(defaultFormData);
    };

    return (
        <div className="page-container">
            <div className="page-container__header">
                <div className="page-container__header-title">
                    <h1>Заява про видачу судового наказу</h1>
                </div>
            </div>
            <div className="page-container__content">
                <div className="court-order-form">

                    {/* Секція: Заявник */}
                    <fieldset className="court-order-form__section">
                        <legend className="court-order-form__legend">Заявник (територіальна громада)</legend>
                        <div className="court-order-form__grid">
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Територіальна громада *</label>
                                <Input
                                    name="communityName"
                                    value={formData.communityName}
                                    onChange={handleChange}
                                    placeholder="Наприклад: Великомостівська міська рада"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Адреса громади</label>
                                <Input
                                    name="communityAddress"
                                    value={formData.communityAddress}
                                    onChange={handleChange}
                                    placeholder="Адреса територіальної громади"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Номери телефону</label>
                                <Input
                                    name="communityPhone"
                                    value={formData.communityPhone}
                                    onChange={handleChange}
                                    placeholder="+380..."
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Електронна пошта</label>
                                <Input
                                    name="communityEmail"
                                    value={formData.communityEmail}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">ЄДРПОУ</label>
                                <Input
                                    name="communityEdrpou"
                                    value={formData.communityEdrpou}
                                    onChange={handleChange}
                                    placeholder="Код ЄДРПОУ"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Адреса міської ради</label>
                                <Input
                                    name="councilAddress"
                                    value={formData.councilAddress}
                                    onChange={handleChange}
                                    placeholder="Адреса міської ради"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Секція: Суд */}
                    <fieldset className="court-order-form__section">
                        <legend className="court-order-form__legend">Суд</legend>
                        <div className="court-order-form__grid">
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Назва суду *</label>
                                <Input
                                    name="courtName"
                                    value={formData.courtName}
                                    onChange={handleChange}
                                    placeholder="Наприклад: Червоноградський міськрайонний суд"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Адреса суду</label>
                                <Input
                                    name="courtAddress"
                                    value={formData.courtAddress}
                                    onChange={handleChange}
                                    placeholder="Адреса суду"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Секція: Боржник */}
                    <fieldset className="court-order-form__section">
                        <legend className="court-order-form__legend">Боржник</legend>
                        <div className="court-order-form__grid">
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Найменування боржника *</label>
                                <Input
                                    name="debtorName"
                                    value={formData.debtorName}
                                    onChange={handleChange}
                                    placeholder="ПІБ або назва юридичної особи"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Адреса боржника</label>
                                <Input
                                    name="debtorAddress"
                                    value={formData.debtorAddress}
                                    onChange={handleChange}
                                    placeholder="Адреса боржника"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">ЄДРПОУ боржника</label>
                                <Input
                                    name="debtorEdrpou"
                                    value={formData.debtorEdrpou}
                                    onChange={handleChange}
                                    placeholder="Код ЄДРПОУ або ІПН боржника"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Засоби зв'язку</label>
                                <Input
                                    name="debtorContacts"
                                    value={formData.debtorContacts}
                                    onChange={handleChange}
                                    placeholder="Телефон, email тощо"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Секція: Фінансові дані */}
                    <fieldset className="court-order-form__section">
                        <legend className="court-order-form__legend">Фінансові дані</legend>
                        <div className="court-order-form__grid">
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Сума боргу (грн) *</label>
                                <Input
                                    name="debtAmount"
                                    value={formData.debtAmount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    type="number"
                                />
                            </div>
                            <div className="court-order-form__field">
                                <label className="court-order-form__label">Судовий збір (грн) *</label>
                                <Input
                                    name="courtFee"
                                    value={formData.courtFee}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    type="number"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Кнопки */}
                    <div className="court-order-form__actions">
                        <Button onClick={handleGenerate} loading={isLoading}>
                            Сформувати заяву
                        </Button>
                        <Button onClick={handleReset} style={{ marginLeft: '12px' }}>
                            Очистити
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourtOrder;
