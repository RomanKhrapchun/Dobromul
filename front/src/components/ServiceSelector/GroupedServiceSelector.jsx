
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFunction } from '../../utils/function';
import { useNotification } from '../../hooks/useNotification';
import './GroupedServiceSelector.css';

// Mock дані для тестування
const MOCK_DATA = [
    // Виконавець 1: Водоканал
    { id: 1, name: 'Водопостачання холодне', price: 150, identifier: 'WTR-001', executor_id: 1, executor_name: 'КП "Міський Водоканал"' },
    { id: 2, name: 'Водопостачання гаряче', price: 280, identifier: 'WTR-002', executor_id: 1, executor_name: 'КП "Міський Водоканал"' },
    { id: 3, name: 'Водовідведення', price: 120, identifier: 'WTR-003', executor_id: 1, executor_name: 'КП "Міський Водоканал"' },
    { id: 4, name: 'Вивіз сміття', price: 95, identifier: 'WTR-004', executor_id: 1, executor_name: 'КП "Міський Водоканал"' },

    // Виконавець 2: Енергопостачання
    { id: 5, name: 'Електроенергія побутова', price: 450, identifier: 'ENG-001', executor_id: 2, executor_name: 'ПАТ "Обленерго"' },
    { id: 6, name: 'Електроенергія за двозонним тарифом', price: 380, identifier: 'ENG-002', executor_id: 2, executor_name: 'ПАТ "Обленерго"' },
    { id: 7, name: 'Електроенергія нічний тариф', price: 220, identifier: 'ENG-003', executor_id: 2, executor_name: 'ПАТ "Обленерго"' },

    // Виконавець 3: Газопостачання
    { id: 8, name: 'Природний газ для населення', price: 720, identifier: 'GAS-001', executor_id: 3, executor_name: 'ТОВ "Облгаз"' },
    { id: 9, name: 'Газопостачання за лічильником', price: 680, identifier: 'GAS-002', executor_id: 3, executor_name: 'ТОВ "Облгаз"' },
    { id: 10, name: 'Технічне обслуговування газового обладнання', price: 150, identifier: 'GAS-003', executor_id: 3, executor_name: 'ТОВ "Облгаз"' },

    // Виконавець 4: Теплопостачання
    { id: 11, name: 'Опалення житлове', price: 890, identifier: 'HET-001', executor_id: 4, executor_name: 'КП "Міськтеплоенерго"' },
    { id: 12, name: 'Опалення комерційне', price: 1200, identifier: 'HET-002', executor_id: 4, executor_name: 'КП "Міськтеплоенерго"' },
    { id: 13, name: 'Гаряче водопостачання (опалення)', price: 340, identifier: 'HET-003', executor_id: 4, executor_name: 'КП "Міськтеплоенерго"' },

    // Виконавець 5: Телекомунікації
    { id: 14, name: 'Інтернет 100 Мбіт/с', price: 200, identifier: 'TEL-001', executor_id: 5, executor_name: 'ТОВ "УкрТелеком"' },
    { id: 15, name: 'Телебачення базовий пакет', price: 120, identifier: 'TEL-002', executor_id: 5, executor_name: 'ТОВ "УкрТелеком"' },
    { id: 16, name: 'Мобільний зв\'язок', price: 85, identifier: 'TEL-003', executor_id: 5, executor_name: 'ТОВ "УкрТелеком"' },
    { id: 17, name: 'Інтернет + ТБ комбо', price: 280, identifier: 'TEL-004', executor_id: 5, executor_name: 'ТОВ "УкрТелеком"' },

    // Виконавець 6: Комунальні послуги
    { id: 18, name: 'Утримання будинку та прибудинкової території', price: 320, identifier: 'COM-001', executor_id: 6, executor_name: 'ОСББ "Наш Дім"' },
    { id: 19, name: 'Ремонт та обслуговування ліфтів', price: 180, identifier: 'COM-002', executor_id: 6, executor_name: 'ОСББ "Наш Дім"' },
    { id: 20, name: 'Охорона під\'їздів', price: 95, identifier: 'COM-003', executor_id: 6, executor_name: 'ОСББ "Наш Дім"' },
    { id: 21, name: 'Консьєрж-послуги', price: 150, identifier: 'COM-004', executor_id: 6, executor_name: 'ОСББ "Наш Дім"' },

    // Послуги без виконавця
    { id: 22, name: 'Страхування житла', price: 450, identifier: 'INS-001', executor_id: null, executor_name: null },
    { id: 23, name: 'Юридичні консультації', price: 300, identifier: 'LEG-001', executor_id: null, executor_name: null },
    { id: 24, name: 'Оцінка майна', price: 500, identifier: 'VAL-001', executor_id: null, executor_name: null },
];

const GroupedServiceSelector = ({
    value,
    onChange,
    error,
    placeholder = "Виберіть послугу",
    required = false,
    useMockData = false // Новий проп для використання mock даних
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [executors, setExecutors] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [selectedExecutorId, setSelectedExecutorId] = useState(null);
    const [availableServices, setAvailableServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const notification = useNotification();
    const dropdownRef = useRef(null);

    // Завантаження даних
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                let servicesData;

                if (useMockData) {
                    // Використовуємо mock дані
                    console.log('🧪 Використовуються mock дані для тестування');
                    servicesData = MOCK_DATA;
                } else {
                    // Завантажуємо реальні дані з API
                    const response = await fetchFunction('api/cnap/services/with-executors', {
                        method: 'get',
                    });
                    servicesData = response?.data.data || [];
                }

                if (servicesData.length > 0) {
                    const mappedServices = servicesData.map(service => ({
                        value: service.id,
                        label: service.name,
                        price: service.price,
                        identifier: service.identifier,
                        executor_id: service.executor_id,
                        executor_name: service.executor_name
                    }));
                    setAllServices(mappedServices);

                    // Створюємо список виконавців
                    const executorsMap = new Map();

                    servicesData.forEach(service => {
                        if (service.executor_id && service.executor_name) {
                            if (!executorsMap.has(service.executor_id)) {
                                executorsMap.set(service.executor_id, {
                                    id: service.executor_id,
                                    name: service.executor_name,
                                    services_count: 0
                                });
                            }
                            executorsMap.get(service.executor_id).services_count++;
                        }
                    });

                    // Додаємо групу для послуг без виконавця
                    const servicesWithoutExecutor = mappedServices.filter(s => !s.executor_id);
                    if (servicesWithoutExecutor.length > 0) {
                        executorsMap.set('no_executor', {
                            id: 'no_executor',
                            name: 'Послуги без виконавця',
                            services_count: servicesWithoutExecutor.length
                        });
                    }

                    setExecutors(Array.from(executorsMap.values()));
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                notification({
                    type: 'error',
                    message: 'Помилка завантаження даних',
                    placement: 'top'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [notification, useMockData]);

    // Знаходимо вибрану послугу при зміні value
    useEffect(() => {
        if (value && allServices.length > 0) {
            const service = allServices.find(s => s.value === value);
            if (service) {
                setSelectedService(service);
                // Автоматично вибираємо виконавця
                const executorId = service.executor_id || 'no_executor';
                setSelectedExecutorId(executorId);
                handleExecutorSelect(executorId);
            }
        } else {
            setSelectedService(null);
            setSelectedExecutorId(null);
            setAvailableServices([]);
        }
    }, [value, allServices]);

    // Закриття dropdown при кліку поза компонентом
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExecutorSelect = useCallback((executorId) => {
        setSelectedExecutorId(executorId);
        setSearchQuery(''); // Очищаємо пошук при зміні виконавця

        let filteredServices = [];
        if (executorId === 'no_executor') {
            filteredServices = allServices.filter(service => !service.executor_id);
        } else {
            filteredServices = allServices.filter(service => service.executor_id === executorId);
        }

        setAvailableServices(filteredServices);
    }, [allServices]);

    const handleServiceSelect = useCallback((service) => {
        setSelectedService(service);
        setIsOpen(false);

        if (onChange) {
            onChange(service.value, service);
        }
    }, [onChange]);

    // Фільтруємо послуги на основі пошукового запиту
    const filteredServices = useCallback(() => {
        if (!searchQuery.trim()) {
            return availableServices;
        }

        const query = searchQuery.toLowerCase();
        return availableServices.filter(service =>
            service.label.toLowerCase().includes(query) ||
            service.identifier.toLowerCase().includes(query)
        );
    }, [availableServices, searchQuery]);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const toggleDropdown = useCallback(() => {
        setIsOpen(!isOpen);
    }, [isOpen]);

    const getDisplayText = () => {
        if (selectedService) {
            return selectedService.label;
        }
        return placeholder;
    };

    const truncateText = (text, maxLength = 60) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    return (
        <div className="grouped-service-selector" ref={dropdownRef}>
            {/* Поле вибору */}
            <div 
                className={`selector-input ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
                onClick={toggleDropdown}
            >
                <span className={`selector-text ${selectedService ? 'selected' : 'placeholder'}`}>
                    {getDisplayText()}
                </span>
                <span className={`selector-arrow ${isOpen ? 'up' : 'down'}`}>
                    ▼
                </span>
            </div>

            {/* Dropdown з групами та послугами */}
            {isOpen && (
                <div className="selector-dropdown">
                    {loading ? (
                        <div className="dropdown-loading">
                            Завантаження...
                        </div>
                    ) : (
                        <div className="dropdown-content">
                            {/* Ліва панель - Виконавці */}
                            <div className="executors-panel">
                                <div className="panel-header">Надавачі</div>{/*Виконавці*/}
                                <div className="executors-list">
                                    {executors.map(executor => (
                                        <div
                                            key={executor.id}
                                            className={`executor-item ${selectedExecutorId === executor.id ? 'selected' : ''}`}
                                            onClick={() => handleExecutorSelect(executor.id)}
                                        >
                                            <div className="executor-name">
                                                {truncateText(executor.name, 35)}
                                            </div>
                                            <div className="executor-count">
                                                {executor.services_count} послуг
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Права панель - Послуги */}
                            <div className="services-panel">
                                <div className="panel-header">
                                    {selectedExecutorId ? 'Послуги' : 'Виберіть виконавця'}
                                </div>
                                {selectedExecutorId && (
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            className="service-search-input"
                                            placeholder="Пошук послуги..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                <div className="services-list">
                                    {selectedExecutorId ? (
                                        filteredServices().length > 0 ? (
                                            filteredServices().map(service => (
                                                <div
                                                    key={service.value}
                                                    className={`service-item ${selectedService?.value === service.value ? 'selected' : ''}`}
                                                    onClick={() => handleServiceSelect(service)}
                                                >
                                                    <div className="service-name">
                                                        {service.label}
                                                    </div>
                                                    <div className="service-details">
                                                        <span className="service-code">{service.identifier}</span>
                                                        <span className="service-price">{service.price} грн</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-services">
                                                {searchQuery ? 'Послуг за вашим запитом не знайдено' : 'Немає доступних послуг'}
                                            </div>
                                        )
                                    ) : (
                                        <div className="select-executor-message">
                                            ← Спочатку виберіть надавача зліва
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Показуємо інформацію про вибрану послугу */}
            {selectedService && !isOpen && (
                <div className="selected-service-info">
                    <div className="service-summary">
                        <span className="service-code-summary">Код: {selectedService.identifier}</span>
                        <span className="service-price-summary">Ціна: {selectedService.price} грн</span>
                        {selectedService.executor_name && (
                            <span className="service-executor-summary">
                                Надавач: {truncateText(selectedService.executor_name, 30)}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupedServiceSelector;