/**
 * Integration Tests for Kindergarten API
 * Tests the complete flow of kindergarten module endpoints
 * Using testHelper.js utilities for mocking
 */

const {
  createMockRequest,
  createMockReply,
  authenticateRequest,
  assertResponse,
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

// Mock the kindergarten service
jest.mock('../../modules/kindergarten/service/kindergarten-service', () => ({
  // Groups
  findGroupsByFilter: jest.fn(),
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  // Children
  findChildrenByFilter: jest.fn(),
  getChildById: jest.fn(),
  createChild: jest.fn(),
  updateChild: jest.fn(),
  deleteChild: jest.fn(),
  // Attendance
  findAttendanceByFilter: jest.fn(),
  getAttendanceById: jest.fn(),
  createAttendance: jest.fn(),
  updateAttendance: jest.fn(),
  deleteAttendance: jest.fn(),
  // Daily Food Cost
  findDailyFoodCostByFilter: jest.fn(),
  createDailyFoodCost: jest.fn(),
  updateDailyFoodCost: jest.fn(),
  deleteDailyFoodCost: jest.fn(),
  getDailyCostBreakdown: jest.fn(),
  getChildDailyCostBreakdown: jest.fn(),
  // Other
  getKindergartenType: jest.fn().mockReturnValue(null),
  getAllKindergartens: jest.fn(),
}));

const kindergartenService = require('../../modules/kindergarten/service/kindergarten-service');
const kindergartenController = require('../../modules/kindergarten/controller/kindergarten-controller');

describe('Kindergarten API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GROUPS API TESTS
  // ============================================================
  describe('Groups API', () => {

    // -----------------------------------------------------------
    // POST /api/kindergarten/groups/filter - Filter groups
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/groups/filter', () => {

      it('should return paginated groups list', async () => {
        const mockResponse = {
          data: [
            { id: 1, group_name: 'Sonechko', group_type: 'young', kindergarten_name: 'Dubochok' },
            { id: 2, group_name: 'Zirochka', group_type: 'older', kindergarten_name: 'Dubochok' }
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
        };

        kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        // Controller may use code() or status()
        const statusCalled = reply.status.mock.calls.length > 0 || reply.code.mock.calls.length > 0;
        expect(statusCalled).toBe(true);
        expect(reply.getStatus()).toBe(200);
        const sentData = reply.getSentData();
        expect(sentData).toHaveProperty('data');
        expect(sentData).toHaveProperty('pagination');
        expect(sentData.data).toHaveLength(2);
      });

      it('should filter groups by kindergarten_name', async () => {
        const mockResponse = {
          data: [{ id: 1, group_name: 'Sonechko', kindergarten_name: 'Dubochok' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, kindergarten_name: 'Dubochok' }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(kindergartenService.findGroupsByFilter).toHaveBeenCalledWith(request);
      });

      it('should filter groups by group_type', async () => {
        const mockResponse = {
          data: [{ id: 1, group_name: 'Sonechko', group_type: 'young' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_type: 'young' }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData().data[0].group_type).toBe('young');
      });

      it('should filter groups by group_name', async () => {
        const mockResponse = {
          data: [{ id: 1, group_name: 'Sonechko', group_type: 'young' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_name: 'Sonechko' }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should return empty data when no groups match filter', async () => {
        const mockResponse = {
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        };

        kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_name: 'NonExistent' }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData().data).toEqual([]);
      });

      it('should handle database error gracefully', async () => {
        kindergartenService.findGroupsByFilter.mockRejectedValue(new Error('Database connection failed'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findGroupsByFilter(request, reply);

        expect(reply.getStatus()).toBe(400);
        expect(reply.getSentData()).toHaveProperty('error');
      });
    });

    // -----------------------------------------------------------
    // POST /api/kindergarten/groups - Create group
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/groups', () => {

      it('should create a new group successfully', async () => {
        const mockResult = { id: 1, group_name: 'NewGroup', group_type: 'young' };
        kindergartenService.createGroup.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            kindergarten_name: 'Dubochok',
            group_name: 'NewGroup_' + randomString(4),
            group_type: 'young'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createGroup(request, reply);

        expect(reply.getStatus()).toBe(201);
        const sentData = reply.getSentData();
        expect(sentData).toHaveProperty('message');
        expect(sentData.message).toContain('успішно');
      });

      it('should return 409 when group name already exists', async () => {
        kindergartenService.createGroup.mockRejectedValue(new Error('Група з такою назвою вже існує'));

        const request = authenticateRequest(createMockRequest({
          body: {
            kindergarten_name: 'Dubochok',
            group_name: 'ExistingGroup',
            group_type: 'young'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createGroup(request, reply);

        expect(reply.getStatus()).toBe(409);
        expect(reply.getSentData()).toHaveProperty('error', 'Conflict');
      });

      it('should handle validation errors for missing fields', async () => {
        kindergartenService.createGroup.mockRejectedValue(new Error('Missing required fields'));

        const request = authenticateRequest(createMockRequest({
          body: {}
        }));
        const reply = createMockReply();

        await kindergartenController.createGroup(request, reply);

        expect(reply.getStatus()).toBe(400);
      });
    });

    // -----------------------------------------------------------
    // PUT /api/kindergarten/groups/:id - Update group
    // -----------------------------------------------------------
    describe('PUT /api/kindergarten/groups/:id', () => {

      it('should update group successfully', async () => {
        const mockResult = { id: 1, group_name: 'UpdatedName' };
        kindergartenService.updateGroup.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { group_name: 'UpdatedName' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateGroup(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData().message).toContain('оновлено');
      });

      it('should return 404 when group not found', async () => {
        kindergartenService.updateGroup.mockRejectedValue(new Error('Групу не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { group_name: 'NewName' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateGroup(request, reply);

        expect(reply.getStatus()).toBe(404);
        expect(reply.getSentData()).toHaveProperty('error', 'Not Found');
      });

      it('should return 409 when updating to duplicate name', async () => {
        kindergartenService.updateGroup.mockRejectedValue(new Error('Група з такою назвою вже існує'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { group_name: 'Group2' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateGroup(request, reply);

        expect(reply.getStatus()).toBe(409);
      });

      it('should update group_type successfully', async () => {
        const mockResult = { id: 1, group_type: 'older' };
        kindergartenService.updateGroup.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { group_type: 'older' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateGroup(request, reply);

        expect(reply.getStatus()).toBe(200);
      });
    });

    // -----------------------------------------------------------
    // DELETE /api/kindergarten/groups/:id - Delete group
    // -----------------------------------------------------------
    describe('DELETE /api/kindergarten/groups/:id', () => {

      it('should delete group successfully', async () => {
        kindergartenService.deleteGroup.mockResolvedValue({ affectedRows: 1 });

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await kindergartenController.deleteGroup(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData().message).toContain('видалено');
      });

      it('should return 404 when deleting non-existent group', async () => {
        kindergartenService.deleteGroup.mockRejectedValue(new Error('Групу не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await kindergartenController.deleteGroup(request, reply);

        expect(reply.getStatus()).toBe(404);
      });
    });
  });

  // ============================================================
  // CHILDREN ROSTER API TESTS
  // ============================================================
  describe('Children Roster API', () => {

    // -----------------------------------------------------------
    // POST /api/kindergarten/childrenRoster/filter
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/childrenRoster/filter', () => {

      it('should return paginated children list', async () => {
        const mockResponse = {
          data: [
            { id: 1, child_name: 'Ivan Petrov', parent_name: 'Maria Petrova', group_id: 1 },
            { id: 2, child_name: 'Anna Kovalenko', parent_name: 'Olena Kovalenko', group_id: 2 }
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
        };

        kindergartenService.findChildrenByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findChildrenByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData()).toHaveProperty('data');
      });

      it('should filter children by child_name', async () => {
        const mockResponse = {
          data: [{ id: 1, child_name: 'Ivan Petrov', parent_name: 'Maria' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findChildrenByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, child_name: 'Ivan' }
        }));
        const reply = createMockReply();

        await kindergartenController.findChildrenByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter children by group_id', async () => {
        const mockResponse = {
          data: [{ id: 1, child_name: 'Ivan', group_id: 1 }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findChildrenByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_id: 1 }
        }));
        const reply = createMockReply();

        await kindergartenController.findChildrenByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter children by parent_name', async () => {
        const mockResponse = {
          data: [{ id: 1, child_name: 'Ivan', parent_name: 'Maria Petrova' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findChildrenByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, parent_name: 'Maria' }
        }));
        const reply = createMockReply();

        await kindergartenController.findChildrenByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });
    });

    // -----------------------------------------------------------
    // GET /api/kindergarten/childrenRoster/:id
    // -----------------------------------------------------------
    describe('GET /api/kindergarten/childrenRoster/:id', () => {

      it('should return child by ID', async () => {
        const mockChild = { id: 1, child_name: 'Ivan Petrov', parent_name: 'Maria' };
        kindergartenService.getChildById.mockResolvedValue(mockChild);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await kindergartenController.getChildById(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData()).toHaveProperty('child_name');
      });

      it('should return 404 when child not found', async () => {
        kindergartenService.getChildById.mockRejectedValue(new Error('Дитину не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await kindergartenController.getChildById(request, reply);

        expect(reply.getStatus()).toBe(404);
      });
    });

    // -----------------------------------------------------------
    // POST /api/kindergarten/childrenRoster - Create child
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/childrenRoster', () => {

      it('should create a new child successfully', async () => {
        const mockResult = { id: 1, child_name: 'NewChild', parent_name: 'Parent' };
        kindergartenService.createChild.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            child_name: 'NewChild_' + randomString(4),
            parent_name: 'Parent Name',
            phone_number: '+380991234567',
            group_id: 1
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createChild(request, reply);

        expect(reply.getStatus()).toBe(201);
        expect(reply.getSentData().message).toContain('успішно');
      });

      it('should return 409 when child already exists', async () => {
        kindergartenService.createChild.mockRejectedValue(new Error('Дитина з таким ПІБ та батьком вже існує'));

        const request = authenticateRequest(createMockRequest({
          body: {
            child_name: 'Existing',
            parent_name: 'Parent',
            phone_number: '+380991234567',
            group_id: 1
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createChild(request, reply);

        expect(reply.getStatus()).toBe(409);
      });

      it('should return 404 when group not found', async () => {
        kindergartenService.createChild.mockRejectedValue(new Error('Група не знайдена'));

        const request = authenticateRequest(createMockRequest({
          body: {
            child_name: 'NewChild',
            parent_name: 'Parent',
            phone_number: '+380991234567',
            group_id: 999
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createChild(request, reply);

        expect(reply.getStatus()).toBe(404);
        expect(reply.getSentData()).toHaveProperty('error', 'Group Not Found');
      });
    });

    // -----------------------------------------------------------
    // PUT /api/kindergarten/childrenRoster/:id - Update child
    // -----------------------------------------------------------
    describe('PUT /api/kindergarten/childrenRoster/:id', () => {

      it('should update child successfully', async () => {
        const mockResult = { id: 1, phone_number: '+380997654321' };
        kindergartenService.updateChild.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { phone_number: '+380997654321' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateChild(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should return 404 when updating non-existent child', async () => {
        kindergartenService.updateChild.mockRejectedValue(new Error('Дитину не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { phone_number: '+380997654321' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateChild(request, reply);

        expect(reply.getStatus()).toBe(404);
      });

      it('should return 409 when updating to duplicate child', async () => {
        kindergartenService.updateChild.mockRejectedValue(new Error('Дитина з таким ПІБ та батьком вже існує'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { child_name: 'ExistingChild', parent_name: 'ExistingParent' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateChild(request, reply);

        expect(reply.getStatus()).toBe(409);
      });
    });

    // -----------------------------------------------------------
    // DELETE /api/kindergarten/childrenRoster/:id - Delete child
    // -----------------------------------------------------------
    describe('DELETE /api/kindergarten/childrenRoster/:id', () => {

      it('should delete child successfully', async () => {
        kindergartenService.deleteChild.mockResolvedValue({ affectedRows: 1 });

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' }
        }));
        const reply = createMockReply();

        await kindergartenController.deleteChild(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData().message).toContain('видалено');
      });

      it('should return 404 when deleting non-existent child', async () => {
        kindergartenService.deleteChild.mockRejectedValue(new Error('Дитину не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' }
        }));
        const reply = createMockReply();

        await kindergartenController.deleteChild(request, reply);

        expect(reply.getStatus()).toBe(404);
      });
    });
  });

  // ============================================================
  // ATTENDANCE API TESTS
  // ============================================================
  describe('Attendance API', () => {

    // -----------------------------------------------------------
    // POST /api/kindergarten/attendance/filter
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/attendance/filter', () => {

      it('should return paginated attendance records', async () => {
        const mockResponse = {
          data: [
            { id: 1, child_name: 'Ivan', attendance_status: 'present', date: '2025-01-20' },
            { id: 2, child_name: 'Anna', attendance_status: 'absent', date: '2025-01-20' }
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
        };

        kindergartenService.findAttendanceByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findAttendanceByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter attendance by date', async () => {
        const mockResponse = {
          data: [{ id: 1, date: '2025-01-15', attendance_status: 'present' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findAttendanceByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, date: '2025-01-15' }
        }));
        const reply = createMockReply();

        await kindergartenController.findAttendanceByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter attendance by attendance_status present', async () => {
        const mockResponse = {
          data: [{ id: 1, attendance_status: 'present' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findAttendanceByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, attendance_status: 'present' }
        }));
        const reply = createMockReply();

        await kindergartenController.findAttendanceByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter attendance by attendance_status absent', async () => {
        const mockResponse = {
          data: [{ id: 1, attendance_status: 'absent' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findAttendanceByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, attendance_status: 'absent' }
        }));
        const reply = createMockReply();

        await kindergartenController.findAttendanceByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should handle database errors', async () => {
        kindergartenService.findAttendanceByFilter.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findAttendanceByFilter(request, reply);

        expect(reply.getStatus()).toBe(400);
      });
    });

    // -----------------------------------------------------------
    // POST /api/kindergarten/attendance - Create attendance
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/attendance', () => {

      it('should create attendance record with absent status', async () => {
        const mockResult = { success: true, data: { id: 1 } };
        kindergartenService.createAttendance.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            child_id: 1,
            attendance_status: 'absent',
            notes: 'Sick'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createAttendance(request, reply);

        expect(reply.getStatus()).toBe(201);
      });

      it('should create attendance record with present status', async () => {
        const mockResult = { success: true, data: { id: 1 } };
        kindergartenService.createAttendance.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            child_id: 1,
            attendance_status: 'present'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createAttendance(request, reply);

        expect(reply.getStatus()).toBe(201);
      });

      it('should return 409 when attendance already exists for child on date', async () => {
        kindergartenService.createAttendance.mockRejectedValue(
          new Error('Запис відвідуваності для цієї дитини на цю дату вже існує')
        );

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            child_id: 1,
            attendance_status: 'present'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createAttendance(request, reply);

        expect(reply.getStatus()).toBe(409);
      });

      it('should return 404 when child not found', async () => {
        kindergartenService.createAttendance.mockRejectedValue(new Error('Дитину не знайдено'));

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            child_id: 999,
            attendance_status: 'present'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createAttendance(request, reply);

        expect(reply.getStatus()).toBe(404);
        expect(reply.getSentData()).toHaveProperty('error', 'Child Not Found');
      });
    });

    // -----------------------------------------------------------
    // PUT /api/kindergarten/attendance/:id - Update attendance
    // -----------------------------------------------------------
    describe('PUT /api/kindergarten/attendance/:id', () => {

      it('should update attendance status to absent', async () => {
        const mockResult = { id: 1, attendance_status: 'absent' };
        kindergartenService.updateAttendance.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { attendance_status: 'absent' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateAttendance(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should update attendance status to present', async () => {
        const mockResult = { id: 1, attendance_status: 'present' };
        kindergartenService.updateAttendance.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { attendance_status: 'present' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateAttendance(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should return 404 when attendance record not found', async () => {
        kindergartenService.updateAttendance.mockRejectedValue(new Error('Запис відвідуваності не знайдено'));

        const request = authenticateRequest(createMockRequest({
          params: { id: '999' },
          body: { attendance_status: 'absent' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateAttendance(request, reply);

        expect(reply.getStatus()).toBe(404);
      });

      it('should return 409 when changing to duplicate date/child', async () => {
        kindergartenService.updateAttendance.mockRejectedValue(
          new Error('Запис відвідуваності для цієї дитини на цю дату вже існує')
        );

        const request = authenticateRequest(createMockRequest({
          params: { id: '1' },
          body: { date: '2025-01-21' }
        }));
        const reply = createMockReply();

        await kindergartenController.updateAttendance(request, reply);

        expect(reply.getStatus()).toBe(409);
      });
    });
  });

  // ============================================================
  // DAILY FOOD COST API TESTS
  // ============================================================
  describe('Daily Food Cost API', () => {

    // -----------------------------------------------------------
    // POST /api/kindergarten/daily_food_cost/filter
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/daily_food_cost/filter', () => {

      it('should return paginated food cost records', async () => {
        const mockResponse = {
          data: [
            { id: 1, date: '2025-01-20', group_type: 'young', cost: 45.50 },
            { id: 2, date: '2025-01-20', group_type: 'older', cost: 52.00 }
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
        };

        kindergartenService.findDailyFoodCostByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();

        await kindergartenController.findDailyFoodCostByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
        expect(reply.getSentData()).toHaveProperty('data');
      });

      it('should filter by date range', async () => {
        const mockResponse = {
          data: [{ id: 1, date: '2025-01-15', cost: 45.00 }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findDailyFoodCostByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: {
            page: 1,
            limit: 10,
            date_from: '2025-01-01',
            date_to: '2025-01-31'
          }
        }));
        const reply = createMockReply();

        await kindergartenController.findDailyFoodCostByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter by group_type young', async () => {
        const mockResponse = {
          data: [{ id: 1, group_type: 'young', cost: 45.00 }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findDailyFoodCostByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_type: 'young' }
        }));
        const reply = createMockReply();

        await kindergartenController.findDailyFoodCostByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should filter by group_type older', async () => {
        const mockResponse = {
          data: [{ id: 1, group_type: 'older', cost: 52.00 }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        };

        kindergartenService.findDailyFoodCostByFilter.mockResolvedValue(mockResponse);

        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10, group_type: 'older' }
        }));
        const reply = createMockReply();

        await kindergartenController.findDailyFoodCostByFilter(request, reply);

        expect(reply.getStatus()).toBe(200);
      });
    });

    // -----------------------------------------------------------
    // POST /api/kindergarten/daily_food_cost - Create food cost
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/daily_food_cost', () => {

      it('should create food cost successfully', async () => {
        const mockResult = { id: 1, date: '2025-01-20', cost: 48.50 };
        kindergartenService.createDailyFoodCost.mockResolvedValue(mockResult);

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            group_type: 'young',
            cost: 48.50,
            kindergarten_id: 1
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createDailyFoodCost(request, reply);

        expect(reply.getStatus()).toBe(201);
        expect(reply.getSentData().message).toContain('успішно');
      });

      it('should return 409 when food cost already exists for date/type', async () => {
        kindergartenService.createDailyFoodCost.mockRejectedValue(
          new Error('Вартість харчування для цієї дати та типу групи вже існує')
        );

        const request = authenticateRequest(createMockRequest({
          body: {
            date: '2025-01-20',
            group_type: 'young',
            cost: 48.50,
            kindergarten_id: 1
          }
        }));
        const reply = createMockReply();

        await kindergartenController.createDailyFoodCost(request, reply);

        expect(reply.getStatus()).toBe(409);
      });
    });

    // -----------------------------------------------------------
    // POST /api/kindergarten/daily_food_cost/breakdown
    // -----------------------------------------------------------
    describe('POST /api/kindergarten/daily_food_cost/breakdown', () => {

      it('should return cost breakdown by groups', async () => {
        const mockBreakdown = [
          { group_type: 'young', cost: 45.00, children_count: 15 },
          { group_type: 'older', cost: 52.00, children_count: 20 }
        ];

        kindergartenService.getDailyCostBreakdown.mockResolvedValue(mockBreakdown);

        const request = authenticateRequest(createMockRequest({
          body: { date: '2025-01-20', kindergarten_id: 1 }
        }));
        const reply = createMockReply();

        await kindergartenController.getDailyCostBreakdown(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should handle date without any costs', async () => {
        kindergartenService.getDailyCostBreakdown.mockResolvedValue([]);

        const request = authenticateRequest(createMockRequest({
          body: { date: '2025-01-20', kindergarten_id: 1 }
        }));
        const reply = createMockReply();

        await kindergartenController.getDailyCostBreakdown(request, reply);

        expect(reply.getStatus()).toBe(200);
      });

      it('should handle database errors in breakdown', async () => {
        kindergartenService.getDailyCostBreakdown.mockRejectedValue(new Error('Database error'));

        const request = authenticateRequest(createMockRequest({
          body: { date: '2025-01-20' }
        }));
        const reply = createMockReply();

        await kindergartenController.getDailyCostBreakdown(request, reply);

        expect(reply.getStatus()).toBe(400);
      });
    });
  });

  // ============================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================
  describe('Edge Cases and Error Handling', () => {

    it('should handle very large page numbers', async () => {
      const mockResponse = { data: [], pagination: { page: 1000, limit: 10, total: 100, totalPages: 10 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1000, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should handle special characters in search', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10, group_name: "O'Brien's Group" }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should handle Unicode characters in child names', async () => {
      const mockResponse = {
        data: [{ id: 1, child_name: 'Iван Петренко-Ковальчук', parent_name: "Марiя О'Коннор" }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      kindergartenService.findChildrenByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findChildrenByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should handle empty request body gracefully', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 16, total: 0, totalPages: 0 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: {}
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should handle null values in request parameters', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 16, total: 0, totalPages: 0 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: null, limit: null }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should handle concurrent requests', async () => {
      const mockResponse = { data: [{ id: 1 }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const requests = Array(5).fill(null).map(() => {
        const request = authenticateRequest(createMockRequest({
          body: { page: 1, limit: 10 }
        }));
        const reply = createMockReply();
        return kindergartenController.findGroupsByFilter(request, reply);
      });

      await Promise.all(requests);

      expect(kindergartenService.findGroupsByFilter).toHaveBeenCalledTimes(5);
    });
  });

  // ============================================================
  // PAGINATION TESTS
  // ============================================================
  describe('Pagination', () => {

    it('should return correct pagination metadata', async () => {
      const mockResponse = {
        data: Array(10).fill({ id: 1, group_name: 'Test' }),
        pagination: { page: 2, limit: 10, total: 50, totalPages: 5 }
      };

      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 2, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      const sentData = reply.getSentData();
      expect(sentData.pagination).toBeDefined();
      expect(sentData.pagination.page).toBe(2);
      expect(sentData.pagination.limit).toBe(10);
    });

    it('should handle first page correctly', async () => {
      const mockResponse = {
        data: [{ id: 1 }],
        pagination: { page: 1, limit: 10, total: 100, totalPages: 10 }
      };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      const sentData = reply.getSentData();
      expect(sentData.pagination.page).toBe(1);
    });

    it('should handle last page correctly', async () => {
      const mockResponse = {
        data: [{ id: 1 }],
        pagination: { page: 3, limit: 10, total: 25, totalPages: 3 }
      };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 3, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });
  });

  // ============================================================
  // SORTING TESTS
  // ============================================================
  describe('Sorting', () => {

    it('should sort groups by name ascending', async () => {
      const mockResponse = {
        data: [
          { id: 1, group_name: 'Alpha' },
          { id: 2, group_name: 'Beta' }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10, sort_by: 'group_name', sort_direction: 'asc' }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should sort groups by name descending', async () => {
      const mockResponse = {
        data: [
          { id: 2, group_name: 'Beta' },
          { id: 1, group_name: 'Alpha' }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10, sort_by: 'group_name', sort_direction: 'desc' }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should use default sorting when not specified', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });
  });

  // ============================================================
  // KINDERGARTEN TYPE FILTERING TESTS
  // ============================================================
  describe('Kindergarten Type Filtering', () => {

    it('should filter data for kindergarten type 1', async () => {
      const mockResponse = {
        data: [{ id: 1, kindergarten_name: 'Dubochok' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10, kindergarten_type: '1' }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should filter data for kindergarten type 2', async () => {
      const mockResponse = {
        data: [{ id: 2, kindergarten_name: 'ZDO Solonka' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10, kindergarten_type: '2' }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });

    it('should return all data when kindergarten type not specified', async () => {
      const mockResponse = {
        data: [
          { id: 1, kindergarten_name: 'Dubochok' },
          { id: 2, kindergarten_name: 'ZDO Solonka' }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };
      kindergartenService.findGroupsByFilter.mockResolvedValue(mockResponse);

      const request = authenticateRequest(createMockRequest({
        body: { page: 1, limit: 10 }
      }));
      const reply = createMockReply();

      await kindergartenController.findGroupsByFilter(request, reply);

      expect(reply.getStatus()).toBe(200);
    });
  });
});
