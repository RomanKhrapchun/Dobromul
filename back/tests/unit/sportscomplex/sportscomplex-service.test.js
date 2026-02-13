/**
 * Unit tests for SportsComplexService
 * Tests sports complex service logic with mocked dependencies
 */

// Mock all dependencies before requiring the module
jest.mock('../../../modules/sportscomplex/repository/sportscomplex-repository');
jest.mock('../../../modules/log/repository/log-repository');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/function');
jest.mock('../../../utils/generateDocx', () => ({
    createRequisiteWord: jest.fn()
}));

const sportsComplexService = require('../../../modules/sportscomplex/service/sportscomplex-service');
const sportsComplexRepository = require('../../../modules/sportscomplex/repository/sportscomplex-repository');
const logRepository = require('../../../modules/log/repository/log-repository');
const logger = require('../../../utils/logger');
const { paginate, paginationData } = require('../../../utils/function');
const { createRequisiteWord } = require('../../../utils/generateDocx');

// Mock constants
jest.mock('../../../utils/constants', () => ({
    allowedRequisitesFilterFields: ['kved', 'iban', 'edrpou'],
    allowedServicesFilterFields: ['name', 'lesson_count'],
    allowedBillsFilterFields: ['client_name', 'membership_number', 'phone_number', 'status', 'service_name'],
    allowedClientsFilterFields: ['name', 'membership_number', 'phone_number'],
    displayRequisitesFilterFields: ['id', 'kved', 'iban', 'edrpou', 'service_group_id'],
    displayServicesFilterFields: ['id', 'name', 'lesson_count', 'price', 'service_group_id'],
    displayBillsFilterFields: ['id', 'client_name', 'membership_number', 'phone_number', 'service_id', 'visit_count', 'total_price', 'status'],
    displayClientsFilterFields: ['id', 'name', 'membership_number', 'phone_number', 'current_service_name', 'remaining_visits', 'subscription_duration', 'subscription_days_left', 'subscription_active', 'created_at'],
    allowedSortFieldsBills: ['membership_number', 'client_name', 'phone_number', 'service_group', 'service_name', 'visit_count', 'total_price', 'created_at'],
    allowedSortFieldsClients: ['name', 'membership_number', 'phone_number', 'current_service_name', 'remaining_visits', 'created_at'],
    allowedSortFieldsServices: ['name', 'lesson_count', 'price', 'service_group_id'],
    allowedSortFieldsRequisites: ['id', 'kved', 'iban', 'edrpou', 'group_name']
}));

describe('SportsComplexService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default function mocks
        paginate.mockReturnValue({ offset: 0 });
        paginationData.mockImplementation((data, page, limit, count) => ({
            totalItems: count,
            items: data,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        }));

        // Default log repository mock
        logRepository.createLog.mockResolvedValue({});
    });

    // ============================================================
    // findRequisitesByFilter
    // ============================================================
    describe('findRequisitesByFilter', () => {
        const mockRequest = {
            body: { page: 1, limit: 16 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        const mockRequisitesData = [
            { data: [{ id: 1, kved: '93.11', iban: 'UA123', edrpou: '12345678' }], count: 1 },
            1
        ];

        it('should return paginated requisites with default parameters', async () => {
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            const result = await sportsComplexService.findRequisitesByFilter(mockRequest);

            expect(paginate).toHaveBeenCalledWith(1, 16);
            expect(sportsComplexRepository.findRequisitesByFilter).toHaveBeenCalledWith(
                16, 0, expect.any(Array), {}, null, 'asc'
            );
            expect(result).toHaveProperty('totalItems');
            expect(result).toHaveProperty('items');
            expect(result).toHaveProperty('sort_by', null);
            expect(result).toHaveProperty('sort_direction', 'asc');
        });

        it('should apply valid sort_by and sort_direction', async () => {
            const requestWithSort = {
                ...mockRequest,
                body: { page: 1, limit: 16, sort_by: 'kved', sort_direction: 'desc' }
            };
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            const result = await sportsComplexService.findRequisitesByFilter(requestWithSort);

            expect(sportsComplexRepository.findRequisitesByFilter).toHaveBeenCalledWith(
                16, 0, expect.any(Array), {}, 'kved', 'desc'
            );
            expect(result.sort_by).toBe('kved');
            expect(result.sort_direction).toBe('desc');
        });

        it('should ignore invalid sort_by field', async () => {
            const requestWithInvalidSort = {
                ...mockRequest,
                body: { page: 1, limit: 16, sort_by: 'invalid_field', sort_direction: 'asc' }
            };
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            const result = await sportsComplexService.findRequisitesByFilter(requestWithInvalidSort);

            expect(result.sort_by).toBeNull();
        });

        it('should default to asc for invalid sort_direction', async () => {
            const requestWithInvalidDirection = {
                ...mockRequest,
                body: { page: 1, limit: 16, sort_by: 'kved', sort_direction: 'invalid' }
            };
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            const result = await sportsComplexService.findRequisitesByFilter(requestWithInvalidDirection);

            expect(result.sort_direction).toBe('asc');
        });

        it('should apply filter fields correctly', async () => {
            const requestWithFilter = {
                ...mockRequest,
                body: { page: 1, limit: 16, kved: '93.11', iban: 'UA123' }
            };
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            await sportsComplexService.findRequisitesByFilter(requestWithFilter);

            expect(sportsComplexRepository.findRequisitesByFilter).toHaveBeenCalledWith(
                16, 0, expect.any(Array), { kved: '93.11', iban: 'UA123' }, null, 'asc'
            );
        });

        it('should log search action when filters are applied', async () => {
            const requestWithFilter = {
                ...mockRequest,
                body: { page: 1, limit: 16, kved: '93.11' }
            };
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            await sportsComplexService.findRequisitesByFilter(requestWithFilter);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SEARCH',
                    application_name: 'Пошук реквізитів',
                    schema_name: 'sport',
                    table_name: 'requisites'
                })
            );
        });

        it('should not log search action when no filters are applied', async () => {
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            await sportsComplexService.findRequisitesByFilter(mockRequest);

            expect(logRepository.createLog).not.toHaveBeenCalled();
        });

        it('should handle pagination offset correctly', async () => {
            const requestPage2 = {
                ...mockRequest,
                body: { page: 2, limit: 16 }
            };
            paginate.mockReturnValue({ offset: 16 });
            sportsComplexRepository.findRequisitesByFilter.mockResolvedValue(mockRequisitesData);

            await sportsComplexService.findRequisitesByFilter(requestPage2);

            expect(paginate).toHaveBeenCalledWith(2, 16);
            expect(sportsComplexRepository.findRequisitesByFilter).toHaveBeenCalledWith(
                16, 16, expect.any(Array), {}, null, 'asc'
            );
        });
    });

    // ============================================================
    // findPoolServicesByFilter
    // ============================================================
    describe('findPoolServicesByFilter', () => {
        const mockRequest = {
            body: { page: 1, limit: 16 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        const mockServicesData = [
            { data: [{ id: 1, name: 'Абонемент 8 занять', lesson_count: 8, price: 1000 }], count: 1 },
            1
        ];

        it('should return paginated pool services', async () => {
            sportsComplexRepository.findPoolServicesByFilter.mockResolvedValue(mockServicesData);

            const result = await sportsComplexService.findPoolServicesByFilter(mockRequest);

            expect(sportsComplexRepository.findPoolServicesByFilter).toHaveBeenCalled();
            expect(result).toHaveProperty('totalItems');
            expect(result).toHaveProperty('items');
        });

        it('should apply name filter correctly', async () => {
            const requestWithFilter = {
                ...mockRequest,
                body: { page: 1, limit: 16, name: 'Абонемент' }
            };
            sportsComplexRepository.findPoolServicesByFilter.mockResolvedValue(mockServicesData);

            await sportsComplexService.findPoolServicesByFilter(requestWithFilter);

            expect(sportsComplexRepository.findPoolServicesByFilter).toHaveBeenCalledWith(
                16, 0, expect.any(Array), { name: 'Абонемент' }, null, 'asc'
            );
        });

        it('should apply sorting by price', async () => {
            const requestWithSort = {
                ...mockRequest,
                body: { page: 1, limit: 16, sort_by: 'price', sort_direction: 'desc' }
            };
            sportsComplexRepository.findPoolServicesByFilter.mockResolvedValue(mockServicesData);

            const result = await sportsComplexService.findPoolServicesByFilter(requestWithSort);

            expect(result.sort_by).toBe('price');
            expect(result.sort_direction).toBe('desc');
        });

        it('should log search action when filters are applied', async () => {
            const requestWithFilter = {
                ...mockRequest,
                body: { page: 1, limit: 16, name: 'Басейн' }
            };
            sportsComplexRepository.findPoolServicesByFilter.mockResolvedValue(mockServicesData);

            await sportsComplexService.findPoolServicesByFilter(requestWithFilter);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SEARCH',
                    application_name: 'Пошук послуг басейну'
                })
            );
        });
    });

    // ============================================================
    // createPoolService
    // ============================================================
    describe('createPoolService', () => {
        const mockRequest = {
            body: {
                name: 'Абонемент 12 занять',
                lesson_count: 12,
                price: 1500,
                service_group_id: 1
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should create pool service successfully', async () => {
            sportsComplexRepository.createPoolService.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.createPoolService(mockRequest);

            expect(sportsComplexRepository.createPoolService).toHaveBeenCalledWith({
                name: 'Абонемент 12 занять',
                lesson_count: 12,
                price: 1500,
                service_group_id: 1
            });
            expect(result).toEqual({ success: true, message: 'Послугу успішно створено' });
        });

        it('should log creation action', async () => {
            sportsComplexRepository.createPoolService.mockResolvedValue({ id: 1 });

            await sportsComplexService.createPoolService(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    row_pk_id: 1,
                    action: 'INSERT',
                    application_name: 'Створення послуги басейну',
                    table_name: 'services'
                })
            );
        });

        it('should throw error on database failure', async () => {
            sportsComplexRepository.createPoolService.mockRejectedValue(new Error('DB Error'));

            await expect(sportsComplexService.createPoolService(mockRequest))
                .rejects.toThrow('DB Error');

            expect(logger.error).toHaveBeenCalledWith(
                '[SportsComplexService][createPoolService]',
                expect.any(Error)
            );
        });
    });

    // ============================================================
    // createClient
    // ============================================================
    describe('createClient', () => {
        const validRequest = {
            body: {
                name: 'Петренко Іван Петрович',
                phone_number: '+38 067 123 45 67',
                membership_number: ''
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should create client with valid phone number', async () => {
            sportsComplexRepository.generateUniqueClientNumber.mockResolvedValue('2501201234567');
            sportsComplexRepository.createClient.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.createClient(validRequest);

            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('id', 1);
            expect(result).toHaveProperty('membership_number', '2501201234567');
        });

        it('should throw error for invalid phone number', async () => {
            const invalidPhoneRequest = {
                ...validRequest,
                body: { ...validRequest.body, phone_number: '123456' }
            };

            await expect(sportsComplexService.createClient(invalidPhoneRequest))
                .rejects.toThrow('Номер телефону має бути у форматі +38 0XX XXX XX XX (український номер)');
        });

        it('should throw error for missing phone number', async () => {
            const missingPhoneRequest = {
                ...validRequest,
                body: { ...validRequest.body, phone_number: '' }
            };

            await expect(sportsComplexService.createClient(missingPhoneRequest))
                .rejects.toThrow('Номер телефону має бути у форматі +38 0XX XXX XX XX (український номер)');
        });

        it('should throw error for short name', async () => {
            const shortNameRequest = {
                ...validRequest,
                body: { ...validRequest.body, name: 'A' }
            };

            await expect(sportsComplexService.createClient(shortNameRequest))
                .rejects.toThrow("ПІБ клієнта обов'язкове і має містити мінімум 2 символи");
        });

        it('should throw error for empty name', async () => {
            const emptyNameRequest = {
                ...validRequest,
                body: { ...validRequest.body, name: '' }
            };

            await expect(sportsComplexService.createClient(emptyNameRequest))
                .rejects.toThrow("ПІБ клієнта обов'язкове і має містити мінімум 2 символи");
        });

        it('should use provided membership number if unique', async () => {
            const requestWithMembership = {
                ...validRequest,
                body: { ...validRequest.body, membership_number: 'CUSTOM123' }
            };
            sportsComplexRepository.checkMembershipUnique.mockResolvedValue(true);
            sportsComplexRepository.createClient.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.createClient(requestWithMembership);

            expect(result.membership_number).toBe('CUSTOM123');
        });

        it('should throw error for duplicate membership number', async () => {
            const requestWithDuplicateMembership = {
                ...validRequest,
                body: { ...validRequest.body, membership_number: 'EXISTING123' }
            };
            sportsComplexRepository.checkMembershipUnique.mockResolvedValue(false);

            await expect(sportsComplexService.createClient(requestWithDuplicateMembership))
                .rejects.toThrow('Номер абонемента "EXISTING123" вже існує');
        });

        it('should log creation action', async () => {
            sportsComplexRepository.generateUniqueClientNumber.mockResolvedValue('2501201234567');
            sportsComplexRepository.createClient.mockResolvedValue({ id: 1 });

            await sportsComplexService.createClient(validRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'INSERT',
                    application_name: 'Створення клієнта',
                    table_name: 'clients'
                })
            );
        });
    });

    // ============================================================
    // updateClient
    // ============================================================
    describe('updateClient', () => {
        const mockRequest = {
            params: { id: 1 },
            body: {
                name: 'Оновлене Ім\'я',
                membership_number: '12345',
                phone_number: '+38 067 123 45 67',
                subscription_duration: '30 днів',
                service_name: 'Басейн'
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should update client successfully', async () => {
            sportsComplexRepository.updateClient.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.updateClient(mockRequest);

            expect(sportsComplexRepository.updateClient).toHaveBeenCalledWith(1, {
                name: 'Оновлене Ім\'я',
                membership_number: '12345',
                phone_number: '+38 067 123 45 67',
                subscription_duration: '30 днів',
                service_name: 'Басейн'
            });
            expect(result).toEqual({ success: true, message: 'Клієнта успішно оновлено', id: 1 });
        });

        it('should log update action', async () => {
            sportsComplexRepository.updateClient.mockResolvedValue({ id: 1 });

            await sportsComplexService.updateClient(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'UPDATE',
                    application_name: 'Оновлення клієнта'
                })
            );
        });

        it('should throw error on database failure', async () => {
            sportsComplexRepository.updateClient.mockRejectedValue(new Error('Update failed'));

            await expect(sportsComplexService.updateClient(mockRequest))
                .rejects.toThrow('Update failed');
        });
    });

    // ============================================================
    // deleteClient
    // ============================================================
    describe('deleteClient', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should delete client successfully', async () => {
            sportsComplexRepository.deleteClient.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.deleteClient(mockRequest);

            expect(sportsComplexRepository.deleteClient).toHaveBeenCalledWith(1);
            expect(result).toEqual({ success: true, message: 'Клієнта успішно видалено' });
        });

        it('should throw error when client not found', async () => {
            sportsComplexRepository.deleteClient.mockResolvedValue(null);

            await expect(sportsComplexService.deleteClient(mockRequest))
                .rejects.toThrow('Клієнта не знайдено');
        });

        it('should log delete action', async () => {
            sportsComplexRepository.deleteClient.mockResolvedValue({ id: 1 });

            await sportsComplexService.deleteClient(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'DELETE',
                    application_name: 'Видалення клієнта'
                })
            );
        });
    });

    // ============================================================
    // searchClients
    // ============================================================
    describe('searchClients', () => {
        it('should search clients by name', async () => {
            const mockRequest = {
                body: { name: 'Петренко' }
            };
            const mockClients = [
                { name: 'Петренко Іван', phone_number: '+380671234567', membership_number: '123' }
            ];
            sportsComplexRepository.searchClientsByName.mockResolvedValue(mockClients);

            const result = await sportsComplexService.searchClients(mockRequest);

            expect(sportsComplexRepository.searchClientsByName).toHaveBeenCalledWith('Петренко');
            expect(result).toEqual(mockClients);
        });

        it('should return empty array when no clients found', async () => {
            const mockRequest = { body: { name: 'Невідомий' } };
            sportsComplexRepository.searchClientsByName.mockResolvedValue([]);

            const result = await sportsComplexService.searchClients(mockRequest);

            expect(result).toEqual([]);
        });

        it('should throw error on database failure', async () => {
            const mockRequest = { body: { name: 'Test' } };
            sportsComplexRepository.searchClientsByName.mockRejectedValue(new Error('Search failed'));

            await expect(sportsComplexService.searchClients(mockRequest))
                .rejects.toThrow('Search failed');
        });
    });

    // ============================================================
    // renewSubscription
    // ============================================================
    describe('renewSubscription', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should renew subscription successfully', async () => {
            sportsComplexRepository.getClientById.mockResolvedValue({ id: 1, name: 'Test' });
            sportsComplexRepository.renewClientSubscription.mockResolvedValue(true);

            const result = await sportsComplexService.renewSubscription(mockRequest);

            expect(result).toEqual({
                success: true,
                message: 'Абонемент успішно оновлено на 30 днів'
            });
        });

        it('should throw 404 error when client not found', async () => {
            sportsComplexRepository.getClientById.mockResolvedValue(null);

            await expect(sportsComplexService.renewSubscription(mockRequest))
                .rejects.toMatchObject({
                    message: 'Клієнта не знайдено',
                    statusCode: 404
                });
        });

        it('should throw error when renewal fails', async () => {
            sportsComplexRepository.getClientById.mockResolvedValue({ id: 1, name: 'Test' });
            sportsComplexRepository.renewClientSubscription.mockResolvedValue(false);

            await expect(sportsComplexService.renewSubscription(mockRequest))
                .rejects.toThrow('Помилка при оновленні абонемента');
        });

        it('should log renewal action', async () => {
            sportsComplexRepository.getClientById.mockResolvedValue({ id: 1, name: 'Test' });
            sportsComplexRepository.renewClientSubscription.mockResolvedValue(true);

            await sportsComplexService.renewSubscription(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'UPDATE',
                    application_name: 'Оновлення абонемента'
                })
            );
        });
    });

    // ============================================================
    // createBill
    // ============================================================
    describe('createBill', () => {
        const mockRequest = {
            body: {
                membership_number: '12345',
                client_name: 'Петренко Іван',
                phone_number: '+380671234567',
                service_id: 1,
                discount_type: 'orphans_heroes'
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should create bill successfully', async () => {
            sportsComplexRepository.createBillWithDiscount.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.createBill(mockRequest);

            expect(sportsComplexRepository.createBillWithDiscount).toHaveBeenCalledWith({
                membership_number: '12345',
                client_name: 'Петренко Іван',
                phone_number: '+380671234567',
                service_id: 1,
                discount_type: 'orphans_heroes'
            });
            expect(result).toEqual({
                success: true,
                message: 'Рахунок успішно створено',
                id: 1
            });
        });

        it('should create bill without discount', async () => {
            const requestWithoutDiscount = {
                ...mockRequest,
                body: { ...mockRequest.body, discount_type: null }
            };
            sportsComplexRepository.createBillWithDiscount.mockResolvedValue({ id: 2 });

            const result = await sportsComplexService.createBill(requestWithoutDiscount);

            expect(sportsComplexRepository.createBillWithDiscount).toHaveBeenCalledWith(
                expect.objectContaining({ discount_type: null })
            );
            expect(result.id).toBe(2);
        });

        it('should log bill creation', async () => {
            sportsComplexRepository.createBillWithDiscount.mockResolvedValue({ id: 1 });

            await sportsComplexService.createBill(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'INSERT',
                    application_name: 'Створення рахунку з пільгою',
                    table_name: 'payments'
                })
            );
        });
    });

    // ============================================================
    // updateBill
    // ============================================================
    describe('updateBill', () => {
        const mockRequest = {
            params: { id: 1 },
            body: {
                membership_number: '12345',
                client_name: 'Оновлене Ім\'я',
                phone_number: '+380671234567',
                service_id: 2,
                discount_type: 'war_veterans'
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should update bill successfully', async () => {
            sportsComplexRepository.updateBillWithDiscount.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.updateBill(mockRequest);

            expect(sportsComplexRepository.updateBillWithDiscount).toHaveBeenCalledWith(1, {
                membership_number: '12345',
                client_name: 'Оновлене Ім\'я',
                phone_number: '+380671234567',
                service_id: 2,
                discount_type: 'war_veterans'
            });
            expect(result).toEqual({ success: true, message: 'Рахунок успішно оновлено' });
        });

        it('should throw error when bill not found', async () => {
            sportsComplexRepository.updateBillWithDiscount.mockResolvedValue(null);

            await expect(sportsComplexService.updateBill(mockRequest))
                .rejects.toThrow('Рахунок не знайдено');
        });

        it('should log update action', async () => {
            sportsComplexRepository.updateBillWithDiscount.mockResolvedValue({ id: 1 });

            await sportsComplexService.updateBill(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'UPDATE',
                    application_name: 'Оновлення рахунку з пільгою'
                })
            );
        });
    });

    // ============================================================
    // validateUkrainianPhone
    // ============================================================
    describe('validateUkrainianPhone', () => {
        it('should validate correct Ukrainian phone numbers', () => {
            expect(sportsComplexService.validateUkrainianPhone('+380671234567')).toBe(true);
            expect(sportsComplexService.validateUkrainianPhone('+380501234567')).toBe(true);
            expect(sportsComplexService.validateUkrainianPhone('+380931234567')).toBe(true);
            expect(sportsComplexService.validateUkrainianPhone('+380961234567')).toBe(true);
            expect(sportsComplexService.validateUkrainianPhone('+380991234567')).toBe(true);
        });

        it('should validate phone numbers with spaces', () => {
            expect(sportsComplexService.validateUkrainianPhone('+38 067 123 45 67')).toBe(true);
            expect(sportsComplexService.validateUkrainianPhone('+38 050 123 45 67')).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(sportsComplexService.validateUkrainianPhone('1234567890')).toBe(false);
            expect(sportsComplexService.validateUkrainianPhone('+380121234567')).toBe(false);
            expect(sportsComplexService.validateUkrainianPhone('+38067123456')).toBe(false);
            expect(sportsComplexService.validateUkrainianPhone('+3806712345678')).toBe(false);
            expect(sportsComplexService.validateUkrainianPhone('invalid')).toBe(false);
        });

        it('should reject empty phone numbers', () => {
            expect(sportsComplexService.validateUkrainianPhone('')).toBe(false);
        });
    });

    // ============================================================
    // normalizeUkrainianPhone
    // ============================================================
    describe('normalizeUkrainianPhone', () => {
        it('should normalize phone number with spaces', () => {
            const result = sportsComplexService.normalizeUkrainianPhone('+380671234567');
            expect(result).toBe('+38 067 123 45 67');
        });

        it('should add + prefix if missing', () => {
            const result = sportsComplexService.normalizeUkrainianPhone('380671234567');
            expect(result).toBe('+38 067 123 45 67');
        });

        it('should handle phone with existing spaces', () => {
            const result = sportsComplexService.normalizeUkrainianPhone('+38 067 123 45 67');
            expect(result).toBe('+38 067 123 45 67');
        });

        it('should return original phone if invalid format', () => {
            const result = sportsComplexService.normalizeUkrainianPhone('1234567');
            expect(result).toBe('1234567');
        });
    });

    // ============================================================
    // getById
    // ============================================================
    describe('getById', () => {
        it('should return requisite by id', async () => {
            const mockRequisite = { id: 1, kved: '93.11' };
            sportsComplexRepository.getById.mockResolvedValue(mockRequisite);

            const result = await sportsComplexService.getById(1);

            expect(sportsComplexRepository.getById).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockRequisite);
        });

        it('should throw error on database failure', async () => {
            sportsComplexRepository.getById.mockRejectedValue(new Error('Not found'));

            await expect(sportsComplexService.getById(999))
                .rejects.toThrow('Not found');
        });
    });

    // ============================================================
    // getServiceGroups
    // ============================================================
    describe('getServiceGroups', () => {
        it('should return all service groups', async () => {
            const mockGroups = [{ id: 1, name: 'Басейн' }, { id: 2, name: 'Зал' }];
            sportsComplexRepository.getServiceGroups.mockResolvedValue(mockGroups);

            const result = await sportsComplexService.getServiceGroups();

            expect(result).toEqual(mockGroups);
        });

        it('should return empty array when no groups', async () => {
            sportsComplexRepository.getServiceGroups.mockResolvedValue([]);

            const result = await sportsComplexService.getServiceGroups();

            expect(result).toEqual([]);
        });
    });

    // ============================================================
    // getServicesByGroup
    // ============================================================
    describe('getServicesByGroup', () => {
        it('should return services by group id', async () => {
            const mockServices = [
                { id: 1, name: 'Абонемент 8', lesson_count: 8, price: 1000 }
            ];
            sportsComplexRepository.getServicesByGroup.mockResolvedValue(mockServices);

            const result = await sportsComplexService.getServicesByGroup(1);

            expect(sportsComplexRepository.getServicesByGroup).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockServices);
        });
    });

    // ============================================================
    // createRequisite
    // ============================================================
    describe('createRequisite', () => {
        const mockRequest = {
            body: {
                kved: '93.11',
                iban: 'UA123456789012345678901234567',
                edrpou: '12345678',
                service_group_id: 1
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should create requisite successfully', async () => {
            sportsComplexRepository.createRequisite.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.createRequisite(mockRequest);

            expect(result).toEqual({ success: true, message: 'Реквізити успішно створено' });
        });

        it('should log creation action', async () => {
            sportsComplexRepository.createRequisite.mockResolvedValue({ id: 1 });

            await sportsComplexService.createRequisite(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'INSERT',
                    application_name: 'Створення реквізитів',
                    table_name: 'requisites'
                })
            );
        });
    });

    // ============================================================
    // updateRequisite
    // ============================================================
    describe('updateRequisite', () => {
        const mockRequest = {
            params: { id: 1 },
            body: {
                kved: '93.12',
                iban: 'UA987654321',
                edrpou: '87654321',
                service_group_id: 2
            },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should update requisite successfully', async () => {
            sportsComplexRepository.updateRequisite.mockResolvedValue({ id: 1 });

            const result = await sportsComplexService.updateRequisite(mockRequest);

            expect(result).toEqual({ success: true, message: 'Реквізити успішно оновлено' });
        });

        it('should throw error when requisite not found', async () => {
            sportsComplexRepository.updateRequisite.mockResolvedValue(null);

            await expect(sportsComplexService.updateRequisite(mockRequest))
                .rejects.toThrow('Реквізити не знайдено');
        });
    });

    // ============================================================
    // getBillById
    // ============================================================
    describe('getBillById', () => {
        it('should return bill by id', async () => {
            const mockBill = { id: 1, client_name: 'Test', total_price: 1000 };
            sportsComplexRepository.getBillByIdWithDiscount.mockResolvedValue(mockBill);

            const result = await sportsComplexService.getBillById(1);

            expect(sportsComplexRepository.getBillByIdWithDiscount).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockBill);
        });
    });

    // ============================================================
    // findClientsByFilter
    // ============================================================
    describe('findClientsByFilter', () => {
        const mockRequest = {
            body: { page: 1, limit: 16 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        const mockClientsData = [
            { data: [{ id: 1, name: 'Test Client' }], count: 1 },
            1
        ];

        it('should return paginated clients', async () => {
            sportsComplexRepository.findClientsByFilter.mockResolvedValue(mockClientsData);

            const result = await sportsComplexService.findClientsByFilter(mockRequest);

            expect(result).toHaveProperty('totalItems');
            expect(result).toHaveProperty('items');
        });

        it('should apply sorting', async () => {
            const requestWithSort = {
                ...mockRequest,
                body: { page: 1, limit: 16, sort_by: 'name', sort_direction: 'asc' }
            };
            sportsComplexRepository.findClientsByFilter.mockResolvedValue(mockClientsData);

            const result = await sportsComplexService.findClientsByFilter(requestWithSort);

            expect(result.sort_by).toBe('name');
            expect(result.sort_direction).toBe('asc');
        });
    });

    // ============================================================
    // startLesson
    // ============================================================
    describe('startLesson', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should start lesson successfully', async () => {
            sportsComplexRepository.startLesson.mockResolvedValue({
                success: true,
                message: 'Заняття успішно розпочато',
                remaining_visits: 7
            });

            const result = await sportsComplexService.startLesson(mockRequest);

            expect(result).toEqual({
                success: true,
                message: 'Заняття успішно розпочато',
                remaining_visits: 7
            });
        });

        it('should throw error when no remaining visits', async () => {
            sportsComplexRepository.startLesson.mockResolvedValue({
                success: false,
                message: 'Кількість занять використана'
            });

            await expect(sportsComplexService.startLesson(mockRequest))
                .rejects.toThrow('Кількість занять використана');
        });
    });

    // ============================================================
    // downloadBill
    // ============================================================
    describe('downloadBill', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '192.168.1.1'
        };

        it('should download bill successfully', async () => {
            sportsComplexRepository.getBillByIdWithDiscount.mockResolvedValue({
                id: 1,
                client_name: 'Test'
            });

            const result = await sportsComplexService.downloadBill(mockRequest);

            expect(result).toBeInstanceOf(Buffer);
        });

        it('should throw error when bill not found', async () => {
            sportsComplexRepository.getBillByIdWithDiscount.mockResolvedValue(null);

            await expect(sportsComplexService.downloadBill(mockRequest))
                .rejects.toThrow('Рахунок не знайдено');
        });
    });

    // ============================================================
    // searchClientByMembership
    // ============================================================
    describe('searchClientByMembership', () => {
        it('should find client by membership number', async () => {
            const mockClient = { name: 'Test', membership_number: '12345' };
            sportsComplexRepository.searchClientByMembership.mockResolvedValue(mockClient);

            const result = await sportsComplexService.searchClientByMembership({
                body: { membership_number: '12345' }
            });

            expect(result).toEqual({ data: mockClient });
        });

        it('should return null data when client not found', async () => {
            sportsComplexRepository.searchClientByMembership.mockResolvedValue(null);

            const result = await sportsComplexService.searchClientByMembership({
                body: { membership_number: 'nonexistent' }
            });

            expect(result).toEqual({ data: null });
        });
    });

    // ============================================================
    // Helper methods
    // ============================================================
    describe('Helper methods', () => {
        describe('determineReportType', () => {
            it('should return all_time for empty bills', () => {
                const result = sportsComplexService.determineReportType([]);
                expect(result).toBe('all_time');
            });

            it('should return today for bills from today', () => {
                const today = new Date();
                const bills = [
                    { created_at: today.toISOString() },
                    { created_at: today.toISOString() }
                ];
                const result = sportsComplexService.determineReportType(bills);
                expect(result).toBe('today');
            });

            it('should return specific_date for bills from same date', () => {
                const date = new Date('2024-01-15');
                const bills = [
                    { created_at: date.toISOString() },
                    { created_at: date.toISOString() }
                ];
                const result = sportsComplexService.determineReportType(bills);
                expect(result).toBe('specific_date');
            });

            it('should return all_time for bills from different dates', () => {
                const bills = [
                    { created_at: new Date('2024-01-15').toISOString() },
                    { created_at: new Date('2024-01-16').toISOString() }
                ];
                const result = sportsComplexService.determineReportType(bills);
                expect(result).toBe('all_time');
            });
        });

        describe('getDiscountLabel', () => {
            it('should return correct label for known discount types', () => {
                expect(sportsComplexService.getDiscountLabel('orphans_heroes'))
                    .toBe("Дітям-сиротам та багатодітним сім'ям");
                expect(sportsComplexService.getDiscountLabel('war_veterans'))
                    .toBe('Учасникам бойових дій');
                expect(sportsComplexService.getDiscountLabel('disability_1_2'))
                    .toBe('Особам з інвалідністю I-II групи');
            });

            it('should return "Без пільги" for null discount', () => {
                expect(sportsComplexService.getDiscountLabel(null)).toBe('Без пільги');
            });

            it('should return original value for unknown discount type', () => {
                expect(sportsComplexService.getDiscountLabel('unknown_type')).toBe('unknown_type');
            });
        });

        describe('getDocumentTitle', () => {
            it('should return day report title for today', () => {
                const result = sportsComplexService.getDocumentTitle('today', '23.01.2026');
                expect(result).toBe('Звіт за день (23.01.2026)');
            });

            it('should return day report title for specific date', () => {
                const result = sportsComplexService.getDocumentTitle('specific_date', '15.01.2024');
                expect(result).toBe('Звіт за день (15.01.2024)');
            });

            it('should return all time title for all_time', () => {
                const result = sportsComplexService.getDocumentTitle('all_time', null);
                expect(result).toBe('Звіт по платежам за увесь час');
            });
        });
    });

    // ============================================================
    // Error logging
    // ============================================================
    describe('Error logging', () => {
        it('should log errors with correct context', async () => {
            sportsComplexRepository.getById.mockRejectedValue(new Error('Test error'));

            try {
                await sportsComplexService.getById(1);
            } catch (e) {
                // Expected
            }

            expect(logger.error).toHaveBeenCalledWith(
                '[SportsComplexService][getById]',
                expect.any(Error)
            );
        });
    });
});
