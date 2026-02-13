/**
 * Unit tests for SportsComplexRepository
 * Tests all sports complex repository methods with mocked database
 */

const sportsComplexRepository = require('../../../modules/sportscomplex/repository/sportscomplex-repository');

// Mock database
jest.mock('../../../helpers/database', () => ({
  sqlRequest: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn()
}));

// Mock constants
jest.mock('../../../utils/constants', () => ({
  getSafeSortFieldBills: jest.fn((field) => field ? `b.${field}` : 'b.id'),
  getSafeSortFieldClients: jest.fn((field) => field ? `c.${field}` : 'c.id'),
  getSafeSortFieldServices: jest.fn((field) => field ? `s.${field}` : 's.id'),
  getSafeSortFieldRequisites: jest.fn((field) => field ? `r.${field}` : 'r.id'),
  validateSortDirection: jest.fn((dir) => dir === 'desc' ? 'desc' : 'asc')
}));

// Mock function utilities
jest.mock('../../../utils/function', () => ({
  buildWhereCondition: jest.fn((conditions, alias) => ({
    text: Object.keys(conditions).map(key => ` AND ${alias ? alias + '.' : ''}${key} = ?`).join(''),
    value: Object.values(conditions)
  }))
}));

const { sqlRequest } = require('../../../helpers/database');
const logger = require('../../../utils/logger');

describe('SportsComplexRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // REQUISITES (Реквізити)
  // ============================================================
  describe('Requisites', () => {
    describe('findRequisitesByFilter', () => {
      it('should return paginated requisites', async () => {
        const mockRequisites = [{
          data: [
            { id: 1, kved: '93.11', iban: 'UA123', edrpou: '12345678', group_name: 'Послуги басейну' }
          ],
          count: 1
        }];

        sqlRequest.mockResolvedValue(mockRequisites);

        const result = await sportsComplexRepository.findRequisitesByFilter(
          10, 0, [], {}
        );

        expect(sqlRequest).toHaveBeenCalled();
        expect(result).toEqual(mockRequisites);
      });

      it('should apply filters', async () => {
        sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

        await sportsComplexRepository.findRequisitesByFilter(
          10, 0, [], { kved: '93.11' }
        );

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('ILIKE'),
          expect.arrayContaining(['%93.11%'])
        );
      });

      it('should apply sorting', async () => {
        sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

        await sportsComplexRepository.findRequisitesByFilter(
          10, 0, [], {}, 'kved', 'desc'
        );

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY'),
          expect.any(Array)
        );
      });

      it('should handle database errors', async () => {
        sqlRequest.mockRejectedValue(new Error('DB Error'));

        await expect(sportsComplexRepository.findRequisitesByFilter(10, 0, [], {}))
          .rejects.toThrow('DB Error');

        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('getById', () => {
      it('should return requisite by id', async () => {
        const mockRequisite = { id: 1, kved: '93.11', iban: 'UA123' };
        sqlRequest.mockResolvedValue([mockRequisite]);

        const result = await sportsComplexRepository.getById(1);

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1'),
          [1]
        );
        expect(result).toEqual(mockRequisite);
      });

      it('should return undefined when not found', async () => {
        sqlRequest.mockResolvedValue([]);

        const result = await sportsComplexRepository.getById(999);

        expect(result).toBeUndefined();
      });
    });

    describe('getRequisite', () => {
      it('should return requisite with group name', async () => {
        const mockRequisite = {
          id: 1,
          kved: '93.11',
          iban: 'UA123',
          group_name: 'Басейн'
        };
        sqlRequest.mockResolvedValue([mockRequisite]);

        const result = await sportsComplexRepository.getRequisite(1);

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('LEFT JOIN sport.service_groups'),
          [1]
        );
        expect(result.group_name).toBe('Басейн');
      });
    });

    describe('createRequisite', () => {
      it('should create requisite and return id', async () => {
        sqlRequest.mockResolvedValue([{ id: 1 }]);

        const result = await sportsComplexRepository.createRequisite({
          kved: '93.11',
          iban: 'UA123456789012345678901234567',
          edrpou: '12345678',
          service_group_id: 1
        });

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO sport.requisites'),
          ['93.11', 'UA123456789012345678901234567', '12345678', 1]
        );
        expect(result).toEqual({ id: 1 });
      });

      it('should handle database errors', async () => {
        sqlRequest.mockRejectedValue(new Error('Duplicate IBAN'));

        await expect(sportsComplexRepository.createRequisite({
          kved: '93.11',
          iban: 'UA123',
          edrpou: '12345678',
          service_group_id: 1
        })).rejects.toThrow('Duplicate IBAN');
      });
    });

    describe('updateRequisite', () => {
      it('should update requisite and return id', async () => {
        sqlRequest.mockResolvedValue([{ id: 1 }]);

        const result = await sportsComplexRepository.updateRequisite(1, {
          kved: '93.12',
          iban: 'UA123',
          edrpou: '87654321',
          service_group_id: 2
        });

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE sport.requisites'),
          ['93.12', 'UA123', '87654321', 2, 1]
        );
        expect(result).toEqual({ id: 1 });
      });
    });
  });

  // ============================================================
  // SERVICE GROUPS (Групи послуг)
  // ============================================================
  describe('Service Groups', () => {
    describe('getServiceGroups', () => {
      it('should return all service groups', async () => {
        const mockGroups = [
          { id: 1, name: 'Басейн' },
          { id: 2, name: 'Тренажерний зал' }
        ];
        sqlRequest.mockResolvedValue(mockGroups);

        const result = await sportsComplexRepository.getServiceGroups();

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('SELECT id, name FROM sport.service_groups')
        );
        expect(result).toEqual(mockGroups);
      });

      it('should return empty array when no groups', async () => {
        sqlRequest.mockResolvedValue([]);

        const result = await sportsComplexRepository.getServiceGroups();

        expect(result).toEqual([]);
      });

      it('should handle database errors', async () => {
        sqlRequest.mockRejectedValue(new Error('Connection failed'));

        await expect(sportsComplexRepository.getServiceGroups())
          .rejects.toThrow('Connection failed');
      });
    });

    describe('createServiceGroup', () => {
      it('should create service group and return data', async () => {
        sqlRequest.mockResolvedValue([{ id: 1, name: 'Новий зал' }]);

        const result = await sportsComplexRepository.createServiceGroup({
          name: 'Новий зал'
        });

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO sport.service_groups'),
          ['Новий зал']
        );
        expect(result).toEqual({ id: 1, name: 'Новий зал' });
      });

      it('should handle duplicate name error', async () => {
        sqlRequest.mockRejectedValue(new Error('Duplicate key'));

        await expect(sportsComplexRepository.createServiceGroup({
          name: 'Existing'
        })).rejects.toThrow('Duplicate key');
      });
    });
  });

  // ============================================================
  // SERVICES (Послуги)
  // ============================================================
  describe('Services', () => {
    describe('findPoolServicesByFilter', () => {
      it('should return paginated services', async () => {
        const mockServices = [{
          data: [
            { id: 1, name: 'Абонемент 8 занять', lesson_count: 8, price: 1000 }
          ],
          count: 1
        }];

        sqlRequest.mockResolvedValue(mockServices);

        const result = await sportsComplexRepository.findPoolServicesByFilter(
          10, 0, [], {}
        );

        expect(sqlRequest).toHaveBeenCalled();
        expect(result).toEqual(mockServices);
      });

      it('should apply sorting', async () => {
        sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

        await sportsComplexRepository.findPoolServicesByFilter(
          10, 0, [], {}, 'price', 'desc'
        );

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY'),
          expect.any(Array)
        );
      });
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('Error handling', () => {
    it('should log errors with correct context', async () => {
      sqlRequest.mockRejectedValue(new Error('Test error'));

      try {
        await sportsComplexRepository.getById(1);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        '[getById]',
        expect.any(Error)
      );
    });

    it('should propagate errors correctly', async () => {
      const testError = new Error('Specific error message');
      sqlRequest.mockRejectedValue(testError);

      await expect(sportsComplexRepository.getRequisite(1))
        .rejects.toThrow('Specific error message');
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    it('should handle empty filter objects', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await sportsComplexRepository.findRequisitesByFilter(10, 0, [], {});

      expect(sqlRequest).toHaveBeenCalled();
    });

    it('should handle special characters in filter values', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await sportsComplexRepository.findRequisitesByFilter(
        10, 0, [], { kved: "93.11'" }
      );

      // The query should be parameterized
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["%93.11'%"])
      );
    });

    it('should handle null sort parameters', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await sportsComplexRepository.findRequisitesByFilter(
        10, 0, [], {}, null, null
      );

      expect(sqlRequest).toHaveBeenCalled();
    });
  });
});
