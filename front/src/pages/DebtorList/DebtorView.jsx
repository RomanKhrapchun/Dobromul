import React, {useMemo, useState, useRef, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom'
import Button from "../../components/common/Button/Button";
import ViewCard from '../../components/Cards/ViewCard';
import Table from "../../components/common/Table/Table";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import useFetch from "../../hooks/useFetch";
import {generateIcon, iconMap, STATUS} from "../../utils/constants";
import Loader from "../../components/Loader/Loader";
import PageError from "../ErrorPage/PageError";
import SMSSendModal from '../SMS/SMSSendModal';
import { COMMUNITY_NAME } from "../../utils/communityConstants";

const onBackIcon = generateIcon(iconMap.back)
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 16, 16)
const phoneAddIcon = generateIcon(iconMap.add, null, 'currentColor', 14, 14)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 14, 14) // Іконка редагування
const deleteIcon = generateIcon(iconMap.close, null, 'currentColor', 12, 12) // Іконка видалення
// Іконка SMS - використовуємо текст замість іконки
const smsIcon = <span style={{ fontSize: '14px', fontWeight: '600' }}>SMS</span>

const DebtorView = () => {
    const {debtId} = useParams()
    const navigate = useNavigate()
    const nodeRef = useRef(null)
    const phoneNodeRef = useRef(null)
    const smsNodeRef = useRef(null)
    const {error, status, data} = useFetch(`api/debtor/info/${debtId}`)
    
    // Стан для таблиці дзвінків
    const [callsData, setCallsData] = useState([])
    const [callsLoading, setCallsLoading] = useState(false)
    const [callsError, setCallsError] = useState(null)
    
    // Розширений стан для модального вікна дзвінків (додано isEdit та editingCallId)
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        isEdit: false, // Новий флаг для режиму редагування
        editingCallId: null, // ID дзвінка, який редагуємо
        formData: {
            callTime: '',
            topic: ''
        }
    })

    // Стан для модального вікна телефону
    const [phoneModalState, setPhoneModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            phone: ''
        }
    })

    // Стан для модального вікна SMS
    const [smsModalState, setSmsModalState] = useState({
        isOpen: false,
        debtor: null
    })

    // Стан для модального вікна адреси
    const addressNodeRef = useRef(null)
    const [addressModalState, setAddressModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            address: ''
        }
    })

    // Перевірка чи це Добромиль
    const isDobromyl = COMMUNITY_NAME?.toLowerCase() === 'dobromyl'

    // Функція для генерації випадкового номера телефону
    const generateRandomPhone = () => {
        return `Не знайдено номер телефону`;
    };

    // Функції для роботи з датами
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const formatDateTimeForAPI = (dateTimeLocal) => {
        return new Date(dateTimeLocal).toISOString();
    };

    // Функція для перетворення з формату таблиці у формат для input datetime-local
    const formatDateTimeForInput = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Завантаження дзвінків при успішному завантаженні інформації про боржника
    useEffect(() => {
        if (status === STATUS.SUCCESS && debtId) {
            loadCalls();
        }
    }, [status, debtId]);

    // Функція для завантаження дзвінків
    const loadCalls = async () => {
        setCallsLoading(true);
        setCallsError(null);
        
        try {
            const response = await fetch(`/api/debtor/calls/${debtId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const calls = await response.json();
            
            // Конвертуємо дані з сервера в формат для таблиці
            const formattedCalls = calls.map(call => ({
                id: call.id,
                callTime: formatDateTime(call.call_date),
                topic: call.call_topic,
                rawCallDate: call.call_date
            }));
            
            setCallsData(formattedCalls);
        } catch (error) {
            console.error('Error loading calls:', error);
            setCallsError(error.message);
        } finally {
            setCallsLoading(false);
        }
    };

    // Функція для відкриття модального вікна телефону
    const handleOpenPhoneModal = () => {
        setPhoneModalState({
            isOpen: true,
            loading: false,
            formData: {
                phone: ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    // Функція для закриття модального вікна телефону
    const handleClosePhoneModal = () => {
        setPhoneModalState({
            isOpen: false,
            loading: false,
            formData: {
                phone: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    // Функція для збереження номера телефону
    const handleSavePhone = async () => {
        const { formData } = phoneModalState
        
        if (!formData.phone.trim()) {
            alert('Введіть номер телефону')
            return
        }

        // Простая валидация номера телефона (украинский формат)
        const phoneRegex = /^(\+38)?[0-9]{10}$/
        const cleanPhone = formData.phone.replace(/\D/g, '')
        
        if (cleanPhone.length < 10) {
            alert('Номер телефону повинен містити мінімум 10 цифр')
            return
        }

        setPhoneModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`/api/debtor/enrich-phone/${debtId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: formData.phone,
                    debtId: debtId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Помилка при збереженні номеру телефону');
            }

            // Перезагружаем данные после успешного добавления
            window.location.reload(); // Простое решение, можно улучшить
            
            handleClosePhoneModal();
        } catch (error) {
            console.error('Error saving phone:', error);
            alert('Помилка при збереженні номеру: ' + error.message);
        } finally {
            setPhoneModalState(prev => ({ ...prev, loading: false }));
        }
    }

    // Функція для зміни даних форми телефону
    const handlePhoneFormChange = (value) => {
        setPhoneModalState(prev => ({
            ...prev,
            formData: {
                phone: value
            }
        }))
    }

    // Функція для видалення номера телефону
    const handleDeletePhone = async (phoneNumber) => {
        // Підтвердження видалення
        const confirmed = window.confirm(`Ви впевнені, що хочете видалити номер ${phoneNumber}?`)

        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(`/api/debtor/phone/${debtId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Помилка при видаленні номеру телефону');
            }

            // Перезагружаем данные после успешного удаления
            window.location.reload();

        } catch (error) {
            console.error('Error deleting phone:', error);
            alert('Помилка при видаленні номеру: ' + error.message);
        }
    }

    // Функції для SMS модального вікна
    const handleOpenSmsModal = (phone) => {
        console.log('handleOpenSmsModal called with phone:', phone);
        console.log('tableData:', tableData);

        if (!phone) {
            alert('Спочатку додайте номер телефону');
            return;
        }

        // Знаходимо дані боржника з tableData
        const debtorData = tableData.data[0];
        console.log('debtorData:', debtorData);

        if (debtorData) {
            const newState = {
                isOpen: true,
                debtor: {
                    ...debtorData,
                    phone: phone
                }
            };
            console.log('Setting SMS modal state:', newState);
            setSmsModalState(newState);
        } else {
            console.error('No debtorData found!');
            alert('Помилка: не знайдено дані боржника');
        }
    }

    const handleCloseSmsModal = () => {
        setSmsModalState({
            isOpen: false,
            debtor: null
        });
    }

    const handleSmsSuccess = () => {
        console.log('SMS успішно відправлено');
    }

    // Функції для роботи з адресою
    const handleOpenAddressModal = (currentAddress = '') => {
        setAddressModalState({
            isOpen: true,
            loading: false,
            formData: {
                address: currentAddress || ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    const handleCloseAddressModal = () => {
        setAddressModalState({
            isOpen: false,
            loading: false,
            formData: {
                address: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    const handleSaveAddress = async () => {
        const { formData } = addressModalState

        if (!formData.address.trim()) {
            alert('Введіть адресу')
            return
        }

        setAddressModalState(prev => ({ ...prev, loading: true }))

        try {
            const response = await fetch(`/api/debtor/address/${debtId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: formData.address.trim()
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Помилка при збереженні адреси')
            }

            window.location.reload()
            handleCloseAddressModal()
        } catch (error) {
            console.error('Error saving address:', error)
            alert('Помилка при збереженні адреси: ' + error.message)
        } finally {
            setAddressModalState(prev => ({ ...prev, loading: false }))
        }
    }

    const handleDeleteAddress = async () => {
        const confirmed = window.confirm('Ви впевнені, що хочете видалити адресу?')

        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(`/api/debtor/address/${debtId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Помилка при видаленні адреси')
            }

            window.location.reload()
        } catch (error) {
            console.error('Error deleting address:', error)
            alert('Помилка при видаленні адреси: ' + error.message)
        }
    }

    const handleAddressFormChange = (value) => {
        setAddressModalState(prev => ({
            ...prev,
            formData: {
                address: value
            }
        }))
    }

    const tableData = useMemo(() => {
        if (typeof data === "object" && Object.keys(data).length) {
            return {
                columns: [
                    {
                        title: 'ID', dataIndex: 'id',
                    },
                    {
                        title: 'П.І.Б', dataIndex: 'name',
                    },
                    {
                        title: 'Номер телефону',
                        dataIndex: 'phone',
                        // Кастомний рендер з окремими кнопками для кожного номера
                        render: (phoneData, record) => {
                            // Перевіряємо, чи є record
                            if (!record || !record.id) {
                                return null;
                            }

                            // phoneData вже є масивом телефонів
                            const phoneArray = Array.isArray(phoneData) ? phoneData : [];
                            const hasPhone = phoneArray.length > 0;

                            console.log('DebtorView - phoneData:', phoneData, 'phoneArray:', phoneArray, 'smsIcon:', smsIcon);

                            return (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {hasPhone ? (
                                        phoneArray.map((phone, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    backgroundColor: '#f0f0f0',
                                                    borderRadius: '4px',
                                                    border: '1px solid #d9d9d9'
                                                }}
                                            >
                                                <span style={{ fontSize: '14px' }}>
                                                    {phone}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        console.log('SMS button clicked for phone:', phone);
                                                        handleOpenSmsModal(phone);
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid #52c41a',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '4px',
                                                        color: '#52c41a',
                                                        transition: 'all 0.2s',
                                                        borderRadius: '4px',
                                                        minWidth: '28px',
                                                        minHeight: '28px'
                                                    }}
                                                    title={`Надіслати SMS на ${phone}`}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.color = '#fff';
                                                        e.target.style.backgroundColor = '#52c41a';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.color = '#52c41a';
                                                        e.target.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    {smsIcon}
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePhone(phone)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '2px',
                                                        color: '#ff4d4f',
                                                        transition: 'color 0.2s'
                                                    }}
                                                    title={`Видалити номер ${phone}`}
                                                    onMouseEnter={(e) => e.target.style.color = '#ff0000'}
                                                    onMouseLeave={(e) => e.target.style.color = '#ff4d4f'}
                                                >
                                                    {deleteIcon}
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <span style={{ color: '#999' }}>
                                            {generateRandomPhone()}
                                        </span>
                                    )}
                                    <button
                                        onClick={handleOpenPhoneModal}
                                        style={{
                                            background: 'none',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px',
                                            flexShrink: 0,
                                            transition: 'all 0.2s'
                                        }}
                                        title={hasPhone ? "Додати ще один номер" : "Додати номер телефону"}
                                        onMouseEnter={(e) => {
                                            e.target.style.borderColor = '#40a9ff';
                                            e.target.style.backgroundColor = '#f0f9ff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.borderColor = '#d9d9d9';
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {phoneAddIcon}
                                    </button>
                                </div>
                            )
                        }
                    },
                    {
                        title: 'Дата боргу', dataIndex: 'date',
                    },
                    {
                        title: 'Нежитлова', dataIndex: 'non_residential_debt',
                    },
                    {
                        title: 'Житлова', dataIndex: 'residential_debt',
                    },
                    {
                        title: 'Податок на землю', dataIndex: 'land_debt',
                    },
                    {
                        title: 'Оренда землі', dataIndex: 'orenda_debt',
                    },
                    {
                        title: 'МПЗ', dataIndex: 'mpz',
                    },
                    // Колонка адреси - тільки для Добромиля
                    ...(isDobromyl ? [{
                        title: 'Адреса',
                        dataIndex: 'address',
                        render: (addressValue, record) => {
                            if (!record || !record.id) {
                                return null;
                            }

                            const hasAddress = addressValue && addressValue.trim();

                            return (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {hasAddress ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                                border: '1px solid #d9d9d9'
                                            }}
                                        >
                                            <span style={{ fontSize: '14px' }}>
                                                {addressValue}
                                            </span>
                                            <button
                                                onClick={() => handleOpenAddressModal(addressValue)}
                                                style={{
                                                    background: 'none',
                                                    border: '1px solid #1890ff',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '2px',
                                                    color: '#1890ff',
                                                    transition: 'all 0.2s',
                                                    borderRadius: '4px'
                                                }}
                                                title="Редагувати адресу"
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = '#fff';
                                                    e.target.style.backgroundColor = '#1890ff';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.color = '#1890ff';
                                                    e.target.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                {editIcon}
                                            </button>
                                            <button
                                                onClick={handleDeleteAddress}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '2px',
                                                    color: '#ff4d4f',
                                                    transition: 'color 0.2s'
                                                }}
                                                title="Видалити адресу"
                                                onMouseEnter={(e) => e.target.style.color = '#ff0000'}
                                                onMouseLeave={(e) => e.target.style.color = '#ff4d4f'}
                                            >
                                                {deleteIcon}
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#999' }}>
                                            Адреса не вказана
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleOpenAddressModal(addressValue || '')}
                                        style={{
                                            background: 'none',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px',
                                            flexShrink: 0,
                                            transition: 'all 0.2s'
                                        }}
                                        title={hasAddress ? "Редагувати адресу" : "Додати адресу"}
                                        onMouseEnter={(e) => {
                                            e.target.style.borderColor = '#40a9ff';
                                            e.target.style.backgroundColor = '#f0f9ff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.borderColor = '#d9d9d9';
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {hasAddress ? editIcon : phoneAddIcon}
                                    </button>
                                </div>
                            )
                        }
                    }] : []),
                ],
                data: data.map(el => ({
                    key: el.id,
                    id: el.id,
                    name: el.name,
                    phone: el.phone || [],  // Залишаємо як масив для кастомного рендера
                    date: el.date,
                    non_residential_debt: el.non_residential_debt,
                    residential_debt: el.residential_debt,
                    land_debt: el.land_debt,
                    orenda_debt: el.orenda_debt,
                    mpz: el.mpz,
                    address: el.address || '',  // Адреса для Добромиля
                }))
            }
        }
        return {columns: [], data: []};
    }, [data, isDobromyl])

    // Колонки для таблиці дзвінків з додатковою колонкою "Дії"
    const callsColumns = useMemo(() => [
        {
            title: '№',
            dataIndex: 'id',
            width: '60px'
        },
        {
            title: 'Час дзвінка',
            dataIndex: 'callTime',
            width: '150px'
        },
        {
            title: 'Тема розмови',
            dataIndex: 'topic',
            render: (text) => (
                <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '400px',
                    minWidth: '200px'
                }}>
                    {text}
                </div>
            )
        },
        // Нова колонка "Дії"
        {
            title: 'Дії',
            dataIndex: 'actions',
            width: '80px',
            render: (_, record) => (
                <button
                    onClick={() => handleEditCall(record)}
                    style={{
                        background: 'none',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#1890ff',
                        transition: 'all 0.2s'
                    }}
                    title="Редагувати дзвінок"
                    onMouseEnter={(e) => {
                        e.target.style.borderColor = '#1890ff';
                        e.target.style.backgroundColor = '#f0f9ff';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.borderColor = '#d9d9d9';
                        e.target.style.backgroundColor = 'transparent';
                    }}
                >
                    {editIcon}
                    <span>Ред.</span>
                </button>
            )
        }
    ], [])

    // Функція для відкриття модального вікна (універсальна для створення і редагування)
    const handleOpenModal = () => {
        setModalState({
            isOpen: true,
            loading: false,
            isEdit: false,
            editingCallId: null,
            formData: {
                callTime: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    // Нова функція для редагування дзвінка
    const handleEditCall = (call) => {
        setModalState({
            isOpen: true,
            loading: false,
            isEdit: true,
            editingCallId: call.id,
            formData: {
                callTime: formatDateTimeForInput(call.rawCallDate),
                topic: call.topic
            }
        })
        document.body.style.overflow = 'hidden'
    }

    const handleCloseModal = () => {
        setModalState({
            isOpen: false,
            loading: false,
            isEdit: false,
            editingCallId: null,
            formData: {
                callTime: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    // Модифікована функція для збереження (створення або оновлення)
    const handleSaveCall = async () => {
        const { formData, isEdit, editingCallId } = modalState
        
        if (!formData.callTime || !formData.topic) {
            alert('Заповніть всі поля')
            return
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            const requestData = {
                call_date: formatDateTimeForAPI(formData.callTime),
                call_topic: formData.topic
            };

            let response;
            
            if (isEdit && editingCallId) {
                // Редагування існуючого дзвінка
                response = await fetch(`/api/debtor/calls/${editingCallId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
            } else {
                // Створення нового дзвінка
                response = await fetch(`/api/debtor/calls/${debtId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        identifier: parseInt(debtId),
                        ...requestData
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Помилка при ${isEdit ? 'оновленні' : 'збереженні'} дзвінка`);
            }

            const savedCall = await response.json();
            
            const formattedCall = {
                id: savedCall.id,
                callTime: formatDateTime(savedCall.call_date),
                topic: savedCall.call_topic,
                rawCallDate: savedCall.call_date
            };

            if (isEdit) {
                // Оновлюємо існуючий запис в таблиці
                setCallsData(prev => prev.map(call => 
                    call.id === editingCallId ? formattedCall : call
                ));
            } else {
                // Додаємо новий запис на початок списку
                setCallsData(prev => [formattedCall, ...prev]);
            }
            
            handleCloseModal();
        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'saving'} call:`, error);
            alert(`Помилка при ${isEdit ? 'оновленні' : 'збереженні'} дзвінка: ` + error.message);
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    }

    const handleFormChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }))
    }

    if (status === STATUS.PENDING) {
        return <Loader/>
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error.status} title={error.message}/>
    }

    return (
        <React.Fragment>
            {status === STATUS.SUCCESS ? (
                <React.Fragment>
                    <div className="btn-group" style={{marginBottom: '10px'}}>
                        <Button icon={onBackIcon} onClick={() => navigate('/debtor')}>
                            Повернутись до реєстру
                        </Button>
                    </div>
                    
                    {/* Основна таблиця з інформацією про боржника */}
                    <ViewCard dataSource={tableData.data} columns={tableData.columns}/>
                    
                    {/* Таблиця дзвінків */}
                    <div style={{marginTop: '30px'}}>
                        <div className="table-elements">
                            <div className="table-header">
                                <h2 className="title title--sm">
                                    Історія дзвінків ({callsData.length})
                                </h2>
                                <div className="table-header__buttons">
                                    <Button
                                        icon={addIcon}
                                        onClick={handleOpenModal}
                                        disabled={callsLoading}
                                    >
                                        Додати дзвінок
                                    </Button>
                                </div>
                            </div>
                            <div className="table-main">
                                <div className="table-wrapper">
                                    {callsLoading ? (
                                        <div style={{textAlign: 'center', padding: '40px'}}>
                                            <Loader />
                                        </div>
                                    ) : callsError ? (
                                        <div style={{
                                            textAlign: 'center', 
                                            padding: '40px', 
                                            color: 'red',
                                            backgroundColor: '#fff2f0',
                                            border: '1px solid #ffccc7',
                                            borderRadius: '6px'
                                        }}>
                                            <h3>Помилка завантаження дзвінків</h3>
                                            <p>{callsError}</p>
                                            <Button onClick={loadCalls} style={{marginTop: '10px'}}>
                                                Спробувати знову
                                            </Button>
                                        </div>
                                    ) : (
                                        <Table 
                                            columns={callsColumns} 
                                            dataSource={callsData.map(call => ({
                                                ...call,
                                                key: call.id
                                            }))}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            ) : null}
            
            {/* Модальне вікно для додавання/редагування дзвінків */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleCloseModal}
                        onOk={handleSaveCall}
                        cancelText="Скасувати"
                        okText={modalState.loading 
                            ? (modalState.isEdit ? "Оновлення..." : "Збереження...") 
                            : (modalState.isEdit ? "Оновити" : "Зберегти")
                        }
                        okButtonDisabled={modalState.loading}
                        title={modalState.isEdit ? "Редагувати дзвінок" : "Додати дзвінок"}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Час дзвінка:
                                </label>
                                <input
                                    type="datetime-local"
                                    value={modalState.formData.callTime}
                                    onChange={(e) => handleFormChange('callTime', e.target.value)}
                                    disabled={modalState.loading}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: modalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Тема розмови:
                                </label>
                                <textarea
                                    value={modalState.formData.topic}
                                    onChange={(e) => handleFormChange('topic', e.target.value)}
                                    disabled={modalState.loading}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        resize: 'vertical',
                                        backgroundColor: modalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                    placeholder="Введіть тему розмови..."
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для додавання номера телефону */}
            <Transition in={phoneModalState.isOpen} timeout={200} unmountOnExit nodeRef={phoneNodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleClosePhoneModal}
                        onOk={handleSavePhone}
                        cancelText="Скасувати"
                        okText={phoneModalState.loading ? "Збереження..." : "Зберегти"}
                        okButtonDisabled={phoneModalState.loading}
                        title="Додати номер телефону">
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Номер телефону:
                                </label>
                                <input
                                    type="tel"
                                    value={phoneModalState.formData.phone}
                                    onChange={(e) => handlePhoneFormChange(e.target.value)}
                                    disabled={phoneModalState.loading}
                                    placeholder="+380XXXXXXXXX або 0XXXXXXXXX"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: phoneModalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                />
                                <small style={{color: '#666', fontSize: '12px'}}>
                                    Введіть номер у форматі: +380xxxxxxxxx або 0xxxxxxxxx
                                </small>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для відправки SMS */}
            <Transition in={smsModalState.isOpen} timeout={200} unmountOnExit nodeRef={smsNodeRef}>
                {state => (
                    <div ref={smsNodeRef}>
                        <SMSSendModal
                            isOpen={smsModalState.isOpen}
                            onClose={handleCloseSmsModal}
                            debtor={smsModalState.debtor}
                            onSuccess={handleSmsSuccess}
                        />
                    </div>
                )}
            </Transition>

            {/* Модальне вікно для адреси (тільки для Добромиля) */}
            {isDobromyl && (
                <Transition in={addressModalState.isOpen} timeout={200} unmountOnExit nodeRef={addressNodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={handleCloseAddressModal}
                            onOk={handleSaveAddress}
                            cancelText="Скасувати"
                            okText={addressModalState.loading ? "Збереження..." : "Зберегти"}
                            okButtonDisabled={addressModalState.loading}
                            title="Редагувати адресу">
                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Адреса:
                                    </label>
                                    <input
                                        type="text"
                                        value={addressModalState.formData.address}
                                        onChange={(e) => handleAddressFormChange(e.target.value)}
                                        disabled={addressModalState.loading}
                                        placeholder="Введіть адресу боржника"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            backgroundColor: addressModalState.loading ? '#f5f5f5' : 'white'
                                        }}
                                    />
                                    <small style={{color: '#666', fontSize: '12px'}}>
                                        Наприклад: м. Добромиль, вул. Шевченка, 15
                                    </small>
                                </div>
                            </div>
                        </Modal>
                    )}
                </Transition>
            )}
        </React.Fragment>
    );
}

export default DebtorView;