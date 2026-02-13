import React, { useState, useMemo, useRef, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS } from '../../utils/constants';
import PageError from '../ErrorPage/PageError';
import SkeletonPage from '../../components/common/Skeleton/SkeletonPage';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import Dropdown from '../../components/common/Dropdown/Dropdown';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import Select from '../../components/common/Select/Select';
import { Transition } from 'react-transition-group';
import { generateIcon, iconMap } from '../../utils/constants';
import classNames from 'classnames';
import useFetch from '../../hooks/useFetch';
import { useNotification } from '../../hooks/useNotification';
import { useCommunitySettings } from '../../context/CommunitySettingsContext';
import { Context } from '../../main';
import DatabaseUpdateModal from '../../components/DatabaseUpdateModal/DatabaseUpdateModal';
import { previewTaxReportsUpdate, getTaxReportsAvailableDates, updateTaxReportsDatabase } from '../../services/taxReportsApi';
import { MessageForPush } from '../../utils/function';
import { formatPeriod, formatDateForUrl, formatDate } from '../../utils/dateFormatters';
import './TaxReports.css';

const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');
const dropDownIcon = generateIcon(iconMap.arrowDown);
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14);
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14);
const dropDownStyle = { width: 'auto' };
const childDropDownStyle = { justifyContent: 'center' };

const TaxReports = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const { settings, isLoading: isSettingsLoading } = useCommunitySettings();

    const [viewType, setViewType] = useState('period'); // 'taxpayer', 'tax-type', 'period'
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [state, setState] = useState({
        limit: 50, // кількість записів на сторінку
        isFilterModalOpen: false, // для модального вікна фільтра
    });
    const filterModalRef = useRef(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    // Стани для оновлення реєстру юридичних осіб
    const [isTaskProcessing, setIsTaskProcessing] = useState(false);
    const [isDatabaseUpdateModalOpen, setIsDatabaseUpdateModalOpen] = useState(false);
    const [databaseUpdateControlSums, setDatabaseUpdateControlSums] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [isLoadingDates, setIsLoadingDates] = useState(false);

    // Use communityName from context
    const communityName = settings.communityName || 'Default Community';
    const isCommunityNameLoaded = !isSettingsLoading;

    // Отримання даних з API
    const { data: taxpayersData, status: taxpayersStatus } = useFetch('api/tax-reports/taxpayers', {
        method: 'get'
    });

    const { data: taxTypesData, status: taxTypesStatus } = useFetch('api/tax-reports/tax-types', {
        method: 'get'
    });

    const { data: periodsData, status: periodsStatus } = useFetch('api/tax-reports/periods', {
        method: 'get'
    });

    // Трансформація даних для використання
    const taxpayers = useMemo(() => {
        if (!taxpayersData || !Array.isArray(taxpayersData)) return [];
        return taxpayersData.map(item => ({
            value: item.taxpayer_code,
            label: `${item.taxpayer_name} (${item.taxpayer_code})`,
            code: item.taxpayer_code,
            name: item.taxpayer_name
        }));
    }, [taxpayersData]);

    const taxTypes = useMemo(() => {
        if (!taxTypesData || !Array.isArray(taxTypesData)) return [];
        return taxTypesData.map(item => ({
            value: item.income_code,
            label: `${item.income_code} - ${item.income_name}`,
            code: item.income_code,
            name: item.income_name
        }));
    }, [taxTypesData]);

    const periods = useMemo(() => {
        if (!periodsData || !Array.isArray(periodsData)) return [];
        return periodsData.map(item => {
            const dateValue = item.report_period;
            const formattedDate = formatDateForUrl(dateValue);
            return {
                value: formattedDate, // Зберігаємо вже відформатовану дату для URL
                label: formatPeriod(dateValue),
                period: dateValue
            };
        });
    }, [periodsData]);

    // Автоматичний вибір поточного місяця при завантаженні
    useEffect(() => {
        if (viewType === 'period' && periods.length > 0 && !selectedFilter) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const currentPeriod = periods.find(p => {
                const d = new Date(p.period);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            setSelectedFilter(currentPeriod || periods[0]);
        }
    }, [periods, viewType, selectedFilter]);

    // Отримання даних таблиці
    const tableDataUrl = useMemo(() => {
        if (!selectedFilter || !selectedFilter.value) return null;

        // URL кодування значення фільтра для коректної обробки спеціальних символів
        const encodedValue = encodeURIComponent(selectedFilter.value);

        let url = null;
        switch (viewType) {
            case 'taxpayer':
                url = `api/tax-reports/by-taxpayer/${encodedValue}?page=1&limit=${state.limit}`;
                break;
            case 'tax-type':
                url = `api/tax-reports/by-tax-type/${encodedValue}?page=1&limit=${state.limit}`;
                break;
            case 'period':
                // selectedFilter.value вже відформатований у форматі YYYY-MM-DD
                url = `api/tax-reports/by-period/${encodeURIComponent(selectedFilter.value)}?page=1&limit=${state.limit}`;
                break;
            default:
                url = null;
        }
        return url;
    }, [viewType, selectedFilter, state.limit]);

    const { data: tableDataResponse, status: tableDataStatus } = useFetch(tableDataUrl, {
        method: 'get'
    });

    // Форматування суми
    const formatAmount = (value) => {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('uk-UA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Отримання назви поточного розрізу
    const getViewTypeLabel = () => {
        switch (viewType) {
            case 'taxpayer':
                return 'По платнику';
            case 'tax-type':
                return 'По податку';
            case 'period':
                return 'По місяцю';
            default:
                return 'Оберіть розріз';
        }
    };

    // Отримання назви поточного фільтра
    const getFilterLabel = () => {
        if (!selectedFilter) return 'Оберіть...';
        
        // Якщо це платник (viewType === 'taxpayer'), прибираємо код з дужок
        if (viewType === 'taxpayer' && selectedFilter.label) {
            return selectedFilter.label.split(' (')[0]; // Беремо тільки назву без коду
        }
        
        return selectedFilter.label || selectedFilter.name || 'Оберіть...';
    };

    // Отримання placeholder для dropdown
    const getFilterPlaceholder = () => {
        switch (viewType) {
            case 'taxpayer':
                return 'Оберіть платника';
            case 'tax-type':
                return 'Оберіть податок';
            case 'period':
                return 'Оберіть період';
            default:
                return 'Оберіть...';
        }
    };

    // Отримання опцій для Select компонента
    const getFilterOptionsForSelect = () => {
        switch (viewType) {
            case 'taxpayer':
                return taxpayers;
            case 'tax-type':
                return taxTypes;
            case 'period':
                return periods;
            default:
                return [];
        }
    };

    // Функції для роботи з модальним вікном фільтра
    const handleOpenFilterModal = () => {
        setState(prevState => ({
            ...prevState,
            isFilterModalOpen: true
        }));
        document.body.style.overflow = 'hidden';
    };

    const handleCloseFilterModal = () => {
        setState(prevState => ({
            ...prevState,
            isFilterModalOpen: false
        }));
        document.body.style.overflow = 'auto';
    };

    const handleFilterSelect = (name, value) => {
        setSelectedFilter(value);
        setSortConfig({ key: null, direction: 'desc' });
    };

    // Меню для вибору розрізу
    const viewTypeMenu = [
        {
            label: 'По платнику',
            key: 'taxpayer',
            onClick: () => {
                setViewType('taxpayer');
                setSelectedFilter(null);
                setSortConfig({ key: null, direction: 'desc' });
            }
        },
        {
            label: 'По податку',
            key: 'tax-type',
            onClick: () => {
                setViewType('tax-type');
                setSelectedFilter(null);
                setSortConfig({ key: null, direction: 'desc' });
            }
        },
        {
            label: 'По місяцю',
            key: 'period',
            onClick: () => {
                setViewType('period');
                setSelectedFilter(null);
                setSortConfig({ key: null, direction: 'desc' });
            }
        }
    ];

    // Отримання меню для фільтра
    const getFilterMenu = () => {
        const options = (() => {
            switch (viewType) {
                case 'taxpayer':
                    return taxpayers;
                case 'tax-type':
                    return taxTypes;
                case 'period':
                    return periods;
                default:
                    return [];
            }
        })();

        return options.map(option => ({
            label: option.label,
            key: option.value,
            onClick: () => setSelectedFilter(option)
        }));
    };

    // Меню для кількості записів
    const limitMenu = [
        {
            label: '25',
            key: '25',
            onClick: () => {
                setState(prevState => ({
                    ...prevState,
                    limit: 25
                }));
            }
        },
        {
            label: '50',
            key: '50',
            onClick: () => {
                setState(prevState => ({
                    ...prevState,
                    limit: 50
                }));
            }
        },
        {
            label: '100',
            key: '100',
            onClick: () => {
                setState(prevState => ({
                    ...prevState,
                    limit: 100
                }));
            }
        },
        {
            label: 'Всі',
            key: '10000',
            onClick: () => {
                setState(prevState => ({
                    ...prevState,
                    limit: 10000
                }));
            }
        }
    ];

    // =====================================================
    // ФУНКЦІЇ ДЛЯ ОНОВЛЕННЯ РЕЄСТРУ ЮРИДИЧНИХ ОСІБ
    // =====================================================

    // Обробник натискання кнопки "Оновити реєстр"
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
                const datesResult = await getTaxReportsAvailableDates(communityName);
                console.log('[TaxReports Available Dates] Отримано дані:', datesResult);

                if (datesResult && datesResult.data && Array.isArray(datesResult.data)) {
                    setAvailableDates(datesResult.data);
                } else {
                    console.warn('[TaxReports Available Dates] Невірний формат відповіді:', datesResult);
                    setAvailableDates([]);
                }
            } catch (error) {
                console.error('[TaxReports Available Dates] Помилка завантаження:', error);
                setAvailableDates([]);
            } finally {
                setIsLoadingDates(false);
            }

            // Викликаємо API для preview
            const result = await previewTaxReportsUpdate(communityName, selectedDate || null);

            // Перевірка відповіді
            if (!result || !result.data) {
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
                message: `Дані отримано. Всього записів: ${result.data.total_count || 0}`,
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

    // Закриття модального вікна
    const handleCloseDatabaseUpdateModal = () => {
        setIsDatabaseUpdateModalOpen(false);
        setDatabaseUpdateControlSums(null);
        setSelectedDate('');
    };

    // Зміна дати в модальному вікні
    const handleDateChange = async (newDate) => {
        if (isTaskProcessing) return;
        setSelectedDate(newDate);
        setIsTaskProcessing(true);

        try {
            // Перезавантажуємо дані preview з новою датою
            const result = await previewTaxReportsUpdate(communityName, newDate || null);

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

    // Підтвердження оновлення БД
    const handleConfirmDatabaseUpdate = async () => {
        try {
            setIsTaskProcessing(true);

            notification({
                type: 'info',
                placement: 'top',
                title: 'Оновлення',
                message: 'Виконується оновлення локальної бази даних...',
                duration: 3
            });

            // Викликаємо API для оновлення БД
            const result = await updateTaxReportsDatabase(communityName);

            // Закриваємо модальне вікно
            setIsDatabaseUpdateModalOpen(false);
            setDatabaseUpdateControlSums(null);

            // Скидаємо фільтр щоб оновити дані без перезавантаження сторінки
            setSelectedFilter(null);

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успішно!',
                message: `База даних оновлена. Завантажено ${result.inserted_records} записів. Оберіть фільтр для перегляду.`,
                duration: 5
            });

        } catch (error) {
            console.error('Помилка оновлення БД:', error);

            // Timeout
            if (error?.response?.status === 408) {
                notification({
                    type: 'warning',
                    title: "Таймаут",
                    message: "Оновлення займає більше часу. Перевірте результат через хвилину.",
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
                title: 'Помилка оновлення',
                message: error?.response?.data?.error || error.message || 'Не вдалося оновити базу даних',
                duration: 5
            });
        } finally {
            setIsTaskProcessing(false);
        }
    };

    // Функції сортування
    const handleSort = useCallback((dataIndex) => {
        setSortConfig(prev => ({
            key: dataIndex,
            direction: prev.key === dataIndex && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    const getSortIcon = useCallback((dataIndex) => {
        if (sortConfig.key !== dataIndex) return null;
        return sortConfig.direction === 'desc' ? sortDownIcon : sortUpIcon;
    }, [sortConfig.key, sortConfig.direction]);

    const createSortableColumn = (title, dataIndex, render = null) => ({
        title,
        dataIndex,
        key: dataIndex,
        sortable: true,
        onHeaderClick: () => handleSort(dataIndex),
        sortIcon: getSortIcon(dataIndex),
        headerClassName: sortConfig.key === dataIndex ? 'active' : '',
        ...(render && { render })
    });

    // Конфігурація колонок для кожного viewType
    const columnConfig = {
        taxpayer: ['period', 'tax_type', 'tax_code', 'accrued', 'received', 'debt', 'overpaid'],
        'tax-type': ['taxpayer_code', 'taxpayer_name', 'period', 'accrued', 'received', 'debt', 'overpaid'],
        period: ['taxpayer_code', 'taxpayer_name', 'tax_type', 'tax_code', 'accrued', 'received', 'debt', 'overpaid']
    };

    const columnDefinitions = {
        period: { title: 'Період', dataIndex: 'period' },
        taxpayer_code: { title: 'ЄДРПОУ', dataIndex: 'taxpayer_code' },
        taxpayer_name: { title: 'Платник', dataIndex: 'taxpayer_name' },
        tax_type: { title: 'Податок', dataIndex: 'tax_type' },
        tax_code: { title: 'КБК', dataIndex: 'tax_code' },
        accrued: { title: 'Нараховано', dataIndex: 'accrued', render: (v) => formatAmount(v || 0) },
        received: { title: 'Сплачено', dataIndex: 'received', render: (v) => formatAmount(v || 0) },
        debt: { title: 'Борг', dataIndex: 'debt', render: (v) => formatAmount(v || 0) },
        overpaid: { title: 'Переплата', dataIndex: 'overpaid', render: (v) => formatAmount(v || 0) }
    };

    // Трансформація даних таблиці з API
    const tableData = useMemo(() => {
        if (!selectedFilter || !tableDataResponse) return { columns: [], data: [] };

        const keys = columnConfig[viewType];
        if (!keys) return { columns: [], data: [] };

        const columns = keys.map(key => {
            const def = columnDefinitions[key];
            return createSortableColumn(def.title, def.dataIndex, def.render || null);
        });

        const items = tableDataResponse?.items || [];
        const data = items.map((item, index) => ({
            key: `row-${index}`,
            taxpayer_code: item.taxpayer_code || '',
            taxpayer_name: item.taxpayer_name || '',
            period: formatPeriod(item.period),
            tax_type: item.tax_type || '',
            tax_code: item.tax_code || '',
            accrued: item.accrued || 0,
            received: item.received || 0,
            debt: item.debt || 0,
            overpaid: item.overpaid || 0
        }));

        return { columns, data };
    }, [viewType, selectedFilter, tableDataResponse]);

    const sortedData = useMemo(() => {
        if (!sortConfig.key || tableData.data.length === 0) return tableData.data;
        return [...tableData.data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            const numA = parseFloat(aVal);
            const numB = parseFloat(bVal);
            if (!isNaN(numA) && !isNaN(numB)) {
                return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
            }
            return sortConfig.direction === 'asc'
                ? String(aVal || '').localeCompare(String(bVal || ''), 'uk')
                : String(bVal || '').localeCompare(String(aVal || ''), 'uk');
        });
    }, [tableData.data, sortConfig]);

    const tableRows = sortedData || [];
    const totalItems = tableDataResponse?.totalItems || 0;

    return (
        <div className="page-container">
            <div className="page-container__header">
                <div className="page-container__header-title">
                    <h1>Податкова звітність</h1>
                </div>
            </div>
            <div className="page-container__content">
                <div className="table-elements">
                    <div className="table-header">
                        <h2 className="title title--sm">
                            {tableRows.length > 0 ? (
                                <React.Fragment>
                                    Показує 1-{Math.min(state.limit, totalItems)} з {totalItems}
                                </React.Fragment>
                            ) : (
                                <React.Fragment>Записів не знайдено</React.Fragment>
                            )}
                        </h2>
                        <div className="table-header__buttons">
                            <Button
                                onClick={handleDatabaseUpdateClick}
                                style={{color: '#2ecc71'}}
                                loading={isTaskProcessing}>
                                Оновити реєстр
                            </Button>
                            <Dropdown
                                icon={dropDownIcon}
                                iconPosition="right"
                                style={dropDownStyle}
                                childStyle={childDropDownStyle}
                                caption={`Розріз: ${getViewTypeLabel()}`}
                                menu={viewTypeMenu}
                            />
                            <Button
                                onClick={handleOpenFilterModal}
                                disabled={!viewType}>
                                Фільтр: {getFilterLabel()}
                            </Button>
                            <Dropdown
                                icon={dropDownIcon}
                                iconPosition="right"
                                style={dropDownStyle}
                                childStyle={childDropDownStyle}
                                caption={`Записів: ${state.limit}`}
                                menu={limitMenu}
                            />
                        </div>
                    </div>
                    <div className="table-main">
                        <div 
                            style={{ width: `${tableRows.length > 0 ? 'auto' : '100%'}` }}
                            className={classNames("table-and-pagination-wrapper")}
                        >
                            <div className="table-wrapper">
                                {(tableDataStatus === STATUS.PENDING || taxpayersStatus === STATUS.PENDING || taxTypesStatus === STATUS.PENDING || periodsStatus === STATUS.PENDING) ? (
                                    <SkeletonPage />
                                ) : tableDataStatus === STATUS.ERROR ? (
                                    <PageError />
                                ) : (
                                    <Table 
                                        columns={tableData.columns} 
                                        dataSource={tableRows} 
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальне вікно для вибору фільтра */}
            <Transition in={state.isFilterModalOpen} timeout={200} unmountOnExit nodeRef={filterModalRef}>
                {(transitionState) => (
                    <Modal
                        className={`tax-reports-filter-modal ${transitionState === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={handleCloseFilterModal}
                        onOk={handleCloseFilterModal}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Оберіть фільтр">
                        <div style={{ padding: '20px 0' }}>
                            <Select
                                placeholder={getFilterPlaceholder()}
                                value={selectedFilter}
                                options={getFilterOptionsForSelect()}
                                onChange={handleFilterSelect}
                                isSearchable={true}
                                isClearable={true}
                                name="filter"
                            />
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно оновлення реєстру юридичних осіб */}
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
        </div>
    );
};

export default TaxReports;
