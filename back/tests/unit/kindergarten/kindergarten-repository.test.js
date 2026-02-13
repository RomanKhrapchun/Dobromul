/**
 * Unit tests for KindergartenRepository
 * Tests all kindergarten repository methods with mocked database
 */

const kindergartenRepository = require('../../../modules/kindergarten/repository/kindergarten-repository');

// Mock database
jest.mock('../../../helpers/database', () => ({
  sqlRequest: jest.fn()
}));

// Mock function utilities
jest.mock('../../../utils/function', () => ({
  buildWhereCondition: jest.fn((conditions, alias) => ({
    text: Object.keys(conditions).map(key => ` AND ${alias ? alias + '.' : ''}${key} = ?`).join(''),
    value: Object.values(conditions)
  }))
}));

const { sqlRequest } = require('../../../helpers/database');
const { buildWhereCondition } = require('../../../utils/function');

describe('KindergartenRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // getTableNames
  // ============================================================
  describe('getTableNames', () => {
    it('should return table names for kindergarten type 1', () => {
      const tables = kindergartenRepository.getTableNames('1');

      expect(tables).toEqual({
        children: 'children_1_roster',
        attendance: 'attendance_1',
        pastAttendance: 'past_attendance_1',
        groups: 'kindergarten_groups',
        dailyFoodCost: 'daily_food_cost',
        billing: 'kindergarten_billing',
        paymentStatements: 'payment_statements',
        admins: 'kindergarten_admins'
      });
    });

    it('should return table names for kindergarten type 2', () => {
      const tables = kindergartenRepository.getTableNames('2');

      expect(tables).toEqual({
        children: 'children_2_roster',
        attendance: 'attendance_2',
        pastAttendance: 'past_attendance_2',
        groups: 'kindergarten_groups',
        dailyFoodCost: 'daily_food_cost',
        billing: 'kindergarten_billing',
        paymentStatements: 'payment_statements',
        admins: 'kindergarten_admins'
      });
    });

    it('should return default table names for null type', () => {
      const tables = kindergartenRepository.getTableNames(null);

      expect(tables).toEqual({
        children: 'children_roster',
        attendance: 'attendance',
        pastAttendance: 'past_attendance',
        groups: 'kindergarten_groups',
        dailyFoodCost: 'daily_food_cost',
        billing: 'kindergarten_billing',
        paymentStatements: 'payment_statements',
        admins: 'kindergarten_admins'
      });
    });

    it('should return default table names for unknown type', () => {
      const tables = kindergartenRepository.getTableNames('3');

      expect(tables.children).toBe('children_roster');
    });
  });

  // ============================================================
  // getKindergartenName
  // ============================================================
  describe('getKindergartenName', () => {
    it('should return name for kindergarten type 1', () => {
      const name = kindergartenRepository.getKindergartenName('1');
      expect(name).toBe('Дубочок');
    });

    it('should return name for kindergarten type 2', () => {
      const name = kindergartenRepository.getKindergartenName('2');
      expect(name).toBe('ЗДО с.Солонка');
    });

    it('should return null for unknown type', () => {
      const name = kindergartenRepository.getKindergartenName('3');
      expect(name).toBeNull();
    });

    it('should return null for null type', () => {
      const name = kindergartenRepository.getKindergartenName(null);
      expect(name).toBeNull();
    });
  });

  // ============================================================
  // findDebtorById
  // ============================================================
  describe('findDebtorById', () => {
    it('should return debtor with debts', async () => {
      const mockDebtor = [{
        id: 1,
        debts: [{
          id: 101,
          child_name: 'Іван Петров',
          debt_amount: 500.00,
          group_number: 'Група 1',
          kindergarten_name: 'Дубочок'
        }]
      }];

      sqlRequest.mockResolvedValue(mockDebtor);

      const result = await kindergartenRepository.findDebtorById(1);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('from ower.ower o'),
        [1]
      );
      expect(result).toEqual(mockDebtor);
    });

    it('should return empty array when debtor not found', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await kindergartenRepository.findDebtorById(999);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // findDebtByFilter
  // ============================================================
  describe('findDebtByFilter', () => {
    it('should return paginated debts without filters', async () => {
      const mockDebts = [{
        data: [
          { id: 1, child_name: 'Child 1', debt_amount: 100 },
          { id: 2, child_name: 'Child 2', debt_amount: 200 }
        ],
        count: 2
      }];

      sqlRequest.mockResolvedValue(mockDebts);

      const result = await kindergartenRepository.findDebtByFilter(10, 0);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('limit ? offset ?'),
        [10, 0]
      );
      expect(result).toEqual(mockDebts);
    });

    it('should apply where conditions', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);
      buildWhereCondition.mockReturnValue({
        text: ' AND od.kindergarten_name = ?',
        value: ['Дубочок']
      });

      await kindergartenRepository.findDebtByFilter(10, 0, {
        kindergarten_name: 'Дубочок'
      });

      expect(buildWhereCondition).toHaveBeenCalledWith(
        { kindergarten_name: 'Дубочок' },
        'od'
      );
    });

    it('should handle empty result', async () => {
      sqlRequest.mockResolvedValue([{ data: null, count: 0 }]);

      const result = await kindergartenRepository.findDebtByFilter(10, 0);

      expect(result[0].data).toBeNull();
      expect(result[0].count).toBe(0);
    });
  });

  // ============================================================
  // findGroupsByFilter (partial test based on known structure)
  // ============================================================
  describe('findGroupsByFilter', () => {
    it('should return groups with pagination', async () => {
      const mockGroups = [{
        data: [
          { id: 1, group_name: 'Сонечко', group_type: 'молодша' },
          { id: 2, group_name: 'Зірочка', group_type: 'середня' }
        ],
        count: 2
      }];

      sqlRequest.mockResolvedValue(mockGroups);

      const result = await kindergartenRepository.findGroupsByFilter({
        limit: 10,
        offset: 0,
        sort_by: 'id',
        sort_direction: 'desc'
      });

      expect(sqlRequest).toHaveBeenCalled();
      expect(result).toEqual(mockGroups);
    });

    it('should filter by kindergarten type', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await kindergartenRepository.findGroupsByFilter({
        limit: 10,
        offset: 0
      }, '1');

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('kindergarten_name'),
        expect.any(Array)
      );
    });
  });

  // ============================================================
  // generateWordByDebtId
  // ============================================================
  describe('generateWordByDebtId', () => {
    it('should return null (placeholder)', async () => {
      const result = await kindergartenRepository.generateWordByDebtId({}, {});
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // printDebtId
  // ============================================================
  describe('printDebtId', () => {
    it('should return null (placeholder)', async () => {
      const result = await kindergartenRepository.printDebtId({}, {});
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('Error handling', () => {
    it('should propagate database errors for findDebtorById', async () => {
      sqlRequest.mockRejectedValue(new Error('Database error'));

      await expect(kindergartenRepository.findDebtorById(1))
        .rejects.toThrow('Database error');
    });

    it('should propagate database errors for findDebtByFilter', async () => {
      sqlRequest.mockRejectedValue(new Error('Connection failed'));

      await expect(kindergartenRepository.findDebtByFilter(10, 0))
        .rejects.toThrow('Connection failed');
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    it('should handle large limit values', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await kindergartenRepository.findDebtByFilter(1000, 0);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        [1000, 0]
      );
    });

    it('should handle large offset values', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await kindergartenRepository.findDebtByFilter(10, 10000);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        [10, 10000]
      );
    });

    it('should handle special characters in filter values', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);
      buildWhereCondition.mockReturnValue({
        text: " AND child_name = ?",
        value: ["O'Brien"]
      });

      await kindergartenRepository.findDebtByFilter(10, 0, {
        child_name: "O'Brien"
      });

      expect(buildWhereCondition).toHaveBeenCalled();
    });
  });
});
