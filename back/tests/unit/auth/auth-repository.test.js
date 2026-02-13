/**
 * Unit tests for AuthRepository
 * Tests all repository methods with mocked database
 */

const authRepository = require('../../../modules/auth/repository/auth-repository');

// Mock database
jest.mock('../../../helpers/database', () => ({
  sqlRequest: jest.fn()
}));

const { sqlRequest } = require('../../../helpers/database');

describe('AuthRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // findOneUserByName
  // ============================================================
  describe('findOneUserByName', () => {
    it('should return user data when user exists', async () => {
      const mockUser = [{
        users_id: 1,
        username: 'testuser',
        last_name: 'Test',
        first_name: 'User',
        middle_name: 'Middle',
        permission: { module1: ['read', 'write'] },
        password: '$2b$10$hashedpassword',
        is_active: true,
        enabled: true
      }];

      sqlRequest.mockResolvedValue(mockUser);

      const result = await authRepository.findOneUserByName('testuser');

      expect(sqlRequest).toHaveBeenCalledTimes(1);
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('select users_id, username'),
        ['testuser']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return empty array when user does not exist', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await authRepository.findOneUserByName('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle special characters in username', async () => {
      sqlRequest.mockResolvedValue([]);

      await authRepository.findOneUserByName("test'user");

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ["test'user"]
      );
    });

    it('should throw error when database fails', async () => {
      sqlRequest.mockRejectedValue(new Error('Database connection failed'));

      await expect(authRepository.findOneUserByName('testuser'))
        .rejects.toThrow('Database connection failed');
    });
  });

  // ============================================================
  // getUserById
  // ============================================================
  describe('getUserById', () => {
    it('should return user data when user exists', async () => {
      const mockUser = [{
        last_name: 'Test',
        first_name: 'User',
        permission: { module1: ['read'] },
        users_id: 1,
        username: 'testuser',
        enabled: true,
        is_active: true
      }];

      sqlRequest.mockResolvedValue(mockUser);

      const result = await authRepository.getUserById(1);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('users_id = ?'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return empty array when user does not exist', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await authRepository.getUserById(999999);

      expect(result).toEqual([]);
    });

    it('should handle string userId gracefully', async () => {
      sqlRequest.mockResolvedValue([]);

      await authRepository.getUserById('1');

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['1']
      );
    });
  });

  // ============================================================
  // insertInfoUser
  // ============================================================
  describe('insertInfoUser', () => {
    it('should insert log entry successfully', async () => {
      sqlRequest.mockResolvedValue([]);

      await authRepository.insertInfoUser(
        1,
        '192.168.1.1',
        'hostname',
        'Mozilla/5.0',
        'Chrome',
        'User logged in',
        'success'
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO log.secure'),
        [1, '192.168.1.1', 'User logged in', 'success', 'hostname', 'Mozilla/5.0', 'Chrome']
      );
    });

    it('should insert log entry with null user_id', async () => {
      sqlRequest.mockResolvedValue([]);

      await authRepository.insertInfoUser(
        null,
        '192.168.1.1',
        'hostname',
        'Mozilla/5.0',
        'Chrome',
        'Failed login attempt',
        'unknown'
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        [null, '192.168.1.1', 'Failed login attempt', 'unknown', 'hostname', 'Mozilla/5.0', 'Chrome']
      );
    });

    it('should handle database errors', async () => {
      sqlRequest.mockRejectedValue(new Error('Insert failed'));

      await expect(authRepository.insertInfoUser(
        1, '127.0.0.1', 'host', 'ua', 'details', 'desc', 'error'
      )).rejects.toThrow('Insert failed');
    });
  });

  // ============================================================
  // findIp
  // ============================================================
  describe('findIp', () => {
    it('should return blocked IP data when IP is blacklisted', async () => {
      const mockIp = [{ ip: '192.168.1.100', date: '2024-01-01' }];
      sqlRequest.mockResolvedValue(mockIp);

      const result = await authRepository.findIp('192.168.1.100');

      expect(sqlRequest).toHaveBeenCalledWith(
        'SELECT ip, date FROM admin.black_list where ip=?',
        ['192.168.1.100']
      );
      expect(result).toEqual(mockIp);
    });

    it('should return empty array when IP is not blacklisted', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await authRepository.findIp('192.168.1.1');

      expect(result).toEqual([]);
    });

    it('should handle IPv6 addresses', async () => {
      sqlRequest.mockResolvedValue([]);

      await authRepository.findIp('::1');

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['::1']
      );
    });
  });

  // ============================================================
  // enabledRegistry
  // ============================================================
  describe('enabledRegistry', () => {
    it('should return registry name when enabled', async () => {
      const mockRegistry = [{ name: 'Test Registry' }];
      sqlRequest.mockResolvedValue(mockRegistry);

      const result = await authRepository.enabledRegistry(1);

      expect(sqlRequest).toHaveBeenCalledWith(
        'select name from admin.doc_template where doct_id = ? and enabled = true',
        [1]
      );
      expect(result).toEqual(mockRegistry);
    });

    it('should return empty array when registry is disabled', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await authRepository.enabledRegistry(2);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // foundCategoryId
  // ============================================================
  describe('foundCategoryId', () => {
    it('should return category id for blog page', async () => {
      const mockCategory = [{ id_category: 5 }];
      sqlRequest.mockResolvedValue(mockCategory);

      const result = await authRepository.foundCategoryId(1);

      expect(sqlRequest).toHaveBeenCalledWith(
        'select id_category from blog.blog_pages where id = ?',
        [1]
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return empty array when page does not exist', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await authRepository.foundCategoryId(999);

      expect(result).toEqual([]);
    });
  });
});
