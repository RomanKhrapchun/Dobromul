import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import BookingFilterContent from "../../components/common/Dropdown/BookingFilterContent";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';

// Icons
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)

const BOOKING_LIST_STATE_KEY = 'bookingListState';

const saveBookingListState = (state) => {
    try {
        sessionStorage.setItem(BOOKING_LIST_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save booking list state:', error);
    }
};

const loadBookingListState = () => {
    try {
        const saved = sessionStorage.getItem(BOOKING_LIST_STATE_KEY);
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
        console.warn('Failed to load booking list state:', error);
    }
    return null;
};

const BookingList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)

    const [stateBooking, setStateBooking] = useState(() => {
        const savedState = loadBookingListState();

        const defaultState = {
            isFilterOpen: false,
            selectData: {},
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'created_at',
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
                    sort_by: savedState.sendData?.sort_by || 'created_at',
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

    const {error, status, data, retryFetch} = useFetch('api/parking/bookings/list', {
        method: 'post',
        data: stateBooking.sendData
    })

    const getDataSafely = () => {
        if (!data) {
            return { totalItems: 0, items: [], currentPage: 1 };
        }

        if (Array.isArray(data)) {
            return {
                totalItems: data.length,
                items: data,
                currentPage: parseInt(stateBooking.sendData.page, 10) || 1
            };
        }

        return {
            totalItems: parseInt(data.totalItems, 10) || 0,
            items: data.items || [],
            currentPage: parseInt(data.currentPage, 10) || (parseInt(stateBooking.sendData.page, 10) || 1)
        };
    };

    useEffect(() => {
        saveBookingListState(stateBooking);
    }, [stateBooking]);

    useEffect(() => {
        // console.log('useEffect triggered, sendData:', stateBooking.sendData);

        if (isFirstAPI.current) {
            // console.log('First API call, skipping...');
            isFirstAPI.current = false
            return;
        }

        // console.log('Fetching data with params:', stateBooking.sendData);
        retryFetch('api/parking/bookings/list', {
            method: 'post',
            data: stateBooking.sendData,
        });
    }, [stateBooking.sendData, retryFetch])

    const onHandleChange = (name, value) => {
        setStateBooking(prev => ({
            ...prev,
            selectData: {
                ...prev.selectData,
                [name]: value
            }
        }));
    };

    const applyFilter = () => {
        // console.log('applyFilter called, selectData:', stateBooking.selectData);

        const isAnyInputFilled = Object.values(stateBooking.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false;
            }
            return value !== null && value !== undefined && value !== '';
        });

        // console.log('isAnyInputFilled:', isAnyInputFilled);

        if (isAnyInputFilled) {
            const filterParams = stateBooking.selectData;

            // console.log('Applying filters:', filterParams);
            setStateBooking(prev => ({
                ...prev,
                sendData: {
                    ...filterParams,
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: prev.sendData.sort_by,
                    sort_direction: prev.sendData.sort_direction,
                },
                isFilterOpen: false
            }));
        } else {
            // console.log('No filters, resetting sendData');
            setStateBooking(prev => ({
                ...prev,
                sendData: {
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: prev.sendData.sort_by,
                    sort_direction: prev.sendData.sort_direction,
                },
                isFilterOpen: false
            }));
        }
    };

    const resetFilters = () => {
        setStateBooking(prev => ({
            ...prev,
            selectData: {},
            isFilterOpen: false,
            sendData: {
                limit: prev.sendData.limit,
                page: 1,
                sort_by: 'created_at',
                sort_direction: 'desc',
            }
        }));
    };

    const toggleFilter = useCallback(() => {
        setStateBooking(prev => ({
            ...prev,
            isFilterOpen: !prev.isFilterOpen
        }));
    }, []);

    const closeFilterDropdown = () => {
        setStateBooking(prev => ({
            ...prev,
            isFilterOpen: false,
        }));
    };

    const handleSort = useCallback((columnId) => {
        setStateBooking(prev => {
            const isSameColumn = prev.sendData.sort_by === columnId;
            const newDirection = isSameColumn && prev.sendData.sort_direction === 'asc' ? 'desc' : 'asc';

            return {
                ...prev,
                sendData: {
                    ...prev.sendData,
                    sort_by: columnId,
                    sort_direction: newDirection,
                    page: 1
                }
            };
        });
    }, []);

    const getSortIcon = (columnId) => {
        if (stateBooking.sendData.sort_by !== columnId) {
            return null;
        }
        return stateBooking.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
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

    const columns = useMemo(() => [
        {
            title: 'Номер машини',
            dataIndex: 'car_number',
            sortable: true,
            sortIcon: getSortIcon('car_number')
        },
        {
            title: 'Дата початку',
            dataIndex: 'start_date',
            sortable: true,
            sortIcon: getSortIcon('start_date')
        },
        {
            title: 'Час початку',
            dataIndex: 'start_time',
            sortable: true,
            sortIcon: getSortIcon('start_time')
        },
        {
            title: 'Дата закінчення',
            dataIndex: 'end_date',
            sortable: true,
            sortIcon: getSortIcon('end_date')
        },
        {
            title: 'Час закінчення',
            dataIndex: 'end_time',
            sortable: true,
            sortIcon: getSortIcon('end_time')
        },
        {
            title: 'Сума',
            dataIndex: 'amount',
            sortable: true,
            sortIcon: getSortIcon('amount')
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            sortable: true,
            sortIcon: getSortIcon('status')
        },
        {
            title: 'Дата створення',
            dataIndex: 'created_at',
            sortable: true,
            sortIcon: getSortIcon('created_at')
        }
    ], [stateBooking.sendData.sort_by, stateBooking.sendData.sort_direction]);

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateBooking.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false;
            }
            return value !== null && value !== undefined && value !== '';
        });
    }, [stateBooking.selectData]);

    const handleChangePage = useCallback((newPage) => {
        if (newPage < 1 || (data && newPage > data.totalPages)) return;

        setStateBooking(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                page: newPage
            }
        }));
    }, [data]);

    const handleChangeLimit = useCallback((newLimit) => {
        const validLimit = parseInt(newLimit, 10);
        if (isNaN(validLimit) || validLimit < 1) return;

        setStateBooking(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                limit: validLimit,
                page: 1
            }
        }));
    }, []);

    const exportToExcel = async () => {
        try {
            const exportParams = { ...stateBooking.sendData };
            delete exportParams.limit;
            delete exportParams.page;

            const response = await fetch(`api/parking/bookings/export`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(exportParams)
            });

            if (!response.ok) {
                throw new Error('Помилка при експорті даних');
            }

            const result = await response.json();

            if (!result.items || result.items.length === 0) {
                notification('Немає даних для експорту', 'warning');
                return;
            }

            const exportData = result.items.map(item => ({
                'Номер машини': item.car_number,
                'Дата початку': new Date(item.start_date).toLocaleDateString('uk-UA'),
                'Час початку': item.start_time,
                'Дата закінчення': new Date(item.end_date).toLocaleDateString('uk-UA'),
                'Час закінчення': item.end_time,
                'Сума': parseFloat(item.amount).toFixed(2),
                'Статус': statusLabels[item.status] || item.status,
                'Дата створення': new Date(item.created_at).toLocaleDateString('uk-UA')
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Заявки парковки');

            const colWidths = [
                { wch: 15 },
                { wch: 15 },
                { wch: 12 },
                { wch: 15 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 }
            ];
            ws['!cols'] = colWidths;

            const fileName = `заявки_парковки_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            notification('Дані успішно експортовано', 'success');
        } catch (error) {
            console.error('Export error:', error);
            notification('Помилка при експорті даних', 'error');
        }
    };

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status}/>
    }

    if (status === STATUS.PENDING) {
        return <SkeletonPage/>
    }

    const {totalItems, items, currentPage} = getDataSafely();
    const totalPages = data?.totalPages || Math.ceil(totalItems / stateBooking.sendData.limit);

    return (
        <div className="table-elements">
            <div className="table-header">
                <h2 className="title title--sm">
                    {totalItems > 0 ? `Всього записів: ${totalItems}` : 'Записів не знайдено'}
                    {data?.totalAmount !== undefined && totalItems > 0 && (
                        <> | Загальна сума: {parseFloat(data.totalAmount).toFixed(2)} ₴</>
                    )}
                </h2>
                <div className="table-header__buttons">
                    <Button
                        className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                        onClick={toggleFilter}
                        icon={filterIcon}
                    >
                        Фільтри {hasActiveFilters && `(${Object.keys(stateBooking.selectData).filter(key => stateBooking.selectData[key]).length})`}
                    </Button>
                    <Button
                        onClick={exportToExcel}
                        icon={downloadIcon}
                        disabled={!items || items.length === 0}
                    >
                        Завантажити
                    </Button>
                    <FilterDropdown
                        isOpen={stateBooking.isFilterOpen}
                        onClose={closeFilterDropdown}
                        filterData={stateBooking.selectData}
                        onFilterChange={onHandleChange}
                        onApplyFilter={applyFilter}
                        onResetFilters={resetFilters}
                        searchIcon={searchIcon}
                        title="Фільтри заявок парковки"
                    >
                        <BookingFilterContent
                            filterData={stateBooking.selectData}
                            onFilterChange={onHandleChange}
                            searchIcon={searchIcon}
                        />
                    </FilterDropdown>
                </div>
            </div>

            <div className="table-main">
                <div className="table-and-pagination-wrapper">
                    <div className="table-wrapper">
                        <Table
                            columns={columns}
                            dataSource={items}
                        />
                    </div>
                    <Pagination
                        className="m-b"
                        currentPage={currentPage}
                        totalCount={totalItems}
                        pageSize={stateBooking.sendData.limit}
                        onPageChange={handleChangePage}
                    />
                </div>
            </div>
        </div>
    );
};

export default BookingList;
