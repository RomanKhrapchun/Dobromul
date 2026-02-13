import React, {useContext, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Context} from '../../main';
import {
    handleKeyDown,
    fetchFunction, transformData,
} from '../../utils/function';
import {useNotification} from "../../hooks/useNotification";
import {generateIcon, iconMap} from "../../utils/constants";
import useForm from "../../hooks/useForm";
import PageError from "../ErrorPage/PageError";
import Loader from "../../components/Loader/Loader";
import Input from "../../components/common/Input/Input";
import Button from "../../components/common/Button/Button";
import FormItem from "../../components/common/FormItem/FormItem";
import Select from "../../components/common/Select/Select";
import {serviceProviderValidationSchema} from "../../schema/service-provider/service-provider-schema";
import TextArea from "../../components/common/TextArea/TextArea";

const onBackIcon = generateIcon(iconMap.back)
const onSaveIcon = generateIcon(iconMap.save)
const heightTextArea = {height: '75px'}

// Опції для типу закладу
const typeOptions = [
    { value: 'Готель', label: 'Готель' },
    { value: 'Ресторан', label: 'Ресторан' },
    { value: 'Кафе', label: 'Кафе' },
    { value: 'База відпочинку', label: 'База відпочинку' },
    { value: 'Пансіонат', label: 'Пансіонат' },
    { value: 'Хостел', label: 'Хостел' },
    { value: 'Квартира', label: 'Квартира' },
    { value: 'Будинок', label: 'Будинок' },
    { value: 'Інше', label: 'Інше' },
];

const ServiceProviderAdd = () => {
    const navigate = useNavigate()
    const {store} = useContext(Context)
    const notification = useNotification()
    const initialValues = {
        location_name: '',
        type: null,
        places: '',
        host_name: '',
        host_ipn: '',
        location_address: '',
        host_legal_address: '',
        host_phone: '',
        reception_phone: '',
        website: '',
    }
    const {errors, validateFields, onFieldChange, formData} = useForm(initialValues)
    const [state, setState] = useState({
        isLoading: false,
        isError: {
            error: false,
            status: '',
            message: '',
        },
    })

    const onBackClick = (e) => {
        e.preventDefault();
        navigate('/touristtax/service-providers')
    }

    const onSubmit = async (event) => {
        event.preventDefault()
        try {
            setState(prevState => ({...prevState, isLoading: true}))
            const schema = serviceProviderValidationSchema()
            const result = await validateFields(schema)
            
            // Додаємо перевірку на наявність result та result.data
            if (!result || result.error || !result.data) {
                throw new Error(result?.error || 'Будь ласка, перевірте введені дані та спробуйте ще раз.')
            }
            
            // Підготовка даних для відправки
            const submitData = {
                location_name: result.data.location_name,
                type: result.data.type?.value || result.data.type,
                places: result.data.places ? parseInt(result.data.places) : null,
                host_name: result.data.host_name,
                host_ipn: result.data.host_ipn,
                location_address: result.data.location_address || null,
                host_legal_address: result.data.host_legal_address || null,
                host_phone: result.data.host_phone || null,
                reception_phone: result.data.reception_phone || null,
                website: result.data.website || null,
            }

            const fetchData = await fetchFunction('api/touristtax/service-providers', {
                method: 'post',
                data: transformData(submitData)
            })
            notification({
                placement: "top",
                type: 'success',
                title: "Успіх",
                message: fetchData?.data || 'Хост успішно додано',
                duration: 2
            })
            navigate('/touristtax/service-providers')
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message ? error.response.data.message : error.message,
                placement: 'top'
            })
            if (error?.response?.status === 401) {
                store.logOff()
                return navigate('/')
            }
        } finally {
            setState(prevState => ({...prevState, isLoading: false}))
        }
    }

    if (state.isError.error) {
        return <PageError statusError={state.isError.status} title={state.isError.message}/>
    }

    return (
        <React.Fragment>
            {
                state.isLoading
                    ? <Loader/>
                    : <React.Fragment>
                        <form onKeyDown={handleKeyDown} onSubmit={onSubmit}>
                            <div className="components-container">
                                <FormItem
                                    label="Назва локації"
                                    tooltip="Введіть назву локації (готель, ресторан, кафе тощо)"
                                    error={errors.location_name}
                                    required
                                    fullWidth
                                    htmlFor={"location_name_input"}
                                >
                                    <Input
                                        type="text"
                                        className={"half-width"}
                                        name="location_name"
                                        value={formData.location_name}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: Готель 'Карпати'"
                                    />
                                </FormItem>
                                <FormItem
                                    label="Тип закладу"
                                    tooltip="Виберіть тип закладу"
                                    error={errors.type}
                                    required
                                    fullWidth
                                    htmlFor={"type_select"}
                                >
                                    <Select
                                        isSearchable
                                        className={"half-width"}
                                        name="type"
                                        placeholder="Виберіть тип..."
                                        value={formData.type}
                                        options={typeOptions}
                                        onChange={onFieldChange}
                                    />
                                </FormItem>
                                <FormItem
                                    label="Кількість місць"
                                    tooltip="Введіть кількість місць у закладі"
                                    error={errors.places}
                                    required
                                    fullWidth
                                    htmlFor={"places_input"}
                                >
                                    <Input
                                        type="number"
                                        className={"half-width"}
                                        name="places"
                                        value={formData.places}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: 50"
                                        min="1"
                                    />
                                </FormItem>
                                <FormItem
                                    label="Назва хоста"
                                    tooltip="Введіть назву хоста (назва організації або ПІБ)"
                                    error={errors.host_name}
                                    required
                                    fullWidth
                                    htmlFor={"host_name_input"}
                                >
                                    <Input
                                        type="text"
                                        className={"half-width"}
                                        name="host_name"
                                        value={formData.host_name}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: ТОВ 'Карпатські Готель'"
                                    />
                                </FormItem>
                                <FormItem
                                    label="ІПН хоста"
                                    tooltip="Введіть ІПН хоста (8-12 цифр)"
                                    error={errors.host_ipn}
                                    required
                                    fullWidth
                                    htmlFor={"host_ipn_input"}
                                >
                                    <Input
                                        type="text"
                                        className={"half-width"}
                                        name="host_ipn"
                                        value={formData.host_ipn}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: 1234567890"
                                        maxLength="12"
                                    />
                                </FormItem>
                                <FormItem
                                    label="Адреса закладу"
                                    tooltip="Введіть адресу закладу"
                                    error={errors.location_address}
                                    required
                                    fullWidth
                                    htmlFor={"location_address_textArea"}
                                >
                                    <TextArea
                                        style={heightTextArea}
                                        className={"input full-width"}
                                        name="location_address"
                                        value={formData.location_address || ''}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: вул. Борканюка, 15, смт. Ясіння..."
                                    />
                                </FormItem>
                                <FormItem
                                    label="Юридична адреса хоста"
                                    tooltip="Введіть юридичну адресу хоста"
                                    error={errors.host_legal_address}
                                    required
                                    fullWidth
                                    htmlFor={"host_legal_address_textArea"}
                                >
                                    <TextArea
                                        style={heightTextArea}
                                        className={"input full-width"}
                                        name="host_legal_address"
                                        value={formData.host_legal_address || ''}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: вул. Борканюка, 15, смт. Ясіння..."
                                    />
                                </FormItem>
                                <FormItem
                                    label="Телефон хоста"
                                    tooltip="Введіть контактний телефон хоста"
                                    error={errors.host_phone}
                                    required
                                    fullWidth
                                    htmlFor={"host_phone_input"}
                                >
                                    <Input
                                        type="tel"
                                        className={"half-width"}
                                        name="host_phone"
                                        value={formData.host_phone}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: +380501234567"
                                    />
                                </FormItem>
                                <FormItem
                                    label="Телефон рецепції"
                                    tooltip="Введіть телефон рецепції (якщо відрізняється від телефону хоста)"
                                    error={errors.reception_phone}
                                    fullWidth
                                    htmlFor={"reception_phone_input"}
                                >
                                    <Input
                                        type="tel"
                                        className={"half-width"}
                                        name="reception_phone"
                                        value={formData.reception_phone}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: +380501234568"
                                    />
                                </FormItem>
                                <FormItem
                                    label="Веб-сайт"
                                    tooltip="Введіть URL веб-сайту"
                                    error={errors.website}
                                    fullWidth
                                    htmlFor={"website_input"}
                                >
                                    <Input
                                        type="url"
                                        className={"half-width"}
                                        name="website"
                                        value={formData.website}
                                        autoComplete="new-password"
                                        onChange={onFieldChange}
                                        placeholder="Наприклад: https://example.com"
                                    />
                                </FormItem>
                                <div className="btn-group components-container__full-width">
                                    <Button icon={onBackIcon} onClick={onBackClick}>
                                        Повернутись
                                    </Button>
                                    <Button type="submit" icon={onSaveIcon}>
                                        Зберегти
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </React.Fragment>
            }
        </React.Fragment>
    );
};
export default ServiceProviderAdd;

