import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import { generateIcon, iconMap, STATUS } from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import classNames from "classnames";
import Pagination from "../../components/common/Pagination/Pagination";
import Input from "../../components/common/Input/Input";
import { fetchFunction, hasOnlyAllowedParams, validateFilters } from "../../utils/function";
import { useNotification } from "../../hooks/useNotification";
import { Context } from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import { Transition } from "react-transition-group";
import FormItem from "../../components/common/FormItem/FormItem";
import Select from "../../components/common/Select/Select";
import SportsFilterDropdown from "../../components/common/Dropdown/SportsFilterDropdown";
import "../../components/common/Dropdown/SportsFilterDropdown.css";

// Іконки
const viewIcon = generateIcon(iconMap.view);
const downloadIcon = generateIcon(iconMap.download);
const editIcon = generateIcon(iconMap.edit);
const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');
const dropDownIcon = generateIcon(iconMap.arrowDown);
const addIcon = generateIcon(iconMap.add);
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14);
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14);
const dropDownStyle = { width: '100%' };
const childDropDownStyle = { justifyContent: 'center' };

// СПИСОК ПІЛЬГ
const DISCOUNT_OPTIONS = [
    {
        id: 'orphans_heroes',
        label: 'Дітям-сиротам, дітям із багатодітних сімей, дітям, батьки яких є героями'
    },
    {
        id: 'refugees_heroes_war',
        label: 'Дітям-біженцям, дітям з багатодітних сімей, дітям, батьки яких є героями війни або загинули'
    },
    {
        id: 'disability_1_2',
        label: 'Особам з інвалідністю I та II групи (мешканці Давидівської сільської територіальної громади)'
    },
    {
        id: 'war_veterans',
        label: 'Учасникам бойових дій та особам з інвалідністю внаслідок війни, які брали участь у бойових діях починаючи з 2014 року'
    },
    {
        id: 'military_service',
        label: 'Військовослужбовцям, які проходять службу у Збройних Силах України та інших військових формуваннях'
    },
    {
        id: 'families_fallen',
        label: 'Сім\'ям загиблих військовослужбовців, полонених та зниклих безвісти військових'
    }
];

const Bills = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const nodeRef = useRef(null);
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const reportModalRef = useRef(null);
    const isFirstRun = useRef(true);
    
    const [state, setState] = useState({
        isFilterOpen: false,
        selectData: {},
        confirmLoading: false,
        itemId: null,
        sendData: {
            limit: 16,
            page: 1,
            sort_by: null,
            sort_direction: null,
        }
    });
    
    // ✅ ФУНКЦІЇ СОРТУВАННЯ
    const handleSort = useCallback((dataIndex) => {
        setState(prevState => {
            let newDirection = 'desc'; // За замовчуванням від найбільшого до найменшого
            
            // Якщо вже сортуємо по цьому полю, змінюємо напрямок
            if (prevState.sendData.sort_by === dataIndex) {
                newDirection = prevState.sendData.sort_direction === 'desc' ? 'asc' : 'desc';
            }
            
            return {
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    sort_by: dataIndex,
                    sort_direction: newDirection,
                    page: 1, // Скидаємо на першу сторінку при сортуванні
                }
            };
        });
    }, []);

    // ✅ ФУНКЦІЯ ДЛЯ ІКОНКИ СОРТУВАННЯ
    const getSortIcon = useCallback((dataIndex) => {
        if (state.sendData.sort_by !== dataIndex) {
            return null;
        }
        try {
            return state.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
        } catch (error) {
            console.error('Помилка при створенні іконки сортування:', error);
            return null;
        }
    }, [state.sendData.sort_by, state.sendData.sort_direction]);
    
    // Стан для модальних вікон
    const [createModalState, setCreateModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            membership_number: '',
            client_name: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
            discount_type: '',
            discount_applied: false,
        },
        serviceGroups: [],
        services: [],
        searchResults: [],
        isClientFound: false,
    });

    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        billId: null,
        formData: {
            membership_number: '',
            client_name: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
            discount_type: '',
            discount_applied: false,
        },
        serviceGroups: [],
        services: [],
        searchResults: [],
        isClientFound: false,
    });

    // ✅ НОВИЙ СТАН ДЛЯ МОДАЛЬНОГО ВІКНА ЗВІТІВ
    const [reportModalState, setReportModalState] = useState({
        isOpen: false,
        loading: false,
        reportType: '', // 'date', 'today', 'all'
        selectedDate: ''
    });

    // Завантаження даних рахунків
    const {error, status, data, retryFetch} = useFetch('api/sportscomplex/bills/filter', {
        method: 'post',
        data: state.sendData
    });

    // Завантаження груп послуг
    useEffect(() => {
        const loadServiceGroups = async () => {
            try {
                const response = await fetchFunction('/api/sportscomplex/service-groups', {
                    method: 'get'
                });
                
                if (response?.data) {
                    const groups = response.data.map(group => ({
                        value: group.id,
                        label: group.name
                    }));
                    
                    setCreateModalState(prev => ({ ...prev, serviceGroups: groups }));
                    setEditModalState(prev => ({ ...prev, serviceGroups: groups }));
                }
            } catch (error) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не вдалося завантажити групи послуг",
                    placement: 'top',
                });
            }
        };

        loadServiceGroups();
    }, []);

    // Ефект для оновлення даних при зміні параметрів пошуку
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/sportscomplex/bills/filter', {
            method: 'post',
            data: state.sendData,
        })
    }, [state.sendData, retryFetch]);

    const startRecord = ((state.sendData.page || 1) - 1) * state.sendData.limit + 1;
    const endRecord = Math.min(startRecord + state.sendData.limit - 1, parseInt(data?.totalItems) || 1);

    // Пошук клієнтів по номеру абонемента
    const searchClientByMembership = async (membershipNumber) => {
        console.log('🔍 Шукаємо клієнта з номером:', membershipNumber);
        
        if (!membershipNumber || membershipNumber.length < 5) {
            console.log('⚠️ Номер занадто короткий:', membershipNumber);
            return null;
        }
        
        try {
            const response = await fetchFunction(`/api/sportscomplex/clients/search-by-membership`, {
                method: 'post',
                data: { membership_number: membershipNumber }
            });
            
            console.log('📥 Відповідь від сервера:', response);
            return response?.data?.data || null;
        } catch (error) {
            console.error('❌ Помилка пошуку клієнта:', error);
            return null;
        }
    };

    // Завантаження послуг для вибраної групи
    const loadServicesForGroup = async (groupId, modalType = 'create') => {
        if (!groupId) {
            if (modalType === 'create') {
                setCreateModalState(prev => ({ ...prev, services: [] }));
            } else {
                setEditModalState(prev => ({ ...prev, services: [] }));
            }
            return;
        }
        
        try {
            const response = await fetchFunction(`/api/sportscomplex/services-by-group/${groupId}`, {
                method: 'get'
            });
            
            if (response?.data) {
                const services = Array.isArray(response.data) ? response.data.map(service => ({
                    value: service.id,
                    label: service.name,
                    visit_count: service.lesson_count,
                    price: service.price
                })) : [];

                if (modalType === 'create') {
                    setCreateModalState(prev => ({ ...prev, services }));
                } else {
                    setEditModalState(prev => ({ ...prev, services }));
                }
            }
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: "Не вдалося завантажити послуги",
                placement: 'top',
            });
        }
    };

    // ✅ ПОКРАЩЕНІ КОЛОНКИ З МОЖЛИВІСТЮ СОРТУВАННЯ
    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: state.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('Номер абонемента', 'membership_number', null, '12%'),
            createSortableColumn('ПІБ клієнта', 'client_name', null, '15%'),
            createSortableColumn('Номер телефону', 'phone_number', null, '12%'),
            createSortableColumn('Група послуг', 'service_group', null, '12%'),
            createSortableColumn('Послуга', 'service_name', null, '15%'),
            createSortableColumn('Кількість відвідувань', 'visit_count', null, '10%'),
            createSortableColumn('Ціна', 'total_price', (price) => `${price} грн`, '10%'),
            {
                title: 'Пільга',
                dataIndex: 'discount_type',
                width: '10%',
                headerClassName: 'non-sortable',
                render: (discountType) => {
                    if (!discountType) return '—';
                    const discount = DISCOUNT_OPTIONS.find(d => d.id === discountType);
                    return discount ? discount.label : '—';
                }
            },
            {
                title: 'Дія',
                dataIndex: 'action',
                headerClassName: 'non-sortable',
                width: '14%',
                render: (_, record) => (
                    <div className="btn-sticky" style={{ justifyContent: 'center', gap: '2px' }}>
                        <Button
                            title="Редагувати"
                            icon={editIcon}
                            size="small"
                            onClick={() => handleOpenEditModal(record)}
                        />
                        <Button
                            title="Скачати"
                            icon={downloadIcon}
                            size="small"
                            onClick={() => handleDownloadBill(record.id)}
                        />
                    </div>
                )
            }
        ];
    }, [handleSort, getSortIcon, state.sendData.sort_by]);

    // Підготовка даних для таблиці
    const tableData = useMemo(() => {
        if (!Array.isArray(data?.items)) return [];
        return data.items.map(el => ({
            key: el.id,
            id: el.id,
            membership_number: el.membership_number,
            client_name: el.client_name,
            phone_number: el.phone_number,
            service_group: el.service_group,
            service_name: el.service_name,
            visit_count: el.visit_count,
            total_price: el.total_price,
            discount_type: el.discount_type,
            created_at: el.created_at
        }));
    }, [data]);

    // Пункти меню для вибору кількості записів на сторінці
    const itemMenu = [16, 32, 48].map(size => ({
        label: `${size}`,
        key: `${size}`,
        onClick: () => {
            if (state.sendData.limit !== size) {
                setState(prev => ({...prev, sendData: {...prev.sendData, limit: size, page: 1}}));
            }
        }
    }));

    // Функції для фільтрів
    const filterHandleClick = () => {
        setState(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setState(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(state.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [state.selectData])

    const onHandleChange = (name, value) => {
        console.log('🔍 === ФРОНТЕНД ДЕБАГ ===');
        console.log('🔍 onHandleChange викликано з:', name, '=', value);
        setState(prev => {
            const newSelectData = {...prev.selectData, [name]: value};
            console.log('🔍 Новий selectData:', newSelectData);
            return {
                ...prev, 
                selectData: newSelectData
            }
        });
    };

    // Функція для зміни полів форми створення
    const onCreateFormChange = async (name, value) => {
        console.log('🔥 onCreateFormChange:', name, value);

        // Спочатку оновлюємо стан
        setCreateModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));

        // АВТОЗАПОВНЕННЯ при введенні номера абонемента
        if (name === 'membership_number' && value.length >= 5) {
            console.log('🔍 Початок пошуку клієнта для номера:', value);
            
            try {
                const client = await searchClientByMembership(value);
                console.log('✅ Результат пошуку клієнта:', client);
                
                if (client) {
                    setCreateModalState(prev => ({
                        ...prev,
                        formData: {
                            ...prev.formData,
                            client_name: client.name || '',
                            phone_number: client.phone_number || ''
                        },
                        isClientFound: true
                    }));
                    console.log('✅ Дані клієнта заповнені:', client.name, client.phone_number);
                } else {
                    // Очищаємо поля, якщо клієнт не знайдений
                    setCreateModalState(prev => ({
                        ...prev,
                        formData: {
                            ...prev.formData,
                            client_name: '',
                            phone_number: ''
                        },
                        isClientFound: false
                    }));
                    console.log('❌ Клієнта не знайдено, поля очищено');
                }
            } catch (error) {
                console.error('❌ Помилка під час пошуку:', error);
                setCreateModalState(prev => ({
                    ...prev,
                    isClientFound: false
                }));
            }
        }

        // ОЧИЩАЄМО СТАТУС ПОШУКУ ЯКЩО НОМЕР АБОНЕМЕНТА ЗМІНИВСЯ
        if (name === 'membership_number' && value.length < 5) {
            setCreateModalState(prev => ({
                ...prev,
                isClientFound: false,
                formData: {
                    ...prev.formData,
                    client_name: '',
                    phone_number: ''
                }
            }));
        }
    };

    // Функції для модального вікна редагування
    const onEditFormChange = async (name, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));

        if (name === 'membership_number' && value.length >= 5) {
            const client = await searchClientByMembership(value);
            if (client) {
                setEditModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        client_name: client.name,
                        phone_number: client.phone_number
                    },
                    isClientFound: true
                }));
            } else {
                setEditModalState(prev => ({
                    ...prev,
                    isClientFound: false
                }));
            }
        }

        if (name === 'membership_number' && value.length < 5) {
            setEditModalState(prev => ({
                ...prev,
                isClientFound: false,
                formData: {
                    ...prev.formData,
                    client_name: '',
                    phone_number: ''
                }
            }));
        }
    };

    // Функція для обробки зміни пільги
    const handleDiscountChange = (discountId, modalType = 'create') => {
        const setState = modalType === 'create' ? setCreateModalState : setEditModalState;
        
        setState(prev => {
            const discountApplied = discountId ? true : false;
            const basePrice = prev.formData.price || 0;
            const finalPrice = discountApplied ? Math.round(basePrice * 0.5) : basePrice;
            
            return {
                ...prev,
                formData: {
                    ...prev.formData,
                    discount_type: discountId,
                    discount_applied: discountApplied,
                    total_price: finalPrice
                }
            };
        });
    };

    // Обробка вибору групи послуг
    const handleServiceGroupChange = (name, option, modalType = 'create') => {
        const groupId = option && typeof option === 'object' ? option.value : option;
        
        if (modalType === 'create') {
            setCreateModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    service_group_id: option,
                    service_id: '',
                    visit_count: '',
                    price: 0,
                    total_price: 0
                }
            }));
        } else {
            setEditModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    service_group_id: option,
                    service_id: '',
                    visit_count: '',
                    price: 0,
                    total_price: 0
                }
            }));
        }
        
        if (groupId) {
            loadServicesForGroup(groupId, modalType);
        }
    };

    // Обробка вибору послуги (з урахуванням пільги)
    const handleServiceChange = (name, option, modalType = 'create') => {
        if (!option) return;
        
        const services = modalType === 'create' ? createModalState.services : editModalState.services;
        const serviceOption = services.find(
            service => service.value === (typeof option === 'object' ? option.value : option)
        );
        
        if (serviceOption) {
            const { label, visit_count, price } = serviceOption;
            const currentDiscount = modalType === 'create' ? 
                createModalState.formData.discount_applied : 
                editModalState.formData.discount_applied;
            
            const finalPrice = currentDiscount ? Math.round(price * 0.5) : price;

            if (modalType === 'create') {
                setCreateModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        service_id: option,
                        visit_count,
                        price,
                        total_price: finalPrice
                    }
                }));
            } else {
                setEditModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        service_id: option,
                        visit_count,
                        price,
                        total_price: finalPrice
                    }
                }));
            }
        }
    };

    // ✅ ПОКРАЩЕНІ ФУНКЦІЇ ДЛЯ ФІЛЬТРІВ З ДЕБАГОМ
    const resetFilters = () => {
        console.log('🔍 === RESET FILTERS ДЕБАГ ===');
        console.log('🔍 Поточний selectData:', state.selectData);
        
        if (Object.values(state.selectData).some(value => value)) {
            setState(prev => ({...prev, selectData: {}}));
        }
        
        const dataReadyForSending = hasOnlyAllowedParams(state.sendData, ['limit', 'page', 'sort_by', 'sort_direction']);
        if (!dataReadyForSending) {
            setState(prev => ({
                ...prev, 
                sendData: {
                    limit: prev.sendData.limit, 
                    page: 1,
                    sort_by: prev.sendData.sort_by,
                    sort_direction: prev.sendData.sort_direction,
                }
            }));
        }
        console.log('🔍 Фільтри скинуто');
    };

    const applyFilter = () => {
        console.log('🔍 === APPLY FILTER ДЕБАГ ===');
        console.log('🔍 state.selectData:', JSON.stringify(state.selectData, null, 2));
        
        const isAnyInputFilled = Object.values(state.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        })
        
        console.log('🔍 isAnyInputFilled:', isAnyInputFilled);
        
        if (isAnyInputFilled) {
            console.log('🔍 Викликаємо validateFilters з:', state.selectData);
            const dataValidation = validateFilters(state.selectData);
            console.log('🔍 Результат validateFilters:', JSON.stringify(dataValidation, null, 2));
            
            if (!dataValidation.error) {
                const newSendData = {
                    ...dataValidation, 
                    limit: state.sendData.limit, 
                    page: 1,
                    sort_by: state.sendData.sort_by,
                    sort_direction: state.sendData.sort_direction,
                };
                console.log('🔍 Відправляємо на сервер:', JSON.stringify(newSendData, null, 2));
                
                setState(prev => ({
                    ...prev, 
                    sendData: newSendData
                }));
            } else {
                console.log('🔍 Помилка валідації:', dataValidation.message);
                notification({ 
                    type: 'warning', 
                    title: 'Помилка', 
                    message: dataValidation.message,
                    placement: 'top' 
                });
            }
        }
    };

    // Функція для навігації по сторінках
    const onPageChange = useCallback(page => {
        if (state.sendData.page !== page) {
            setState(prev => ({...prev, sendData: {...prev.sendData, page}}));
        }
    }, [state.sendData.page]);

    // ✅ ФУНКЦІЇ ДЛЯ МОДАЛЬНОГО ВІКНА ЗВІТІВ
    const openReportModal = () => {
        setReportModalState(prev => ({
            ...prev,
            isOpen: true,
            reportType: '',
            selectedDate: ''
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeReportModal = () => {
        setReportModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleReportTypeChange = (type) => {
        setReportModalState(prev => ({
            ...prev,
            reportType: type,
            selectedDate: type === 'today' ? new Date().toISOString().split('T')[0] : ''
        }));
    };

    const handleDateChange = (event) => {
        setReportModalState(prev => ({
            ...prev,
            selectedDate: event.target.value
        }));
    };

    // ✅ ОНОВЛЕНА ФУНКЦІЯ ГЕНЕРАЦІЇ ЗВІТУ
    const handleGenerateReport = async () => {
        try {
            // Валідація
            if (!reportModalState.reportType) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Оберіть тип звіту",
                    placement: 'top',
                });
                return;
            }

            if (reportModalState.reportType === 'date' && !reportModalState.selectedDate) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Оберіть дату для звіту",
                    placement: 'top',
                });
                return;
            }

            setReportModalState(prev => ({...prev, loading: true}));
            
            // Формуємо фільтри в залежності від типу звіту
            let reportFilters = {};
            
            if (reportModalState.reportType === 'date' && reportModalState.selectedDate) {
                reportFilters.date = reportModalState.selectedDate;
            } else if (reportModalState.reportType === 'today') {
                const today = new Date().toISOString().split('T')[0];
                reportFilters.date = today;
            }
            // Для 'all' не додаємо фільтри по даті
            
            console.log('📊 Відправляємо фільтри на сервер:', reportFilters);
            console.log('📊 Тип звіту:', reportModalState.reportType);
            
            // Отримуємо дані для звіту
            const reportResponse = await fetchFunction('/api/sportscomplex/bills/report', {
                method: 'post',
                data: reportFilters
            });
            
            console.log('📊 Отримали відповідь від /bills/report:', reportResponse);
            console.log('📊 reportResponse.data:', reportResponse.data);
            console.log('📊 reportResponse.data.success:', reportResponse.data.success);
            console.log('📊 reportResponse.data.data type:', typeof reportResponse.data.data);
            console.log('📊 reportResponse.data.data isArray:', Array.isArray(reportResponse.data.data));
            console.log('📊 reportResponse.data.data length:', reportResponse.data.data?.length);
            
            if (!reportResponse.data.success || !reportResponse.data.data || reportResponse.data.data.length === 0) {
                notification({
                    type: 'warning',
                    title: "Попередження",
                    message: "Немає даних для формування звіту",
                    placement: 'top',
                });
                setReportModalState(prev => ({...prev, loading: false}));
                return;
            }
            
            console.log('📊 Відправляємо дані до /export-word:', reportResponse.data.data);
            console.log('📊 Перший елемент даних:', reportResponse.data.data[0]);
            
            // Генеруємо Word файл
            const response = await fetchFunction('/api/sportscomplex/bills/export-word', {
                method: 'post',
                data: reportResponse.data.data,
                responseType: 'blob'
            });
            
            console.log('📊 Отримали відповідь від /export-word:', response);
            console.log('📊 Response type:', typeof response.data);
            console.log('📊 Response size:', response.data?.size);
            
            notification({
                placement: "top",
                duration: 2,
                title: 'Успіх',
                message: "Звіт успішно сформовано.",
                type: 'success'
            });
            
            // Скачуємо файл
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // ✅ ОНОВЛЕНІ НАЗВИ ФАЙЛІВ
            let fileName;
            if (reportModalState.reportType === 'today') {
                const todayFormatted = new Date().toLocaleDateString('uk-UA');
                fileName = `Звіт за день(${todayFormatted})`;
            } else if (reportModalState.reportType === 'date') {
                const selectedDateFormatted = new Date(reportModalState.selectedDate).toLocaleDateString('uk-UA');
                fileName = `Звіт за день(${selectedDateFormatted})`;
            } else {
                fileName = 'Звіт по платежам за увесь час';
            }
            fileName += '.docx';
            
            console.log('📊 Назва файлу:', fileName);
            
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            closeReportModal();
            
        } catch (error) {
            console.error('❌ Помилка генерації звіту:', error);
            console.error('❌ Error response:', error?.response);
            console.error('❌ Error response status:', error?.response?.status);
            console.error('❌ Error response data:', error?.response?.data);
            
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || "Помилка генерації звіту",
                placement: 'top',
            });
        } finally {
            setReportModalState(prev => ({...prev, loading: false}));
        }
    };

    // Функції для модального вікна створення
    const openCreateModal = () => {
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                membership_number: '',
                client_name: '',
                phone_number: '',
                service_group_id: '',
                service_id: '',
                visit_count: '',
                price: 0,
                total_price: 0,
                discount_type: '',
                discount_applied: false,
            },
            isClientFound: false
        }));
        document.body.style.overflow = 'hidden';
    };
    
    const closeCreateModal = () => {
        setCreateModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    // Функції для модального вікна редагування
    const handleOpenEditModal = async (bill) => {
        try {
            const response = await fetchFunction(`/api/sportscomplex/bills/${bill.id}`, {
                method: 'get'
            });
            
            const billData = response.data;
            
            setEditModalState(prev => ({
                ...prev,
                isOpen: true,
                billId: bill.id,
                formData: {
                    membership_number: billData.membership_number,
                    client_name: billData.client_name,
                    phone_number: billData.phone_number,
                    service_group_id: { value: billData.service_group_id, label: billData.service_group },
                    service_id: { value: billData.service_id, label: billData.service_name },
                    visit_count: billData.visit_count,
                    price: billData.price,
                    total_price: billData.total_price,
                    discount_type: billData.discount_type || '',
                    discount_applied: !!billData.discount_type,
                },
                isClientFound: true
            }));
            
            if (billData.service_group_id) {
                loadServicesForGroup(billData.service_group_id, 'edit');
            }
            
            document.body.style.overflow = 'hidden';
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: "Не вдалося завантажити дані рахунку",
                placement: 'top',
            });
        }
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false, billId: null }));
        document.body.style.overflow = 'auto';
    };

    // Функція для створення рахунку
    const handleCreateFormSubmit = async () => {
        const { membership_number, client_name, phone_number, service_id, discount_type } = createModalState.formData;
        
        if (!membership_number || !client_name || !phone_number || !service_id) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }

        // ПЕРЕВІРКА ЧИ ЗНАЙДЕНО КЛІЄНТА
        if (!createModalState.isClientFound) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Клієнта з таким номером абонемента не знайдено. Перевірте номер або створіть клієнта в розділі "Клієнти".',
            });
            return;
        }
        
        try {
            setCreateModalState(prev => ({...prev, loading: true}));
            
            const serviceIdValue = typeof service_id === 'object' ? service_id.value : service_id;
            
            await fetchFunction('/api/sportscomplex/bills', {
                method: 'post',
                data: {
                    membership_number,
                    client_name,
                    phone_number,
                    service_id: serviceIdValue,
                    discount_type: discount_type || null
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Рахунок успішно створено',
            });
            
            retryFetch('/api/sportscomplex/bills/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeCreateModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setCreateModalState(prev => ({...prev, loading: false}));
        }
    };

    // Функція для редагування рахунку
    const handleEditFormSubmit = async () => {
        const { membership_number, client_name, phone_number, service_id, discount_type } = editModalState.formData;
        
        if (!membership_number || !client_name || !phone_number || !service_id) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }
        
        try {
            setEditModalState(prev => ({...prev, loading: true}));
            
            const serviceIdValue = typeof service_id === 'object' ? service_id.value : service_id;
            
            await fetchFunction(`/api/sportscomplex/bills/${editModalState.billId}`, {
                method: 'put',
                data: {
                    membership_number,
                    client_name,
                    phone_number,
                    service_id: serviceIdValue,
                    discount_type: discount_type || null
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Рахунок успішно оновлено',
            });
            
            retryFetch('/api/sportscomplex/bills/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeEditModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setEditModalState(prev => ({...prev, loading: false}));
        }
    };

    // Функція для скачування рахунку
    const handleDownloadBill = async (billId) => {
        try {
            setState(prev => ({...prev, confirmLoading: true}));
            
            const response = await fetchFunction(`/api/sportscomplex/bills/${billId}/download`, {
                method: 'get',
                responseType: 'blob'
            });
            
            notification({
                placement: "top",
                duration: 2,
                title: 'Успіх',
                message: "Файл успішно сформовано.",
                type: 'success'
            });
            
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bill-${billId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message ? error.response.data.message : error.message,
                placement: 'top',
            });
        } finally {
            setState(prev => ({...prev, confirmLoading: false}));
        }
    };

    // Обробка помилок
    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}
            
            {status === STATUS.SUCCESS && (
                <div className="table-elements">
                    <div className="table-header">
                        <h2 className="title title--sm">
                            {data?.items?.length ? 
                                `Показує ${startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з ${data?.totalItems || 1}` : 
                                'Записів не знайдено'
                            }
                        </h2>
                        <div className="table-header__buttons">
                            <Button 
                                className="btn--primary"
                                onClick={openCreateModal}
                                icon={addIcon}
                            >
                                Створити
                            </Button>
                            <Button 
                                className="btn--primary"
                                onClick={openReportModal}
                                icon={downloadIcon}
                                loading={state.confirmLoading}
                            >
                                Звітність
                            </Button>
                            <Dropdown 
                                icon={dropDownIcon} 
                                iconPosition="right" 
                                style={dropDownStyle} 
                                childStyle={childDropDownStyle} 
                                caption={`Записів: ${state.sendData.limit}`} 
                                menu={itemMenu} 
                            />
                            <Button
                                className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                onClick={filterHandleClick}
                                icon={filterIcon}>
                                Фільтри {hasActiveFilters && `(${Object.keys(state.selectData).filter(key => state.selectData[key]).length})`}
                            </Button>
                            
                            {/* ✅ ФІЛЬТР ДЛЯ BILLS з автоматичним визначенням полів */}
                            <SportsFilterDropdown
                                isOpen={state.isFilterOpen}
                                onClose={closeFilterDropdown}
                                filterData={state.selectData}
                                onFilterChange={onHandleChange}
                                onApplyFilter={applyFilter}
                                onResetFilters={resetFilters}
                                searchIcon={searchIcon}
                            />
                        </div>
                    </div>
                    <div className="table-main">
                        <div className="table-and-pagination-wrapper">
                            <Table 
                                columns={Array.isArray(columnTable) ? columnTable.filter(Boolean) : []} 
                                dataSource={Array.isArray(tableData) ? tableData : []}
                            />
                            <Pagination 
                                className="m-b" 
                                currentPage={parseInt(data?.currentPage) || 1} 
                                totalCount={parseInt(data?.totalItems) || 1} 
                                pageSize={state.sendData.limit} 
                                onPageChange={onPageChange} 
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* ✅ НОВЕ МОДАЛЬНЕ ВІКНО ДЛЯ ВИБОРУ ТИПУ ЗВІТУ */}
            <Transition in={reportModalState.isOpen} timeout={200} unmountOnExit nodeRef={reportModalRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeReportModal}
                        onOk={handleGenerateReport}
                        confirmLoading={reportModalState.loading}
                        cancelText="Скасувати"
                        okText="Створити звіт"
                        title="Створення звіту"
                        width="500px"
                    >
                        <div className="form-container">
                            <FormItem label="Оберіть тип звіту" required fullWidth>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="reportType"
                                            value="today"
                                            checked={reportModalState.reportType === 'today'}
                                            onChange={(e) => handleReportTypeChange(e.target.value)}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span>За сьогодні</span>
                                    </label>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="reportType"
                                            value="date"
                                            checked={reportModalState.reportType === 'date'}
                                            onChange={(e) => handleReportTypeChange(e.target.value)}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span>За певну дату</span>
                                    </label>
                                    
                                    {reportModalState.reportType === 'date' && (
                                        <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                                            <input
                                                type="date"
                                                value={reportModalState.selectedDate}
                                                onChange={handleDateChange}
                                                style={{
                                                    padding: '8px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    )}
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="reportType"
                                            value="all"
                                            checked={reportModalState.reportType === 'all'}
                                            onChange={(e) => handleReportTypeChange(e.target.value)}
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span>За весь час</span>
                                    </label>
                                </div>
                            </FormItem>
                            
                            {reportModalState.reportType && (
                                <div style={{ 
                                    padding: '12px', 
                                    backgroundColor: '#f0f9ff', 
                                    border: '1px solid #bae6fd', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    marginTop: '16px'
                                }}>
                                    <strong>Опис:</strong> Буде створено Word документ з таблицею рахунків
                                    {reportModalState.reportType === 'today' && ' за сьогоднішню дату'}
                                    {reportModalState.reportType === 'date' && reportModalState.selectedDate && ` за ${reportModalState.selectedDate}`}
                                    {reportModalState.reportType === 'all' && ' за весь період'}
                                    . Таблиця буде містити всі дані аналогічно до відображення на сторінці.
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* Модальні вікна створення та редагування - код залишається без змін */}
            <Transition in={createModalState.isOpen} timeout={200} unmountOnExit nodeRef={addFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeCreateModal}
                        onOk={handleCreateFormSubmit}
                        confirmLoading={createModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Створення нового рахунку"
                        width="700px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                    placeholder="Введіть номер абонемента"
                                />
                            </FormItem>
                            
                            {createModalState.formData.membership_number.length >= 5 && (
                                <div style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                    backgroundColor: createModalState.isClientFound ? '#e6f7ff' : '#fff2e8',
                                    border: `1px solid ${createModalState.isClientFound ? '#91d5ff' : '#ffcc99'}`,
                                    color: createModalState.isClientFound ? '#096dd9' : '#d46b08'
                                }}>
                                    {createModalState.isClientFound ? 
                                        '✅ Клієнта знайдено! Дані автоматично заповнені.' : 
                                        '⚠️ Клієнта з таким номером абонемента не знайдено.'}
                                </div>
                            )}
                            
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={createModalState.formData.client_name}
                                    onChange={onCreateFormChange}
                                    placeholder={createModalState.isClientFound ? 
                                        "Автоматично заповнено" : 
                                        "Спочатку введіть номер абонемента"}
                                    disabled={createModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: createModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: createModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={createModalState.formData.phone_number}
                                    onChange={onCreateFormChange}
                                    placeholder={createModalState.isClientFound ? 
                                        "Автоматично заповнено" : 
                                        "Спочатку введіть номер абонемента"}
                                    disabled={createModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: createModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: createModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Група послуг" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть групу послуг"
                                    value={createModalState.formData.service_group_id}
                                    onChange={(name, option) => handleServiceGroupChange(name, option, 'create')}
                                    options={createModalState.serviceGroups}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Послуга" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть послугу"
                                    value={createModalState.formData.service_id}
                                    onChange={(name, option) => handleServiceChange(name, option, 'create')}
                                    options={createModalState.services}
                                    disabled={!createModalState.formData.service_group_id}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Пільги (знижка 50%)" 
                                fullWidth
                            >
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                                    {DISCOUNT_OPTIONS.map(discount => (
                                        <div key={discount.id} style={{ marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '14px' }}>
                                                <input
                                                    type="radio"
                                                    name="discount_type"
                                                    value={discount.id}
                                                    checked={createModalState.formData.discount_type === discount.id}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'create')}
                                                    style={{ marginRight: '8px', marginTop: '2px' }}
                                                />
                                                <span style={{ lineHeight: '1.4' }}>{discount.label}</span>
                                            </label>
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="discount_type"
                                                value=""
                                                checked={!createModalState.formData.discount_type}
                                                onChange={(e) => handleDiscountChange('', 'create')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span>Без пільги</span>
                                        </label>
                                    </div>
                                </div>
                            </FormItem>
                            
                            <div className="form-row" style={{display: 'flex', gap: '16px'}}>
                                <FormItem 
                                    label="Кількість відвідувань" 
                                    fullWidth
                                >
                                    <Input
                                        name="visit_count"
                                        value={createModalState.formData.visit_count}
                                        disabled={true}
                                    />
                                </FormItem>
                                
                                <FormItem 
                                    label="Ціна" 
                                    fullWidth
                                >
                                    <Input
                                        name="total_price"
                                        value={createModalState.formData.total_price ? `${createModalState.formData.total_price} грн` : ''}
                                        disabled={true}
                                    />
                                </FormItem>
                            </div>
                            
                            {createModalState.formData.discount_applied && (
                                <div style={{ 
                                    padding: '10px', 
                                    backgroundColor: '#e6f7ff', 
                                    border: '1px solid #91d5ff', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#096dd9'
                                }}>
                                    ✅ Застосована знижка 50% за пільгою
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* Модальне вікно редагування */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeEditModal}
                        onOk={handleEditFormSubmit}
                        confirmLoading={editModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти зміни"
                        title="Редагування рахунку"
                        width="700px"
                    >
                        {/* Аналогічний контент як у створенні, але з editModalState та 'edit' modalType */}
                        <div className="form-container">
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть номер абонемента"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={editModalState.formData.client_name}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть ПІБ клієнта"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={editModalState.formData.phone_number}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть номер телефону"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Група послуг" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть групу послуг"
                                    value={editModalState.formData.service_group_id}
                                    onChange={(name, option) => handleServiceGroupChange(name, option, 'edit')}
                                    options={editModalState.serviceGroups}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Послуга" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть послугу"
                                    value={editModalState.formData.service_id}
                                    onChange={(name, option) => handleServiceChange(name, option, 'edit')}
                                    options={editModalState.services}
                                    disabled={!editModalState.formData.service_group_id}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Пільги (знижка 50%)" 
                                fullWidth
                            >
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                                    {DISCOUNT_OPTIONS.map(discount => (
                                        <div key={discount.id} style={{ marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '14px' }}>
                                                <input
                                                    type="radio"
                                                    name="discount_type_edit"
                                                    value={discount.id}
                                                    checked={editModalState.formData.discount_type === discount.id}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'edit')}
                                                    style={{ marginRight: '8px', marginTop: '2px' }}
                                                />
                                                <span style={{ lineHeight: '1.4' }}>{discount.label}</span>
                                            </label>
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="discount_type_edit"
                                                value=""
                                                checked={!editModalState.formData.discount_type}
                                                onChange={(e) => handleDiscountChange('', 'edit')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span>Без пільги</span>
                                        </label>
                                    </div>
                                </div>
                            </FormItem>
                            
                            <div className="form-row" style={{display: 'flex', gap: '16px'}}>
                                <FormItem 
                                    label="Кількість відвідувань" 
                                    fullWidth
                                >
                                    <Input
                                        name="visit_count"
                                        value={editModalState.formData.visit_count}
                                        disabled={true}
                                    />
                                </FormItem>
                                
                                <FormItem 
                                    label="Ціна" 
                                    fullWidth
                                >
                                    <Input
                                        name="total_price"
                                        value={editModalState.formData.total_price ? `${editModalState.formData.total_price} грн` : ''}
                                        disabled={true}
                                    />
                                </FormItem>
                            </div>
                            
                            {editModalState.formData.discount_applied && (
                                <div style={{ 
                                    padding: '10px', 
                                    backgroundColor: '#e6f7ff', 
                                    border: '1px solid #91d5ff', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#096dd9'
                                }}>
                                    ✅ Застосована знижка 50% за пільгою
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Bills;