/**
 * Unit tests for UserRepository
 * Tests all user repository methods with mocked database
 */

const userRepository = require('../../../modules/user/repository/user-repository');

// Mock database
jest.mock('../../../helpers/database', () => ({
  sqlRequest: jest.fn()
}));

// Mock function utilities
jest.mock('../../../utils/function', () => ({
  buildWhereCondition: jest.fn((conditions) => ({
    text: Object.keys(conditions).map(key => ` AND ${key} = ?`).join(''),
    value: Object.values(conditions)
  }))
}));

const { sqlRequest } = require('../../../helpers/database');
const { buildWhereCondition } = require('../../../utils/function');

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // generateMenu
  // ============================================================
  describe('generateMenu', () => {
    it('should return menu structure', async () => {
      const mockMenu = [
        {
          module_name: 'Адміністрування',
          module_id: 'admin',
          children: [
            { module_id: 'users', module_name: 'Користувачі', key: 'users' }
          ]
        }
      ];

      sqlRequest.mockResolvedValue(mockMenu);

      const result = await userRepository.generateMenu();

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('select mod.module_name')
      );
      expect(result).toEqual(mockMenu);
    });

    it('should return empty array when no modules', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await userRepository.generateMenu();

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // getUserProfileById
  // ============================================================
  describe('getUserProfileById', () => {
    it('should return user profile with specified fields', async () => {
      const mockProfile = [{
        username: 'testuser',
        email: 'test@example.com',
        last_name: 'Test'
      }];

      sqlRequest.mockResolvedValue(mockProfile);

      const result = await userRepository.getUserProfileById(
        1,
        ['username', 'email', 'last_name']
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('username'),
        [1]
      );
      expect(result).toEqual(mockProfile);
    });

    it('should return empty array when user not found', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await userRepository.getUserProfileById(999, ['username']);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // updateUserProfileById
  // ============================================================
  describe('updateUserProfileById', () => {
    it('should update user profile and return user id', async () => {
      const mockResult = [{ users_id: 1 }];
      sqlRequest.mockResolvedValue(mockResult);

      const result = await userRepository.updateUserProfileById(
        1,
        { last_name: 'Updated', email: 'updated@test.com' }
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE admin.users SET'),
        ['Updated', 'updated@test.com', 1]
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle single field update', async () => {
      sqlRequest.mockResolvedValue([{ users_id: 1 }]);

      await userRepository.updateUserProfileById(1, { last_name: 'New' });

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('last_name = ?'),
        ['New', 1]
      );
    });
  });

  // ============================================================
  // findUsersByFilter
  // ============================================================
  describe('findUsersByFilter', () => {
    it('should return paginated users with filters', async () => {
      const mockResult = [{
        data: [{ username: 'user1' }, { username: 'user2' }],
        count: 2
      }];

      sqlRequest.mockResolvedValue(mockResult);

      const result = await userRepository.findUsersByFilter(
        10,
        0,
        null,
        {},
        ['username', 'email']
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('limit ? offset ?'),
        [10, 0]
      );
      expect(result).toEqual(mockResult);
    });

    it('should apply title filter', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

      await userRepository.findUsersByFilter(
        10,
        0,
        'john',
        {},
        ['username']
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('username ILIKE ?'),
        ['%john%', '%john%', 10, 0]
      );
    });

    it('should apply where conditions', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);
      buildWhereCondition.mockReturnValue({
        text: ' AND is_active = ?',
        value: [true]
      });

      await userRepository.findUsersByFilter(
        10,
        0,
        null,
        { is_active: true },
        ['username']
      );

      expect(buildWhereCondition).toHaveBeenCalledWith({ is_active: true });
    });

    it('should combine title and where conditions', async () => {
      sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);
      buildWhereCondition.mockReturnValue({
        text: ' AND enabled = ?',
        value: [true]
      });

      await userRepository.findUsersByFilter(
        10,
        0,
        'admin',
        { enabled: true },
        ['username']
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([true, '%admin%', '%admin%', 10, 0])
      );
    });
  });

  // ============================================================
  // getUserById
  // ============================================================
  describe('getUserById', () => {
    it('should return user with creator and editor info', async () => {
      const mockUser = [{
        uid: 'Admin User',
        editor_id: 'Editor User',
        create_date: '2024-01-01',
        editor_date: '2024-01-15',
        username: 'testuser'
      }];

      sqlRequest.mockResolvedValue(mockUser);

      const result = await userRepository.getUserById(1, ['username']);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('users_id = ?'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return empty array when user not found', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await userRepository.getUserById(999, ['username']);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // createUser
  // ============================================================
  describe('createUser', () => {
    it('should create user successfully', async () => {
      sqlRequest.mockResolvedValue([]);

      const userData = {
        username: 'newuser',
        email: 'new@test.com',
        last_name: 'New',
        first_name: 'User'
      };

      await userRepository.createUser(userData);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin.users'),
        ['newuser', 'new@test.com', 'New', 'User']
      );
    });

    it('should handle minimal user data', async () => {
      sqlRequest.mockResolvedValue([]);

      await userRepository.createUser({ username: 'minimal' });

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('username'),
        ['minimal']
      );
    });
  });

  // ============================================================
  // updateUser
  // ============================================================
  describe('updateUser', () => {
    it('should update user and return user id', async () => {
      const mockResult = [{ users_id: 1 }];
      sqlRequest.mockResolvedValue(mockResult);

      const result = await userRepository.updateUser(
        1,
        { last_name: 'Updated' }
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE admin.users SET'),
        ['Updated', 1]
      );
      expect(result).toEqual(mockResult);
    });

    it('should update multiple fields', async () => {
      sqlRequest.mockResolvedValue([{ users_id: 1 }]);

      await userRepository.updateUser(1, {
        last_name: 'New',
        first_name: 'User',
        email: 'new@test.com'
      });

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['New', 'User', 'new@test.com', 1]
      );
    });
  });

  // ============================================================
  // deleteUser
  // ============================================================
  describe('deleteUser', () => {
    it('should delete user and return user id', async () => {
      const mockResult = [{ users_id: 1 }];
      sqlRequest.mockResolvedValue(mockResult);

      const result = await userRepository.deleteUser(1);

      expect(sqlRequest).toHaveBeenCalledWith(
        'DELETE FROM admin.users where users_id = ? RETURNING users_id',
        [1]
      );
      expect(result).toEqual(mockResult);
    });

    it('should return empty when user does not exist', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await userRepository.deleteUser(999);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // getAllUsers
  // ============================================================
  describe('getAllUsers', () => {
    it('should return all users with default limit', async () => {
      const mockUsers = [
        { users_id: 1, username: 'user1' },
        { users_id: 2, username: 'user2' }
      ];

      sqlRequest.mockResolvedValue(mockUsers);

      const result = await userRepository.getAllUsers();

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('limit ?'),
        [10]
      );
      expect(result).toEqual(mockUsers);
    });

    it('should filter users by title', async () => {
      sqlRequest.mockResolvedValue([]);

      await userRepository.getAllUsers('admin', 5);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('username ILIKE ?'),
        ['%admin%', 5]
      );
    });

    it('should apply custom limit', async () => {
      sqlRequest.mockResolvedValue([]);

      await userRepository.getAllUsers(null, 20);

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        [20]
      );
    });
  });

  // ============================================================
  // findUserByLoginAndEmail
  // ============================================================
  describe('findUserByLoginAndEmail', () => {
    it('should find user by username or email (without id)', async () => {
      const mockResult = [{ users_id: 1, username: 'exists', email: 'exists@test.com' }];
      sqlRequest.mockResolvedValue(mockResult);

      const result = await userRepository.findUserByLoginAndEmail(
        'exists',
        'exists@test.com'
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('username = ? or email = ?'),
        ['exists', 'exists@test.com']
      );
      expect(result).toEqual(mockResult);
    });

    it('should exclude specific user id when updating', async () => {
      sqlRequest.mockResolvedValue([]);

      await userRepository.findUserByLoginAndEmail(
        'exists',
        'exists@test.com',
        5
      );

      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('users_id <> ?'),
        ['exists', 'exists@test.com', 5]
      );
    });

    it('should return empty array when no duplicates found', async () => {
      sqlRequest.mockResolvedValue([]);

      const result = await userRepository.findUserByLoginAndEmail(
        'unique',
        'unique@test.com'
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('Error handling', () => {
    it('should propagate database errors', async () => {
      sqlRequest.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.generateMenu())
        .rejects.toThrow('Database error');
    });

    it('should handle connection timeout', async () => {
      sqlRequest.mockRejectedValue(new Error('Connection timeout'));

      await expect(userRepository.getUserById(1, ['username']))
        .rejects.toThrow('Connection timeout');
    });
  });
});
