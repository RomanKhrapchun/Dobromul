import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import CheckHistoryFilterContent from "../../components/common/Dropdown/CheckHistoryFilterContent";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';

// Icons
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)

const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const CHECK_HISTORY_STATE_KEY = 'checkHistoryState';

const saveCheckHistoryState = (state) => {
    try {
        sessionStorage.setItem(CHECK_HISTORY_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save check history state:', error);
    }
};

const loadCheckHistoryState = () => {
    try {
        const saved = sessionStorage.getItem(CHECK_HISTORY_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
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
        console.warn('Failed to load check history state:', error);
    }
    return null;
};

const CheckHistoryList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)

    const [stateCheckHistory, setStateCheckHistory] = useState(() => {
        const savedState = loadCheckHistoryState();

        const defaultState = {
            isFilterOpen: false,
            selectData: {},
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'check_date',
                sort_direction: 'desc',
            }
        };

        if (savedState) {
            const validLimit = parseInt(savedState.sendData?.limit, 10);
            const validPage = parseInt(savedState.sendData?.page, 10);

            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                sendData: {
                    limit: isNaN(validLimit) ? 16 : validLimit,
                    page: isNaN(validPage) ? 1 : Math.max(1, validPage),
                    sort_by: savedState.sendData?.sort_by || 'check_date',
                    sort_direction: savedState.sendData?.sort_direction || 'desc',
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

    const {error, status, data, retryFetch} = useFetch('api/parking/check-activity/list', {
        method: 'post',
        data: stateCheckHistory.sendData
    })

    const getDataSafely = () => {
        if (!data) {
            return { totalItems: 0, items: [], currentPage: 1 };
        }

        if (Array.isArray(data)) {
            console.warn('API returned array instead of object');
            return {
                totalItems: data.length,
                items: data,
                currentPage: parseInt(stateCheckHistory.sendData.page, 10) || 1
            };
        }

        return {
            totalItems: parseInt(data.totalItems, 10) || 0,
            items: data.items || [],
            currentPage: parseInt(data.currentPage, 10) || (parseInt(stateCheckHistory.sendData.page, 10) || 1)
        };
    };

    const { totalItems, items: safeItems, currentPage: apiCurrentPage } = getDataSafely();

    const currentPage = parseInt(stateCheckHistory.sendData.page, 10) || 1;
    const limit = parseInt(stateCheckHistory.sendData.limit, 10) || 16;
    const startRecord = totalItems > 0 ? (currentPage - 1) * limit + 1 : 0;
    const endRecord = totalItems > 0 ? Math.min(startRecord + limit - 1, totalItems) : 0;

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }

        retryFetch('api/parking/check-activity/list', {
            method: 'post',
            data: stateCheckHistory.sendData,
        });
    }, [stateCheckHistory.sendData, retryFetch]);

    useEffect(() => {
        saveCheckHistoryState(stateCheckHistory);
    }, [stateCheckHistory]);

    useEffect(() => {
        const pageValue = stateCheckHistory.sendData.page;

        if (isNaN(pageValue) || pageValue < 1) {
            console.warn('Invalid page detected, resetting to 1');
            setStateCheckHistory(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page: 1
                }
            }));
        }
    }, [stateCheckHistory.sendData.page]);

    const handleSort = useCallback((dataIndex) => {
        setStateCheckHistory(prevState => {
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

    const getSortIcon = useCallback((dataIndex) => {
        if (stateCheckHistory.sendData.sort_by !== dataIndex) {
            return null;
        }
        try {
            return stateCheckHistory.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
        } catch (error) {
            console.error('Помилка при створенні іконки сортування:', error);
            return null;
        }
    }, [stateCheckHistory.sendData.sort_by, stateCheckHistory.sendData.sort_direction]);

    const formatDateTime = (datetime) => {
        if (!datetime) return '-';
        const date = new Date(datetime);
        return new Intl.DateTimeFormat('uk-UA', {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(date);
    };

    const statusColors = {
        'paid': '#28a745',
        'pending': '#ffc107',
        'cancelled': '#dc3545'
    };

    const statusLabels = {
        'paid': 'Оплачено',
        'pending': 'Очікує',
        'cancelled': 'Скасовано'
    };

    const getStatusStyle = (status) => {
        return {
            backgroundColor: statusColors[status] + '20',
            color: statusColors[status],
            border: `1px solid ${statusColors[status]}`,
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold'
        };
    };

    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: stateCheckHistory.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('Хто/Де перевірив', 'check_location', (value) => (
                <span style={{
                    fontWeight: '600',
                    color: '#2c3e50'
                }}>
                    {value || 'Не вказано'}
                </span>
            ), '180px'),

            createSortableColumn('Номер машини', 'car_number', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: '#495057',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px'
                }}>
                    {value}
                </span>
            ), '150px'),

            createSortableColumn('Статус', 'status_at_check_time', (value) => (
                <span style={getStatusStyle(value)}>
                    {statusLabels[value] || value}
                </span>
            ), '120px'),

            createSortableColumn('Дата перевірки', 'check_date', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#495057'
                }}>
                    {formatDateTime(value)}
                </span>
            ), '180px'),

            {
                title: 'Період парковки',
                dataIndex: 'parking_period',
                render: (_, item) => {
                    if (!item.start_date || !item.end_date) return '-';
                    const startDate = new Date(item.start_date).toLocaleDateString('uk-UA');
                    const endDate = new Date(item.end_date).toLocaleDateString('uk-UA');
                    return (
                        <span style={{ fontSize: '13px', color: '#495057' }}>
                            {startDate} - {endDate}
                        </span>
                    );
                },
                width: '180px'
            },

            {
                title: 'Сума',
                dataIndex: 'amount',
                render: (value) => value ? `${parseFloat(value).toFixed(2)} ₴` : '-',
                width: '100px'
            }
        ];
    }, [handleSort, getSortIcon, stateCheckHistory.sendData.sort_by]);

    const tableData = useMemo(() => {
        if (safeItems?.length) {
            return safeItems.map((item, index) => ({
                key: `${item.id}_${index}`,
                check_location: item.check_location,
                car_number: item.car_number,
                status_at_check_time: item.status_at_check_time,
                check_date: item.check_date,
                start_date: item.start_date,
                end_date: item.end_date,
                amount: item.amount
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
                if (stateCheckHistory.sendData.limit !== newLimit) {
                    setStateCheckHistory(prevState => ({
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
                if (stateCheckHistory.sendData.limit !== newLimit) {
                    setStateCheckHistory(prevState => ({
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
                if (stateCheckHistory.sendData.limit !== newLimit) {
                    setStateCheckHistory(prevState => ({
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
        setStateCheckHistory(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    };

    const closeFilterDropdown = () => {
        setStateCheckHistory(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateCheckHistory.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateCheckHistory.selectData]);

    const onHandleChange = (name, value) => {
        setStateCheckHistory(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const resetFilters = () => {
        setStateCheckHistory(prevState => ({
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
        const isAnyInputFilled = Object.values(stateCheckHistory.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        });

        if (isAnyInputFilled) {
            const filterParams = stateCheckHistory.selectData;

            setStateCheckHistory(prevState => ({
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
            setStateCheckHistory(prevState => ({
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

    const onPageChange = useCallback((page) => {
        const validPage = parseInt(page, 10);
        if (isNaN(validPage) || validPage < 1) {
            console.error('Invalid page number received:', page);
            return;
        }

        if (stateCheckHistory.sendData.page !== validPage) {
            setStateCheckHistory(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page: validPage,
                }
            }))
        }
    }, [stateCheckHistory.sendData.page]);

    const exportToExcel = async () => {
        try {
            const exportParams = {
                ...stateCheckHistory.sendData,
                page: 1,
                limit: 10000,
                ...Object.fromEntries(
                    Object.entries(stateCheckHistory.selectData).filter(([_, value]) => {
                        if (Array.isArray(value)) return value.length > 0;
                        return value !== null && value !== undefined && value !== '' && value !== false;
                    })
                )
            };

            const response = await fetch("/api/parking/check-activity/export", {
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
            const headers = ['Хто/Де перевірив', 'Номер машини', 'Статус', 'Дата перевірки', 'Період початку', 'Період закінчення', 'Сума'];
            excelData.push(headers);

            apiData.items.forEach(item => {
                excelData.push([
                    item.check_location || '',
                    item.car_number || '',
                    statusLabels[item.status_at_check_time] || item.status_at_check_time || '',
                    formatDateTime(item.check_date),
                    item.start_date ? new Date(item.start_date).toLocaleDateString('uk-UA') : '',
                    item.end_date ? new Date(item.end_date).toLocaleDateString('uk-UA') : '',
                    item.amount ? parseFloat(item.amount).toFixed(2) : ''
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(excelData);

            const colWidths = [
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
                { wch: 22 },
                { wch: 15 },
                { wch: 15 },
                { wch: 12 }
            ];

            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Історія перевірок");

            const currentDate = new Date().toISOString().split('T')[0];
            const filterInfo = Object.keys(stateCheckHistory.selectData).filter(key => stateCheckHistory.selectData[key]).length > 0
                ? '_filtered'
                : '';

            const fileName = `історія_перевірок_${currentDate}${filterInfo}.xlsx`;

            XLSX.writeFile(workbook, fileName);

            notification({
                type: "success",
                placement: "top",
                title: "Успіх",
                message: `Історію перевірок успішно експортовано (${apiData.items.length} записів)`
            });

        } catch (error) {
            notification({
                type: "error",
                placement: "top",
                title: "Помилка",
                message: "Не вдалося експортувати історію перевірок"
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
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="title title--sm">
                                {safeItems.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord}-{endRecord} з {totalItems}
                                    </React.Fragment> :
                                    <React.Fragment>Записів не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateCheckHistory.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateCheckHistory.selectData).filter(key => stateCheckHistory.selectData[key]).length})`}
                                </Button>
                                <Button
                                    onClick={exportToExcel}
                                    icon={downloadIcon}>
                                    Завантажити
                                </Button>

                                <FilterDropdown
                                    isOpen={stateCheckHistory.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateCheckHistory.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри історії перевірок"
                                >
                                    <CheckHistoryFilterContent
                                        filterData={stateCheckHistory.selectData}
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
                                    minWidth: safeItems.length > 0 ? '950px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                {totalItems > 0 && (() => {
                                    const safeCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
                                    const safeTotalCount = Math.max(1, parseInt(totalItems, 10) || 1);
                                    const safePageSize = Math.max(1, parseInt(limit, 10) || 16);

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

export default CheckHistoryList;
