// ФАЙЛ: front/src/pages/Kindergarten/PaymentStatement.jsx

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
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/Select/Select";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";

const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const groupIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const PAYMENT_STATEMENT_STATE_KEY = 'paymentStatementState';

const savePaymentStatementState = (state) => {
    try {
        sessionStorage.setItem(PAYMENT_STATEMENT_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            groupFilter: state.groupFilter,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save payment statement state:', error);
    }
};

const loadPaymentStatementState = () => {
    try {
        const saved = sessionStorage.getItem(PAYMENT_STATEMENT_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load payment statement state:', error);
    }
    return null;
};

const clearPaymentStatementState = () => {
    try {
        sessionStorage.removeItem(PAYMENT_STATEMENT_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear payment statement state:', error);
    }
};

const PaymentStatement = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)
    
    // Отримуємо поточний місяць та рік
    const getCurrentMonthYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const [statePayment, setStatePayment] = useState(() => {
        const savedState = loadPaymentStatementState();
        const currentMonthYear = getCurrentMonthYear();

        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                confirmLoading: false,
                itemId: null,
                groupFilter: savedState.groupFilter || 'all', // 'all', 'young', 'older'
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'child_name',
                    sort_direction: 'asc',
                    month: currentMonthYear
                }
            };
        }

        return {
            isFilterOpen: false,
            selectData: {},
            confirmLoading: false,
            itemId: null,
            groupFilter: 'all',
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                month: currentMonthYear
            }
        };
    });

    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        statementId: null,
        formData: {
            payment_amount: ''
        }
    });

    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        statementId: null,
        childName: '',
        month: ''
    });

    const [groupsData, setGroupsData] = useState([]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/payment_statements/monthly', {
        method: 'post',
        data: statePayment.sendData
    })
    
    const startRecord = ((statePayment.sendData.page || 1) - 1) * statePayment.sendData.limit + 1;
    const endRecord = Math.min(startRecord + statePayment.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/payment_statements/monthly', {
            method: 'post',
            data: statePayment.sendData
        });
    }, [statePayment.sendData, statePayment.groupFilter, retryFetch]);

    useEffect(() => {
        const loadGroups = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: { limit: 1000, page: 1 }
                });
                
                if (response?.data && Array.isArray(response.data.items)) {
                    const groupOptions = response.data.items.map(group => ({
                        value: group.id,
                        label: `${group.group_name} (${group.kindergarten_name})`,
                        group_name: group.group_name,
                        kindergarten_name: group.kindergarten_name
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
    }, []);

    useEffect(() => {
        savePaymentStatementState(statePayment);
    }, [statePayment]);

    useEffect(() => {
        return () => {
            clearPaymentStatementState();
        };
    }, []);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = statePayment.sendData.sort_by === dataIndex;
        const direction = statePayment.sendData.sort_direction;
        
        return {
            title: (
                <span 
                    onClick={() => handleSort(dataIndex)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    className={`sortable-header ${isActive ? 'active' : ''}`}
                >
                    {title} {isActive && (direction === 'asc' ? sortUpIcon : sortDownIcon)}
                </span>
            ),
            dataIndex,
            headerClassName: isActive ? 'active-sort' : '',
            render,
            width
        };
    };

    const handleSort = (dataIndex) => {
        setStatePayment(prevState => {
            const isSameField = prevState.sendData.sort_by === dataIndex;
            const newDirection = isSameField && prevState.sendData.sort_direction === 'asc' ? 'desc' : 'asc';
            
            return {
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    sort_by: dataIndex,
                    sort_direction: newDirection,
                    page: 1
                }
            };
        });
    };

    const formatMonth = (monthStr) => {
        if (!monthStr) return '-';
        const [year, month] = monthStr.split('-');
        if (!year || !month) return '-';
        const monthNum = parseInt(month, 10);
        if (monthNum < 1 || monthNum > 12) return '-';
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return `${months[monthNum - 1]} ${year}`;
    };

    const columnTable = useMemo(() => [
        {
            title: 'Місяць',
            dataIndex: 'month',
            render: (value) => formatMonth(value),
            width: '150px'
        },
        createSortableColumn('ПІБ дитини', 'child_name', null, '200px'),
        {
            title: 'Група',
            dataIndex: 'group_name',
            width: '150px'
        },
        {
            title: 'Садок',
            dataIndex: 'kindergarten_name',
            width: '200px'
        },
        createSortableColumn('Сума оплати', 'total_amount', (value) => {
            if (!value || value === 0) return '0.00 ₴';
            return `${parseFloat(value).toFixed(2)} ₴`;
        }, '120px'),
        {
            title: 'Днів відвідування',
            dataIndex: 'attendance_days',
            width: '150px',
            render: (value) => value || '0'
        },
        {
            title: 'Дії',
            dataIndex: 'action',
            width: '120px',
            render: (_, record) => (
                <div className="btn-sticky" style={{ justifyContent: 'center', gap: '8px' }}>
                    <Button
                        title="Редагувати"
                        icon={editIcon}
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        title="Видалити"
                        icon={deleteIcon}
                        onClick={() => openDeleteModal(record)}
                    />
                </div>
            ),
        },
    ], [statePayment.sendData.sort_by, statePayment.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.child_id,
                id: el.child_id,
                month: el.month,
                child_id: el.child_id,
                child_name: el.child_name,
                parent_name: el.parent_name,
                group_id: el.group_id,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                group_type: el.group_type,
                total_amount: el.total_amount,
                attendance_days: el.attendance_days,
                created_at: el.created_at
            }))
        }
        return []
    }, [data])

    const menuItems = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (statePayment.sendData.limit !== 16) {
                    setStatePayment(prevState => ({
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
                if (statePayment.sendData.limit !== 32) {
                    setStatePayment(prevState => ({
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
                if (statePayment.sendData.limit !== 48) {
                    setStatePayment(prevState => ({
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

    const handleGroupFilterToggle = () => {
        setStatePayment(prevState => {
            let newFilter = 'all';
            if (prevState.groupFilter === 'all') {
                newFilter = 'young';
            } else if (prevState.groupFilter === 'young') {
                newFilter = 'older';
            } else {
                newFilter = 'all';
            }
            
            return {
                ...prevState,
                groupFilter: newFilter,
                sendData: {
                    ...prevState.sendData,
                    page: 1
                }
            };
        });
    };

    const getGroupFilterLabel = () => {
        switch (statePayment.groupFilter) {
            case 'young':
                return 'Молодша група';
            case 'older':
                return 'Старша група';
            default:
                return 'Всі групи';
        }
    };

    const filterHandleClick = () => {
        setStatePayment(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStatePayment(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.values(statePayment.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [statePayment.selectData])

    const onHandleChange = (name, value) => {
        setStatePayment(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(statePayment.selectData).some(Boolean)) {
            setStatePayment((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(statePayment.sendData, ['limit', 'page', 'sort_by', 'sort_direction', 'month'])) {
            setStatePayment((prev) => ({
                ...prev,
                sendData: {
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: 'child_name',
                    sort_direction: 'asc',
                    month: getCurrentMonthYear()
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(statePayment.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(statePayment.selectData);
        if (!validation.error) {
            setStatePayment((prev) => ({
                ...prev,
                sendData: { 
                    ...prev.sendData,
                    ...validation, 
                    page: 1,
                },
                isFilterOpen: false
            }));
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
        if (statePayment.sendData.page !== page) {
            setStatePayment(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [statePayment.sendData.page])

    const handleEdit = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            statementId: record.id,
            formData: {
                payment_amount: record.total_amount || ''
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleEditInputChange = (field, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }));
    };

    const handleUpdatePayment = async () => {
        const { payment_amount } = editModalState.formData;
        
        if (!payment_amount) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть суму оплати',
            });
            return;
        }

        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/payment_statements/${editModalState.statementId}`, {
                method: 'PUT',
                data: {
                    total_amount: parseFloat(payment_amount)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Суму оплати успішно оновлено',
            });

            closeEditModal();

            retryFetch('api/kindergarten/payment_statements/monthly', {
                method: 'post',
                data: statePayment.sendData
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити суму',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const openDeleteModal = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            statementId: record.id,
            childName: record.child_name,
            month: formatMonth(record.month)
        });
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleDeletePayment = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/payment_statements/${deleteModalState.statementId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Випискцу успішно видалено',
            });

            closeDeleteModal();

            retryFetch('api/kindergarten/payment_statements/monthly', {
                method: 'post',
                data: statePayment.sendData
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити виписку',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

    if (status === STATUS.PENDING) {
        return <SkeletonPage />
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error?.status} title={error?.message || 'Помилка завантаження'} />
    }

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="table-header__quantity">
                                {tableData && Array.isArray(tableData) && tableData.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ?
                                        `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 0}
                                    </React.Fragment> :
                                    'Виписка по оплаті'
                                }
                            </h2>
                            
                            <div className="table-header__buttons">
                                <Button
                                    className={`btn--secondary`}
                                    onClick={handleGroupFilterToggle}
                                    icon={groupIcon}
                                    title="Переключити тип групи"
                                >
                                    {getGroupFilterLabel()}
                                </Button>
                                
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    caption={`Записів: ${statePayment.sendData.limit}`}
                                    menu={menuItems}
                                />
                                <Button
                                    className={`btn btn--filter ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(statePayment.selectData).filter(key => statePayment.selectData[key]).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={statePayment.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={statePayment.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри виписки"
                                >
                                    {/* Кастомні фільтри для Payment Statement */}
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">ПІБ дитини</label>
                                        <Input
                                            icon={searchIcon}
                                            name="child_name"
                                            type="text"
                                            placeholder="Введіть ПІБ дитини"
                                            value={statePayment.selectData?.child_name || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Місяць</label>
                                        <Input
                                            name="month"
                                            type="month"
                                            placeholder="YYYY-MM"
                                            value={statePayment.selectData?.month || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Група</label>
                                        <Select
                                            name="group_id"
                                            placeholder="Оберіть групу"
                                            value={
                                                statePayment.selectData.group_id
                                                    ? groupsData.find(g => g.value === statePayment.selectData.group_id)
                                                    : null
                                            }
                                            onChange={(name, option) => onHandleChange(name, option?.value || null)}
                                            options={groupsData}
                                            isClearable
                                        />
                                    </div>
                                </FilterDropdown>
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '1000px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={statePayment.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }

            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdatePayment}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Редагувати суму оплати"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    label="Сума оплати (₴)"
                                    placeholder="Введіть суму оплати"
                                    name="payment_amount"
                                    value={editModalState.formData.payment_amount}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDeleteModal}
                        onOk={handleDeletePayment}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Видалити"
                        title="Підтвердження видалення"
                    >
                        <p>
                            Ви впевнені, що хочете видалити виписку для дитини <strong>{deleteModalState.childName}</strong> за місяць <strong>{deleteModalState.month}</strong>?
                        </p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default PaymentStatement;