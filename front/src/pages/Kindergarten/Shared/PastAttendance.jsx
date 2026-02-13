import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom'
import useFetch from "../../../hooks/useFetch";
import Table from "../../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS, KINDERGARTEN_MAP} from "../../../utils/constants.jsx";
import PageError from "../../ErrorPage/PageError";
import Pagination from "../../../components/common/Pagination/Pagination";
import {fetchFunction, validateFilters} from "../../../utils/function";
import {useNotification} from "../../../hooks/useNotification";
import {Context} from "../../../main";
import Dropdown from "../../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../../components/common/Skeleton/SkeletonPage";
import Input from "../../../components/common/Input/Input";
import Select from "../../../components/common/Select/Select";
import Button from "../../../components/common/Button/Button";
import FilterDropdown from "../../../components/common/Dropdown/FilterDropdown";
import "../../../components/common/Dropdown/FilterDropdown.css";

// Іконки
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Функція для отримання вчорашньої дати (для архівних відвідувань)
const getYesterdayUkraineDate = () => {
    const now = new Date();
    const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    ukraineTime.setDate(ukraineTime.getDate() - 1);
    return ukraineTime.toISOString().split('T')[0];
};

// Опції для статусів відвідуваності
const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'present', label: 'Присутній(-я)' },
    { value: 'absent', label: 'Відсутній(-я)' },
    { value: 'sick', label: 'Хворий(-а)' },
    { value: 'vacation', label: 'Відпустка' }
];

/**
 * Спільний компонент для архівної відвідуваності
 * Отримує kindergartenId з URL параметрів
 */
const PastAttendance = () => {
    const navigate = useNavigate()
    const { kindergartenId } = useParams()
    const notification = useNotification()
    const {store} = useContext(Context)

    // Отримуємо інформацію про садочок з mapping
    const kindergartenInfo = KINDERGARTEN_MAP[kindergartenId] || { type: kindergartenId, name: `Садочок ${kindergartenId}` };
    const kindergartenType = kindergartenInfo.type;

    // Стан для груп
    const [groupsData, setGroupsData] = useState([]);

    const [stateAttendance, setStateAttendance] = useState({
        isFilterOpen: false,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
            sort_by: 'child_name',
            sort_direction: 'asc',
            kindergarten_type: kindergartenType
        }
    });

    // Завантаження груп при монтуванні компонента
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: { limit: 1000, page: 1, kindergarten_type: kindergartenType }
                });

                if (response?.data && Array.isArray(response.data.items)) {
                    const groupOptions = response.data.items.map(group => ({
                        value: group.id,
                        label: group.group_name,
                        group_name: group.group_name
                    }));
                    setGroupsData(groupOptions);
                }
            } catch (error) {
                console.error('Помилка завантаження груп:', error);
            }
        };
        loadGroups();
    }, [kindergartenType]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/past_attendance/filter', {
        method: 'post',
        data: stateAttendance.sendData
    })

    const startRecord = ((stateAttendance.sendData.page || 1) - 1) * stateAttendance.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAttendance.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }

        retryFetch('api/kindergarten/past_attendance/filter', {
            method: 'post',
            data: stateAttendance.sendData
        });
    }, [stateAttendance.sendData, retryFetch]);

    const getSortIcon = useCallback((columnName) => {
        if (stateAttendance.sendData.sort_by === columnName) {
            return stateAttendance.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
        }
        return null;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction]);

    const handleSort = useCallback((columnName) => {
        const currentSort = stateAttendance.sendData;
        let newDirection = 'asc';

        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }

        setStateAttendance(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateAttendance.sendData]);

    const columns = useMemo(() => {
        return [
            {
                title: (
                    <div
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'child_name' ? 'active' : ''}`}
                        onClick={() => handleSort('child_name')}
                    >
                        <span>ПІБ дитини</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('child_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'child_name',
                key: 'child_name',
                sorter: false,
            },
            {
                title: (
                    <div
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'group_name' ? 'active' : ''}`}
                        onClick={() => handleSort('group_name')}
                    >
                        <span>Група</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('group_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'group_name',
                key: 'group_name',
                sorter: false,
            },
            {
                title: (
                    <div
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'date' ? 'active' : ''}`}
                        onClick={() => handleSort('date')}
                    >
                        <span>Дата</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('date')}
                        </div>
                    </div>
                ),
                dataIndex: 'attendance_date',
                key: 'attendance_date',
                render: (date) => {
                    if (!date) return '-';
                    const dateObj = new Date(date);
                    return dateObj.toLocaleDateString('uk-UA');
                }
            },
            {
                title: 'Присутність',
                dataIndex: 'attendance_status',
                key: 'attendance_status',
                render: (status) => {
                    const statusConfig = {
                        present: { color: '#52c41a', label: 'Присутній(-я)' },
                        absent: { color: '#f5222d', label: 'Відсутній(-я)' },
                        sick: { color: '#faad14', label: 'Хворий(-а)' },
                        vacation: { color: '#1890ff', label: 'Відпустка' }
                    };

                    const config = statusConfig[status] || statusConfig.absent;

                    return (
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ color: config.color, fontWeight: '600' }}>
                                {config.label}
                            </span>
                        </div>
                    );
                }
            },
        ];
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction, handleSort, getSortIcon]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            const defaultDate = stateAttendance.sendData.date
                || stateAttendance.selectData.date
                || getYesterdayUkraineDate();

            return data.items.map((el) => ({
                key: `${el.id}`,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                attendance_status: el.attendance_status || 'absent',
                attendance_date: el.date || defaultDate
            }));
        }
        return [];
    }, [data, stateAttendance.sendData.date, stateAttendance.selectData.date]);

    const itemMenu = [
        {
            label: '16', key: '16',
            onClick: () => {
                if (stateAttendance.sendData.limit !== 16) {
                    setStateAttendance(prev => ({ ...prev, sendData: { ...prev.sendData, limit: 16, page: 1 } }))
                }
            },
        },
        {
            label: '32', key: '32',
            onClick: () => {
                if (stateAttendance.sendData.limit !== 32) {
                    setStateAttendance(prev => ({ ...prev, sendData: { ...prev.sendData, limit: 32, page: 1 } }))
                }
            },
        },
        {
            label: '48', key: '48',
            onClick: () => {
                if (stateAttendance.sendData.limit !== 48) {
                    setStateAttendance(prev => ({ ...prev, sendData: { ...prev.sendData, limit: 48, page: 1 } }))
                }
            },
        }
    ];

    const filterHandleClick = () => {
        setStateAttendance(prev => ({ ...prev, isFilterOpen: !prev.isFilterOpen }))
    }

    const closeFilterDropdown = () => {
        setStateAttendance(prev => ({ ...prev, isFilterOpen: false }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.keys(stateAttendance.selectData).some(key => {
            return stateAttendance.selectData[key] !== undefined &&
                   stateAttendance.selectData[key] !== null &&
                   stateAttendance.selectData[key] !== '';
        });
    }, [stateAttendance.selectData]);

    const onHandleChange = useCallback((name, value) => {
        setStateAttendance(prevState => {
            const newSelectData = { ...prevState.selectData, [name]: value };

            // Якщо вибрано місяць, очищаємо дату
            if (name === 'month' && value) {
                delete newSelectData.date;
            }
            // Якщо вибрано дату, очищаємо місяць
            if (name === 'date' && value) {
                delete newSelectData.month;
            }

            return { ...prevState, selectData: newSelectData };
        });
    }, [])

    const applyFilter = useCallback(() => {
        const allowedFilters = ['child_name', 'group_id', 'group_name', 'attendance_status', 'date', 'month'];

        const validationResult = validateFilters(stateAttendance.selectData);

        if (validationResult.error) {
            notification({type: 'error', title: 'Помилка фільтрації', message: validationResult.message || 'Помилка валідації'});
            return;
        }

        const { error, ...cleanedData } = validationResult;

        const validatedData = Object.keys(cleanedData).reduce((acc, key) => {
            if (allowedFilters.includes(key)) {
                acc[key] = cleanedData[key];
            }
            return acc;
        }, {});

        setStateAttendance(prevState => ({
            ...prevState,
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: prevState.sendData.sort_by,
                sort_direction: prevState.sendData.sort_direction,
                kindergarten_type: kindergartenType,
                ...validatedData,
            },
            isFilterOpen: false,
        }));
    }, [stateAttendance.selectData, notification, kindergartenType]);

    const resetFilters = useCallback(() => {
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {},
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                kindergarten_type: kindergartenType
            },
            isFilterOpen: false
        }));
    }, [kindergartenType]);

    const onPageChange = useCallback((page) => {
        if (stateAttendance.sendData.page !== page) {
            setStateAttendance(prev => ({ ...prev, sendData: { ...prev.sendData, page } }))
        }
    }, [stateAttendance.sendData.page])

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}

            {status === STATUS.SUCCESS && (
                <div className="table-elements">
                    <div className="table-header">
                        <h2 className="table-header__quantity">
                            {data?.items?.length ? (
                                <>
                                    Показує {startRecord !== endRecord ?
                                        `${startRecord} – ${endRecord}` :
                                        startRecord
                                    } з {data?.totalItems || 0} записів
                                </>
                            ) : (
                                <>Показує 0 – 0 з 0 записів</>
                            )}
                        </h2>
                        <div className="table-header__buttons">
                            <Dropdown
                                icon={dropDownIcon}
                                iconPosition="right"
                                style={dropDownStyle}
                                caption={`Записів: ${stateAttendance.sendData.limit}`}
                                menu={itemMenu}
                            />
                            <Button
                                className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                onClick={filterHandleClick}
                                icon={filterIcon}
                            >
                                Фільтри {hasActiveFilters && `(${Object.keys(stateAttendance.selectData).filter(key => stateAttendance.selectData[key]).length})`}
                            </Button>

                            <FilterDropdown
                                isOpen={stateAttendance.isFilterOpen}
                                onClose={closeFilterDropdown}
                                filterData={stateAttendance.selectData}
                                onFilterChange={onHandleChange}
                                onApplyFilter={applyFilter}
                                onResetFilters={resetFilters}
                                searchIcon={searchIcon}
                                title="Фільтри архівних відвідувань"
                            >
                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Місяць</label>
                                    <Input
                                        name="month"
                                        type="month"
                                        value={stateAttendance.selectData?.month || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Дата</label>
                                    <Input
                                        name="date"
                                        type="date"
                                        value={stateAttendance.selectData?.date || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">ПІБ дитини</label>
                                    <Input
                                        icon={searchIcon}
                                        name="child_name"
                                        type="text"
                                        placeholder="Введіть ПІБ дитини"
                                        value={stateAttendance.selectData?.child_name || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Група</label>
                                    <Select
                                        name="group_id"
                                        placeholder="Оберіть групу"
                                        value={
                                            stateAttendance.selectData.group_id
                                                ? groupsData.find(g => g.value === stateAttendance.selectData.group_id)
                                                : null
                                        }
                                        onChange={(name, option) => onHandleChange(name, option?.value || null)}
                                        options={groupsData}
                                        isClearable
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Статус відвідуваності</label>
                                    <Select
                                        name="attendance_status"
                                        value={stateAttendance.selectData?.attendance_status || ''}
                                        onChange={(name, option) => onHandleChange(name, option?.value)}
                                        options={ATTENDANCE_STATUS_OPTIONS}
                                        placeholder="Оберіть статус"
                                    />
                                </div>
                            </FilterDropdown>
                        </div>
                    </div>
                    <div className="table-main">
                        <div className="table-and-pagination-wrapper">
                            <div className="table-wrapper" style={{
                                overflowX: 'auto',
                                minWidth: data?.items?.length > 10 ? '1200px' : 'auto'
                            }}>
                                <Table columns={columns} dataSource={tableData}/>
                            </div>
                            <Pagination
                                className="m-b"
                                currentPage={parseInt(data?.currentPage) || 1}
                                totalCount={data?.totalItems || 1}
                                pageSize={stateAttendance.sendData.limit}
                                onPageChange={onPageChange}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PastAttendance;
