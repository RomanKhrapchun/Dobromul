import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import ReceiptFilterContent from "../../components/common/Dropdown/ReceiptFilterContent";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';

// Icons
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)

// Використовуємо наявні іконки або створюємо резервні варіанти
const uuidIcon = iconMap.key ? generateIcon(iconMap.key, null, 'currentColor', 16, 16) : 
    generateIcon(iconMap.search, null, 'currentColor', 16, 16) // резерв
const linkIcon = iconMap.link ? generateIcon(iconMap.link, null, 'currentColor', 16, 16) :
    generateIcon(iconMap.external, null, 'currentColor', 16, 16) // резерв
const fileIcon = iconMap.file ? generateIcon(iconMap.file, null, 'currentColor', 16, 16) :
    generateIcon(iconMap.document, null, 'currentColor', 16, 16) // резерв

const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const RECEIPT_LIST_STATE_KEY = 'receiptListState';

// Типи ідентифікаторів
const IDENTIFIER_TYPES = {
    ALL: 'all',
    UUID: 'uuid',
    URL_NUMBERS: 'url-numbers',
    OTHERS: 'others'
};

const getIdentifierTypeConfig = (type) => {
    switch (type) {
        case IDENTIFIER_TYPES.UUID:
            return {
                label: 'UUID',
                icon: uuidIcon,
                endpoint: 'api/tourism/receipts/list/uuid',
                color: '#17a2b8',
                description: 'UUID формат ідентифікаторів'
            };
        case IDENTIFIER_TYPES.URL_NUMBERS:
            return {
                label: 'URL/Числа',
                icon: linkIcon,
                endpoint: 'api/tourism/receipts/list/url-numbers',
                color: '#28a745',
                description: 'URL та числові ідентифікатори до 8 символів'
            };
        case IDENTIFIER_TYPES.OTHERS:
            return {
                label: 'Інші',
                icon: fileIcon,
                endpoint: 'api/tourism/receipts/list/others',
                color: '#6c757d',
                description: 'Інші типи ідентифікаторів'
            };
        case IDENTIFIER_TYPES.ALL:
            return {
                label: 'Усі',
                icon: null, // або використайте існуючу іконку
                endpoint: 'api/tourism/receipts/list',
                color: '#007bff',
                description: 'Всі типи ідентифікаторів'
            };
    }
};

const saveReceiptListState = (state) => {
    try {
        sessionStorage.setItem(RECEIPT_LIST_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            identifierType: state.identifierType,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save receipt list state:', error);
    }
};

const loadReceiptListState = () => {
    try {
        const saved = sessionStorage.getItem(RECEIPT_LIST_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                // Валідація збережених даних
                if (parsed.sendData) {
                    const validPage = parseInt(parsed.sendData.page, 10);
                    const validLimit = parseInt(parsed.sendData.limit, 10);
                    
                    parsed.sendData.page = isNaN(validPage) ? 1 : Math.max(1, validPage);
                    parsed.sendData.limit = isNaN(validLimit) ? 16 : validLimit;
                }
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load receipt list state:', error);
    }
    return null;
};

const ReceiptList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    
    const [stateReceipt, setStateReceipt] = useState(() => {
        const savedState = loadReceiptListState();
        
        const defaultState = {
            isFilterOpen: false,
            selectData: {},
            identifierType: IDENTIFIER_TYPES.ALL,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'counter',
                sort_direction: 'desc',
            }
        };
        
        if (savedState) {
            // Додаткова валідація для savedState
            const validLimit = parseInt(savedState.sendData?.limit, 10);
            const validPage = parseInt(savedState.sendData?.page, 10);
            
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                identifierType: savedState.identifierType || IDENTIFIER_TYPES.UUID,
                sendData: {
                    limit: isNaN(validLimit) ? 16 : validLimit,
                    page: isNaN(validPage) ? 1 : Math.max(1, validPage),
                    sort_by: savedState.sendData?.sort_by || 'counter',
                    sort_direction: savedState.sendData?.sort_direction || 'desc',
                    // Збережуємо інші можливі параметри фільтрів
                    ...Object.fromEntries(
                        Object.entries(savedState.sendData || {}).filter(([key, value]) => 
                            !['limit', 'page', 'sort_by', 'sort_direction'].includes(key) &&
                            value !== null && value !== undefined && value !== ''
                        )
                    )
                }
            };
        }
        
        return defaultState;
    });

    const isFirstAPI = useRef(true);
    
    // Отримуємо конфігурацію для поточного типу
    const currentTypeConfig = getIdentifierTypeConfig(stateReceipt.identifierType);
    
    // Використовуємо відповідний API endpoint
    const {error, status, data, retryFetch} = useFetch(currentTypeConfig.endpoint, {
        method: 'post',
        data: stateReceipt.sendData
    })
    
    // Безпечна функція для отримання даних з API
    const getDataSafely = () => {
        if (!data) {
            return { totalItems: 0, items: [], currentPage: 1 };
        }
        
        // Якщо API повертає масив замість об'єкта
        if (Array.isArray(data)) {
            console.warn('API returned array instead of object');
            return { 
                totalItems: data.length, 
                items: data, 
                currentPage: parseInt(stateReceipt.sendData.page, 10) || 1 
            };
        }
        
        // Якщо API повертає правильну структуру об'єкта
        return { 
            totalItems: parseInt(data.totalItems, 10) || 0, 
            items: data.items || [], 
            currentPage: parseInt(data.currentPage, 10) || (parseInt(stateReceipt.sendData.page, 10) || 1)
        };
    };

    const { totalItems, items: safeItems, currentPage: apiCurrentPage } = getDataSafely();

    // Безпечне обчислення пагінації
    const currentPage = parseInt(stateReceipt.sendData.page, 10) || 1;
    const limit = parseInt(stateReceipt.sendData.limit, 10) || 16;
    const startRecord = totalItems > 0 ? (currentPage - 1) * limit + 1 : 0;
    const endRecord = totalItems > 0 ? Math.min(startRecord + limit - 1, totalItems) : 0;

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch(currentTypeConfig.endpoint, {
            method: 'post',
            data: stateReceipt.sendData,
        });
    }, [stateReceipt.sendData, currentTypeConfig.endpoint, retryFetch]);

    useEffect(() => {
        saveReceiptListState(stateReceipt);
    }, [stateReceipt]);

    // Перевірка на NaN у page
    useEffect(() => {
        const pageValue = stateReceipt.sendData.page;
        
        if (isNaN(pageValue) || pageValue < 1) {
            console.warn('Invalid page detected, resetting to 1');
            setStateReceipt(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page: 1
                }
            }));
        }
    }, [stateReceipt.sendData.page]);

    // Функція для зміни типу ідентифікатора
    const handleIdentifierTypeChange = useCallback((newType) => {
        if (newType !== stateReceipt.identifierType) {
            setStateReceipt(prevState => ({
                ...prevState,
                identifierType: newType,
                sendData: {
                    ...prevState.sendData,
                    page: 1, // Скидаємо на першу сторінку
                }
            }));
        }
    }, [stateReceipt.identifierType]);

    // Функція для отримання стилю статусу на основі counter
    const getStatusStyle = (counter) => {
        if (counter < 5) {
            return {
                backgroundColor: '#d4edda',
                color: '#155724',
                border: '1px solid #c3e6cb'
            };
        } else {
            return {
                backgroundColor: '#fff3cd',
                color: '#856404', 
                border: '1px solid #ffeaa7'
            };
        }
    };

    const getStatusText = (counter) => {
        if (counter === 0) return 'Не сканувалось';
        if (counter < 5) return `${counter} сканувань`;
        return `${counter} сканувань (багато)`;
    };

    // Функція для обробки сортування
    const handleSort = useCallback((dataIndex) => {
        setStateReceipt(prevState => {
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

    // Функція для отримання іконки сортування
    const getSortIcon = useCallback((dataIndex) => {
        if (stateReceipt.sendData.sort_by !== dataIndex) {
            return null;
        }
        try {
            return stateReceipt.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
        } catch (error) {
            console.error('Помилка при створенні іконки сортування:', error);
            return null;
        }
    }, [stateReceipt.sendData.sort_by, stateReceipt.sendData.sort_direction]);

    // Функція для форматування суми
    const formatCurrency = (amount) => {
        if (!amount) return '0.00 ₴';
        return `${parseFloat(amount).toFixed(2)} ₴`;
    };

    // Функція для форматування великих чисел
    const formatNumber = (num) => {
        return num.toLocaleString('uk-UA');
    };

    // Меню для перемикання типів ідентифікаторів
    const identifierTypeMenu = [
        {
            label: (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span>📋</span>
                    <span>Усі</span>
                </div>
            ),
            key: IDENTIFIER_TYPES.ALL,
            onClick: () => handleIdentifierTypeChange(IDENTIFIER_TYPES.ALL),
        },
        {
            label: (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {getIdentifierTypeConfig(IDENTIFIER_TYPES.UUID).icon}
                    <span>{getIdentifierTypeConfig(IDENTIFIER_TYPES.UUID).label}</span>
                </div>
            ),
            key: IDENTIFIER_TYPES.UUID,
            onClick: () => handleIdentifierTypeChange(IDENTIFIER_TYPES.UUID),
        },
        {
            label: (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {getIdentifierTypeConfig(IDENTIFIER_TYPES.URL_NUMBERS).icon}
                    <span>{getIdentifierTypeConfig(IDENTIFIER_TYPES.URL_NUMBERS).label}</span>
                </div>
            ),
            key: IDENTIFIER_TYPES.URL_NUMBERS,
            onClick: () => handleIdentifierTypeChange(IDENTIFIER_TYPES.URL_NUMBERS),
        },
        {
            label: (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {getIdentifierTypeConfig(IDENTIFIER_TYPES.OTHERS).icon}
                    <span>{getIdentifierTypeConfig(IDENTIFIER_TYPES.OTHERS).label}</span>
                </div>
            ),
            key: IDENTIFIER_TYPES.OTHERS,
            onClick: () => handleIdentifierTypeChange(IDENTIFIER_TYPES.OTHERS),
        },
    ];

    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: stateReceipt.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('ID', 'identifier', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: currentTypeConfig.color
                }}>
                    {value}
                </span>
            ), '80px'),
            
            createSortableColumn('П.І.Б.', 'name', null, '200px'),
            
            createSortableColumn('Стать', 'gender', (value) => {
                const genderMap = {
                    'male': '👨 Ч',
                    'female': '👩 Ж'
                };
                return genderMap[value] || '-';
            }, '80px'),
            
            createSortableColumn('Громадянство', 'citizenship', null, '120px'),
            
            createSortableColumn('Прибуття', 'arrival_date', (value) => {
                if (!value) return '-';
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '90px'),
            
            createSortableColumn('Відʼїзд', 'departure_date', (value) => {
                if (!value) return '-';
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '90px'),
            
            createSortableColumn('Сума', 'amount', (value) => (
                <span style={{
                    fontWeight: 'bold',
                    color: value > 0 ? '#2c3e50' : '#6c757d'
                }}>
                    {formatCurrency(value)}
                </span>
            ), '100px'),
            
            createSortableColumn('Дата', 'date', (value) => {
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    year: "numeric", 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '100px'),
            
            createSortableColumn('Сканувань', 'counter', (value, record) => (
                <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ...getStatusStyle(value)
                }}>
                    {getStatusText(value)}
                </span>
            ), '120px')
        ];
    }, [handleSort, getSortIcon, stateReceipt.sendData.sort_by, currentTypeConfig.color]);

    const tableData = useMemo(() => {
        if (safeItems?.length) {
            return safeItems.map(item => ({
                key: item.id,
                id: item.id,
                identifier: item.identifier,
                name: item.name,
                gender: item.gender,
                citizenship: item.citizenship,
                arrival_date: item.arrival_date,
                departure_date: item.departure_date,
                amount: item.amount,
                date: item.date,
                counter: item.counter,
                created_at: item.created_at,
                updated_at: item.updated_at
            }));
        }
        return [];
    }, [safeItems]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                const newLimit = 16;
                if (stateReceipt.sendData.limit !== newLimit) {
                    setStateReceipt(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: newLimit,
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
                const newLimit = 32;
                if (stateReceipt.sendData.limit !== newLimit) {
                    setStateReceipt(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: newLimit,
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
                const newLimit = 48;
                if (stateReceipt.sendData.limit !== newLimit) {
                    setStateReceipt(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: newLimit,
                            page: 1,
                        }
                    }))
                }
            },
        },
    ];

    const filterHandleClick = () => {
        setStateReceipt(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    };

    const closeFilterDropdown = () => {
        setStateReceipt(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateReceipt.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateReceipt.selectData]);

    const onHandleChange = (name, value) => {
        setStateReceipt(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const resetFilters = () => {
        setStateReceipt(prevState => ({
            ...prevState,
            selectData: {},
            isFilterOpen: false,
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: prevState.sendData.sort_by,
                sort_direction: prevState.sendData.sort_direction,
            }
        }));
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateReceipt.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        });
        
        if (isAnyInputFilled) {
            const filterParams = stateReceipt.selectData;
            
            setStateReceipt(prevState => ({
                ...prevState,
                sendData: {
                    ...filterParams,
                    limit: prevState.sendData.limit,
                    page: 1,
                    sort_by: prevState.sendData.sort_by,
                    sort_direction: prevState.sendData.sort_direction,
                },
                isFilterOpen: false
            }))
        } else {
            setStateReceipt(prevState => ({
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
    };

    // ВИПРАВЛЕНА функція onPageChange
    const onPageChange = useCallback((page) => {
        const validPage = parseInt(page, 10);
        if (isNaN(validPage) || validPage < 1) {
            console.error('Invalid page number received:', page);
            return;
        }
        
        if (stateReceipt.sendData.page !== validPage) {
            setStateReceipt(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page: validPage, // ВИКОРИСТОВУЄМО validPage!
                }
            }))
        }
    }, [stateReceipt.sendData.page]);

    const exportToExcel = async () => {
        try {
            const exportParams = {
                ...stateReceipt.sendData,
                page: 1,
                limit: 10000,
                ...Object.fromEntries(
                    Object.entries(stateReceipt.selectData).filter(([_, value]) => {
                        if (Array.isArray(value)) return value.length > 0;
                        return value !== null && value !== undefined && value !== '' && value !== false;
                    })
                )
            };

            //const response = await fetch(`/${currentTypeConfig.endpoint.replace('list', 'export')}`, {
            const response = await fetch(`api/tourism/receipts/export`, {
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

            const excelData = [];
            const headers = ['ID квитанції', 'П.І.Б.', 'Стать', 'Громадянство', 'Прибуття', 'Відʼїзд', 'Сума (₴)', 'Дата квитанції', 'Кількість сканувань', 'Дата створення', 'Дата оновлення'];
            excelData.push(headers);

            apiData.items.forEach(receipt => {
                const genderMap = { 'male': 'Чоловіча', 'female': 'Жіноча' };
                excelData.push([
                    receipt.identifier || '',
                    receipt.name || '',
                    genderMap[receipt.gender] || '',
                    receipt.citizenship || '',
                    receipt.arrival_date || '',
                    receipt.departure_date || '',
                    receipt.amount || 0,
                    receipt.date || '',
                    receipt.counter || 0,
                    receipt.created_at || '',
                    receipt.updated_at || ''
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            const colWidths = [
                { wch: 15 }, // ID
                { wch: 30 }, // П.І.Б
                { wch: 12 }, // Стать
                { wch: 15 }, // Громадянство
                { wch: 12 }, // Прибуття
                { wch: 12 }, // Відʼїзд
                { wch: 12 }, // Сума
                { wch: 15 }, // Дата квитанції
                { wch: 18 }, // Кількість сканувань
                { wch: 20 }, // Дата створення
                { wch: 20 }  // Дата оновлення
            ];

            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Квитанції");

            const currentDate = new Date().toISOString().split('T')[0];
            const filterInfo = Object.keys(stateReceipt.selectData).filter(key => stateReceipt.selectData[key]).length > 0 
                ? '_filtered' 
                : '';
            
            const fileName = `квитанції_${currentTypeConfig.label}_${currentDate}${filterInfo}.xlsx`;

            XLSX.writeFile(workbook, fileName);

            notification({
                type: "success",
                placement: "top",
                title: "Успіх",
                message: `Список квитанцій успішно експортовано (${apiData.items.length} записів)`
            });

        } catch (error) {
            notification({
                type: "error",
                placement: "top",
                title: "Помилка",
                message: "Не вдалося експортувати список квитанцій"
            });
            console.error("Export error:", error);
        }
    };

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status}/>
    }

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    {/* Статистика відфільтрованих даних */}
                    <div className="stats-section" style={{
                        display: 'flex',
                        gap: '20px',
                        marginBottom: '20px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <div className="stat-card" style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: currentTypeConfig.color,
                                marginBottom: '5px'
                            }}>
                                {formatNumber(totalItems)}
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: '#6c757d',
                                fontWeight: '500'
                            }}>
                                Кількість ({currentTypeConfig.label})
                            </div>
                        </div>
                        
                        <div className="stat-card" style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: '#28a745',
                                marginBottom: '5px'
                            }}>
                                {formatCurrency(data?.totalAmount || 0)}
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: '#6c757d',
                                fontWeight: '500'
                            }}>
                                Загальна сума
                            </div>
                        </div>
                    </div>

                    <div className="table-elements">
                        <div className="table-header">
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <h2 className="title title--sm">
                                    {safeItems.length > 0 ?
                                        <React.Fragment>
                                            Показує {startRecord}-{endRecord} з {totalItems}
                                        </React.Fragment> : 
                                        <React.Fragment>Записів не знайдено</React.Fragment>
                                    }
                                </h2>
                                
                                <div style={{
                                    padding: '6px 12px',
                                    backgroundColor: currentTypeConfig.color,
                                    color: 'white',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {currentTypeConfig.icon}
                                    {currentTypeConfig.label}
                                </div>
                            </div>
                            
                            <div className="table-header__buttons">
                                <Dropdown
                                    icon={currentTypeConfig.icon}
                                    iconPosition="left"
                                    style={{...dropDownStyle, minWidth: '160px'}}
                                    childStyle={childDropDownStyle}
                                    caption={`Тип: ${currentTypeConfig.label}`}
                                    menu={identifierTypeMenu}
                                />
                                
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateReceipt.sendData.limit}`}
                                    menu={itemMenu}
                                />
                                
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateReceipt.selectData).filter(key => stateReceipt.selectData[key]).length})`}
                                </Button>
                                
                                <Button
                                    onClick={exportToExcel}
                                    icon={downloadIcon}>
                                    Завантажити
                                </Button>
                                
                                <FilterDropdown
                                    isOpen={stateReceipt.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateReceipt.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title={`Фільтри квитанцій (${currentTypeConfig.label})`}
                                >
                                    <ReceiptFilterContent
                                        filterData={stateReceipt.selectData}
                                        onFilterChange={onHandleChange}
                                        searchIcon={searchIcon}
                                    />
                                </FilterDropdown>
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: safeItems.length > 0 ? '1100px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                {totalItems > 0 && (() => {
                                    // Додатковий захист для пропсів Pagination
                                    const safeCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
                                    const safeTotalCount = Math.max(1, parseInt(totalItems, 10) || 1);
                                    const safePageSize = Math.max(1, parseInt(limit, 10) || 16);
                                    
                                    // Обчислюємо максимальну сторінку щоб обмежити currentPage
                                    const maxPage = Math.ceil(safeTotalCount / safePageSize);
                                    const boundedCurrentPage = Math.min(safeCurrentPage, maxPage);
                                    
                                    return (
                                        <Pagination
                                            className="m-b"
                                            currentPage={boundedCurrentPage}
                                            totalCount={safeTotalCount}
                                            pageSize={safePageSize}
                                            onPageChange={onPageChange}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
        </React.Fragment>
    )
};

export default ReceiptList;