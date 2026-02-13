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
import {getMockTouristRegistryData} from "../../utils/mockTouristRegistryData";

const filterIcon = generateIcon(iconMap.filter)
const searchIcon = generateIcon(iconMap.search, 'input-icon')
const dropDownIcon = generateIcon(iconMap.arrowDown)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const TouristRegistryList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const [state, setState] = useState({
        isOpen: false,
        confirmLoading: false,
        deletedItemId: null,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
            sort_by: null,
            sort_direction: null,
        }
    })
    const nodeRef = useRef(null)
    const isFirstRun = useRef(true)
    const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_MENU === 'true'
    const [mockData, setMockData] = useState(null)
    const [mockStatus, setMockStatus] = useState(STATUS.IDLE)
    
    const {error, status, data, retryFetch} = useFetch('api/touristtax/tourist-registry', {
        method: 'post',
        data: state.sendData
    })

    const shouldUseMock = USE_MOCK_DATA || (error?.status === 404 || status === STATUS.ERROR)

    useEffect(() => {
        if (shouldUseMock && (status === STATUS.ERROR || error?.status === 404)) {
            const loadMockData = async () => {
                setMockStatus(STATUS.PENDING)
                try {
                    const response = await getMockTouristRegistryData(
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
                    const response = await getMockTouristRegistryData(
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
            retryFetch('api/touristtax/tourist-registry', {
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

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatAmount = (amount) => {
        if (amount == null) return '—';
        return `${amount.toFixed(2)} ₴`;
    };

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
            createSortableColumn('Хост', 'host_name'),
            createSortableColumn('ПІБ туриста', 'full_name'),
            createSortableColumn('Дата поселення', 'arrival', (_, record) => formatDate(record.arrival)),
            createSortableColumn('Дата вибуття', 'departure', (_, record) => formatDate(record.departure)),
            createSortableColumn('К-сть ночей', 'rental_days'),
            createSortableColumn('Сума збору', 'tax', (_, record) => formatAmount(record.tax)),
            createSortableColumn('Сплата', 'is_paid', (_, record) => (
                record.is_paid ? 'Так' : 'Ні'
            )),
        ]
    }, [handleSort, getSortIcon, state.sendData.sort_by])

    const tableData = useMemo(() => {
        const sourceData = shouldUseMock && (status === STATUS.ERROR || error?.status === 404) ? mockData : data
        if (sourceData?.items?.length) {
            return sourceData.items.map(el => ({
                key: el.id,
                id: el.id,
                host_name: el.host_name,
                full_name: el.full_name,
                arrival: el.arrival,
                departure: el.departure,
                rental_days: el.rental_days,
                tax: el.tax,
                is_paid: el.is_paid,
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
        const isAnyInputFilled = Object.values(state.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
        if (isAnyInputFilled) {
            const dataValidation = validateFilters(state.selectData)
            if (!dataValidation.error) {
                // Remove internal `error` flag returned by validateFilters
                const { error, ...validated } = dataValidation || {}
                const prepared = { ...validated }
                
                const payload = {
                    ...prepared,
                    limit: state.sendData.limit,
                    page: 1,
                    sort_by: state.sendData.sort_by,
                    sort_direction: state.sendData.sort_direction,
                }

                setState(prevState => ({
                    ...prevState,
                    sendData: payload,
                    isOpen: false,
                }))

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Фільтр застосовано',
                    message: `Застосовано ${Object.keys(prepared).filter(k => !['limit', 'page', 'sort_by', 'sort_direction'].includes(k)).length} фільтр(ів)`,
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
                const fetchData = await fetchFunction(`api/touristtax/tourist-registry/${state.deletedItemId}`, {
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

    // const handleTestValidation = async () => {
    //     const testCases = [
    //         {
    //             name: '✅ Валідний запит',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист Валідний",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: true
    //         },
    //         {
    //             name: '❌ Відсутній host_name',
    //             data: {
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Відсутній full_name',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Відсутній arrival',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Відсутній departure',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Відсутній rental_days',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Відсутній tax',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Невірний формат дати arrival (YYYY/MM/DD)',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024/12/01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Невірний формат дати departure (DD.MM.YYYY)',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "05.12.2024",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ departure раніше за arrival (rental_days = 0)',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-05",
    //                 departure: "2024-12-01",
    //                 rental_days: 0,
    //                 tax: 0
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Неіснуючий host_name',
    //             data: {
    //                 host_name: "Неіснуючий Хост 12345",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Негативний tax',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: -10
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Негативний rental_days',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: -5,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ rental_days = 0 (менше мінімуму)',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-01",
    //                 rental_days: 0,
    //                 tax: 0
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Пустий host_name',
    //             data: {
    //                 host_name: "",
    //                 full_name: "Тестовий Турист",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '❌ Пустий full_name',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00
    //             },
    //             shouldSucceed: false
    //         },
    //         {
    //             name: '✅ Валідний запит з усіма полями',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист З Полями",
    //                 arrival: "2024-12-01",
    //                 departure: "2024-12-05",
    //                 rental_days: 4,
    //                 tax: 60.00,
    //                 is_paid: true
    //             },
    //             shouldSucceed: true
    //         },
    //         {
    //             name: '✅ Валідний запит з мінімальними полями',
    //             data: {
    //                 host_name: "Петренко Іван Васильович",
    //                 full_name: "Тестовий Турист Мінімальний",
    //                 arrival: "2024-12-10",
    //                 departure: "2024-12-15",
    //                 rental_days: 5,
    //                 tax: 75.00
    //             },
    //             shouldSucceed: true
    //         }
    //     ];

    //     let successCount = 0;
    //     let failCount = 0;
    //     const results = [];

    //     notification({
    //         type: 'info',
    //         title: 'Тестування валідації',
    //         message: `Почато тестування ${testCases.length} випадків...`,
    //         placement: 'top',
    //         duration: 3
    //     });

    //     for (const testCase of testCases) {
    //         try {
    //             const response = await fetchFunction('api/touristtax/tourist-registry/create', {
    //                 method: 'post',
    //                 data: testCase.data
    //             });

    //             if (testCase.shouldSucceed) {
    //                 successCount++;
    //                 results.push(`✅ ${testCase.name} - Успіх`);
    //             } else {
    //                 failCount++;
    //                 results.push(`❌ ${testCase.name} - Помилка: очікувалась помилка, але запит пройшов успішно`);
    //             }
    //         } catch (error) {
    //             if (!testCase.shouldSucceed) {
    //                 successCount++;
    //                 const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error.message;
    //                 results.push(`✅ ${testCase.name} - Очікувана помилка: ${errorMessage}`);
    //             } else {
    //                 failCount++;
    //                 const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error.message;
    //                 results.push(`❌ ${testCase.name} - Неочікувана помилка: ${errorMessage}`);
    //             }
    //         }
            
    //         // Невелика затримка між запитами
    //         await new Promise(resolve => setTimeout(resolve, 200));
    //     }

    //     // Показуємо результати
    //     const resultMessage = `Тестування завершено!\n\nУспішних: ${successCount}/${testCases.length}\nПомилок: ${failCount}/${testCases.length}\n\nДеталі:\n${results.join('\n')}`;
        
    //     notification({
    //         type: successCount === testCases.length ? 'success' : 'warning',
    //         title: 'Результати тестування',
    //         message: resultMessage,
    //         placement: 'top',
    //         duration: 10
    //     });

    //     // Також виводимо в консоль для детального перегляду
    //     console.log('🧪 Результати тестування валідації:');
    //     console.log(`Успішних: ${successCount}/${testCases.length}`);
    //     console.log(`Помилок: ${failCount}/${testCases.length}`);
    //     results.forEach(result => console.log(result));
    // }

    if (displayStatus === STATUS.ERROR && !shouldUseMock) {
        return <PageError title={error.message} statusError={error.status}/>
    }

    return (
        <div className="page-container">
            <div className="page-container__header">
                <div className="page-container__header-title">
                    <h1>Реєстр туристів</h1>
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
                                    {/* <Button
                                        className="btn--secondary"
                                        onClick={handleTestValidation}
                                        style={{ marginRight: '8px' }}>
                                        🧪 Тест валідації
                                    </Button> */}
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
                                            icon={searchIcon}
                                            name="host_name"
                                            type="text"
                                            placeholder="Введіть назву хоста"
                                            value={state.selectData?.host_name || ''}
                                            onChange={onHandleChange}/>
                                    </div>
                                    <div className="table-filter__item">
                                        <Input
                                            icon={searchIcon}
                                            name="full_name"
                                            type="text"
                                            placeholder="Введіть ПІБ туриста"
                                            value={state.selectData?.full_name || ''}
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
            </div>
        </div>
    )
}

export default TouristRegistryList;

