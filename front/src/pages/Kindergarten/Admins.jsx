import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import classNames from 'classnames';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/Select/Select";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown.jsx";
import "../../components/common/Dropdown/FilterDropdown.css";

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 16, 16)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 16, 16)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Опції ролей
const ROLE_OPTIONS = [
    { value: 'educator', label: 'Вихователь' }
];

const Admins = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    
    const [stateAdmins, setStateAdmins] = useState({
        isFilterOpen: false,
        selectData: {},
        confirmLoading: false,
        itemId: null,
        sendData: {
            limit: 16,
            page: 1,
            sort_by: 'id',
            sort_direction: 'desc',
        }
    });

    // Стан модального вікна
    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: 'create',
        loading: false,
        formData: {
            id: null,
            username: '',
            full_name: '',
            kindergarten_name: '',
            group_id: null,
            role: 'educator'
        }
    });

    // Стан для списку садочків
    const [kindergartensData, setKindergartensData] = useState([]);
    
    // ✅ ДОДАНО: Стани для груп
    const [groupOptions, setGroupOptions] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/admins/filter', {
        method: 'post',
        data: stateAdmins.sendData
    })
    
    const startRecord = ((stateAdmins.sendData.page || 1) - 1) * stateAdmins.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAdmins.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/admins/filter', {
            method: 'post',
            data: stateAdmins.sendData
        });
    }, [stateAdmins.sendData, retryFetch]);

    // Завантажуємо унікальні назви садочків
    useEffect(() => {
        const loadKindergartens = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: { limit: 1000, page: 1 }
                });
                
                if (response?.data && Array.isArray(response.data.items)) {
                    // Отримуємо унікальні назви садочків
                    const uniqueKindergartens = [...new Set(
                        response.data.items
                            .map(group => group.kindergarten_name)
                            .filter(name => name) // Прибираємо null/undefined
                    )];
                    
                    const kindergartenOptions = uniqueKindergartens.map(name => ({
                        value: name,
                        label: name
                    }));
                    
                    setKindergartensData(kindergartenOptions);
                } else {
                    setKindergartensData([]);
                }
            } catch (error) {
                console.error('Error loading kindergartens:', error);
                setKindergartensData([]);
            }
        };
        loadKindergartens();
    }, []);

    // ✅ ДОДАНО: Завантаження груп по садочку
    const fetchGroupsByKindergarten = async (kindergartenName) => {
        if (!kindergartenName) {
            setGroupOptions([]);
            return;
        }

        try {
            setLoadingGroups(true);
            
            const response = await fetchFunction('api/kindergarten/groups/by-kindergarten', {
                method: 'POST',
                data: { kindergarten_name: kindergartenName }
            });

            if (response?.data && Array.isArray(response.data)) {
                const options = response.data.map(group => ({
                    value: group.id,
                    label: `${group.group_name}${group.educator_name ? ` (${group.educator_name})` : ''}`
                }));
                setGroupOptions(options);
            } else {
                setGroupOptions([]);
            }
        } catch (error) {
            console.error('Помилка завантаження груп:', error);
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: 'Не вдалося завантажити групи',
            });
            setGroupOptions([]);
        } finally {
            setLoadingGroups(false);
        }
    };

    const getSortIcon = useCallback((columnName) => {
        if (stateAdmins.sendData.sort_by === columnName) {
            return stateAdmins.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
        }
        return null;
    }, [stateAdmins.sendData.sort_by, stateAdmins.sendData.sort_direction]);

    const handleSort = useCallback((columnName) => {
        const currentSort = stateAdmins.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateAdmins(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateAdmins.sendData]);

    // ✅ ОНОВЛЕНО: Відкрити модальне вікно для створення
    const openCreateModal = () => {
        setModalState({
            isOpen: true,
            mode: 'create',
            loading: false,
            formData: {
                id: null,
                username: '',
                full_name: '',
                kindergarten_name: '',
                group_id: null,
                role: 'educator'
            }
        });
        setGroupOptions([]);
    };

    // ✅ ОНОВЛЕНО: Відкрити модальне вікно для редагування
    const openEditModal = async (record) => {
        setModalState({
            isOpen: true,
            mode: 'edit',
            loading: false,
            formData: {
                id: record.id,
                username: record.username,
                full_name: record.full_name,
                kindergarten_name: record.kindergarten_name,
                group_id: record.group_id,
                role: record.role
            }
        });
        
        if (record.kindergarten_name) {
            await fetchGroupsByKindergarten(record.kindergarten_name);
        }
    };

    // Закрити модальне вікно
    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: 'create',
            loading: false,
            formData: {
                id: null,
                username: '',
                full_name: '',
                kindergarten_name: '',
                group_id: null,
                role: 'educator'
            }
        });
        setGroupOptions([]);
    };

    // ✅ ОНОВЛЕНО: Зміна input поля з динамічним завантаженням груп
    const handleInputChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value 
                    ? value.value 
                    : value
            }
        }));
        
        // ✅ ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ: При зміні садочка - завантажити його групи
        if (field === 'kindergarten_name') {
            // Очистити вибрану групу
            setModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    kindergarten_name: value,
                    group_id: null  // Скинути групу
                }
            }));
            
            // Завантажити нові групи
            const kindergartenName = typeof value === 'object' && value?.value 
                ? value.value 
                : value;
            fetchGroupsByKindergarten(kindergartenName);
        }
    };

    // Зміна select поля
    const handleSelectChange = (name, value) => {
        // ✅ ВИПРАВЛЕНО: Об'єднано два setModalState в один
        if (name === 'kindergarten_name') {
            setModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    kindergarten_name: value,  // ✅ Встановити садочок
                    group_id: null              // ✅ Скинути групу
                }
            }));
            fetchGroupsByKindergarten(value);
        } else {
            setModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    [name]: value
                }
            }));
        }
    };

    // ✅ ОНОВЛЕНО: Збереження (створення або оновлення)
    const handleSave = async () => {
        const { username, full_name, kindergarten_name, group_id, role } = modalState.formData;

        // Валідація логіну
        if (!username || !username.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть логін',
            });
            return;
        }

        // Валідація ПІБ
        if (!full_name.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть ПІБ',
            });
            return;
        }

        // Валідація садочка
        if (!kindergarten_name || !kindergarten_name.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, оберіть садочок',
            });
            return;
        }

        try {
            setModalState(prev => ({ ...prev, loading: true }));

            if (modalState.mode === 'create') {
                await fetchFunction('api/kindergarten/admins', {
                    method: 'POST',
                    data: {
                        username: username.trim(),
                        full_name: full_name.trim(),
                        kindergarten_name: typeof kindergarten_name === 'string' 
                            ? kindergarten_name.trim() 
                            : kindergarten_name,
                        group_id: group_id || null,
                        role: role
                    }
                });

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: 'Адміністратора успішно створено',
                });
            } else {
                await fetchFunction(`api/kindergarten/admins/${modalState.formData.id}`, {
                    method: 'PUT',
                    data: {
                        username: username.trim(),
                        full_name: full_name.trim(),
                        kindergarten_name: typeof kindergarten_name === 'string' 
                            ? kindergarten_name.trim() 
                            : kindergarten_name,
                        group_id: group_id || null,
                        role: role
                    }
                });

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: 'Дані адміністратора успішно оновлено',
                });
            }

            closeModal();
            
            retryFetch('api/kindergarten/admins/filter', {
                method: 'post',
                data: stateAdmins.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося зберегти дані',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Видалення
    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цього адміністратора?')) {
            return;
        }

        try {
            await fetchFunction(`api/kindergarten/admins/${id}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Адміністратора успішно видалено',
            });

            retryFetch('api/kindergarten/admins/filter', {
                method: 'post',
                data: stateAdmins.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити адміністратора',
            });
        }
    };

    const columns = useMemo(() => {
        const columns = [
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'full_name' ? 'active' : ''}`}
                        onClick={() => handleSort('full_name')}
                    >
                        <span>ПІБ вихователя</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('full_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'full_name',
                key: 'full_name',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'username' ? 'active' : ''}`}
                        onClick={() => handleSort('username')}
                    >
                        <span>Логін</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('username')}
                        </div>
                    </div>
                ),
                dataIndex: 'username',
                key: 'username',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'kindergarten_name' ? 'active' : ''}`}
                        onClick={() => handleSort('kindergarten_name')}
                    >
                        <span>Назва садочка</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('kindergarten_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'kindergarten_name',
                key: 'kindergarten_name',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'group_name' ? 'active' : ''}`}
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
                render: (group_name) => {
                    return <span>{group_name || '-'}</span>;
                }
            },
            {
                title: 'Роль',
                dataIndex: 'role',
                key: 'role',
                render: (role) => {
                    const roleLabel = role === 'educator' ? 'Вихователь' : 'Адміністратор';
                    return <span>{roleLabel}</span>;
                }
            },
            {
                title: 'Дії',
                key: 'actions',
                render: (_, record) => (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Button
                            title="Редагувати"
                            icon={editIcon}
                            size="small"
                            className="btn--primary"
                            onClick={() => openEditModal(record)}
                        >
                            Редагувати
                        </Button>
                        <Button
                            title="Видалити"
                            icon={deleteIcon}
                            size="small"
                            className="btn--danger"
                            onClick={() => handleDelete(record.id)}
                        >
                            Видалити
                        </Button>
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateAdmins.sendData.sort_by, stateAdmins.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                username: el.username,
                full_name: el.full_name,
                kindergarten_name: el.kindergarten_name,
                group_id: el.group_id,
                group_name: el.group_name,
                role: el.role,
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateAdmins.sendData.limit !== 16) {
                    setStateAdmins(prevState => ({
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
                if (stateAdmins.sendData.limit !== 32) {
                    setStateAdmins(prevState => ({
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
                if (stateAdmins.sendData.limit !== 48) {
                    setStateAdmins(prevState => ({
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
    ];

    const filterHandleClick = () => {
        setStateAdmins(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateAdmins(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateAdmins.selectData).some(value => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== '' && value !== null && value !== undefined;
        });
    }, [stateAdmins.selectData]);

    const onHandleChange = useCallback((field, value) => {
        setStateAdmins(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [field]: value,
            }
        }))
    }, [])

    const resetFilter = () => {
        setStateAdmins(prevState => ({
            ...prevState,
            selectData: {},
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: 'id',
                sort_direction: 'desc',
            }
        }))
    }

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateAdmins.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        })
        if (isAnyInputFilled) {
            const dataValidation = validateFilters(stateAdmins.selectData)
            if (!dataValidation.error) {
                setStateAdmins(prevState => ({
                    ...prevState,
                    sendData: {
                        ...dataValidation,
                        limit: prevState.sendData.limit,
                        page: 1,
                        sort_by: prevState.sendData.sort_by,
                        sort_direction: prevState.sendData.sort_direction,
                    }
                }))
            } else {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Помилка',
                    message: dataValidation.message ?? 'Щось пішло не так.',
                })
            }
        }
    }

    const onPageChange = useCallback((page) => {
        if (stateAdmins.sendData.page !== page) {
            setStateAdmins(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateAdmins.sendData.page])

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}

            {status === STATUS.SUCCESS && (
                <>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="title title--sm">
                                {data?.items?.length ? (
                                    <>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </>
                                ) : (
                                    <>Записів не знайдено</>
                                )}
                            </h2>

                            <div className="table-header__buttons">
                                <Button
                                    onClick={openCreateModal}
                                    icon={addIcon}
                                    className="btn--primary"
                                >
                                    Додати працівника
                                </Button>
                                
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    caption={`Записів: ${stateAdmins.sendData.limit}`}
                                    menu={itemMenu}
                                />
                                
                                <Button
                                    className={classNames("table-filter-trigger", {
                                        "has-active-filters": hasActiveFilters
                                    })}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}
                                >
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateAdmins.selectData).filter(key => stateAdmins.selectData[key]).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={stateAdmins.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateAdmins.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilter}
                                    searchIcon={searchIcon}
                                    title="Фільтри адміністраторів"
                                >
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Логін</label>
                                        <Input
                                            icon={searchIcon}
                                            name="username"
                                            type="text"
                                            placeholder="Введіть логін"
                                            value={stateAdmins.selectData?.username || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">ПІБ</label>
                                        <Input
                                            icon={searchIcon}
                                            name="full_name"
                                            type="text"
                                            placeholder="Введіть ПІБ"
                                            value={stateAdmins.selectData?.full_name || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Назва садочка</label>
                                        <Input
                                            icon={searchIcon}
                                            name="kindergarten_name"
                                            type="text"
                                            placeholder="Введіть назву садочка"
                                            value={stateAdmins.selectData?.kindergarten_name || ''}
                                            onChange={onHandleChange}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Роль</label>
                                        <Select
                                            name="role"
                                            placeholder="Оберіть роль"
                                            value={
                                                stateAdmins.selectData.role
                                                    ? ROLE_OPTIONS.find(opt => opt.value === stateAdmins.selectData.role)
                                                    : null
                                            }
                                            options={[
                                                { value: '', label: 'Всі ролі' },
                                                ...ROLE_OPTIONS
                                            ]}
                                            onChange={(name, selected) => {
                                                const value = selected?.value || '';
                                                onHandleChange('role', value);
                                            }}
                                            style={dropDownStyle}
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
                                    <Table columns={columns} dataSource={tableData} />
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={Number(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateAdmins.sendData.limit}
                                    onPageChange={onPageChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ✅ ОНОВЛЕНО: Модальне вікно з полем для групи */}
                    <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                        {state => (
                            <Modal
                                ref={modalNodeRef}
                                className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                                onClose={closeModal}
                                onOk={handleSave}
                                confirmLoading={modalState.loading}
                                cancelText="Скасувати"
                                okText={modalState.mode === 'create' ? 'Створити' : 'Зберегти'}
                                title={modalState.mode === 'create' ? 'Додати працівника' : 'Редагувати адміністратора'}
                            >
                                <div className="modal-input-wrapper">
                                    <div className="modal-input-item">
                                        <h4 className="input-description">Логін <span style={{color: 'red'}}>*</span></h4>
                                        <Input
                                            placeholder="Введіть логін (латиницею)"
                                            name="username"
                                            value={modalState.formData.username}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">ПІБ вихователя</h4>
                                        <Input
                                            placeholder="Введіть ПІБ"
                                            name="full_name"
                                            value={modalState.formData.full_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">Назва садочка <span style={{color: 'red'}}>*</span></h4>
                                        <Select
                                            placeholder={kindergartensData.length > 0 ? "Оберіть садочок" : "Завантаження..."}
                                            name="kindergarten_name"
                                            options={kindergartensData}
                                            value={modalState.formData.kindergarten_name ? 
                                                kindergartensData.find(k => k.value === modalState.formData.kindergarten_name) || null
                                                : null
                                            }
                                            onChange={(name, option) => handleSelectChange(name, option?.value || null)}
                                            style={dropDownStyle}
                                            required
                                        />
                                    </div>

                                    {/* ✅ НОВЕ ПОЛЕ - Група */}
                                        <div className="modal-input-item">
                                            <h4 className="input-description">Група</h4>
                                            <Select
                                                placeholder={loadingGroups ? "Завантаження..." : "Оберіть групу"}
                                                name="group_id"
                                                options={groupOptions}
                                                value={modalState.formData.group_id ? 
                                                    groupOptions.find(g => g.value === modalState.formData.group_id) || null
                                                    : null
                                                }
                                                onChange={(name, option) => {
                                                    console.log('🟣 Select групи:', { name, option, value: option?.value });
                                                    handleSelectChange(name, option?.value || null);
                                                }}
                                                style={dropDownStyle}
                                                disabled={!modalState.formData.kindergarten_name || loadingGroups}
                                            />
                                            {modalState.formData.kindergarten_name && (
                                                <p style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                                                    Показуються тільки групи вибраного садочка
                                                </p>
                                            )}
                                        </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">Роль</h4>
                                        <Select
                                            placeholder="Оберіть роль"
                                            options={ROLE_OPTIONS}
                                            value={ROLE_OPTIONS.find(opt => opt.value === modalState.formData.role) || null}
                                            onChange={(name, option) => handleSelectChange(name, option?.value || "educator")}
                                            style={dropDownStyle}
                                            required
                                        />
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </Transition>
                </>
            )}
        </>
    );
};

export default Admins;