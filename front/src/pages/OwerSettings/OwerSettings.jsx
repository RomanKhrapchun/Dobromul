import React, { useContext, useState, useEffect } from 'react';
import { Context } from '../../main';
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../hooks/useNotification";
import useForm from "../../hooks/useForm";
import Loader from "../../components/Loader/Loader";
import PageError from "../ErrorPage/PageError";
import FormSeparator from "../../components/common/FormSeparator/FormSeparator";
import FormItem from "../../components/common/FormItem/FormItem";
import Input from "../../components/common/Input/Input";
import Button from "../../components/common/Button/Button";
import { generateIcon, iconMap } from "../../utils/constants";
import OwerSettingsService from "../../services/OwerSettingsService";
import "./OwerSettings.css";

const onBackIcon = generateIcon(iconMap.back);
const onSaveIcon = generateIcon(iconMap.save);
const separatorStyle = { marginBottom: 0 };

const initialValues = {
    id: '',
    file: '',
    nonResidentialDebtPurpose: '',
    nonResidentialDebtAccount: '',
    nonResidentialDebtEdrpou: '',
    nonResidentialDebtRecipientname: '',
    residentialDebtPurpose: '',
    residentialDebtAccount: '',
    residentialDebtEdrpou: '',
    residentialDebtRecipientname: '',
    landDebtPurpose: '',
    landDebtAccount: '',
    landDebtEdrpou: '',
    landDebtRecipientname: '',
    orendaDebtPurpose: '',
    orendaDebtAccount: '',
    orendaDebtEdrpou: '',
    orendaDebtRecipientname: '',
    callbackPaySuccess: '',
    callbackUrl: '',
    mpzPurpose: '',
    mpzAccount: '',
    mpzEdrpou: '',
    mpzRecipientname: ''
};

const OwerSettings = () => {
    const navigate = useNavigate();
    const { store } = useContext(Context);
    const notification = useNotification();
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

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await OwerSettingsService.getSettings();
                if (response.data && !response.data.error) {
                    const data = response.data.data;
                    setFieldsValue({
                        id: data.id || '',
                        file: data.file || '',
                        nonResidentialDebtPurpose: data.nonResidentialDebtPurpose || '',
                        nonResidentialDebtAccount: data.nonResidentialDebtAccount || '',
                        nonResidentialDebtEdrpou: data.nonResidentialDebtEdrpou || '',
                        nonResidentialDebtRecipientname: data.nonResidentialDebtRecipientname || '',
                        residentialDebtPurpose: data.residentialDebtPurpose || '',
                        residentialDebtAccount: data.residentialDebtAccount || '',
                        residentialDebtEdrpou: data.residentialDebtEdrpou || '',
                        residentialDebtRecipientname: data.residentialDebtRecipientname || '',
                        landDebtPurpose: data.landDebtPurpose || '',
                        landDebtAccount: data.landDebtAccount || '',
                        landDebtEdrpou: data.landDebtEdrpou || '',
                        landDebtRecipientname: data.landDebtRecipientname || '',
                        orendaDebtPurpose: data.orendaDebtPurpose || '',
                        orendaDebtAccount: data.orendaDebtAccount || '',
                        orendaDebtEdrpou: data.orendaDebtEdrpou || '',
                        orendaDebtRecipientname: data.orendaDebtRecipientname || '',
                        callbackPaySuccess: data.callbackPaySuccess || '',
                        callbackUrl: data.callbackUrl || '',
                        mpzPurpose: data.mpzPurpose || '',
                        mpzAccount: data.mpzAccount || '',
                        mpzEdrpou: data.mpzEdrpou || '',
                        mpzRecipientname: data.mpzRecipientname || ''
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

            const response = await OwerSettingsService.updateSettings(formData);

            if (response.data && !response.data.error) {
                // Invalidate cache
                await OwerSettingsService.invalidateCache();

                notification({
                    placement: "top",
                    type: 'success',
                    title: "Успіх",
                    message: "Налаштування реквізитів успішно збережено",
                    duration: 2
                });
            } else {
                throw new Error(response.data?.message || 'Помилка збереження');
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
                <form className="components-container" onSubmit={onSubmit}>
                    <div className="components-container__full-width">
                        <h1 className="title title--md">Налаштування реквізитів</h1>

                        {/* Нерухомість нежитлова */}
                        <FormSeparator title="Нерухомість нежитлова" style={separatorStyle} />
                        <FormItem label="Призначення платежу" fullWidth>
                            <Input
                                name="nonResidentialDebtPurpose"
                                type="text"
                                className="half-width"
                                value={formData.nonResidentialDebtPurpose}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Номер рахунку" fullWidth>
                            <Input
                                name="nonResidentialDebtAccount"
                                type="text"
                                className="half-width"
                                value={formData.nonResidentialDebtAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="ЄДРПОУ" fullWidth>
                            <Input
                                name="nonResidentialDebtEdrpou"
                                type="text"
                                className="half-width"
                                value={formData.nonResidentialDebtEdrpou}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Отримувач" fullWidth>
                            <Input
                                name="nonResidentialDebtRecipientname"
                                type="text"
                                className="half-width"
                                value={formData.nonResidentialDebtRecipientname}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Нерухомість житлова */}
                        <FormSeparator title="Нерухомість житлова" style={separatorStyle} />
                        <FormItem label="Призначення платежу" fullWidth>
                            <Input
                                name="residentialDebtPurpose"
                                type="text"
                                className="half-width"
                                value={formData.residentialDebtPurpose}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Номер рахунку" fullWidth>
                            <Input
                                name="residentialDebtAccount"
                                type="text"
                                className="half-width"
                                value={formData.residentialDebtAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="ЄДРПОУ" fullWidth>
                            <Input
                                name="residentialDebtEdrpou"
                                type="text"
                                className="half-width"
                                value={formData.residentialDebtEdrpou}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Отримувач" fullWidth>
                            <Input
                                name="residentialDebtRecipientname"
                                type="text"
                                className="half-width"
                                value={formData.residentialDebtRecipientname}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Земля */}
                        <FormSeparator title="Земля" style={separatorStyle} />
                        <FormItem label="Призначення платежу" fullWidth>
                            <Input
                                name="landDebtPurpose"
                                type="text"
                                className="half-width"
                                value={formData.landDebtPurpose}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Номер рахунку" fullWidth>
                            <Input
                                name="landDebtAccount"
                                type="text"
                                className="half-width"
                                value={formData.landDebtAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="ЄДРПОУ" fullWidth>
                            <Input
                                name="landDebtEdrpou"
                                type="text"
                                className="half-width"
                                value={formData.landDebtEdrpou}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Отримувач" fullWidth>
                            <Input
                                name="landDebtRecipientname"
                                type="text"
                                className="half-width"
                                value={formData.landDebtRecipientname}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Оренда */}
                        <FormSeparator title="Оренда" style={separatorStyle} />
                        <FormItem label="Призначення платежу" fullWidth>
                            <Input
                                name="orendaDebtPurpose"
                                type="text"
                                className="half-width"
                                value={formData.orendaDebtPurpose}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Номер рахунку" fullWidth>
                            <Input
                                name="orendaDebtAccount"
                                type="text"
                                className="half-width"
                                value={formData.orendaDebtAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="ЄДРПОУ" fullWidth>
                            <Input
                                name="orendaDebtEdrpou"
                                type="text"
                                className="half-width"
                                value={formData.orendaDebtEdrpou}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Отримувач" fullWidth>
                            <Input
                                name="orendaDebtRecipientname"
                                type="text"
                                className="half-width"
                                value={formData.orendaDebtRecipientname}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* МПЗ (Місцеві податки і збори) */}
                        <FormSeparator title="МПЗ (Місцеві податки і збори)" style={separatorStyle} />
                        <FormItem label="Призначення платежу" fullWidth>
                            <Input
                                name="mpzPurpose"
                                type="text"
                                className="half-width"
                                value={formData.mpzPurpose}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Номер рахунку" fullWidth>
                            <Input
                                name="mpzAccount"
                                type="text"
                                className="half-width"
                                value={formData.mpzAccount}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="ЄДРПОУ" fullWidth>
                            <Input
                                name="mpzEdrpou"
                                type="text"
                                className="half-width"
                                value={formData.mpzEdrpou}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Отримувач" fullWidth>
                            <Input
                                name="mpzRecipientname"
                                type="text"
                                className="half-width"
                                value={formData.mpzRecipientname}
                                onChange={onFieldChange}
                            />
                        </FormItem>

                        {/* Callback налаштування */}
                        <FormSeparator title="Callback налаштування" style={separatorStyle} />
                        <FormItem label="Callback Pay Success" fullWidth>
                            <Input
                                name="callbackPaySuccess"
                                type="text"
                                className="half-width"
                                value={formData.callbackPaySuccess}
                                onChange={onFieldChange}
                            />
                        </FormItem>
                        <FormItem label="Callback URL" fullWidth>
                            <Input
                                name="callbackUrl"
                                type="text"
                                className="half-width"
                                value={formData.callbackUrl}
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

export default OwerSettings;
