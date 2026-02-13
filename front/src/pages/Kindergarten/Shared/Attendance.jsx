import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom'
import classNames from 'classnames';
import useFetch from "../../../hooks/useFetch";
import Table from "../../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS, KINDERGARTEN_MAP} from "../../../utils/constants.jsx";
import Button from "../../../components/common/Button/Button";
import PageError from "../../ErrorPage/PageError";
import Pagination from "../../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../../utils/function";
import {useNotification} from "../../../hooks/useNotification";
import {Context} from "../../../main";
import Dropdown from "../../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../../components/common/Skeleton/SkeletonPage";
import Input from "../../../components/common/Input/Input";
import Select from "../../../components/common/Select/Select";
import FilterDropdown from "../../../components/common/Dropdown/FilterDropdown";
import "../../../components/common/Dropdown/FilterDropdown.css";

// Іконки
const checkIcon = generateIcon(iconMap.check, null, 'currentColor', 16, 16)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Функція для отримання поточної дати України
const getCurrentUkraineDate = () => {
    const now = new Date();
    const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const year = ukraineTime.getFullYear();
    const month = String(ukraineTime.getMonth() + 1).padStart(2, '0');
    const day = String(ukraineTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Опції для статусів відвідуваності
const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'present', label: 'Присутній(-я)' },
    { value: 'absent', label: 'Відсутній(-я)' },
    { value: 'sick', label: 'Хворий(-а)' },
    { value: 'vacation', label: 'Відпустка' }
];

/**
 * Спільний компонент для відвідуваності
 * Отримує kindergartenId з URL параметрів
 */
const Attendance = () => {
    const navigate = useNavigate()
    const { kindergartenId } = useParams()
    const notification = useNotification()
    const {store} = useContext(Context)
    const [groupsData, setGroupsData] = useState([]);

    // Отримуємо інформацію про садочок з mapping
    const kindergartenInfo = KINDERGARTEN_MAP[kindergartenId] || { type: kindergartenId, name: `Садочок ${kindergartenId}` };
    const kindergartenType = kindergartenInfo.type;

    const currentDate = getCurrentUkraineDate();

    const [stateAttendance, setStateAttendance] = useState({
        isFilterOpen: false,
        selectData: { date: currentDate },
        confirmLoading: false,
        itemId: null,
        sendData: {
            limit: 16,
            page: 1,
            sort_by: 'child_name',
            sort_direction: 'asc',
            date: currentDate,
            kindergarten_type: kindergartenType
        }
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/attendance/filter', {
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

        retryFetch('api/kindergarten/attendance/filter', {
            method: 'post',
            data: stateAttendance.sendData
        });
    }, [stateAttendance.sendData, retryFetch]);

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
                } else {
                    setGroupsData([]);
                }
            } catch (error) {
                console.error('Error loading groups:', error);
                setGroupsData([]);
            }
        };
        loadGroups();
    }, [kindergartenType]);

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

    const toggleAttendance = useCallback(async (record) => {
        const newStatus = record.attendance_status === 'present' ? 'absent' : 'present';
        const dateForRequest = stateAttendance.sendData.date
            || stateAttendance.selectData.date
            || getCurrentUkraineDate();

        try {
            if (record.attendance_id) {
                await fetchFunction(`api/kindergarten/attendance/${record.attendance_id}`, {
                    method: 'PUT',
                    data: {
                        kindergarten_type: kindergartenType,
                        attendance_status: newStatus
                    }
                });
            } else {
                await fetchFunction('api/kindergarten/attendance', {
                    method: 'POST',
                    data: {
                        kindergarten_type: kindergartenType,
                        date: dateForRequest,
                        child_id: record.child_id,
                        attendance_status: newStatus
                    }
                });
            }

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Відвідуваність оновлено успішно',
            });

            setStateAttendance(prev => {
                retryFetch('api/kindergarten/attendance/filter', {
                    method: 'post',
                    data: prev.sendData,
                });
                return prev;
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити відвідуваність',
            });
        }
    }, [stateAttendance.sendData, stateAttendance.selectData, retryFetch, notification, kindergartenType]);

    const columns = useMemo(() => {
        return [
            {
                title: 'Дата',
                dataIndex: 'attendance_date',
                key: 'attendance_date',
                width: 120,
                render: () => {
                    const displayDate = stateAttendance.sendData.date
                        || stateAttendance.selectData.date
                        || getCurrentUkraineDate();

                    try {
                        return new Date(displayDate).toLocaleDateString('uk-UA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                    } catch (err) {
                        return displayDate;
                    }
                }
            },
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
            {
                title: 'Дія',
                key: 'actions',
                render: (_, record) => (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button
                            title={record.attendance_status === 'present' ? 'Відмітити відсутність' : 'Відмітити присутність'}
                            icon={checkIcon}
                            size="small"
                            className={record.attendance_status === 'present' ? 'btn--secondary' : 'btn--primary'}
                            onClick={() => toggleAttendance(record)}
                        >
                            {record.attendance_status === 'present' ? 'Відмітити відсутність' : 'Відмітити присутність'}
                        </Button>
                    </div>
                ),
            }
        ];
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction, stateAttendance.sendData.date, stateAttendance.selectData.date, handleSort, getSortIcon, toggleAttendance]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            const dateForDisplay = stateAttendance.sendData.date
                || stateAttendance.selectData.date
                || getCurrentUkraineDate();

            return data.items.map((el) => ({
                key: `${el.child_id}`,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                attendance_id: el.attendance_id,
                attendance_status: el.attendance_status || 'absent',
                attendance_date: dateForDisplay
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
            const value = stateAttendance.selectData[key];
            if (key === 'date') return false;
            return value !== null && value !== undefined && value !== '';
        });
    }, [stateAttendance.selectData]);

    const onHandleChange = (name, value) => {
        setStateAttendance(prev => ({
            ...prev,
            selectData: { ...prev.selectData, [name]: value }
        }))
    }

    const resetFilters = () => {
        const resetDate = getCurrentUkraineDate();
        setStateAttendance(prev => ({
            ...prev,
            selectData: { date: resetDate },
            sendData: {
                limit: prev.sendData.limit,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                date: resetDate,
                kindergarten_type: kindergartenType
            },
            isFilterOpen: false
        }));
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateAttendance.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const cleanedSelectData = Object.keys(stateAttendance.selectData).reduce((acc, key) => {
            const value = stateAttendance.selectData[key];
            if (value !== '' && value !== null && value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {});

        const validation = validateFilters(cleanedSelectData);
        if (!validation.error) {
            setStateAttendance(prev => {
                const newSendData = {
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: prev.sendData.sort_by,
                    sort_direction: prev.sendData.sort_direction,
                    date: prev.sendData.date,
                    kindergarten_type: kindergartenType
                };

                Object.keys(cleanedSelectData).forEach(key => {
                    newSendData[key] = cleanedSelectData[key];
                });

                return { ...prev, sendData: newSendData, isFilterOpen: false };
            });
        } else {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: validation.message ?? 'Щось пішло не так.',
            });
        }
    };

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
                                    Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    <small style={{marginLeft: '10px', color: '#666', fontSize: '12px'}}>
                                        (Дата: {stateAttendance.sendData.date})
                                    </small>
                                </>
                            ) : (
                                <>Записів не знайдено</>
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
                                className={classNames("table-filter-trigger", { "has-active-filters": hasActiveFilters })}
                                onClick={filterHandleClick}
                                icon={filterIcon}
                            >
                                Фільтри {hasActiveFilters && `(${Object.keys(stateAttendance.selectData).filter(key => key !== 'date' && stateAttendance.selectData[key]).length})`}
                            </Button>

                            <FilterDropdown
                                isOpen={stateAttendance.isFilterOpen}
                                onClose={closeFilterDropdown}
                                filterData={stateAttendance.selectData}
                                onFilterChange={onHandleChange}
                                onApplyFilter={applyFilter}
                                onResetFilters={resetFilters}
                                searchIcon={searchIcon}
                                title="Фільтри відвідуваності"
                            >
                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">ПІБ дитини</label>
                                    <Input
                                        icon={searchIcon}
                                        name="child_name"
                                        placeholder="Введіть ПІБ"
                                        value={stateAttendance.selectData.child_name || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Назва групи</label>
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
                                        placeholder="Оберіть статус"
                                        value={
                                            stateAttendance.selectData.attendance_status
                                                ? ATTENDANCE_STATUS_OPTIONS.find(opt => opt.value === stateAttendance.selectData.attendance_status)
                                                : null
                                        }
                                        onChange={(name, option) => onHandleChange(name, option?.value || null)}
                                        options={ATTENDANCE_STATUS_OPTIONS}
                                        isClearable
                                    />
                                </div>

                                <div className="filter-dropdown__item">
                                    <label className="filter-dropdown__label">Дата</label>
                                    <Input
                                        name="date"
                                        type="date"
                                        value={stateAttendance.selectData.date || ''}
                                        onChange={(name, newDate) => {
                                            onHandleChange('date', newDate);
                                            setStateAttendance(prev => ({
                                                ...prev,
                                                selectData: { ...prev.selectData, date: newDate },
                                                sendData: { ...prev.sendData, date: newDate, page: 1 }
                                            }));
                                        }}
                                    />
                                </div>
                            </FilterDropdown>
                        </div>
                    </div>

                    <div className="table-main">
                        <div className="table-and-pagination-wrapper">
                            <div className="table-wrapper" style={{
                                overflowX: 'auto',
                                minWidth: data?.items?.length > 0 ? '1200px' : 'auto'
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

export default Attendance;
