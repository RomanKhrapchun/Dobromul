import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import classNames from "classnames";
import Pagination from "../../components/common/Pagination/Pagination";
import Input from "../../components/common/Input/Input";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import Modal from "../../components/common/Modal/Modal";
import {Transition} from 'react-transition-group';
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Badge from "../../components/common/Badge/Badge";
import {getMockServiceProvidersData} from "../../utils/mockServiceProvidersData";
import { QRCodeSVG } from 'qrcode.react';

const addIcon = generateIcon(iconMap.add)
const filterIcon = generateIcon(iconMap.filter)
const searchIcon = generateIcon(iconMap.search, 'input-icon')
const dropDownIcon = generateIcon(iconMap.arrowDown)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const phoneIcon = generateIcon(iconMap.phone, null, 'currentColor', 20, 20)
const copyIcon = generateIcon(
    <path d="M8 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-3V3a1 1 0 00-1-1H8zm-1 2h4v1h-4V4zM4 6h10v10H4V6z"/>,
    null, 'currentColor', 20, 20
)
const qrIcon = generateIcon(
    <path d="M3 3h5v5H3V3zm2 2v1h1V5H5zM3 12h5v5H3v-5zm2 2v1h1v-1H5zM12 3h5v5h-5V3zm2 2v1h1V5h-1zM11 11h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"/>,
    null, 'currentColor', 20, 20
)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const TRAVELTAX_BASE_URL = import.meta.env.VITE_TRAVELTAX_BASE_URL

const ServiceProvidersList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const [state, setState] = useState({
        isOpen: false,
        confirmLoading: false,
        deletedItemId: null,
        contactInfoModal: {
            isOpen: false,
            contactData: null,
        },
        qrModal: {
            isOpen: false,
            qrData: null,
        },
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
            sort_by: null,
            sort_direction: null,
        }
    })
    const nodeRef = useRef(null)
    const contactInfoNodeRef = useRef(null)
    const qrModalNodeRef = useRef(null)
    const isFirstRun = useRef(true)
    const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_MENU === 'true'
    const [mockData, setMockData] = useState(null)
    const [mockStatus, setMockStatus] = useState(STATUS.IDLE)
    
    const {error, status, data, retryFetch} = useFetch('api/touristtax/service-providers/filter', {
        method: 'post',
        data: state.sendData
    })

    const shouldUseMock = USE_MOCK_DATA || (error?.status === 404 || status === STATUS.ERROR)

    useEffect(() => {
        if (shouldUseMock && (status === STATUS.ERROR || error?.status === 404)) {
            const loadMockData = async () => {
                setMockStatus(STATUS.PENDING)
                try {
                    const response = await getMockServiceProvidersData(
                        state.sendData.page, 
                        state.sendData.limit,
                        state.sendData.sort_by,
                        state.sendData.sort_direction
                    )
                    setMockData(response.data)
                    setMockStatus(STATUS.SUCCESS)
                } catch (err) {
                    setMockStatus(STATUS.ERROR)
                }
            }
            loadMockData()
        }
    }, [status, error, shouldUseMock, state.sendData.page, state.sendData.limit, state.sendData.sort_by, state.sendData.sort_direction])

    useEffect(() => {
        if (shouldUseMock && mockData && (status === STATUS.ERROR || error?.status === 404)) {
            const loadMockData = async () => {
                setMockStatus(STATUS.PENDING)
                try {
                    const response = await getMockServiceProvidersData(
                        state.sendData.page, 
                        state.sendData.limit,
                        state.sendData.sort_by,
                        state.sendData.sort_direction
                    )
                    setMockData(response.data)
                    setMockStatus(STATUS.SUCCESS)
                } catch (err) {
                    setMockStatus(STATUS.ERROR)
                }
            }
            loadMockData()
        }
    }, [state.sendData.page, state.sendData.limit, state.sendData.sort_by, state.sendData.sort_direction, shouldUseMock])

    const displayData = shouldUseMock && (status === STATUS.ERROR || error?.status === 404) ? mockData : data
    const displayStatus = shouldUseMock && (status === STATUS.ERROR || error?.status === 404) ? mockStatus : status

    const startRecord = ((state.sendData.page || 1) - 1) * state.sendData.limit + 1;
    const endRecord = Math.min(startRecord + state.sendData.limit - 1, displayData?.totalItems || 1);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        if (!USE_MOCK_DATA) {
            console.debug('ServiceProvidersList: retryFetch will be called with sendData:', state.sendData)
            retryFetch('api/touristtax/service-providers/filter', {
                method: 'post',
                data: state.sendData,
            })
        }
    }, [state.sendData, retryFetch, USE_MOCK_DATA])

    const handleOpenModal = (recordId) => {
        setState(prevState => ({
            ...prevState,
            deletedItemId: recordId,
        }))
        document.body.style.overflow = 'hidden'
    }

    const handleCloseModal = () => {
        setState(prevState => ({
            ...prevState,
            deletedItemId: null,
        }))
        document.body.style.overflow = 'auto';
    }

    const handleContactInfo = (id) => {
        const sourceData = shouldUseMock && (status === STATUS.ERROR || error?.status === 404) ? mockData : data
        const contactData = sourceData?.items?.find(item => item.id === id)
        
        if (contactData) {
            setState(prevState => ({
                ...prevState,
                contactInfoModal: {
                    isOpen: true,
                    contactData: contactData,
                }
            }))
            document.body.style.overflow = 'hidden'
        }
    }

    const handleCloseContactInfoModal = () => {
        setState(prevState => ({
            ...prevState,
            contactInfoModal: {
                isOpen: false,
                contactData: null,
            }
        }))
        document.body.style.overflow = 'auto'
    }

    const handleCopyLink = async (hostName) => {
        try {
            // Обгортаємо в лапки та замінюємо тільки пробіли на %20
            const encodedName = `"${hostName}"`.replace(/\s/g, '%20');
            const link = `${TRAVELTAX_BASE_URL}/?name=${encodedName}`;
            await navigator.clipboard.writeText(link)
            notification({
                type: 'success',
                title: 'Успіх',
                message: 'Посилання скопійовано в буфер обміну',
                placement: 'top',
            })
        } catch (error) {
            notification({
                type: 'warning',
                title: 'Помилка',
                message: 'Не вдалося скопіювати посилання',
                placement: 'top',
            })
        }
    }

    const handleGenerateQR = (hostName) => {
        // Обгортаємо в лапки та замінюємо тільки пробіли на %20
        const encodedName = `"${hostName}"`.replace(/\s/g, '%20');
        const link = `${TRAVELTAX_BASE_URL}/?name=${encodedName}`;
        setState(prevState => ({
            ...prevState,
            qrModal: {
                isOpen: true,
                qrData: {
                    hostName: hostName,
                    link: link,
                }
            }
        }))
        document.body.style.overflow = 'hidden'
    }

    const handleCloseQRModal = () => {
        setState(prevState => ({
            ...prevState,
            qrModal: {
                isOpen: false,
                qrData: null,
            }
        }))
        document.body.style.overflow = 'auto'
    }

    const handleSort = useCallback((dataIndex) => {
        setState(prevState => {
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
        if (state.sendData.sort_by !== dataIndex) {
            return null;
        }
        return state.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
    }, [state.sendData.sort_by, state.sendData.sort_direction]);

    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: state.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('Назва локації', 'location_name'),
            createSortableColumn('Тип', 'type'),
            createSortableColumn('К-сть місць', 'places'),
            createSortableColumn('Хост', 'host_name'),
            createSortableColumn('ІПН хоста', 'host_ipn'),
            {
                title: 'Дія', 
                dataIndex: 'action',
                headerClassName: 'non-sortable',
                render: (_, {id, host_name}) => (
                    <div className="btn-sticky" style={{justifyContent:'center'}}>
                        <Button
                            title="Контактна інформація"
                            icon={phoneIcon}
                            onClick={() => handleContactInfo(id)}/>
                        <Button
                            title="Копіювати посилання"
                            icon={copyIcon}
                            onClick={() => handleCopyLink(host_name)}/>
                        <Button
                            title="Згенерувати QR"
                            icon={qrIcon}
                            onClick={() => handleGenerateQR(host_name)}/>
                    </div>
                ),
            }
        ]
    }, [handleSort, getSortIcon, state.sendData.sort_by, handleContactInfo, handleCopyLink, handleGenerateQR])

    const tableData = useMemo(() => {
        const sourceData = shouldUseMock && (status === STATUS.ERROR || error?.status === 404) ? mockData : data
        if (sourceData?.items?.length) {
            return sourceData.items.map(el => ({
                key: el.id,
                id: el.id,
                location_name: el.location_name,
                type: el.type,
                places: el.places,
                host_name: el.host_name,
                host_ipn: el.host_ipn,
                location_address: el.location_address,
                host_legal_address: el.host_legal_address,
                host_phone: el.host_phone,
                reception_phone: el.reception_phone,
                website: el.website,
                social_links: el.social_links,
            }))
        }
        return []
    }, [data, mockData, shouldUseMock, status, error])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (state.sendData.limit !== 16) {
                    setState(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 16,
                            page: 1,
                            sort_by: prevState.sendData.sort_by,
                            sort_direction: prevState.sendData.sort_direction,
                        }
                    }))
                }
            },
        },
        {
            label: '32',
            key: '32',
            onClick: () => {
                if (state.sendData.limit !== 32) {
                    setState(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 32,
                            page: 1,
                            sort_by: prevState.sendData.sort_by,
                            sort_direction: prevState.sendData.sort_direction,
                        }
                    }))
                }
            },
        },
        {
            label: '48',
            key: '48',
            onClick: () => {
                if (state.sendData.limit !== 48) {
                    setState(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 48,
                            page: 1,
                            sort_by: prevState.sendData.sort_by,
                            sort_direction: prevState.sendData.sort_direction,
                        }
                    }))
                }
            },
        },
    ]

    const filterHandleClick = () => {
        setState(prevState => ({
            ...prevState,
            isOpen: !prevState.isOpen,
        }))
    }

    const addHandleClick = () => {
        navigate('/touristtax/service-providers/add')
    }

    const onHandleChange = (name, value) => {
        setState(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    }

    const resetFilters = () => {
        if (Object.values(state.selectData).some(value => value)) {
            setState(prevState => ({
                ...prevState,
                selectData: {},
            }));
        }
        const dataReadyForSending = hasOnlyAllowedParams(state.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])
        if (!dataReadyForSending) {
            setState(prevState => ({
                ...prevState,
                sendData: {
                    limit: prevState.sendData.limit,
                    page: 1,
                    sort_by: prevState.sendData.sort_by,
                    sort_direction: prevState.sendData.sort_direction,
                }
            }))
        }
    }

    const applyFilter = () => {
        console.debug('ServiceProvidersList: applyFilter called, selectData:', state.selectData)
        const isAnyInputFilled = Object.values(state.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        })
        console.debug('ServiceProvidersList: isAnyInputFilled ->', isAnyInputFilled)
        if (isAnyInputFilled) {
            const dataValidation = validateFilters(state.selectData)
            if (!dataValidation.error) {
                // Remove internal `error` flag returned by validateFilters
                const { error, ...validated } = dataValidation || {}
                const prepared = { ...validated }
                if (prepared.name) {
                    prepared.title = prepared.name
                    delete prepared.name
                }
                console.debug('ServiceProvidersList: applying filters, prepared payload:', prepared)

                const payload = {
                    ...prepared,
                    limit: state.sendData.limit,
                    page: 1,
                    sort_by: state.sendData.sort_by,
                    sort_direction: state.sendData.sort_direction,
                }

                console.debug('ServiceProvidersList: About to update sendData with:', payload)
                
                // Update UI state (close filter) — setState will trigger the main useEffect that calls retryFetch
                setState(prevState => ({
                    ...prevState,
                    sendData: payload,
                    isOpen: false,
                }))

                // Show visible notification with the prepared filter
                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Фільтр застосовано',
                    message: `Фільтр: ${JSON.stringify(prepared)}`,
                    duration: 2,
                })
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
        if (state.sendData.page !== page) {
            setState(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [state.sendData.page])

    const handleOk = async () => {
        if (state.deletedItemId) {
            try {
                setState(prevState => ({
                    ...prevState,
                    confirmLoading: true,
                }))
                const fetchData = await fetchFunction(`api/touristtax/service-providers/${state.deletedItemId}`, {
                    method: 'delete',
                })
                notification({
                    placement: "top",
                    duration: 2,
                    title: 'Успіх',
                    message: fetchData.data,
                    type: 'success'
                })
                const currentPage = state.sendData.page;
                const isLastItemOnPage = data?.items?.length === 1;
                const newPage = isLastItemOnPage && currentPage > 1 ? currentPage - 1 : currentPage;
                setState(prevState => ({
                    ...prevState,
                    sendData: {
                        ...prevState.sendData,
                        page: newPage,
                        sort_by: prevState.sendData.sort_by,
                        sort_direction: prevState.sendData.sort_direction,
                    }
                }))

            } catch (error) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: error?.response?.data?.message ? error.response.data.message : error.message,
                    placement: 'top',
                })
                if (error?.response?.status === 401) {
                    store.logOff()
                    return navigate('/')
                }
            } finally {
                setState(prevState => ({
                    ...prevState,
                    confirmLoading: false,
                    deletedItemId: null,
                }))
                document.body.style.overflow = 'auto';
            }
        }
    }

    if (displayStatus === STATUS.ERROR && !shouldUseMock) {
        return <PageError title={error.message} statusError={error.status}/>
    }

    return (
        <div className="page-container">
            <div className="page-container__header">
                <div className="page-container__header-title">
                    <h1>Реєстр надавачів послуг</h1>
                </div>
            </div>
            <div className="page-container__content">
                {displayStatus === STATUS.PENDING ? <SkeletonPage/> : null}
                {displayStatus === STATUS.SUCCESS ?
                    <React.Fragment>
                        <div className="table-elements">
                            <div className="table-header">
                                <h2 className="title title--sm">
                                    {displayData?.items && Array.isArray(displayData?.items) && displayData?.items.length > 0 ?
                                        <React.Fragment>
                                            Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {displayData?.totalItems || 1}
                                        </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                    }
                                </h2>
                                <div className="table-header__buttons">
                                    <Button
                                        icon={addIcon}
                                        onClick={addHandleClick}>
                                        Додати
                                    </Button>
                                    <Dropdown
                                        icon={dropDownIcon}
                                        iconPosition="right"
                                        style={dropDownStyle}
                                        childStyle={childDropDownStyle}
                                        caption={`Записів: ${state.sendData.limit}`}
                                        menu={itemMenu}/>
                                    <Button
                                        className="table-filter-trigger"
                                        onClick={filterHandleClick}
                                        icon={filterIcon}>
                                        Фільтри
                                    </Button>
                                </div>
                            </div>
                            <div className="table-main">
                                <div style={{width: `${displayData?.items?.length > 0 ? 'auto' : '100%'}`}}
                                     className={classNames("table-and-pagination-wrapper", {"table-and-pagination-wrapper--active": state.isOpen})}>
                                    <div className="table-wrapper">
                                        <Table columns={columnTable} dataSource={tableData}/>
                                    </div>
                                    <Pagination
                                        className="m-b"
                                        currentPage={parseInt(displayData?.currentPage) || 1}
                                        totalCount={displayData?.totalItems || 1}
                                        pageSize={state.sendData.limit}
                                        onPageChange={onPageChange}/>
                                </div>
                                <div className={`table-filter ${state.isOpen ? "table-filter--active" : ""}`}>
                                    <h3 className="title title--sm">
                                        Фільтри
                                    </h3>
                                    <div className="btn-group">
                                        <Button onClick={applyFilter}>
                                            Застосувати
                                        </Button>
                                        <Button className="btn--secondary" onClick={resetFilters}>
                                            Скинути
                                        </Button>
                                    </div>
                                    <div className="table-filter__item">
                                        <Input
                                            id="service-provider-name"
                                            aria-label="Назва надавача послуг"
                                            autoComplete="organization"
                                            icon={searchIcon}
                                            name="name"
                                            type="text"
                                            placeholder="Введіть назву надавача послуг"
                                            value={state.selectData?.name || ''}
                                            onChange={onHandleChange}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </React.Fragment> : null
                }
                <Transition in={!!state.deletedItemId} timeout={200} unmountOnExit nodeRef={nodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={handleCloseModal}
                            onOk={handleOk}
                            confirmLoading={state.confirmLoading}
                            cancelText="Скасувати"
                            okText="Так, вилучити"
                            title="Підтвердження видалення">
                            <p className="paragraph">
                                Ви впевнені, що бажаєте виконати операцію &quot;Видалення&quot;?
                            </p>
                        </Modal>
                    )}
                </Transition>
                <Transition in={state.contactInfoModal.isOpen} timeout={200} unmountOnExit nodeRef={contactInfoNodeRef}>
                    {transitionState => {
                        const contactData = state.contactInfoModal.contactData
                        return (
                            <Modal
                                className={`${transitionState === 'entered' ? "modal-window-wrapper--active" : ""}`}
                                onClose={handleCloseContactInfoModal}
                                cancelText="Закрити"
                                title="Контактна інформація">
                                {contactData && (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0'}}>
                                        <div>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333'}}>
                                                Адреса закладу:
                                            </h4>
                                            <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
                                                {contactData.location_address || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333'}}>
                                                Юридична адреса Хоста:
                                            </h4>
                                            <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
                                                {contactData.host_legal_address || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333'}}>
                                                Контактний телефон Хоста:
                                            </h4>
                                            <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
                                                {contactData.host_phone ? (
                                                    <a href={`tel:${contactData.host_phone}`} style={{color: '#1890ff', textDecoration: 'none'}}>
                                                        {contactData.host_phone}
                                                    </a>
                                                ) : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333'}}>
                                                Телефон рецепції:
                                            </h4>
                                            <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
                                                {contactData.reception_phone ? (
                                                    <a href={`tel:${contactData.reception_phone}`} style={{color: '#1890ff', textDecoration: 'none'}}>
                                                        {contactData.reception_phone}
                                                    </a>
                                                ) : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333'}}>
                                                Посилання:
                                            </h4>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                {contactData.website ? (
                                                    <div>
                                                        <span style={{fontSize: '12px', color: '#999', marginRight: '8px'}}>Сайт:</span>
                                                        <a 
                                                            href={contactData.website} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{color: '#1890ff', textDecoration: 'none', fontSize: '14px'}}
                                                        >
                                                            {contactData.website}
                                                        </a>
                                                    </div>
                                                ) : null}
                                                {contactData.social_links && Array.isArray(contactData.social_links) && contactData.social_links.length > 0 ? (
                                                    contactData.social_links.map((link, index) => (
                                                        <div key={index}>
                                                            <span style={{fontSize: '12px', color: '#999', marginRight: '8px'}}>Соцмережа:</span>
                                                            <a 
                                                                href={link.url || link} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                style={{color: '#1890ff', textDecoration: 'none', fontSize: '14px'}}
                                                            >
                                                                {link.name || link.url || link}
                                                            </a>
                                                        </div>
                                                    ))
                                                ) : contactData.social_links && typeof contactData.social_links === 'string' ? (
                                                    <div>
                                                        <span style={{fontSize: '12px', color: '#999', marginRight: '8px'}}>Соцмережа:</span>
                                                        <a 
                                                            href={contactData.social_links} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{color: '#1890ff', textDecoration: 'none', fontSize: '14px'}}
                                                        >
                                                            {contactData.social_links}
                                                        </a>
                                                    </div>
                                                ) : null}
                                                {(!contactData.website && (!contactData.social_links || (Array.isArray(contactData.social_links) && contactData.social_links.length === 0))) && (
                                                    <p style={{margin: 0, fontSize: '14px', color: '#666'}}>—</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Modal>
                        )
                    }}
                </Transition>
                <Transition in={state.qrModal.isOpen} timeout={200} unmountOnExit nodeRef={qrModalNodeRef}>
                    {transitionState => {
                        const qrData = state.qrModal.qrData
                        return (
                            <Modal
                                className={`${transitionState === 'entered' ? "modal-window-wrapper--active" : ""}`}
                                onClose={handleCloseQRModal}
                                cancelText="Закрити"
                                title="QR код">
                                {qrData && (
                                    <div style={{
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        gap: '20px', 
                                        padding: '20px 0'
                                    }}>
                                        <QRCodeSVG 
                                            value={qrData.link}
                                            size={256}
                                            level="H"
                                            includeMargin={true}
                                        />
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            maxWidth: '400px'
                                        }}>
                                            <p style={{
                                                margin: 0, 
                                                fontSize: '14px', 
                                                color: '#666',
                                                textAlign: 'center',
                                                wordBreak: 'break-all',
                                                padding: '0 20px'
                                            }}>
                                                {qrData.link}
                                            </p>
                                            <Button
                                                title="Копіювати посилання"
                                                icon={copyIcon}
                                                onClick={() => handleCopyLink(qrData.hostName)}
                                                style={{marginTop: '10px'}}
                                            >
                                                Копіювати посилання
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Modal>
                        )
                    }}
                </Transition>
            </div>
        </div>
    )
}

export default ServiceProvidersList;