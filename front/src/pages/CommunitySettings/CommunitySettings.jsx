import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../../main';
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../hooks/useNotification";
import useForm from "../../hooks/useForm";
import { handleKeyDown } from "../../utils/function";
import Loader from "../../components/Loader/Loader";
import PageError from "../ErrorPage/PageError";
import FormSeparator from "../../components/common/FormSeparator/FormSeparator";
import FormItem from "../../components/common/FormItem/FormItem";
import Input from "../../components/common/Input/Input";
import Button from "../../components/common/Button/Button";
import { generateIcon, iconMap } from "../../utils/constants";
import CommunitySettingsService from "../../services/CommunitySettingsService";
import { useCommunitySettings } from "../../context/CommunitySettingsContext";
import "./CommunitySettings.css";

const onBackIcon = generateIcon(iconMap.back);
const onSaveIcon = generateIcon(iconMap.save);
const separatorStyle = { marginBottom: 0 };

const initialValues = {
    id: null,
    cityName: '',
    cityCouncil: '',
    altCityName: '',
    territoryTitle: '',
    territoryTitleInstrumental: '',
    websiteName: '',
    websiteUrl: '',
    websiteUrlP4v: '',
    telegramName: '',
    telegramUrl: '',
    phoneNumberGuDps: '',
    phoneNumberKindergarten: '',
    currentRegion: {
        name: '',
        genitive: '',
        dative: '',
        accusative: '',
        instrumental: '',
        locative: ''
    },
    guDpsRegion: '',
    guDpsAddress: '',
    debtChargeAccount: '',
    communityName: '',
    altQrCode: ''
};

const CommunitySettings = () => {
    const navigate = useNavigate();
    const { store } = useContext(Context);
    const notification = useNotification();
    const { updateSettings: updateContextSettings } = useCommunitySettings();
    const { errors, validateFields, onFieldChange, setFieldsValue, formData } = useForm(initialValues);
    const [state, setState] = useState({
        isLoading: true,
        isSaving: false,
        isError: {
            error: false,
            status: '',
            message: '',
        },
    });

    const onBackClick = (e) => {
        e.preventDefault();
        navigate('/');
    };

    // Handle nested region field changes
    const onRegionFieldChange = (name, value) => {
        const field = name.replace('currentRegion.', '');
        const newRegion = { ...formData.currentRegion, [field]: value };
        onFieldChange('currentRegion', newRegion);
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await CommunitySettingsService.getSettings();
                if (response.data && !response.data.error) {
                    const data = response.data.data;
                    setFieldsValue({
                        id: data.id,
                        cityName: data.cityName || '',
                        cityCouncil: data.cityCouncil || '',
                        altCityName: data.altCityName || '',
                        territoryTitle: data.territoryTitle || '',
                        territoryTitleInstrumental: data.territoryTitleInstrumental || '',
                        websiteName: data.websiteName || '',
                        websiteUrl: data.websiteUrl || '',
                        websiteUrlP4v: data.websiteUrlP4v || '',
                        telegramName: data.telegramName || '',
                        telegramUrl: data.telegramUrl || '',
                        phoneNumberGuDps: data.phoneNumberGuDps || '',
                        phoneNumberKindergarten: data.phoneNumberKindergarten || '',
                        currentRegion: data.currentRegion || initialValues.currentRegion,
                        guDpsRegion: data.guDpsRegion || '',
                        guDpsAddress: data.guDpsAddress || '',
                        debtChargeAccount: data.debtChargeAccount || '',
                        communityName: data.communityName || '',
                        altQrCode: data.altQrCode || ''
                    });
                }
            } catch (error) {
                if (error?.response?.status === 401) {
                    notification({
                        placement: "top",
                        type: 'warning',
                        title: "Помилка",
                        message: error?.response?.data?.message ?? "Не авторизований!",
                    });
                    store.logOff();
                    return navigate('/');
                }
                setState(prevState => ({
                    ...prevState,
                    isError: {
                        error: true,
                        status: error?.response?.status ?? 400,
                        message: error?.response?.data?.message || error.message,
                    },
                }));
            } finally {
                setState(prevState => ({ ...prevState, isLoading: false }));
            }
        };
        loadSettings();
    }, [navigate, store, notification, setFieldsValue]);

    const onSubmit = async (event) => {
        event.preventDefault();
        try {
            setState(prevState => ({ ...prevState, isSaving: true }));

            // Use Context's updateSettings which also invalidates cache and broadcasts to other tabs
            const result = await updateContextSettings(formData);

            if (result.success) {
                notification({
                    placement: "top",
                    type: 'success',
                    title: "Успіх",
                    message: "Налаштування громади успішно збережено",
                    duration: 2
                });
            } else {
                throw new Error(result.error || 'Помилка збереження');
            }
        } catch (error) {
            notification({
                placement: "top",
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error.message || error,
            });
            if (error?.response?.status === 401) {
                store.logOff();
                return navigate('/');
            }
        } finally {
            setState(prevState => ({ ...prevState, isSaving: false }));
        }
    };

    if (state.isError.error) {
        return <PageError statusError={state.isError.status} title={state.isError.message} />;
    }

    return (
        <React.Fragment>
            {state.isLoading ? (
                <Loader />
            ) : (
                <form onKeyDown={handleKeyDown} onSubmit={onSubmit}>
                    <div className="components-container">
                        {/* Брендинг */}
                        <FormSeparator caption="Брендинг громади" style={separatorStyle} />
                        <FormItem
                            label="Назва міста"
                            tooltip="Коротка назва міста для відображення в заголовку"
                            error={errors.cityName}
                            fullWidth
                            required
                        >
                            <Input
                                name="cityName"
                                type="text"
                                className="half-width"
                                value={formData.cityName}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Тип ради"
                            tooltip="Тип ради (міська рада, селищна рада тощо)"
                            error={errors.cityCouncil}
                            fullWidth
                            required
                        >
                            <Input
                                name="cityCouncil"
                                type="text"
                                className="half-width"
                                value={formData.cityCouncil}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Alt для логотипу"
                            tooltip="Альтернативний текст для зображення логотипу"
                            fullWidth
                        >
                            <Input
                                name="altCityName"
                                type="text"
                                className="half-width"
                                value={formData.altCityName}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Офіційні назви */}
                        <FormSeparator caption="Офіційні назви" style={separatorStyle} />
                        <FormItem
                            label="Повна назва"
                            tooltip="Повна офіційна назва (напр. 'Боярська міська рада')"
                            error={errors.territoryTitle}
                            fullWidth
                            required
                        >
                            <Input
                                name="territoryTitle"
                                type="text"
                                value={formData.territoryTitle}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Назва (орудний відмінок)"
                            tooltip="Назва в орудному відмінку для документів"
                            fullWidth
                        >
                            <Input
                                name="territoryTitleInstrumental"
                                type="text"
                                value={formData.territoryTitleInstrumental}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Вебсайти */}
                        <FormSeparator caption="Вебсайти" style={separatorStyle} />
                        <FormItem
                            label="Назва порталу"
                            tooltip="Назва порталу для відображення"
                            fullWidth
                        >
                            <Input
                                name="websiteName"
                                type="text"
                                value={formData.websiteName}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="URL порталу"
                            tooltip="Адреса головного порталу"
                            fullWidth
                        >
                            <Input
                                name="websiteUrl"
                                type="text"
                                value={formData.websiteUrl}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="URL P4V порталу"
                            tooltip="Адреса порталу оплати P4V"
                            fullWidth
                        >
                            <Input
                                name="websiteUrlP4v"
                                type="text"
                                value={formData.websiteUrlP4v}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Telegram */}
                        <FormSeparator caption="Telegram бот" style={separatorStyle} />
                        <FormItem
                            label="Назва бота"
                            tooltip="Назва Telegram бота для відображення"
                            fullWidth
                        >
                            <Input
                                name="telegramName"
                                type="text"
                                className="half-width"
                                value={formData.telegramName}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Посилання на бот"
                            tooltip="URL посилання на Telegram бот"
                            fullWidth
                        >
                            <Input
                                name="telegramUrl"
                                type="text"
                                className="half-width"
                                value={formData.telegramUrl}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Контакти */}
                        <FormSeparator caption="Контактні дані" style={separatorStyle} />
                        <FormItem
                            label="Телефон ГУ ДПС"
                            tooltip="Контактний телефон податкової служби"
                            fullWidth
                        >
                            <Input
                                name="phoneNumberGuDps"
                                type="text"
                                className="half-width"
                                value={formData.phoneNumberGuDps}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Телефон дитсадка"
                            tooltip="Контактний телефон для модуля дитсадків"
                            fullWidth
                        >
                            <Input
                                name="phoneNumberKindergarten"
                                type="text"
                                className="half-width"
                                value={formData.phoneNumberKindergarten}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Регіон */}
                        <FormSeparator caption="Область (відмінки)" style={separatorStyle} />
                        <FormItem label="Назва області" fullWidth>
                            <Input
                                name="currentRegion.name"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.name || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Родовий відмінок" tooltip="напр. 'Київської області'" fullWidth>
                            <Input
                                name="currentRegion.genitive"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.genitive || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Давальний відмінок" tooltip="напр. 'Київській області'" fullWidth>
                            <Input
                                name="currentRegion.dative"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.dative || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Знахідний відмінок" tooltip="напр. 'Київську область'" fullWidth>
                            <Input
                                name="currentRegion.accusative"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.accusative || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Орудний відмінок" tooltip="напр. 'Київською областю'" fullWidth>
                            <Input
                                name="currentRegion.instrumental"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.instrumental || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Місцевий відмінок" tooltip="напр. 'Київській області'" fullWidth>
                            <Input
                                name="currentRegion.locative"
                                type="text"
                                className="half-width"
                                value={formData.currentRegion?.locative || ''}
                                onChange={onRegionFieldChange}
                            />
                        </FormItem>

                        {/* ДПС */}
                        <FormSeparator caption="Податкова служба" style={separatorStyle} />
                        <FormItem
                            label="Регіон ГУ ДПС"
                            tooltip="Назва регіону для документів ДПС"
                            fullWidth
                        >
                            <Input
                                name="guDpsRegion"
                                type="text"
                                className="half-width"
                                value={formData.guDpsRegion}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Адреса ГУ ДПС"
                            tooltip="Повна адреса податкової служби"
                            fullWidth
                        >
                            <Input
                                name="guDpsAddress"
                                type="text"
                                value={formData.guDpsAddress}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Фінанси */}
                        <FormSeparator caption="Фінансові реквізити" style={separatorStyle} />
                        <FormItem
                            label="Рахунок для нарахувань"
                            tooltip="IBAN рахунок для податкових нарахувань"
                            fullWidth
                        >
                            <Input
                                name="debtChargeAccount"
                                type="text"
                                className="half-width"
                                value={formData.debtChargeAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Системні */}
                        <FormSeparator caption="Системні налаштування" style={separatorStyle} />
                        <FormItem
                            label="Ідентифікатор громади"
                            tooltip="Унікальний ідентифікатор для API запитів"
                            error={errors.communityName}
                            fullWidth
                            required
                        >
                            <Input
                                name="communityName"
                                type="text"
                                className="half-width"
                                value={formData.communityName}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem
                            label="Alt для QR-коду"
                            tooltip="Альтернативний текст для QR-кодів"
                            fullWidth
                        >
                            <Input
                                name="altQrCode"
                                type="text"
                                className="half-width"
                                value={formData.altQrCode}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Кнопки */}
                        <div className="btn-group components-container__full-width">
                            <Button icon={onBackIcon} onClick={onBackClick}>
                                Повернутись
                            </Button>
                            <Button
                                type="submit"
                                icon={onSaveIcon}
                                disabled={state.isSaving}
                            >
                                {state.isSaving ? 'Збереження...' : 'Зберегти'}
                            </Button>
                        </div>
                    </div>
                </form>
            )}
        </React.Fragment>
    );
};

export default CommunitySettings;
