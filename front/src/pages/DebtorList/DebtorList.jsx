import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters , MessageForPush} from "../../utils/function";
import { useDebtorListState } from "../../hooks/useDebtorListState"; 
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';
import DebtorInfoCards from './DebtorInfoCards';
import ControlSumsModal from '../../components/ControlSumsModal/ControlSumsModal';
import DatabaseUpdateModal from '../../components/DatabaseUpdateModal/DatabaseUpdateModal';
import { processDebtorRegister, sendEmailTask, previewDatabaseUpdate, updateDatabaseExecute, getAvailableDates } from '../../services/taskApi';
import { updateTaxReportsDatabase } from '../../services/taxReportsApi';
import { useCommunitySettings } from "../../context/CommunitySettingsContext";
import SMSSendModal from '../SMS/SMSSendModal';


const phoneIcon = generateIcon(iconMap.phone, null, 'currentColor', 20, 20)
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const smsIcon = generateIcon(iconMap.message || iconMap.email, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
//const privatIcon = generateIcon(iconMap.privatbank, 'sort-icon', 'currentColor', 14, 14)
const privatIcon = (
    <img 
        src="/icons/privatbank-logo.png" 
        alt="ПриватБанк"
        width="24" 
        height="24"
    />
);
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const DEBTOR_LIST_STATE_KEY = 'debtorListState';

// Функція для форматування дати
const formatDateTime = (dateString) => {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Якщо дата невалідна, повертаємо оригінальний рядок

        // Форматуємо дату в форматі YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString;
    }
};

// Функція для форматування дати (тільки дата, без часу)
const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString;
    }
};

const DebtorList = () => {
        const navigate = useNavigate()
        const notification = useNotification()
        const {store} = useContext(Context)
        const nodeRef = useRef(null)
        const { settings, isLoading: isSettingsLoading } = useCommunitySettings();

        const [isTaskProcessing, setIsTaskProcessing] = useState(false);
        const [controlSums, setControlSums] = useState(null);
        const [isControlSumsModalOpen, setIsControlSumsModalOpen] = useState(false);

        const [isDatabaseUpdateModalOpen, setIsDatabaseUpdateModalOpen] = useState(false);
        const [databaseUpdateControlSums, setDatabaseUpdateControlSums] = useState(null);
        const [availableDates, setAvailableDates] = useState([]);
        const [selectedDate, setSelectedDate] = useState('');
        const [isLoadingDates, setIsLoadingDates] = useState(false);

        const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
        const [debtorsForSms, setDebtorsForSms] = useState([]);
        const [isLoadingDebtors, setIsLoadingDebtors] = useState(false);

        // Use communityName from context
        const communityName = settings.communityName || 'Default Community';
        const isCommunityNameLoaded = !isSettingsLoading;

        const {
            stateDebtor,
            setStateDebtor,
            navigateToDebtor,
            updateFilters,
            updateSendData,
            resetFilters: resetFiltersHook
        } = useDebtorListState();
    
        const isFirstAPI = useRef(true);
        const {error, status, data, retryFetch} = useFetch('api/debtor/filter', {
            method: 'post',
            data: stateDebtor.sendData
        })
        const startRecord = ((stateDebtor.sendData.page || 1) - 1) * stateDebtor.sendData.limit + 1;
        const endRecord = Math.min(startRecord + stateDebtor.sendData.limit - 1, data?.totalItems || 1);
        
        const handleNavigateToDebtor = useCallback((debtorId) => {
            navigateToDebtor(debtorId, navigate);
        }, [navigateToDebtor, navigate]);


        useEffect(() => {
            if (isFirstAPI.current) {
                isFirstAPI.current = false;
                return;
            }
            
            retryFetch('api/debtor/filter', {
                method: 'post',
                data: stateDebtor.sendData,
            });
        }, [stateDebtor.sendData, retryFetch]);

        

        const {
            data: statsData,
            status: statsStatus,
            error: statsError
        } = useFetch('api/debtor/stats', { method: 'get' });

        const getPhoneButtonStyle = (phoneStatus) => {
            switch (phoneStatus) {
                case 'has_phone':
                    return {
                        backgroundColor: '#27ae60',
                        borderColor: '#27ae60',
                        color: 'white'
                    };
                case 'no_phone':
                    return {
                        backgroundColor: '#e74c3c',
                        borderColor: '#e74c3c', 
                        color: 'white'
                    };
             }
        };
        
        const getPhoneButtonTitle = (record) => {
            switch (record.phone_status) {
                case 'has_phone':
                    return 'Телефон підтверджено';
                case 'no_phone':
                    return 'Телефону немає';
                case 'not_checked':
                default:
                    return 'Телефон не перевірявся';
            }
        };

        const handleSort = useCallback((dataIndex) => {
            setStateDebtor(prevState => {
                let newDirection = 'desc'; 
                
                if (prevState.sendData.sort_by === dataIndex) {
                    newDirection = prevState.sendData.sort_direction === 'desc' ? 'asc' : 'desc';
                }
                
                return {
                    ...prevState,
                    sendData: {
                        ...prevState.sendData,
                        sort_by: dataIndex,
                        sort_direction: newDirection,
                        page: 1, 
                    }
                };
            });
        }, []);

        const handlePushClick = async () => {
            // Перевірка конфігурації
            if (communityName === "" || communityName === undefined || communityName === "Default Community") {
                MessageForPush();
                return;
            }
        
            try {
                setIsTaskProcessing(true);
        
                notification({
                    type: 'info',
                    placement: 'top',
                    title: 'Обробка',
                    message: `Обробка реєстру для громади: ${communityName}`,
                    duration: 2
                });
        
                // Викликаємо API
                const result = await processDebtorRegister(communityName);
                
                // Перевірка відповіді (опціонально)
                if (!result || typeof result.total_records === 'undefined') {
                    throw new Error('Невірний формат відповіді від сервера');
                }
                
                // Зберігаємо контрольні суми
                setControlSums(result);
                
                // Відкриваємо модальне вікно
                setIsControlSumsModalOpen(true);
                
                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: `Реєстр оброблено. Записів: ${result.total_records}`,
                    duration: 3
                });
                
            } catch (error) {
                console.error('Помилка обробки реєстру:', error);
                
                // Timeout
                if (error?.response?.status === 408) {
                    notification({
                        type: 'warning',
                        title: "Таймаут",
                        message: "Обробка займає більше часу. Спробуйте пізніше.",
                        placement: 'top',
                        duration: 5
                    });
                    return;
                }
                
                // Unauthorized
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
                
                // Інші помилки
                notification({
                    type: 'error',
                    placement: 'top',
                    title: 'Помилка обробки',
                    message: error?.response?.data?.error || error.message || 'Не вдалося обробити реєстр',
                    duration: 5
                });
            } finally {
                setIsTaskProcessing(false);
            }
        };

        const handleBulkSmsClick = async () => {
            try {
                setIsLoadingDebtors(true);

                // Завантажити боржників з телефонами
                const response = await fetch('/api/debtor/with-phones');
                const result = await response.json();

                if (result.error) {
                    throw new Error(result.message);
                }

                const debtors = result.data;

                if (!debtors || debtors.length === 0) {
                    notification({
                        type: 'warning',
                        title: 'Немає отримувачів',
                        message: 'Не знайдено боржників з телефонами'
                    });
                    return;
                }

                // Показати notification з кількістю отримувачів
                notification({
                    type: 'info',
                    title: 'Масова SMS розсилка',
                    message: `Знайдено ${debtors.length} боржників з телефонами`,
                    placement: 'top',
                    duration: 2
                });

                // Зберегти боржників та відкрити модалку
                setDebtorsForSms(debtors);
                setIsSmsModalOpen(true);

            } catch (error) {
                notification({
                    type: 'error',
                    title: 'Помилка',
                    message: error.message
                });
            } finally {
                setIsLoadingDebtors(false);
            }
        };

        const handleConfirmAndSendEmail = async () => {
            try {
                setIsTaskProcessing(true);
    
                notification({
                    type: 'info',
                    placement: 'top',
                    title: 'Відправка',
                    message: 'Відправка email...',
                    duration: 2
                });
    
                // Викликаємо API через service
                const result = await sendEmailTask(communityName);
                
                // Закриваємо модальне вікно
                setIsControlSumsModalOpen(false);
                setControlSums(null);
                
                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: `Email відправлено на ${result.recipient_email}`,
                    duration: 3
                });
                
            } catch (error) {
                console.error('Помилка відправки email:', error);
                
                // Обробка помилки авторизації
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
                    type: 'error',
                    placement: 'top',
                    title: 'Помилка відправки',
                    message: error?.response?.data?.error || error.message || 'Не вдалося відправити email',
                    duration: 5
                });
            } finally {
                setIsTaskProcessing(false);
            }
        };

        const handleCloseControlSumsModal = () => {
            setIsControlSumsModalOpen(false);
            setControlSums(null);
        };

        const handleDatabaseUpdateClick = async () => {
            // Перевірка конфігурації
            if (communityName === "" || communityName === undefined || communityName === "Default Community") {
                MessageForPush();
                return;
            }

            try {
                setIsTaskProcessing(true);

                notification({
                    type: 'info',
                    placement: 'top',
                    title: 'Завантаження',
                    message: `Отримання даних з віддаленого сервера для громади: ${communityName}`,
                    duration: 2
                });

                // Завантажуємо список доступних дат
                setIsLoadingDates(true);
                try {
                    const datesResult = await getAvailableDates(communityName);
                    console.log('[Available Dates] Отримано дані:', datesResult);
                    console.log('[Available Dates] datesResult.data:', datesResult?.data);
                    console.log('[Available Dates] Тип:', typeof datesResult?.data, 'isArray:', Array.isArray(datesResult?.data));

                    if (datesResult && datesResult.data && Array.isArray(datesResult.data)) {
                        console.log('[Available Dates] Встановлюємо доступні дати:', datesResult.data);
                        setAvailableDates(datesResult.data);
                    } else {
                        console.warn('[Available Dates] Невірний формат відповіді:', datesResult);
                        setAvailableDates([]);
                    }
                } catch (error) {
                    console.error('[Available Dates] Помилка завантаження:', error);
                    console.error('[Available Dates] Error details:', error.response?.data);
                    setAvailableDates([]);
                } finally {
                    setIsLoadingDates(false);
                }

                // Викликаємо новий API для preview (з вибраною датою або без)
                const result = await previewDatabaseUpdate(communityName, selectedDate || null);

                // Перевірка відповіді
                if (!result || !result.data || typeof result.data.total_debtors === 'undefined') {
                    throw new Error('Невірний формат відповіді від сервера');
                }

                // Зберігаємо дані preview
                setDatabaseUpdateControlSums(result);

                // Відкриваємо модальне вікно
                setIsDatabaseUpdateModalOpen(true);

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: `Дані отримано. Всього боржників: ${result.data.total_debtors}`,
                    duration: 3
                });

            } catch (error) {
                console.error('Помилка перевірки оновлення БД:', error);

                // Timeout
                if (error?.response?.status === 408) {
                    notification({
                        type: 'warning',
                        title: "Таймаут",
                        message: "Обробка займає більше часу. Спробуйте пізніше.",
                        placement: 'top',
                        duration: 5
                    });
                    return;
                }

                // Unauthorized
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

                // Інші помилки
                notification({
                    type: 'error',
                    placement: 'top',
                    title: 'Помилка перевірки',
                    message: error?.response?.data?.error || error.message || 'Не вдалося перевірити оновлення',
                    duration: 5
                });
            } finally {
                setIsTaskProcessing(false);
            }
        };

        const handleCloseDatabaseUpdateModal = () => {
            setIsDatabaseUpdateModalOpen(false);
            setDatabaseUpdateControlSums(null);
            setSelectedDate('');
        };

        const handleDateChange = async (newDate) => {
            setSelectedDate(newDate);
            setIsTaskProcessing(true);

            try {
                // Перезавантажуємо дані preview з новою датою
                const result = await previewDatabaseUpdate(communityName, newDate || null);

                if (result && result.data) {
                    setDatabaseUpdateControlSums(result);

                    notification({
                        type: 'success',
                        placement: 'top',
                        title: 'Успіх',
                        message: `Дані оновлено для ${newDate ? formatDate(newDate) : 'останньої дати'}`,
                        duration: 2
                    });
                }
            } catch (error) {
                console.error('Помилка оновлення preview:', error);
                notification({
                    type: 'error',
                    placement: 'top',
                    title: 'Помилка',
                    message: 'Не вдалося оновити дані',
                    duration: 3
                });
            } finally {
                setIsTaskProcessing(false);
            }
        };

        const handleConfirmDatabaseUpdate = async () => {
            try {
                setIsTaskProcessing(true);

                notification({
                    type: 'info',
                    placement: 'top',
                    title: 'Оновлення',
                    message: 'Виконується оновлення реєстрів фіз. та юр. осіб...',
                    duration: 3
                });

                // Паралельне оновлення обох реєстрів
                const [debtorResult, taxReportsResult] = await Promise.allSettled([
                    updateDatabaseExecute(communityName),
                    updateTaxReportsDatabase(communityName)
                ]);

                // Закриваємо модальне вікно
                setIsDatabaseUpdateModalOpen(false);
                setDatabaseUpdateControlSums(null);

                // Формуємо повідомлення про результат
                const messages = [];

                if (debtorResult.status === 'fulfilled') {
                    const count = debtorResult.value?.inserted_debtors ?? 0;
                    messages.push(`Фіз. особи: ${count} боржників`);
                } else {
                    const errorMsg = debtorResult.reason?.message || debtorResult.reason?.response?.data?.error || 'невідома помилка';
                    messages.push(`Фіз. особи: помилка (${errorMsg})`);
                    console.error('Помилка оновлення реєстру фіз. осіб:', debtorResult.reason);
                }

                if (taxReportsResult.status === 'fulfilled') {
                    const count = taxReportsResult.value?.inserted_records ?? 0;
                    messages.push(`Юр. особи: ${count} записів`);
                } else {
                    const errorMsg = taxReportsResult.reason?.message || taxReportsResult.reason?.response?.data?.error || 'невідома помилка';
                    messages.push(`Юр. особи: помилка (${errorMsg})`);
                    console.error('Помилка оновлення реєстру юр. осіб:', taxReportsResult.reason);
                }

                const allSucceeded = debtorResult.status === 'fulfilled' && taxReportsResult.status === 'fulfilled';

                notification({
                    type: allSucceeded ? 'success' : 'warning',
                    placement: 'top',
                    title: allSucceeded ? 'Успішно!' : 'Частково оновлено',
                    message: messages.join('. '),
                    duration: 5
                });

                // Оновлюємо список боржників
                retryFetch('api/debtor/filter', {
                    method: 'post',
                    data: stateDebtor.sendData,
                });

            } finally {
                setIsTaskProcessing(false);
            }
        };

        const getSortIcon = useCallback((dataIndex) => {
            if (stateDebtor.sendData.sort_by !== dataIndex) {
                return null;
            }
            try {
                return stateDebtor.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
            } catch (error) {
                console.error('Помилка при створенні іконки сортування:', error);
                return null;
            }
        }, [stateDebtor.sendData.sort_by, stateDebtor.sendData.sort_direction]);

        const columnTable = useMemo(() => {
            const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
                title,
                dataIndex,
                sortable: true,
                onHeaderClick: () => handleSort(dataIndex),
                sortIcon: getSortIcon(dataIndex),
                headerClassName: stateDebtor.sendData.sort_by === dataIndex ? 'active' : '',
                ...(width && { width }),
                ...(render && { render })
            });

            const hasDebt = (record) => {
                return ['mpz', 'orenda_debt', 'land_debt', 'residential_debt', 'non_residential_debt']
                    .some(field => Number(record[field]) > 0);
            };

            const selectedTaxType = stateDebtor.selectData?.tax_type;

            // Визначаємо чи це громада Добромиль (case-insensitive)
            const isDobromyl = communityName?.toLowerCase() === 'dobromyl';

            let columns = [
                createSortableColumn('ІПН', 'identification', null, '65px'),
                createSortableColumn('П.І.Б', 'name', null, '130px'),
                createSortableColumn('Дата', 'date', null, '80px'),
            ];
            
            if (!selectedTaxType || selectedTaxType === '') {
                columns.push(
                    createSortableColumn('Нежитл', 'non_residential_debt', null, '70px'),
                    createSortableColumn('Житл', 'residential_debt', null, '65px'),
                    createSortableColumn('Земля', 'land_debt', null, '65px'),
                    createSortableColumn('Оренда', 'orenda_debt', null, '70px'),
                    createSortableColumn('МПЗ', 'mpz', null, '60px')
                );
            } else {
                const taxTypeMapping = {
                    'non_residential_debt': { title: 'Нежитлова', width: '100px' },
                    'residential_debt': { title: 'Житлова', width: '100px' },
                    'land_debt': { title: 'Земельна', width: '100px' },
                    'orenda_debt': { title: 'Орендна', width: '100px' },
                    'mpz': { title: 'МПЗ', width: '100px' }
                };
                
                if (taxTypeMapping[selectedTaxType]) {
                    columns.push(
                        createSortableColumn(
                            taxTypeMapping[selectedTaxType].title, 
                            selectedTaxType, 
                            null, 
                            taxTypeMapping[selectedTaxType].width
                        )
                    );
                }
            }
            columns.push(
                createSortableColumn('Всього', 'total_debt', (value) => {
                    const numValue = Number(value) || 0;
                    return (
                        <span style={{
                            fontWeight: 'bold',
                            color: numValue > 0 ? '#e74c3c' : '#27ae60',
                            fontSize: '13px'
                        }}>
                            {numValue.toFixed(2)}
                        </span>
                    );
                }, '80px'),

                // Для Добромиля показуємо "Адреса платника", для інших - "Дата формування квитанції"
                isDobromyl
                    ? createSortableColumn('Адреса платника', 'address', null, '150px')
                    : createSortableColumn('Дата формування квитанції', 'receipt_date', (value) => {
                        return formatDateTime(value);
                    }, '150px'),
                {
                    title: 'Дія',
                    dataIndex: 'action',
                    headerClassName: 'non-sortable',
                    width: '95px',
                    render: (_, record) => (
                        <div className="btn-sticky" style={{
                            justifyContent: 'center', 
                            gap: '1px', 
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                title={getPhoneButtonTitle(record)}
                                icon={phoneIcon}
                                size="small"
                                style={getPhoneButtonStyle(record.phone_status)}
                                onClick={() => handleNavigateToDebtor(record.id)}
                            />
                            {hasDebt(record) && (
                                <>
                                    <Button
                                        title="Завантажити"
                                        icon={downloadIcon}
                                        size="small"
                                        onClick={() => handleOpenModal(record.id)}
                                    />
                                    <Button
                                        title="Реквізити"
                                        icon={editIcon}
                                        size="small"
                                        onClick={() => navigate(`/debtor/${record.id}/print`)}
                                    />
                                </>
                            )}
                        </div>
                    ),
                }
            );
        
            return columns;
        }, [navigate, handleSort, getSortIcon, stateDebtor.sendData.sort_by, stateDebtor.selectData?.tax_type, handleNavigateToDebtor, communityName]);

        const tableData = useMemo(() => {
            if (data?.items?.length) {
                const result = data?.items?.map(el => {
                    const totalDebt = (Number(el.non_residential_debt) || 0) + 
                                    (Number(el.residential_debt) || 0) + 
                                    (Number(el.land_debt) || 0) + 
                                    (Number(el.orenda_debt) || 0) + 
                                    (Number(el.mpz) || 0);
                    
                    return {
                        key: el.id,
                        id: el.id,
                        name: el.name,
                        date: el.date,
                        non_residential_debt: el.non_residential_debt,
                        residential_debt: el.residential_debt,
                        land_debt: el.land_debt,
                        orenda_debt: el.orenda_debt,
                        mpz: el.mpz,
                        identification: el.identification,
                        total_debt: totalDebt,
                        receipt_date: el.receipt_date || "",
                        address: el.address || "", // Адреса платника (для Добромиля)
                        // Додаємо нові поля з API
                        phone_status: el.phone_status || 'not_checked',
                        ischecked: el.ischecked || false,
                        hasnumber: el.hasnumber || false
                    }
                });
                return result;
            }
            return []
        }, [data])

        const itemMenu = [
            {
                label: '16',
                key: '16',
                onClick: () => {
                    if (stateDebtor.sendData.limit !== 16) {
                        setStateDebtor(prevState => ({
                            ...prevState,
                            sendData: {
                                ...prevState.sendData,
                                limit: 16,
                                page: 1,
                            }
                        }))
                    }
                },
            },
            {
                label: '32',
                key: '32',
                onClick: () => {
                    if (stateDebtor.sendData.limit !== 32) {
                        setStateDebtor(prevState => ({
                            ...prevState,
                            sendData: {
                                ...prevState.sendData,
                                limit: 32,
                                page: 1,
                            }
                        }))
                    }
                },
            },
            {
                label: '48',
                key: '48',
                onClick: () => {
                    if (stateDebtor.sendData.limit !== 48) {
                        setStateDebtor(prevState => ({
                            ...prevState,
                            sendData: {
                                ...prevState.sendData,
                                limit: 48,
                                page: 1,
                            }
                        }))
                    }
                },
            },
        ]

        const filterHandleClick = () => {
            setStateDebtor(prevState => ({
                ...prevState,
                isFilterOpen: !prevState.isFilterOpen,
            }))
        }

        const closeFilterDropdown = () => {
            setStateDebtor(prevState => ({
                ...prevState,
                isFilterOpen: false,
            }))
        }

        // Перевіряємо чи є активні фільтри
        const hasActiveFilters = useMemo(() => {
            return Object.values(stateDebtor.selectData).some(value => {
                if (Array.isArray(value) && !value.length) {
                    return false
                }
                return value !== null && value !== undefined && value !== ''
            })
        }, [stateDebtor.selectData])

        const onHandleChange = (name, value) => {
            setStateDebtor(prevState => ({
                ...prevState,
                selectData: {
                    ...prevState.selectData,
                    [name]: value
                }
            }))
        }

         // ВИКОРИСТОВУЄМО МЕТОД З ХУКА
        const resetFilters = resetFiltersHook;

        // const resetFilters = () => {
        //     // Очищуємо selectData
        //     setStateDebtor(prevState => ({
        //         ...prevState,
        //         selectData: {},
        //         isFilterOpen: false,
        //         sendData: {
        //             // Залишаємо тільки базові параметри для запиту
        //             limit: prevState.sendData.limit,
        //             page: 1,
        //             sort_by: prevState.sendData.sort_by,
        //             sort_direction: prevState.sendData.sort_direction,
        //         }
        //     }));
        // }

        const applyFilter = () => {
            const isAnyInputFilled = Object.values(stateDebtor.selectData).some(value => {
                if (Array.isArray(value) && !value.length) {
                    return false
                }
                return value
            })
            
            if (isAnyInputFilled) {
                const dataValidation = validateFilters(stateDebtor.selectData)
                if (!dataValidation.error) {
                    // Об'єднуємо дані валідації з selectData
                    const filterParams = {
                        //...dataValidation.cleanedData,
                        ...dataValidation
                    }
                    // console.log('filterParams', filterParams)
                    setStateDebtor(prevState => ({
                        ...prevState,
                        sendData: {
                            ...filterParams, // Включаємо всі параметри фільтру
                            limit: prevState.sendData.limit,
                            page: 1,
                            sort_by: prevState.sendData.sort_by,
                            sort_direction: prevState.sendData.sort_direction,
                        },
                        isFilterOpen: false
                    }))
                } else {
                    notification({
                        type: 'warning',
                        placement: 'top',
                        title: 'Помилка',
                        message: dataValidation.message ?? 'Щось пішло не так.',
                    })
                }
            } else {
                // Якщо фільтри порожні, очищуємо sendData від фільтрів
                setStateDebtor(prevState => ({
                    ...prevState,
                    sendData: {
                        limit: prevState.sendData.limit,
                        page: 1,
                        sort_by: prevState.sendData.sort_by,
                        sort_direction: prevState.sendData.sort_direction,
                    },
                    isFilterOpen: false
                }))
            }
        }

        const onPageChange = useCallback((page) => {
            if (stateDebtor.sendData.page !== page) {
                setStateDebtor(prevState => ({
                    ...prevState,
                    sendData: {
                        ...prevState.sendData,
                        page,
                    }
                }))
            }
        }, [stateDebtor.sendData.page])

        const handleOpenModal = (recordId) => {
            setStateDebtor(prevState => ({
                ...prevState,
                itemId: recordId,
            }))
            document.body.style.overflow = 'hidden'
        }

        const handleCloseModal = () => {
            setStateDebtor(prevState => ({
                ...prevState,
                itemId: null,
            }))
            document.body.style.overflow = 'auto';
        }

        const exportToExcel = async () => {
            try {
                // Визначаємо чи це громада Добромиль (case-insensitive)
                const isDobromyl = communityName?.toLowerCase() === 'dobromyl';

                // Готуємо параметри для запиту всіх даних
                const exportParams = {
                    ...stateDebtor.sendData,
                    page: 1,
                    limit: 10000, // Отримуємо всі записи
                    // Додаємо активні фільтри
                    ...Object.fromEntries(
                        Object.entries(stateDebtor.selectData).filter(([_, value]) => {
                            // Фільтруємо тільки заповнені значення
                            if (Array.isArray(value)) return value.length > 0;
                            return value !== null && value !== undefined && value !== '' && value !== false;
                        })
                    )
                };

                // Отримуємо дані з API
                const response = await fetch("/api/debtor/list", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(exportParams)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const apiData = await response.json();

                if (!apiData.items || !Array.isArray(apiData.items)) {
                    throw new Error("Неправильна структура даних");
                }

                // Створюємо масив для Excel
                const excelData = [];

                // Формуємо заголовки в залежності від активних фільтрів
                const selectedTaxType = stateDebtor.selectData?.tax_type;
                const headers = ['ІПН', 'П.І.Б', 'Дата'];

                // Додаємо колонки податків в залежності від фільтру
                if (!selectedTaxType || selectedTaxType === '') {
                    // Якщо тип не вибраний - показуємо всі колонки
                    headers.push('Нежитлова нерухомість (₴)', 'Житлова нерухомість (₴)', 'Земельний податок (₴)', 'Орендна плата (₴)', 'МПЗ (₴)');
                } else {
                    // Якщо вибраний конкретний тип - показуємо тільки його
                    const taxTypeMapping = {
                        'non_residential_debt': 'Нежитлова нерухомість (₴)',
                        'residential_debt': 'Житлова нерухомість (₴)',
                        'land_debt': 'Земельний податок (₴)',
                        'orenda_debt': 'Орендна плата (₴)',
                        'mpz': 'МПЗ (₴)'
                    };

                    if (taxTypeMapping[selectedTaxType]) {
                        headers.push(taxTypeMapping[selectedTaxType]);
                    }
                }

                headers.push('Загальна заборгованість (₴)');

                // Додаємо колонку "Адреса" тільки для Добромиля
                if (isDobromyl) {
                    headers.push('Адреса');
                }

                // Додаємо заголовки в Excel
                excelData.push(headers);

                // Додаємо дані боржників
                apiData.items.forEach(debtor => {
                    const row = [
                        debtor.identification || '',
                        debtor.name || '',
                        debtor.date || ''
                    ];

                    // Додаємо податкові дані в залежності від фільтру
                    if (!selectedTaxType || selectedTaxType === '') {
                        // Всі типи податків
                        row.push(
                            parseFloat(debtor.non_residential_debt || 0).toFixed(2),
                            parseFloat(debtor.residential_debt || 0).toFixed(2),
                            parseFloat(debtor.land_debt || 0).toFixed(2),
                            parseFloat(debtor.orenda_debt || 0).toFixed(2),
                            parseFloat(debtor.mpz || 0).toFixed(2)
                        );
                    } else {
                        // Конкретний тип податку
                        if (debtor[selectedTaxType] !== undefined) {
                            row.push(parseFloat(debtor[selectedTaxType] || 0).toFixed(2));
                        }
                    }

                    // Додаємо загальну заборгованість
                    row.push(parseFloat(debtor.total_debt || 0).toFixed(2));

                    // Додаємо адресу тільки для Добромиля
                    if (isDobromyl) {
                        row.push(debtor.address || '');
                    }

                    excelData.push(row);
                });

                // Створюємо Excel файл
                const worksheet = XLSX.utils.aoa_to_sheet(excelData);

                // Налаштовуємо ширину колонок
                const colWidths = [
                    { wch: 15 }, // ІПН
                    { wch: 25 }, // П.І.Б
                    { wch: 12 }, // Дата
                ];

                // Додаємо ширину для податкових колонок
                if (!selectedTaxType || selectedTaxType === '') {
                    colWidths.push(
                        { wch: 18 }, // Нежитлова
                        { wch: 18 }, // Житлова
                        { wch: 18 }, // Земельний
                        { wch: 18 }, // Орендна
                        { wch: 12 }  // МПЗ
                    );
                } else {
                    colWidths.push({ wch: 20 }); // Вибраний тип податку
                }

                colWidths.push({ wch: 20 }); // Загальна заборгованість

                // Додаємо ширину колонки "Адреса" для Добромиля
                if (isDobromyl) {
                    colWidths.push({ wch: 35 }); // Адреса
                }

                worksheet['!cols'] = colWidths;

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Реєстр боржників");

                // Формуємо ім'я файлу з датою
                const currentDate = new Date().toISOString().split('T')[0];
                const filterInfo = Object.keys(stateDebtor.selectData).filter(key => stateDebtor.selectData[key]).length > 0
                    ? '_filtered'
                    : '';

                const fileName = `реєстр_боржників_${currentDate}${filterInfo}.xlsx`;

                // Експортуємо файл
                XLSX.writeFile(workbook, fileName);

                // Показуємо повідомлення про успіх
                notification({
                    type: "success",
                    placement: "top",
                    title: "Успіх",
                    message: `Реєстр боржників успішно експортовано (${apiData.items.length} записів)`
                });

            } catch (error) {
                notification({
                    type: "error",
                    placement: "top",
                    title: "Помилка",
                    message: "Не вдалося експортувати реєстр боржників"
                });
                console.error("Export error:", error);
            }
        };
        
        const handleGenerate = async () => {
            if (stateDebtor.itemId) {
                try {
                    setStateDebtor(prevState => ({
                        ...prevState,
                        confirmLoading: true,
                    }))
                    const fetchData = await fetchFunction(`api/debtor/generate/${stateDebtor.itemId}`, {
                        method: 'get',
                        responseType: 'blob'
                    })
                    notification({
                        placement: "top",
                        duration: 2,
                        title: 'Успіх',
                        message: "Успішно сформовано.",
                        type: 'success'
                    })
                    const blob = fetchData.data
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'generated.docx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                } catch (error) {
                    if (error?.response?.status === 401) {
                        notification({
                            type: 'warning',
                            title: "Помилка",
                            message: error?.response?.status === 401 ? "Не авторизований" : error.message,
                            placement: 'top',
                        })
                        store.logOff()
                        return navigate('/')
                    }
                    notification({
                        type: 'warning',
                        title: "Помилка",
                        message: error?.response?.data?.message ? error.response.data.message : error.message,
                        placement: 'top',
                    })
                } finally {
                    setStateDebtor(prevState => ({
                        ...prevState,
                        confirmLoading: false,
                        itemId: null,
                    }))
                    document.body.style.overflow = 'auto';
                }
            }
        }

        if (status === STATUS.ERROR) {
            return <PageError title={error.message} statusError={error.status}/>
        }
        let chartData = [
            {
              month: "01.07",
              totalDebt: 600000,
              totalDebtors: 4500,
              residential: 320000,
              nonResidential: 180000,
              land: 50000,
              orenda: 35000,
              mpz: 15000
            },
        ]
        return (
            <React.Fragment>
                {status === STATUS.PENDING ? <SkeletonPage/> : null}
                {status === STATUS.SUCCESS ?
                    <React.Fragment>
                        <DebtorInfoCards 
                            totalDebtors={statsData.total_debtors || 0}  // або data?.totalItems
                            debtsByType={{
                                residential_debt: statsData.residential_debt || 0,
                                non_residential_debt: statsData.non_residential_debt || 0,
                                land_debt: statsData.land_debt || 0,
                                orenda_debt: statsData.orenda_debt || 0,
                                mpz: statsData.mpz || 0
                            }}
                            totalDebt={statsData.total_debt || 0}
                            chartData={statsData.chartData?.map(item => ({
                                month: item.month,
                                totalDebt: parseFloat(item.total_debt),
                                totalDebtors: parseInt(item.total_debtors),
                                residential: parseFloat(item.residential_debt),
                                nonResidential: parseFloat(item.non_residential_debt),
                                land: parseFloat(item.land_debt),
                                orenda: parseFloat(item.orenda_debt),
                                mpz: parseFloat(item.mpz)
                            })) || []} 
                        />
                        <div className="table-elements">
                            <div className="table-header">
                                <h2 className="title title--sm">
                                    {data?.items && Array.isArray(data?.items) && data?.items.length > 0 ?
                                        <React.Fragment>
                                            Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                        </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                    }
                                </h2>
                                <div className="table-header__buttons">
                                    <Button
                                        onClick={handleBulkSmsClick}
                                        icon={smsIcon}
                                        style={{color: '#e2edfd'}}
                                        loading={isLoadingDebtors}>
                                        Масова SMS розсилка
                                    </Button>
                                    <Button
                                        onClick={handlePushClick}
                                        icon={privatIcon}
                                        style={{color: 'orange'}}>
                                        PUSH
                                    </Button>
                                    <Button
                                        onClick={handleDatabaseUpdateClick}
                                        style={{color: '#2ecc71'}}>
                                        Оновити реєстр
                                    </Button>
                                    <Dropdown
                                        icon={dropDownIcon}
                                        iconPosition="right"
                                        style={dropDownStyle}
                                        childStyle={childDropDownStyle}
                                        caption={`Записів: ${stateDebtor.sendData.limit}`}
                                        menu={itemMenu}/>
                                    <Button
                                        className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                        onClick={filterHandleClick}
                                        icon={filterIcon}>
                                        Фільтри {hasActiveFilters && `(${Object.keys(stateDebtor.selectData).filter(key => stateDebtor.selectData[key]).length})`}
                                    </Button>
                                    <Button
                                        //className="button-export"
                                        onClick={exportToExcel}
                                        icon={downloadIcon}>
                                        Завантажити
                                    </Button>
                                    <FilterDropdown
                                        isOpen={stateDebtor.isFilterOpen}
                                        onClose={closeFilterDropdown}
                                        filterData={stateDebtor.selectData}
                                        onFilterChange={onHandleChange}
                                        onApplyFilter={applyFilter}
                                        onResetFilters={resetFilters}
                                        searchIcon={searchIcon}
                                    />
                                </div>
                            </div>
                            <div className="table-main">
                                <div className="table-and-pagination-wrapper">
                                    <div className="table-wrapper" style={{
                                        overflowX: 'auto',
                                        overflowY: 'auto',
                                        maxHeight: 'calc(100vh - 280px)',
                                        minWidth: data?.items?.length > 0 ? '1200px' : 'auto'
                                    }}>
                                        <Table columns={columnTable} dataSource={tableData}/>
                                    </div>
                                    <Pagination
                                        className="m-b"
                                        currentPage={parseInt(data?.currentPage) || 1}
                                        totalCount={data?.totalItems || 1}
                                        pageSize={stateDebtor.sendData.limit}
                                        onPageChange={onPageChange}/>
                                </div>
                            </div>
                        </div>
                    </React.Fragment> : null
                }
                <Transition in={!!stateDebtor.itemId} timeout={200} unmountOnExit nodeRef={nodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={handleCloseModal}
                            onOk={handleGenerate}
                            confirmLoading={stateDebtor.confirmLoading}
                            cancelText="Скасувати"
                            okText="Так, сформувати"
                            title="Підтвердження формування реквізитів">
                            <p className="paragraph">
                                Ви впевнені, що бажаєте виконати операцію &quot;Сформувати реквізити&quot;?
                            </p>
                        </Modal>
                    )}
                </Transition>
                <ControlSumsModal
                    isOpen={isControlSumsModalOpen}
                    onClose={handleCloseControlSumsModal}
                    controlSums={controlSums}
                    onConfirm={handleConfirmAndSendEmail}
                    isLoading={isTaskProcessing}
                    communityName={communityName}
                />
                <DatabaseUpdateModal
                    isOpen={isDatabaseUpdateModalOpen}
                    onClose={handleCloseDatabaseUpdateModal}
                    controlSums={databaseUpdateControlSums}
                    onConfirm={handleConfirmDatabaseUpdate}
                    isLoading={isTaskProcessing}
                    communityName={communityName}
                    availableDates={availableDates}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    isLoadingDates={isLoadingDates}
                />
                <SMSSendModal
                    isOpen={isSmsModalOpen}
                    onClose={() => {
                        setIsSmsModalOpen(false);
                        setDebtorsForSms([]);
                    }}
                    debtors={debtorsForSms}
                    onSuccess={(result) => {
                        notification({
                            type: 'success',
                            title: 'Успіх',
                            message: `Відправлено ${result.total_sent} з ${result.total_count} SMS`
                        });
                        setIsSmsModalOpen(false);
                        setDebtorsForSms([]);
                    }}
                />
            </React.Fragment>
        )
    }
;
export default DebtorList;