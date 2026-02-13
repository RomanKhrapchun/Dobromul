/**
 * Integration Tests for SportsComplex API
 * Tests the complete flow of sportscomplex module endpoints
 * Using testHelper.js utilities for mocking
 */

const {
  createMockRequest,
  createMockReply,
  authenticateRequest,
  randomString
} = require('./testHelper');

// Mock the logger first (before requiring other modules)
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock log repository
jest.mock('../../modules/log/repository/log-repository', () => ({
  createLog: jest.fn().mockResolvedValue({ id: 1 })
}));

// Mock the sportscomplex service
jest.mock('../../modules/sportscomplex/service/sportscomplex-service', () => ({
  // Requisites
  findRequisitesByFilter: jest.fn(),
  createRequisite: jest.fn(),
  updateRequisite: jest.fn(),
  // Services
  findPoolServicesByFilter: jest.fn(),
  createPoolService: jest.fn(),
  getServiceById: jest.fn(),
  updateService: jest.fn(),
  // Service Groups
  createServiceGroup: jest.fn(),
  getServiceGroups: jest.fn(),
  getServicesByGroup: jest.fn(),
  // Clients
  findClientsByFilter: jest.fn(),
  createClient: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
  getClientById: jest.fn(),
  renewSubscription: jest.fn(),
  startLesson: jest.fn(),
  searchClients: jest.fn(),
  searchClientByMembership: jest.fn(),
  // Bills
  findBillsByFilter: jest.fn(),
  createBill: jest.fn(),
  updateBill: jest.fn(),
  getBillById: jest.fn(),
  getBillsReport: jest.fn(),
  downloadBill: jest.fn(),
  exportBillsToWord: jest.fn(),
  // Other
  getById: jest.fn(),
  generateWordById: jest.fn(),
  printById: jest.fn(),
}));

const sportsComplexService = require('../../modules/sportscomplex/service/sportscomplex-service');
const sportsComplexController = require('../../modules/sportscomplex/controller/sportscomplex-controller');

describe('SportsComplex API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // REQUISITES API TESTS
  // ============================================================
  describe('Requisites API', () => {

    // -----------------------------------------------------------
    // POST /api/sportscomplex/filter-requisites
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/filter-requisites', () => {

      it('should return paginated requisites list', async () => {
        const mockResponse = {
          items: [
            { id: 1, kved: '93.11', iban: 'UA123456789012345678901234567', edrpou: '12345678' },
            { id: 2, kved: '93.12', iban: 'UA987654321098765432109876543', edrpou: '87654321' }
          ],
          pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
          sort_by: null,
          sort_direction: 'asc'
        };

        sportsComplexService.findRequisitesByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findRequisitesByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should filter requisites by kved', async () => {
        const mockResponse = {
          items: [{ id: 1, kved: '93.11', iban: 'UA123456789012345678901234567' }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 },
          sort_by: null,
          sort_direction: 'asc'
        };

        sportsComplexService.findRequisitesByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, kved: '93.11' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findRequisitesByFilter(request, reply);

        expect(sportsComplexService.findRequisitesByFilter).toHaveBeenCalledWith(request);
      });

      it('should return empty data when no requisites match filter', async () => {
        const mockResponse = {
          items: [],
          pagination: { page: 1, limit: 16, total: 0, totalPages: 0 }
        };

        sportsComplexService.findRequisitesByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, kved: 'nonexistent' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findRequisitesByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should handle database error gracefully', async () => {
        sportsComplexService.findRequisitesByFilter.mockRejectedValue(new Error('Database connection failed'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findRequisitesByFilter(request, reply);

        expect(reply.getStatus()).toBe(500);
        expect(reply.getSentData()).toHaveProperty('error');
      });
    });

    // -----------------------------------------------------------
    // POST /api/sportscomplex/requisites - Create requisite
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/requisites', () => {

      it('should create a new requisite successfully', async () => {
        const mockResult = { success: true, message: 'Requisites created successfully' };
        sportsComplexService.createRequisite.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            kved: '93.11',
            iban: 'UA123456789012345678901234567',
            edrpou: '12345678',
            service_group_id: 1
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createRequisite(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle validation error for missing fields', async () => {
        sportsComplexService.createRequisite.mockRejectedValue(new Error('Missing required fields'));

        const request = authenticateRequest(createMockRequest({
          body: {}
        }));
        const reply = createMockReply();

        await sportsComplexController.createRequisite(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/requisites/:id - Update requisite
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/requisites/:id', () => {

      it('should update requisite successfully', async () => {
        const mockResult = { success: true, message: 'Requisites updated successfully' };
        sportsComplexService.updateRequisite.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { kved: '93.12', iban: 'UA999999999999999999999999999' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateRequisite(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should return 500 when requisite not found', async () => {
        sportsComplexService.updateRequisite.mockRejectedValue(new Error('Requisites not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { kved: '93.12' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateRequisite(request, reply);

        expect(reply.getStatus()).toBe(500);
        expect(reply.getSentData()).toHaveProperty('error');
      });
    });
  });

  // ============================================================
  // SERVICES (POOL) API TESTS
  // ============================================================
  describe('Services API', () => {

    // -----------------------------------------------------------
    // POST /api/sportscomplex/filter-pool
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/filter-pool', () => {

      it('should return paginated services list', async () => {
        const mockResponse = {
          items: [
            { id: 1, name: 'Swimming lessons', lesson_count: 8, price: 500 },
            { id: 2, name: 'Aqua aerobics', lesson_count: 12, price: 800 }
          ],
          pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
          sort_by: null,
          sort_direction: 'asc'
        };

        sportsComplexService.findPoolServicesByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findPoolServicesByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should filter services by name', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'Swimming lessons', lesson_count: 8, price: 500 }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
        };

        sportsComplexService.findPoolServicesByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, name: 'Swimming' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findPoolServicesByFilter(request, reply);

        expect(sportsComplexService.findPoolServicesByFilter).toHaveBeenCalledWith(request);
      });

      it('should handle database error gracefully', async () => {
        sportsComplexService.findPoolServicesByFilter.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findPoolServicesByFilter(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // POST /api/sportscomplex/services - Create service
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/services', () => {

      it('should create a new service successfully', async () => {
        const mockResult = { success: true, message: 'Service created successfully' };
        sportsComplexService.createPoolService.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            name: 'New Service_' + randomString(4),
            lesson_count: 10,
            price: 600,
            service_group_id: 1
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createPoolService(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle validation error', async () => {
        sportsComplexService.createPoolService.mockRejectedValue(new Error('Validation error'));

        const request = authenticateRequest(createMockRequest({
          body: {}
        }));
        const reply = createMockReply();

        await sportsComplexController.createPoolService(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // GET /api/sportscomplex/service/:id
    // -----------------------------------------------------------
    describe('GET /api/sportscomplex/service/:id', () => {

      it('should return service by ID', async () => {
        const mockService = { id: 1, name: 'Swimming lessons', lesson_count: 8, price: 500 };
        sportsComplexService.getServiceById.mockResolvedValue(mockService);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getServiceById(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockService);
      });

      it('should handle service not found', async () => {
        sportsComplexService.getServiceById.mockRejectedValue(new Error('Service not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getServiceById(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/service/:id - Update service
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/service/:id', () => {

      it('should update service successfully', async () => {
        const mockResult = { success: true, message: 'Service updated successfully' };
        sportsComplexService.updateService.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { name: 'Updated Service', price: 700 }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateService(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle service not found error', async () => {
        sportsComplexService.updateService.mockRejectedValue(new Error('Service not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { name: 'Updated Service' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateService(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });
  });

  // ============================================================
  // SERVICE GROUPS API TESTS
  // ============================================================
  describe('Service Groups API', () => {

    // -----------------------------------------------------------
    // POST /api/sportscomplex/service-groups - Create service group
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/service-groups', () => {

      it('should create a new service group successfully', async () => {
        const mockResult = { id: 1, name: 'Pool Services' };
        sportsComplexService.createServiceGroup.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: { name: 'Pool Services_' + randomString(4) }
        }));
        const reply = createMockReply();

        await sportsComplexController.createServiceGroup(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle duplicate service group name', async () => {
        sportsComplexService.createServiceGroup.mockRejectedValue(new Error('Service group already exists'));

        const request = authenticateRequest(createMockRequest({
          body: { name: 'Existing Group' }
        }));
        const reply = createMockReply();

        await sportsComplexController.createServiceGroup(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // GET /api/sportscomplex/service-groups
    // -----------------------------------------------------------
    describe('GET /api/sportscomplex/service-groups', () => {

      it('should return all service groups', async () => {
        const mockGroups = [
          { id: 1, name: 'Pool Services' },
          { id: 2, name: 'Gym Services' }
        ];
        sportsComplexService.getServiceGroups.mockResolvedValue(mockGroups);

        const request = authenticateRequest(createMockRequest({}));
        const reply = createMockReply();

        await sportsComplexController.getServiceGroups(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockGroups);
      });

      it('should return empty array when no service groups exist', async () => {
        sportsComplexService.getServiceGroups.mockResolvedValue([]);

        const request = authenticateRequest(createMockRequest({}));
        const reply = createMockReply();

        await sportsComplexController.getServiceGroups(request, reply);

        expect(reply.send).toHaveBeenCalledWith([]);
      });

      it('should handle database error', async () => {
        sportsComplexService.getServiceGroups.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({}));
        const reply = createMockReply();

        await sportsComplexController.getServiceGroups(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });
  });

  // ============================================================
  // CLIENTS API TESTS
  // ============================================================
  describe('Clients API', () => {

    // -----------------------------------------------------------
    // POST /api/sportscomplex/clients/filter
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/clients/filter', () => {

      it('should return paginated clients list', async () => {
        const mockResponse = {
          items: [
            { id: 1, name: 'John Doe', phone_number: '+38 050 123 45 67', membership_number: 'SC001' },
            { id: 2, name: 'Jane Smith', phone_number: '+38 050 987 65 43', membership_number: 'SC002' }
          ],
          pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
          sort_by: null,
          sort_direction: 'asc'
        };

        sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findClientsByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should filter clients by name', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'John Doe', membership_number: 'SC001' }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
        };

        sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, name: 'John' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findClientsByFilter(request, reply);

        expect(sportsComplexService.findClientsByFilter).toHaveBeenCalledWith(request);
      });

      it('should filter clients by membership_number', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'John Doe', membership_number: 'SC001' }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
        };

        sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, membership_number: 'SC001' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findClientsByFilter(request, reply);

        expect(sportsComplexService.findClientsByFilter).toHaveBeenCalledWith(request);
      });

      it('should return empty data when no clients match filter', async () => {
        const mockResponse = {
          items: [],
          pagination: { page: 1, limit: 16, total: 0, totalPages: 0 }
        };

        sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, name: 'nonexistent' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findClientsByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should handle database error gracefully', async () => {
        sportsComplexService.findClientsByFilter.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findClientsByFilter(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // POST /api/sportscomplex/clients - Create client
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/clients', () => {

      it('should create a new client successfully', async () => {
        const mockResult = {
          success: true,
          message: 'Client created successfully',
          id: 1,
          membership_number: 'SC001'
        };
        sportsComplexService.createClient.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            name: 'New Client_' + randomString(4),
            phone_number: '+38 050 123 45 67',
            membership_number: ''
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createClient(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle duplicate membership number error', async () => {
        sportsComplexService.createClient.mockRejectedValue(new Error('Membership number already exists'));

        const request = authenticateRequest(createMockRequest({
          body: {
            name: 'Test Client',
            phone_number: '+38 050 123 45 67',
            membership_number: 'SC001'
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createClient(request, reply);

        expect(reply.getStatus()).toBe(500);
      });

      it('should handle validation error for invalid phone', async () => {
        sportsComplexService.createClient.mockRejectedValue(new Error('Invalid phone number format'));

        const request = authenticateRequest(createMockRequest({
          body: {
            name: 'Test Client',
            phone_number: '12345',
            membership_number: ''
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createClient(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/clients/:id - Update client
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/clients/:id', () => {

      it('should update client successfully', async () => {
        const mockResult = { success: true, message: 'Client updated successfully', id: 1 };
        sportsComplexService.updateClient.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { name: 'Updated Name', phone_number: '+38 050 999 99 99' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateClient(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle client not found error', async () => {
        sportsComplexService.updateClient.mockRejectedValue(new Error('Client not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { name: 'Updated Name' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateClient(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // DELETE /api/sportscomplex/clients/:id - Delete client
    // -----------------------------------------------------------
    describe('DELETE /api/sportscomplex/clients/:id', () => {

      it('should delete client successfully', async () => {
        const mockResult = { success: true, message: 'Client deleted successfully' };
        sportsComplexService.deleteClient.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.deleteClient(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle client not found error', async () => {
        sportsComplexService.deleteClient.mockRejectedValue(new Error('Client not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await sportsComplexController.deleteClient(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/clients/:id/renew-subscription
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/clients/:id/renew-subscription', () => {

      it('should renew subscription successfully', async () => {
        const mockResult = { success: true, message: 'Subscription renewed for 30 days' };
        sportsComplexService.renewSubscription.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        const result = await sportsComplexController.renewSubscription(request, reply);

        expect(result).toEqual(mockResult);
      });

      it('should handle client not found for renewal', async () => {
        const error = new Error('Client not found');
        error.statusCode = 404;
        sportsComplexService.renewSubscription.mockRejectedValue(error);

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        const result = await sportsComplexController.renewSubscription(request, reply);

        expect(result.success).toBe(false);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/clients/:id/start-lesson
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/clients/:id/start-lesson', () => {

      it('should start lesson successfully', async () => {
        const mockResult = {
          success: true,
          message: 'Lesson started',
          remaining_lessons: 7
        };
        sportsComplexService.startLesson.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.startLesson(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle no remaining lessons error', async () => {
        sportsComplexService.startLesson.mockRejectedValue(new Error('No remaining lessons'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.startLesson(request, reply);

        expect(reply.getStatus()).toBe(500);
      });

      it('should handle expired subscription error', async () => {
        sportsComplexService.startLesson.mockRejectedValue(new Error('Subscription expired'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.startLesson(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });
  });

  // ============================================================
  // BILLS API TESTS
  // ============================================================
  describe('Bills API', () => {

    // -----------------------------------------------------------
    // POST /api/sportscomplex/bills/filter
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/bills/filter', () => {

      it('should return paginated bills list', async () => {
        const mockResponse = {
          items: [
            { id: 1, membership_number: 'SC001', client_name: 'John Doe', total_price: 500 },
            { id: 2, membership_number: 'SC002', client_name: 'Jane Smith', total_price: 800 }
          ],
          pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
          sort_by: null,
          sort_direction: 'asc'
        };

        sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findBillsByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should filter bills by membership_number', async () => {
        const mockResponse = {
          items: [{ id: 1, membership_number: 'SC001', client_name: 'John Doe' }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
        };

        sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, membership_number: 'SC001' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findBillsByFilter(request, reply);

        expect(sportsComplexService.findBillsByFilter).toHaveBeenCalledWith(request);
      });

      it('should filter bills by client_name', async () => {
        const mockResponse = {
          items: [{ id: 1, client_name: 'John Doe', total_price: 500 }],
          pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
        };

        sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, client_name: 'John' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findBillsByFilter(request, reply);

        expect(sportsComplexService.findBillsByFilter).toHaveBeenCalledWith(request);
      });

      it('should return empty data when no bills match filter', async () => {
        const mockResponse = {
          items: [],
          pagination: { page: 1, limit: 16, total: 0, totalPages: 0 }
        };

        sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16, client_name: 'nonexistent' }
        }));
        const reply = createMockReply();

        await sportsComplexController.findBillsByFilter(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResponse);
      });

      it('should handle database error gracefully', async () => {
        sportsComplexService.findBillsByFilter.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();

        await sportsComplexController.findBillsByFilter(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // POST /api/sportscomplex/bills - Create bill
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/bills', () => {

      it('should create a new bill successfully', async () => {
        const mockResult = {
          success: true,
          message: 'Bill created successfully',
          id: 1
        };
        sportsComplexService.createBill.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            membership_number: 'SC001',
            client_name: 'John Doe',
            phone_number: '+38 050 123 45 67',
            service_id: 1,
            discount_type: null
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createBill(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should create bill with discount', async () => {
        const mockResult = {
          success: true,
          message: 'Bill created with discount',
          id: 2
        };
        sportsComplexService.createBill.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            membership_number: 'SC002',
            client_name: 'Jane Smith',
            phone_number: '+38 050 987 65 43',
            service_id: 1,
            discount_type: 'war_veterans'
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.createBill(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle validation error', async () => {
        sportsComplexService.createBill.mockRejectedValue(new Error('Validation error'));

        const request = authenticateRequest(createMockRequest({
          body: {}
        }));
        const reply = createMockReply();

        await sportsComplexController.createBill(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/sportscomplex/bills/:id - Update bill
    // -----------------------------------------------------------
    describe('PUT /api/sportscomplex/bills/:id', () => {

      it('should update bill successfully', async () => {
        const mockResult = { success: true, message: 'Bill updated successfully' };
        sportsComplexService.updateBill.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: {
            client_name: 'Updated Name',
            discount_type: 'military_service'
          }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateBill(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockResult);
      });

      it('should handle bill not found error', async () => {
        sportsComplexService.updateBill.mockRejectedValue(new Error('Bill not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { client_name: 'Updated Name' }
        }));
        const reply = createMockReply();

        await sportsComplexController.updateBill(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // GET /api/sportscomplex/bills/:id
    // -----------------------------------------------------------
    describe('GET /api/sportscomplex/bills/:id', () => {

      it('should return bill by ID', async () => {
        const mockBill = {
          id: 1,
          membership_number: 'SC001',
          client_name: 'John Doe',
          total_price: 500,
          discount_type: null
        };
        sportsComplexService.getBillById.mockResolvedValue(mockBill);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getBillById(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockBill);
      });

      it('should handle bill not found', async () => {
        sportsComplexService.getBillById.mockRejectedValue(new Error('Bill not found'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getBillById(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });

    // -----------------------------------------------------------
    // POST /api/sportscomplex/bills/report
    // -----------------------------------------------------------
    describe('POST /api/sportscomplex/bills/report', () => {

      it('should return bills report', async () => {
        const mockReport = {
          success: true,
          data: [
            { id: 1, membership_number: 'SC001', client_name: 'John Doe', total_price: 500 },
            { id: 2, membership_number: 'SC002', client_name: 'Jane Smith', total_price: 800 }
          ]
        };
        sportsComplexService.getBillsReport.mockResolvedValue(mockReport);

        const request = authenticateRequest(createMockRequest({
          body: { date_from: '2025-01-01', date_to: '2025-01-31' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getBillsReport(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockReport);
      });

      it('should return empty report when no bills in date range', async () => {
        const mockReport = {
          success: true,
          data: []
        };
        sportsComplexService.getBillsReport.mockResolvedValue(mockReport);

        const request = authenticateRequest(createMockRequest({
          body: { date_from: '2020-01-01', date_to: '2020-01-31' }
        }));
        const reply = createMockReply();

        await sportsComplexController.getBillsReport(request, reply);

        expect(reply.send).toHaveBeenCalledWith(mockReport);
      });

      it('should handle database error in report', async () => {
        sportsComplexService.getBillsReport.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: {}
        }));
        const reply = createMockReply();

        await sportsComplexController.getBillsReport(request, reply);

        expect(reply.getStatus()).toBe(500);
      });
    });
  });

  // ============================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================
  describe('Edge Cases and Error Handling', () => {

    it('should handle very large page numbers for clients', async () => {
      const mockResponse = {
        items: [],
        pagination: { page: 1000, limit: 16, total: 100, totalPages: 7 }
      };
      sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1000, limit: 16 }
      }));
      const reply = createMockReply();

      await sportsComplexController.findClientsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle special characters in client name search', async () => {
      const mockResponse = {
        items: [],
        pagination: { page: 1, limit: 16, total: 0, totalPages: 0 }
      };
      sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16, name: "O'Brien-Smith" }
      }));
      const reply = createMockReply();

      await sportsComplexController.findClientsByFilter(request, reply);

      expect(sportsComplexService.findClientsByFilter).toHaveBeenCalledWith(request);
    });

    it('should handle Ukrainian characters in client names', async () => {
      const mockResponse = {
        items: [{ id: 1, name: 'Iван Петренко-Ковальчук', membership_number: 'SC001' }],
        pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
      };

      sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16, name: 'Iван' }
      }));
      const reply = createMockReply();

      await sportsComplexController.findClientsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle empty request body for bills filter', async () => {
      const mockResponse = {
        items: [],
        pagination: { page: 1, limit: 16, total: 0, totalPages: 0 }
      };
      sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: {}
      }));
      const reply = createMockReply();

      await sportsComplexController.findBillsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle concurrent requests to clients filter', async () => {
      const mockResponse = {
        items: [{ id: 1 }],
        pagination: { page: 1, limit: 16, total: 1, totalPages: 1 }
      };
      sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

      const requests = Array(5).fill(null).map(() => {
        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 16 }
        }));
        const reply = createMockReply();
        return sportsComplexController.findClientsByFilter(request, reply);
      });

      await Promise.all(requests);

      expect(sportsComplexService.findClientsByFilter).toHaveBeenCalledTimes(5);
    });
  });

  // ============================================================
  // SORTING TESTS
  // ============================================================
  describe('Sorting', () => {

    it('should sort bills by created_at ascending', async () => {
      const mockResponse = {
        items: [
          { id: 1, created_at: '2025-01-01' },
          { id: 2, created_at: '2025-01-02' }
        ],
        pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
        sort_by: 'created_at',
        sort_direction: 'asc'
      };

      sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16, sort_by: 'created_at', sort_direction: 'asc' }
      }));
      const reply = createMockReply();

      await sportsComplexController.findBillsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should sort bills by total_price descending', async () => {
      const mockResponse = {
        items: [
          { id: 2, total_price: 800 },
          { id: 1, total_price: 500 }
        ],
        pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
        sort_by: 'total_price',
        sort_direction: 'desc'
      };

      sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16, sort_by: 'total_price', sort_direction: 'desc' }
      }));
      const reply = createMockReply();

      await sportsComplexController.findBillsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should sort clients by name ascending', async () => {
      const mockResponse = {
        items: [
          { id: 1, name: 'Anna' },
          { id: 2, name: 'Boris' }
        ],
        pagination: { page: 1, limit: 16, total: 2, totalPages: 1 },
        sort_by: 'name',
        sort_direction: 'asc'
      };

      sportsComplexService.findClientsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16, sort_by: 'name', sort_direction: 'asc' }
      }));
      const reply = createMockReply();

      await sportsComplexController.findClientsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });

    it('should use default sorting when not specified', async () => {
      const mockResponse = {
        items: [],
        pagination: { page: 1, limit: 16, total: 0, totalPages: 0 },
        sort_by: null,
        sort_direction: 'asc'
      };
      sportsComplexService.findBillsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 16 }
      }));
      const reply = createMockReply();

      await sportsComplexController.findBillsByFilter(request, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResponse);
    });
  });

  // ============================================================
  // DISCOUNT TYPES TESTS
  // ============================================================
  describe('Discount Types', () => {

    it('should create bill with orphans_heroes discount', async () => {
      const mockResult = { success: true, id: 1 };
      sportsComplexService.createBill.mockResolvedValue(mockResult);

      const request = authenticateRequest(createMockRequest({
        body: {
          membership_number: 'SC001',
          client_name: 'Test Client',
          phone_number: '+38 050 123 45 67',
          service_id: 1,
          discount_type: 'orphans_heroes'
        }
      }));
      const reply = createMockReply();

      await sportsComplexController.createBill(request, reply);

      expect(sportsComplexService.createBill).toHaveBeenCalledWith(request);
    });

    it('should create bill with refugees_heroes_war discount', async () => {
      const mockResult = { success: true, id: 2 };
      sportsComplexService.createBill.mockResolvedValue(mockResult);

      const request = authenticateRequest(createMockRequest({
        body: {
          membership_number: 'SC002',
          client_name: 'Test Client 2',
          phone_number: '+38 050 987 65 43',
          service_id: 1,
          discount_type: 'refugees_heroes_war'
        }
      }));
      const reply = createMockReply();

      await sportsComplexController.createBill(request, reply);

      expect(sportsComplexService.createBill).toHaveBeenCalledWith(request);
    });

    it('should create bill with disability_1_2 discount', async () => {
      const mockResult = { success: true, id: 3 };
      sportsComplexService.createBill.mockResolvedValue(mockResult);

      const request = authenticateRequest(createMockRequest({
        body: {
          membership_number: 'SC003',
          client_name: 'Test Client 3',
          phone_number: '+38 050 111 22 33',
          service_id: 1,
          discount_type: 'disability_1_2'
        }
      }));
      const reply = createMockReply();

      await sportsComplexController.createBill(request, reply);

      expect(sportsComplexService.createBill).toHaveBeenCalledWith(request);
    });
  });
});
