import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../../main';
import { useNotification } from '../../hooks/useNotification';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import Pagination from '../../components/common/Pagination/Pagination';
import Loader from '../../components/Loader/Loader';
import PageError from '../ErrorPage/PageError';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import FormItem from '../../components/common/FormItem/FormItem';
import { generateIcon, iconMap } from '../../utils/constants';
import SmsService from '../../services/SmsService';
import './SMS.css';

const backIcon = generateIcon(iconMap.back);
const addIcon = generateIcon(iconMap.add);
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20);
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20);
const refreshIcon = generateIcon(iconMap.refresh, null, 'currentColor', 20, 20);

const SMSList = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);

    const [activeTab, setActiveTab] = useState('history');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // History state
    const [history, setHistory] = useState([]);
    const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [historyFilters, setHistoryFilters] = useState({ status: '', phone: '', dateFrom: '', dateTo: '' });

    // Templates state
    const [templates, setTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ name: '', text: '', description: '' });

    // Stats state
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        } else if (activeTab === 'templates') {
            loadTemplates();
        } else if (activeTab === 'stats') {
            loadStats();
        }
    }, [activeTab, historyPagination.page]);

    useEffect(() => {
        console.log('🔔 isTemplateModalOpen змінився:', isTemplateModalOpen);
        if (isTemplateModalOpen) {
            console.log('🔔 Modal ПОВИНЕН відкритися!');
        }
    }, [isTemplateModalOpen]);

    const loadHistory = async () => {
        try {
            setIsLoading(true);
            const response = await SmsService.getHistory({
                limit: historyPagination.limit,
                offset: (historyPagination.page - 1) * historyPagination.limit
            });
            if (response.data && !response.data.error) {
                const data = response.data.data;
                setHistory(data.sms_list || []);
                setHistoryPagination(prev => ({ ...prev, total: data.total_count || 0 }));
            }
        } catch (err) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Локальна фільтрація історії
    const getFilteredHistory = () => {
        return history.filter(sms => {
            // Фільтр по телефону
            if (historyFilters.phone && !sms.phone?.includes(historyFilters.phone)) {
                return false;
            }
            // Фільтр по статусу
            if (historyFilters.status && sms.status !== historyFilters.status) {
                return false;
            }
            // Фільтр по даті (від)
            if (historyFilters.dateFrom && sms.created_at) {
                const smsDate = new Date(sms.created_at).setHours(0, 0, 0, 0);
                const filterDate = new Date(historyFilters.dateFrom).setHours(0, 0, 0, 0);
                if (smsDate < filterDate) {
                    return false;
                }
            }
            // Фільтр по даті (до)
            if (historyFilters.dateTo && sms.created_at) {
                const smsDate = new Date(sms.created_at).setHours(0, 0, 0, 0);
                const filterDate = new Date(historyFilters.dateTo).setHours(0, 0, 0, 0);
                if (smsDate > filterDate) {
                    return false;
                }
            }
            return true;
        });
    };

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const response = await SmsService.getTemplates();
            console.log('Templates response:', response);
            if (response.data && !response.data.error) {
                const templatesData = response.data.data || [];
                console.log('Templates data:', templatesData);
                setTemplates(templatesData);
            } else {
                console.warn('No templates data or error:', response.data);
            }
        } catch (err) {
            console.error('Error loading templates:', err);
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const response = await SmsService.getStats();
            if (response.data && !response.data.error) {
                setStats(response.data.data);
            }
        } catch (err) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = (err) => {
        if (err?.response?.status === 401) {
            notification({ type: 'warning', title: 'Помилка', message: 'Не авторизований!' });
            store.logOff();
            navigate('/');
        } else {
            setError(err?.response?.data?.message || err.message);
        }
    };

    // Template CRUD
    const openTemplateModal = (template = null) => {
        console.log('🔵 openTemplateModal викликано', { template });
        if (template) {
            setEditingTemplate(template);
            setTemplateForm({ name: template.name, text: template.text, description: template.description || '' });
        } else {
            setEditingTemplate(null);
            setTemplateForm({ name: '', text: '', description: '' });
        }
        setIsTemplateModalOpen(true);
        console.log('🔵 Modal state встановлено в true');
    };

    const saveTemplate = async () => {
        console.log('🟢 saveTemplate викликано', { templateForm, editingTemplate });
        try {
            if (!templateForm.name || !templateForm.text) {
                console.log('⚠️ Валідація не пройдена');
                notification({ type: 'warning', title: 'Помилка', message: 'Заповніть обов\'язкові поля' });
                return;
            }

            console.log('🟢 Відправка запиту на сервер...');
            if (editingTemplate) {
                const response = await SmsService.updateTemplate(editingTemplate.id, templateForm);
                console.log('🟢 Відповідь від сервера (update):', response);
                notification({ type: 'success', title: 'Успіх', message: 'Шаблон оновлено' });
            } else {
                const response = await SmsService.createTemplate(templateForm);
                console.log('🟢 Відповідь від сервера (create):', response);
                notification({ type: 'success', title: 'Успіх', message: 'Шаблон створено' });
            }

            setIsTemplateModalOpen(false);
            loadTemplates();
        } catch (err) {
            console.error('❌ Помилка в saveTemplate:', err);
            notification({ type: 'warning', title: 'Помилка', message: err?.response?.data?.message || 'Помилка збереження' });
        }
    };

    const deleteTemplate = async (id) => {
        if (!window.confirm('Видалити цей шаблон?')) return;
        try {
            await SmsService.deleteTemplate(id);
            notification({ type: 'success', title: 'Успіх', message: 'Шаблон видалено' });
            loadTemplates();
        } catch (err) {
            notification({ type: 'warning', title: 'Помилка', message: 'Помилка видалення' });
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            'delivered': { bg: '#27ae60', text: 'Доставлено' },
            'sending': { bg: '#3498db', text: 'Відправляється' },
            'failed': { bg: '#e74c3c', text: 'Помилка' },
            'undeliverable': { bg: '#e74c3c', text: 'Не доставлено' },
            'expired': { bg: '#95a5a6', text: 'Прострочено' },
            'rejected_spam': { bg: '#9b59b6', text: 'Спам' }
        };
        const statusInfo = statusColors[status] || { bg: '#95a5a6', text: status };
        return (
            <span className="sms-status-badge" style={{ backgroundColor: statusInfo.bg }}>
                {statusInfo.text}
            </span>
        );
    };

    const historyColumns = [
        { dataIndex: 'debtor_name', title: 'ПІБ', width: '15%', render: (name) => name || '-' },
        { dataIndex: 'phone', title: 'Телефон', width: '15%' },
        { dataIndex: 'text', title: 'Текст', width: '30%', render: (text) => (
            <span className="sms-text-preview">{text?.substring(0, 80)}{text?.length > 80 ? '...' : ''}</span>
        )},
        { dataIndex: 'status', title: 'Статус', width: '12%', render: (status) => getStatusBadge(status) },
        { dataIndex: 'created_at', title: 'Дата', width: '18%', render: (date) => date ? new Date(date).toLocaleString('uk-UA') : '' },
        { dataIndex: 'reserved_segments', title: 'Сегменти', width: '10%' }
    ];

    const templateColumns = [
        { dataIndex: 'name', title: 'Назва', width: '25%' },
        { dataIndex: 'text', title: 'Текст', width: '45%', render: (text) => (
            <span className="sms-text-preview">{text?.substring(0, 80)}{text?.length > 80 ? '...' : ''}</span>
        )},
        { dataIndex: 'description', title: 'Опис', width: '20%' },
        { dataIndex: 'actions', title: '', width: '10%', render: (_, record) => (
            <div className="table-actions">
                <Button size="sm" icon={editIcon} onClick={() => openTemplateModal(record)} />
                <Button size="sm" icon={deleteIcon} variant="danger" onClick={() => deleteTemplate(record.id)} />
            </div>
        )}
    ];

    if (error) {
        return <PageError statusError={500} title={error} />;
    }

    return (
        <div className="components-container">
            <div className="components-container__full-width">
                <div className="page-header">
                    <h1 className="title title--md">SMS повідомлення</h1>
                    <Button icon={backIcon} onClick={() => navigate('/')}>Повернутись</Button>
                </div>

                {/* Tabs */}
                <div className="sms-tabs">
                    <button
                        className={`sms-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Історія
                    </button>
                    <button
                        className={`sms-tab ${activeTab === 'templates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        Шаблони
                    </button>
                    <button
                        className={`sms-tab ${activeTab === 'stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        Статистика
                    </button>
                </div>

                {isLoading ? <Loader /> : (
                    <>
                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div className="sms-history">
                                <div className="sms-filters">
                                    <Input
                                        placeholder="Телефон"
                                        value={historyFilters.phone}
                                        onChange={(name, value) => setHistoryFilters(prev => ({ ...prev, phone: value }))}
                                    />
                                    <select
                                        value={historyFilters.status}
                                        onChange={(e) => setHistoryFilters(prev => ({ ...prev, status: e.target.value }))}
                                        className="sms-select"
                                    >
                                        <option value="">Всі статуси</option>
                                        <option value="delivered">Доставлено</option>
                                        <option value="sending">Відправляється</option>
                                        <option value="failed">Помилка</option>
                                        <option value="undeliverable">Не доставлено</option>
                                    </select>
                                    <Input
                                        type="date"
                                        value={historyFilters.dateFrom}
                                        onChange={(name, value) => setHistoryFilters(prev => ({ ...prev, dateFrom: value }))}
                                    />
                                    <Input
                                        type="date"
                                        value={historyFilters.dateTo}
                                        onChange={(name, value) => setHistoryFilters(prev => ({ ...prev, dateTo: value }))}
                                    />
                                    <Button icon={refreshIcon} onClick={loadHistory}>Оновити</Button>
                                </div>
                                <Table
                                    columns={historyColumns}
                                    dataSource={getFilteredHistory()}
                                />
                                {historyPagination.total > historyPagination.limit && (
                                    <Pagination
                                        currentPage={historyPagination.page}
                                        totalPages={Math.ceil(historyPagination.total / historyPagination.limit)}
                                        onPageChange={(page) => setHistoryPagination(prev => ({ ...prev, page }))}
                                    />
                                )}
                            </div>
                        )}

                        {/* Templates Tab */}
                        {activeTab === 'templates' && (
                            <div className="sms-templates">
                                <div className="sms-templates-header">
                                    <Button icon={addIcon} onClick={() => openTemplateModal()}>
                                        Новий шаблон
                                    </Button>
                                </div>
                                <Table
                                    columns={templateColumns}
                                    dataSource={templates}
                                />
                            </div>
                        )}

                        {/* Stats Tab */}
                        {activeTab === 'stats' && stats && (
                            <div className="sms-stats">
                                <div className="sms-stats-grid">
                                    <div className="sms-stat-card">
                                        <h3>Всього SMS</h3>
                                        <p className="sms-stat-value">{stats.total_sms || 0}</p>
                                    </div>
                                    <div className="sms-stat-card">
                                        <h3>Унікальних номерів</h3>
                                        <p className="sms-stat-value">{stats.unique_phones || 0}</p>
                                    </div>
                                    <div className="sms-stat-card">
                                        <h3>Сегментів</h3>
                                        <p className="sms-stat-value">{stats.total_segments || 0}</p>
                                    </div>
                                    <div className="sms-stat-card success">
                                        <h3>Доставлено</h3>
                                        <p className="sms-stat-value">{stats.by_status?.delivered || 0}</p>
                                    </div>
                                    <div className="sms-stat-card info">
                                        <h3>Відправляється</h3>
                                        <p className="sms-stat-value">{stats.by_status?.sending || 0}</p>
                                    </div>
                                    <div className="sms-stat-card danger">
                                        <h3>Помилки</h3>
                                        <p className="sms-stat-value">{stats.by_status?.undeliverable || 0}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Template Modal */}
            <Modal
                className={isTemplateModalOpen ? "modal-window-wrapper--active" : ""}
                onClose={() => {
                    console.log('🔴 Modal onClose викликано');
                    setIsTemplateModalOpen(false);
                }}
                onOk={() => {
                    console.log('🟢 Modal onOk викликано');
                    saveTemplate();
                }}
                title={editingTemplate ? 'Редагувати шаблон' : 'Новий шаблон'}
                okText={editingTemplate ? 'Зберегти' : 'Створити'}
                cancelText="Скасувати"
            >
                <div className="sms-template-form">
                    <FormItem label="Назва шаблону *" fullWidth>
                        <Input
                            value={templateForm.name}
                            onChange={(name, value) => setTemplateForm(prev => ({ ...prev, name: value }))}
                            placeholder="Наприклад: Нагадування про борг"
                        />
                    </FormItem>
                    <FormItem label="Текст SMS *" fullWidth>
                        <div>
                            <textarea
                                className="sms-textarea"
                                value={templateForm.text}
                                onChange={(e) => setTemplateForm(prev => ({ ...prev, text: e.target.value }))}
                                placeholder="Текст повідомлення. Використовуйте {{name}}, {{debt_amount}}, {{address}}, {{date}}"
                                rows={4}
                            />
                            <small className="sms-hint">
                                Доступні плейсхолдери: {'{{name}}'}, {'{{debt_amount}}'}, {'{{address}}'}, {'{{date}}'}, {'{{phone}}'}
                            </small>
                        </div>
                    </FormItem>
                    <FormItem label="Опис" fullWidth>
                        <Input
                            value={templateForm.description}
                            onChange={(name, value) => setTemplateForm(prev => ({ ...prev, description: value }))}
                            placeholder="Короткий опис шаблону"
                        />
                    </FormItem>
                </div>
            </Modal>
        </div>
    );
};

export default SMSList;
