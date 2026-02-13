import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import useSessionState from "../../hooks/useSessionState";
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
import Textarea from "../../components/common/Textarea/Textarea";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";

// Іконки
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const ChildProposals = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const rejectModalNodeRef = useRef(null)

    // Використовуємо useSessionState замість ручного управління sessionStorage
    const [stateProposals, setStateProposals] = useSessionState(
        'childProposalsState',
        {
            isFilterOpen: false,
            selectData: { status: 'pending' },
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'created_at',
                sort_direction: 'desc',
                status: 'pending'
            }
        }
    );

    // стан для модального вікна відхилення
    const [rejectModalState, setRejectModalState] = useState({
        isOpen: false,
        loading: false,
        proposalId: null,
        formData: {
            review_notes: ''
        }
    });

    // стан для груп та садочків (для фільтрів)
    const [groupsData, setGroupsData] = useState([]);
    const [kindergartens, setKindergartens] = useState([]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/proposals/filter', {
        method: 'post',
        data: stateProposals.sendData
    })

    const startRecord = ((stateProposals.sendData.page || 1) - 1) * stateProposals.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateProposals.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }

        retryFetch('api/kindergarten/proposals/filter', {
            method: 'post',
            data: stateProposals.sendData
        });
    }, [stateProposals.sendData, retryFetch]);

    // Завантажуємо список груп для фільтру
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: {
                        limit: 1000,
                        page: 1
                    }
                });

                if (response?.data && Array.isArray(response.data.items)) {
                    const groupOptions = response.data.items.map(group => ({
                        value: group.id,
                        label: group.group_name
                    }));
                    setGroupsData(groupOptions);
                }
            } catch (error) {
                console.error('Error loading groups:', error);
            }
        };
        loadGroups();
    }, []);

    // Завантажуємо список садочків для фільтру
    useEffect(() => {
        fetchFunction('api/kindergarten/kindergartens')
            .then(res => {
                if (res && res.data) {
                    setKindergartens(res.data);
                }
            })
            .catch(err => {
                console.error('Помилка завантаження садочків:', err);
            });
    }, []);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateProposals.sendData.sort_by === dataIndex;
        const direction = stateProposals.sendData.sort_direction;

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
            headerClassName: isActive ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        };
    };

    const handleSort = (column) => {
        const currentSortBy = stateProposals.sendData.sort_by;
        const currentDirection = stateProposals.sendData.sort_direction;

        let newDirection = 'asc';
        if (currentSortBy === column && currentDirection === 'asc') {
            newDirection = 'desc';
        }

        setStateProposals(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                sort_by: column,
                sort_direction: newDirection,
                page: 1
            }
        }));
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { label: 'Очікує', className: 'badge badge-warning' },
            approved: { label: 'Затверджено', className: 'badge badge-success' },
            rejected: { label: 'Відхилено', className: 'badge badge-danger' }
        };

        const config = statusConfig[status] || { label: status, className: 'badge' };
        return <span className={config.className}>{config.label}</span>;
    };

    const columnTable = useMemo(() => {
        let columns = [
            createSortableColumn('#', 'id', null, '60px'),
            createSortableColumn('Дитина', 'child_name', null, '150px'),
            createSortableColumn('Батьки', 'parent_name', null, '150px'),
            createSortableColumn('Телефон', 'phone_number', null, '120px'),
            createSortableColumn('Група', 'group_name', null, '150px'),
            {
                title: 'Садочок',
                dataIndex: 'kindergarten_name',
                width: '120px'
            },
            {
                title: 'Пільга %',
                dataIndex: 'benefit_percentage',
                width: '80px',
                render: (value) => value ? `${parseFloat(value).toFixed(2)}%` : '-'
            },
            createSortableColumn('Статус', 'status', (status) => getStatusBadge(status), '120px'),
            createSortableColumn('Дата створення', 'created_at', (date) => {
                return new Date(date).toLocaleDateString('uk-UA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }, '150px'),
            {
                title: 'Дії',
                dataIndex: 'action',
                headerClassName: 'non-sortable',
                width: '200px',
                render: (_, record) => {
                    if (record.status === 'pending') {
                        return (
                            <div className="btn-sticky" style={{
                                justifyContent: 'center',
                                gap: '8px',
                                flexWrap: 'wrap'
                            }}>
                                <Button
                                    title="Затвердити"
                                    size="small"
                                    className="btn--success"
                                    onClick={() => handleApprove(record)}
                                >
                                    ✅ Затвердити
                                </Button>
                                <Button
                                    title="Відхилити"
                                    size="small"
                                    className="btn--danger"
                                    onClick={() => openRejectModal(record)}
                                >
                                    ❌ Відхилити
                                </Button>
                            </div>
                        );
                    }
                    return <span>-</span>;
                },
            }
        ];
        return columns;
    }, [stateProposals.sendData.sort_by, stateProposals.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                child_name: el.child_name,
                parent_name: el.parent_name,
                phone_number: el.phone_number,
                group_id: el.group_id,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                benefit_percentage: el.benefit_percentage,
                benefit_reason: el.benefit_reason,
                status: el.status,
                created_at: el.created_at,
                proposed_by: el.proposed_by,
                reviewed_by: el.reviewed_by,
                review_notes: el.review_notes
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateProposals.sendData.limit !== 16) {
                    setStateProposals(prevState => ({
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
                if (stateProposals.sendData.limit !== 32) {
                    setStateProposals(prevState => ({
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
                if (stateProposals.sendData.limit !== 48) {
                    setStateProposals(prevState => ({
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
        setStateProposals(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateProposals(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    // Перевіряємо чи є активні фільтри (крім дефолтного status: 'pending')
    const hasActiveFilters = useMemo(() => {
        return Object.entries(stateProposals.selectData).some(([key, value]) => {
            // Пропускаємо дефолтний статус 'pending' - він не рахується як активний фільтр
            if (key === 'status' && value === 'pending') {
                return false;
            }
            if (Array.isArray(value) && !value.length) {
                return false;
            }
            return value !== null && value !== undefined && value !== '';
        });
    }, [stateProposals.selectData]);

    const onHandleChange = (name, value) => {
        setStateProposals(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateProposals.selectData).some(Boolean)) {
            setStateProposals((prev) => ({ ...prev, selectData: { status: 'pending' } }));
        }
        if (!hasOnlyAllowedParams(stateProposals.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateProposals((prev) => ({
                ...prev,
                sendData: {
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: 'created_at',
                    sort_direction: 'desc',
                    status: 'pending'
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateProposals.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateProposals.selectData);
        if (!validation.error) {
            setStateProposals((prev) => ({
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
        if (stateProposals.sendData.page !== page) {
            setStateProposals(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateProposals.sendData.page])

    // Функція затвердження пропозиції
    const handleApprove = async (record) => {
        try {
            await fetchFunction(`api/kindergarten/proposals/${record.id}/approve`, {
                method: 'POST'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Пропозицію затверджено, дитину додано до списку',
            });

            // Оновлюємо список
            retryFetch('api/kindergarten/proposals/filter', {
                method: 'post',
                data: stateProposals.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося затвердити пропозицію',
            });
        }
    };

    // Функції для модального вікна відхилення
    const openRejectModal = (record) => {
        setRejectModalState({
            isOpen: true,
            loading: false,
            proposalId: record.id,
            formData: {
                review_notes: ''
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const closeRejectModal = () => {
        setRejectModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleRejectInputChange = (field, value) => {
        setRejectModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }));
    };

    const handleReject = async () => {
        if (!rejectModalState.formData.review_notes.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, вкажіть причину відхилення',
            });
            return;
        }

        setRejectModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/proposals/${rejectModalState.proposalId}/reject`, {
                method: 'POST',
                data: {
                    review_notes: rejectModalState.formData.review_notes.trim()
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Пропозицію відхилено',
            });

            closeRejectModal();

            // Оновлюємо список
            retryFetch('api/kindergarten/proposals/filter', {
                method: 'post',
                data: stateProposals.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося відхилити пропозицію',
            });
        } finally {
            setRejectModalState(prev => ({ ...prev, loading: false }));
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
                                {data?.items && Array.isArray(data?.items) && data?.items.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateProposals.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateProposals.selectData).filter(key => {
                                        // Не рахуємо дефолтний status: 'pending'
                                        if (key === 'status' && stateProposals.selectData[key] === 'pending') return false;
                                        return stateProposals.selectData[key];
                                    }).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={stateProposals.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateProposals.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри пропозицій"
                                >
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Статус</label>
                                        <Select
                                            name="status"
                                            placeholder="Оберіть статус"
                                            value={stateProposals.selectData.status}
                                            onChange={onHandleChange}
                                            options={[
                                                { value: '', label: 'Всі' },
                                                { value: 'pending', label: 'Очікує' },
                                                { value: 'approved', label: 'Затверджено' },
                                                { value: 'rejected', label: 'Відхилено' }
                                            ]}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Садочок</label>
                                        <Select
                                            name="kindergarten_id"
                                            placeholder="Оберіть садочок"
                                            value={stateProposals.selectData?.kindergarten_id || ''}
                                            onChange={onHandleChange}
                                            options={[
                                                { value: '', label: 'Всі садочки' },
                                                ...kindergartens.map(k => ({ value: k.id, label: k.name }))
                                            ]}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">ПІБ дитини</label>
                                        <Input
                                            icon={searchIcon}
                                            name="child_name"
                                            type="text"
                                            placeholder="Введіть ПІБ дитини"
                                            value={stateProposals.selectData?.child_name || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Група</label>
                                        <Select
                                            name="group_id"
                                            placeholder="Оберіть групу"
                                            value={
                                                stateProposals.selectData.group_id
                                                    ? groupsData.find(g => g.value === stateProposals.selectData.group_id)
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
                                    minWidth: data?.items?.length > 0 ? '1400px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateProposals.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }

            {/* Модальне вікно для відхилення пропозиції */}
            <Transition in={rejectModalState.isOpen} timeout={200} unmountOnExit nodeRef={rejectModalNodeRef}>
                {state => (
                    <Modal
                        ref={rejectModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeRejectModal}
                        onOk={handleReject}
                        confirmLoading={rejectModalState.loading}
                        cancelText="Скасувати"
                        okText="Відхилити"
                        title="Відхилення пропозиції"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Textarea
                                    label="Причина відхилення"
                                    placeholder="Вкажіть причину відхилення пропозиції..."
                                    name="review_notes"
                                    value={rejectModalState.formData.review_notes}
                                    onChange={handleRejectInputChange}
                                    rows={5}
                                    required
                                />
                                <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                                    Ця причина буде збережена в системі
                                </small>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    )
}

export default ChildProposals;
