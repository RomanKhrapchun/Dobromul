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
import './ChildBenefits.css';

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const ChildBenefits = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)

    // Використовуємо useSessionState замість ручного управління sessionStorage
    const [stateBenefits, setStateBenefits] = useSessionState(
        'childBenefitsState',
        {
            isFilterOpen: false,
            selectData: {},
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'valid_from',
                sort_direction: 'desc'
            }
        }
    );

    // стан для модального вікна додавання пільги
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            child_id: '',
            benefit_percentage: '',
            benefit_reason: '',
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: '',
            documents: ''
        }
    });

    // стан для модального вікна редагування пільги
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        benefitId: null,
        formData: {
            child_id: '',
            benefit_percentage: '',
            benefit_reason: '',
            valid_from: '',
            valid_to: '',
            documents: ''
        }
    });

    // стан для модального вікна видалення пільги
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        benefitId: null,
        childName: ''
    });

    // стан для списку дітей (для селекту)
    const [childrenData, setChildrenData] = useState([]);
    const [kindergartens, setKindergartens] = useState([]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/benefits/filter', {
        method: 'post',
        data: stateBenefits.sendData
    })

    const startRecord = ((stateBenefits.sendData.page || 1) - 1) * stateBenefits.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateBenefits.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }

        retryFetch('api/kindergarten/benefits/filter', {
            method: 'post',
            data: stateBenefits.sendData
        });
    }, [stateBenefits.sendData, retryFetch]);

    // Завантажуємо список дітей для селекту
    useEffect(() => {
        const loadChildren = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/childrenRoster/filter', {
                    method: 'POST',
                    data: {
                        limit: 1000,
                        page: 1
                    }
                });

                if (response?.data && Array.isArray(response.data.items)) {
                    const childOptions = response.data.items.map(child => ({
                        value: child.id,
                        label: `${child.child_name} (${child.group_name || 'Без групи'})`
                    }));
                    setChildrenData(childOptions);
                }
            } catch (error) {
                console.error('Error loading children:', error);
            }
        };
        loadChildren();
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
        const isActive = stateBenefits.sendData.sort_by === dataIndex;
        const direction = stateBenefits.sendData.sort_direction;

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
        const currentSortBy = stateBenefits.sendData.sort_by;
        const currentDirection = stateBenefits.sendData.sort_direction;

        let newDirection = 'asc';
        if (currentSortBy === column && currentDirection === 'asc') {
            newDirection = 'desc';
        }

        setStateBenefits(prev => ({
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
            active: { label: 'Активна', className: 'badge badge-success' },
            inactive: { label: 'Неактивна', className: 'badge badge-secondary' },
            expired: { label: 'Закінчилась', className: 'badge badge-warning' }
        };

        const config = statusConfig[status] || { label: status, className: 'badge' };
        return <span className={config.className}>{config.label}</span>;
    };

    const columnTable = useMemo(() => {
        let columns = [
            createSortableColumn('#', 'id', null, '60px'),
            createSortableColumn('Дитина', 'child_name', null, '180px'),
            createSortableColumn('Група', 'group_name', null, '150px'),
            {
                title: 'Садочок',
                dataIndex: 'kindergarten_name',
                width: '120px'
            },
            createSortableColumn('Пільга %', 'benefit_percentage', (value) => {
                return `${parseFloat(value).toFixed(2)}%`;
            }, '100px'),
            {
                title: 'Причина',
                dataIndex: 'benefit_reason',
                width: '200px',
                render: (text) => {
                    if (!text) return '-';
                    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
                }
            },
            createSortableColumn('Діє з', 'valid_from', (date) => {
                return new Date(date).toLocaleDateString('uk-UA');
            }, '100px'),
            {
                title: 'До',
                dataIndex: 'valid_to',
                width: '100px',
                render: (date) => {
                    return date ? new Date(date).toLocaleDateString('uk-UA') : 'Безстроково';
                }
            },
            {
                title: 'Статус',
                dataIndex: 'status',
                width: '120px',
                render: (status) => getStatusBadge(status)
            },
            {
                title: 'Дії',
                dataIndex: 'action',
                headerClassName: 'non-sortable',
                width: '150px',
                render: (_, record) => (
                    <div className="btn-sticky" style={{
                        justifyContent: 'center',
                        gap: '4px',
                        flexWrap: 'wrap'
                    }}>
                        <Button
                            title="Редагувати"
                            icon={editIcon}
                            size="small"
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            title="Видалити"
                            icon={deleteIcon}
                            size="small"
                            className="btn--secondary"
                            onClick={() => openDeleteModal(record)}
                        />
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateBenefits.sendData.sort_by, stateBenefits.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                benefit_percentage: el.benefit_percentage,
                benefit_reason: el.benefit_reason,
                valid_from: el.valid_from,
                valid_to: el.valid_to,
                documents: el.documents,
                status: el.status
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateBenefits.sendData.limit !== 16) {
                    setStateBenefits(prevState => ({
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
                if (stateBenefits.sendData.limit !== 32) {
                    setStateBenefits(prevState => ({
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
                if (stateBenefits.sendData.limit !== 48) {
                    setStateBenefits(prevState => ({
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
        setStateBenefits(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateBenefits(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateBenefits.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateBenefits.selectData])

    const onHandleChange = (name, value) => {
        setStateBenefits(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateBenefits.selectData).some(Boolean)) {
            setStateBenefits((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(stateBenefits.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateBenefits((prev) => ({
                ...prev,
                sendData: {
                    limit: prev.sendData.limit,
                    page: 1,
                    sort_by: 'valid_from',
                    sort_direction: 'desc'
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateBenefits.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateBenefits.selectData);
        if (!validation.error) {
            setStateBenefits((prev) => ({
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
        if (stateBenefits.sendData.page !== page) {
            setStateBenefits(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateBenefits.sendData.page])

    // Функції для модального вікна додавання
    const openModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                child_id: '',
                benefit_percentage: '',
                benefit_reason: '',
                valid_from: new Date().toISOString().split('T')[0],
                valid_to: '',
                documents: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleModalInputChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value
                    ? value.value
                    : value
            }
        }));
    };

    const handleSaveBenefit = async () => {
        const { child_id, benefit_percentage, benefit_reason, valid_from, valid_to, documents } = modalState.formData;

        // Валідація обов'язкових полів
        if (!child_id || !benefit_percentage || !benefit_reason.trim() || !valid_from) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть всі обов\'язкові поля',
            });
            return;
        }

        // Валідація відсотка
        const percentage = parseFloat(benefit_percentage);
        if (percentage < 0 || percentage > 100) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Відсоток пільги має бути від 0 до 100',
            });
            return;
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            const requestData = {
                child_id: parseInt(child_id),
                benefit_percentage: percentage,
                benefit_reason: benefit_reason.trim(),
                valid_from: valid_from
            };

            if (valid_to) {
                requestData.valid_to = valid_to;
            }

            if (documents && documents.trim()) {
                requestData.documents = documents.trim();
            }

            await fetchFunction('api/kindergarten/benefits', {
                method: 'POST',
                data: requestData
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Пільгу успішно додано',
            });

            closeModal();

            // Оновлюємо список
            retryFetch('api/kindergarten/benefits/filter', {
                method: 'post',
                data: stateBenefits.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати пільгу',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функції для модального вікна редагування
    const openEditModal = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            benefitId: record.id,
            formData: {
                child_id: record.child_id,
                benefit_percentage: record.benefit_percentage,
                benefit_reason: record.benefit_reason || '',
                valid_from: record.valid_from,
                valid_to: record.valid_to || '',
                documents: record.documents || ''
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
                [field]: value && typeof value === 'object' && value.value
                    ? value.value
                    : value
            }
        }));
    };

    const handleUpdateBenefit = async () => {
        const { child_id, benefit_percentage, benefit_reason, valid_from, valid_to, documents } = editModalState.formData;

        // Валідація обов'язкових полів
        if (!child_id || !benefit_percentage || !benefit_reason.trim() || !valid_from) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть всі обов\'язкові поля',
            });
            return;
        }

        // Валідація відсотка
        const percentage = parseFloat(benefit_percentage);
        if (percentage < 0 || percentage > 100) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Відсоток пільги має бути від 0 до 100',
            });
            return;
        }

        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            const requestData = {
                child_id: parseInt(child_id),
                benefit_percentage: percentage,
                benefit_reason: benefit_reason.trim(),
                valid_from: valid_from
            };

            if (valid_to) {
                requestData.valid_to = valid_to;
            }

            if (documents && documents.trim()) {
                requestData.documents = documents.trim();
            }

            await fetchFunction(`api/kindergarten/benefits/${editModalState.benefitId}`, {
                method: 'PUT',
                data: requestData
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Пільгу успішно оновлено',
            });

            closeEditModal();

            // Оновлюємо список
            retryFetch('api/kindergarten/benefits/filter', {
                method: 'post',
                data: stateBenefits.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити пільгу',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функції для модального вікна видалення
    const openDeleteModal = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            benefitId: record.id,
            childName: record.child_name
        });
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleDeleteBenefit = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/benefits/${deleteModalState.benefitId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Пільгу успішно видалено',
            });

            closeDeleteModal();

            // Оновлюємо список
            retryFetch('api/kindergarten/benefits/filter', {
                method: 'post',
                data: stateBenefits.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити пільгу',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
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
                                <Button
                                    onClick={openModal}
                                    icon={addIcon}>
                                    Додати пільгу
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateBenefits.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateBenefits.selectData).filter(key => stateBenefits.selectData[key]).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={stateBenefits.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateBenefits.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри пільг"
                                >
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Статус</label>
                                        <Select
                                            name="status"
                                            placeholder="Оберіть статус"
                                            value={stateBenefits.selectData.status}
                                            onChange={onHandleChange}
                                            options={[
                                                { value: '', label: 'Всі' },
                                                { value: 'active', label: 'Активна' },
                                                { value: 'inactive', label: 'Неактивна' },
                                                { value: 'expired', label: 'Закінчилась' }
                                            ]}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Садочок</label>
                                        <Select
                                            name="kindergarten_id"
                                            placeholder="Оберіть садочок"
                                            value={stateBenefits.selectData?.kindergarten_id || ''}
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
                                            value={stateBenefits.selectData?.child_name || ''}
                                            onChange={onHandleChange}
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
                                    pageSize={stateBenefits.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }

            {/* Модальне вікно для додавання пільги */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSaveBenefit}
                        confirmLoading={modalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Додати пільгу"
                    >
                        <div className="modal-form benefit-form">
                            <div className="form-group benefit-form__group">
                                <Select
                                    label="Дитина"
                                    placeholder={childrenData.length > 0 ? "Пошук дитини..." : "Завантаження дітей..."}
                                    name="child_id"
                                    options={childrenData}
                                    value={modalState.formData.child_id ?
                                        childrenData.find(child => child.value == modalState.formData.child_id) || null
                                        : null
                                    }
                                    onChange={handleModalInputChange}
                                    style={dropDownStyle}
                                    isSearchable={true}
                                    required
                                />
                            </div>

                            <div className="form-group benefit-form__group">
                                <Input
                                    label="Відсоток пільги (0-100)"
                                    placeholder="Введіть відсоток пільги"
                                    name="benefit_percentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={modalState.formData.benefit_percentage}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group benefit-form__group">
                                <Textarea
                                    label="Причина надання пільги"
                                    placeholder="Вкажіть причину надання пільги"
                                    name="benefit_reason"
                                    value={modalState.formData.benefit_reason}
                                    onChange={handleModalInputChange}
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-row benefit-form__row">
                                <div className="form-group benefit-form__group benefit-form__group--half">
                                    <Input
                                        label="Діє з"
                                        type="date"
                                        name="valid_from"
                                        value={modalState.formData.valid_from}
                                        onChange={handleModalInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group benefit-form__group benefit-form__group--half">
                                    <Input
                                        label="Діє до (опціонально)"
                                        type="date"
                                        name="valid_to"
                                        value={modalState.formData.valid_to}
                                        onChange={handleModalInputChange}
                                    />
                                    <small className="benefit-form__hint">
                                        Порожнє = безстроково
                                    </small>
                                </div>
                            </div>

                            <div className="form-group benefit-form__group">
                                <Input
                                    label="Документи (опціонально)"
                                    placeholder="Шлях до документів або опис"
                                    name="documents"
                                    value={modalState.formData.documents}
                                    onChange={handleModalInputChange}
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для редагування пільги */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdateBenefit}
                        confirmLoading={editModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Редагувати пільгу"
                    >
                        <div className="modal-form benefit-form">
                            <div className="form-group benefit-form__group">
                                <Select
                                    label="Дитина"
                                    placeholder="Пошук дитини..."
                                    name="child_id"
                                    options={childrenData}
                                    value={editModalState.formData.child_id ?
                                        childrenData.find(child => child.value == editModalState.formData.child_id) || null
                                        : null
                                    }
                                    onChange={handleEditInputChange}
                                    style={dropDownStyle}
                                    isSearchable={true}
                                    required
                                />
                            </div>

                            <div className="form-group benefit-form__group">
                                <Input
                                    label="Відсоток пільги (0-100)"
                                    placeholder="Введіть відсоток пільги"
                                    name="benefit_percentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={editModalState.formData.benefit_percentage}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group benefit-form__group">
                                <Textarea
                                    label="Причина надання пільги"
                                    placeholder="Вкажіть причину надання пільги"
                                    name="benefit_reason"
                                    value={editModalState.formData.benefit_reason}
                                    onChange={handleEditInputChange}
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-row benefit-form__row">
                                <div className="form-group benefit-form__group benefit-form__group--half">
                                    <Input
                                        label="Діє з"
                                        type="date"
                                        name="valid_from"
                                        value={editModalState.formData.valid_from}
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-group benefit-form__group benefit-form__group--half">
                                    <Input
                                        label="Діє до (опціонально)"
                                        type="date"
                                        name="valid_to"
                                        value={editModalState.formData.valid_to}
                                        onChange={handleEditInputChange}
                                    />
                                    <small className="benefit-form__hint">
                                        Порожнє = безстроково
                                    </small>
                                </div>
                            </div>

                            <div className="form-group benefit-form__group">
                                <Input
                                    label="Документи (опціонально)"
                                    placeholder="Шлях до документів або опис"
                                    name="documents"
                                    value={editModalState.formData.documents}
                                    onChange={handleEditInputChange}
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для підтвердження видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDeleteModal}
                        onOk={handleDeleteBenefit}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Так, видалити"
                        title="Підтвердження видалення"
                    >
                        <p className="paragraph">
                            Ви впевнені, що бажаєте видалити пільгу для дитини <strong>"{deleteModalState.childName}"</strong>?
                        </p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    )
}

export default ChildBenefits;
