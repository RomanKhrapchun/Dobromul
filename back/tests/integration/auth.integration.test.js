/**
 * Integration tests for Auth API endpoints
 * Tests the full request/response cycle with mocked database
 */

const {
  createMockRequest,
  createMockReply,
  authenticateRequest
} = require('./testHelper');

// Mock all dependencies
jest.mock('../../helpers/database', () => ({
  sqlRequest: jest.fn()
}));

jest.mock('../../utils/sessionStore', () => ({
  setSession: jest.fn(),
  getSession: jest.fn(),
  deleteSession: jest.fn()
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'test-session-id-12345'
  }))
}));

jest.mock('../../utils/constants', () => ({
  redisClientConfig: { ttl: 3600 }
}));

jest.mock('../../utils/messages', () => ({
  userAuthenticatedErrorMessage: 'Invalid credentials',
  userAccountNotActivatedErrorMessage: 'Account not activated',
  blockedIPNotification: 'IP blocked'
}));

// Import modules after mocking
const authService = require('../../modules/auth/service/auth-service');
const authController = require('../../modules/auth/controller/auth-controller');
const { sqlRequest } = require('../../helpers/database');
const sessionStore = require('../../utils/sessionStore');
const bcrypt = require('bcrypt');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Login Flow
  // ============================================================
  describe('Login Flow', () => {
    const validUser = [{
      users_id: 1,
      username: 'admin',
      last_name: 'Admin',
      first_name: 'User',
      password: '$2b$10$hashedpassword',
      is_active: true,
      enabled: true,
      permission: {
        users: ['read', 'write'],
        debtors: ['read']
      }
    }];

    const mockMenuData = [{
      module_name: 'Адміністрування',
      module_id: 'admin',
      children: [
        { module_id: 'users', module_name: 'Користувачі', key: 'users' }
      ]
    }];

    it('should complete full login flow successfully', async () => {
      // Setup mocks
      sqlRequest
        .mockResolvedValueOnce([]) // findIp - not blocked
        .mockResolvedValueOnce(validUser) // findOneUserByName
        .mockResolvedValueOnce([]) // insertInfoUser
        .mockResolvedValueOnce(mockMenuData); // generateMenu

      bcrypt.compare.mockResolvedValue(true);
      sessionStore.setSession.mockResolvedValue(true);

      // Execute login
      const request = createMockRequest({
        body: { username: 'admin', password: 'correctpassword' }
      });

      const result = await authService.login(request);

      // Verify result
      expect(result).toHaveProperty('sessionId', 'test-session-id-12345');
      expect(result).toHaveProperty('data');
      expect(result.data.username).toBe('admin');

      // Verify session was created
      expect(sessionStore.setSession).toHaveBeenCalledWith(
        'test-session-id-12345',
        1,
        3600
      );
    });

    it('should reject login for blocked IP', async () => {
      sqlRequest.mockResolvedValueOnce([{ ip: '127.0.0.1', date: '2024-01-01' }]);

      const request = createMockRequest({
        body: { username: 'admin', password: 'password' }
      });

      await expect(authService.login(request))
        .rejects.toThrow('IP blocked');
    });

    it('should reject login for non-existent user', async () => {
      sqlRequest
        .mockResolvedValueOnce([]) // Not blocked
        .mockResolvedValueOnce([]) // User not found
        .mockResolvedValueOnce([]); // Log attempt

      const request = createMockRequest({
        body: { username: 'nonexistent', password: 'password' }
      });

      await expect(authService.login(request))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject login for disabled account', async () => {
      const disabledUser = [{ ...validUser[0], enabled: false }];

      sqlRequest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(disabledUser);

      const request = createMockRequest({
        body: { username: 'disabled', password: 'password' }
      });

      await expect(authService.login(request))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject login for inactive account', async () => {
      const inactiveUser = [{ ...validUser[0], is_active: false }];

      sqlRequest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(inactiveUser);

      const request = createMockRequest({
        body: { username: 'inactive', password: 'password' }
      });

      await expect(authService.login(request))
        .rejects.toThrow('Account not activated');
    });

    it('should reject login with wrong password', async () => {
      sqlRequest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(validUser)
        .mockResolvedValueOnce([]); // Log failed attempt

      bcrypt.compare.mockResolvedValue(false);

      const request = createMockRequest({
        body: { username: 'admin', password: 'wrongpassword' }
      });

      await expect(authService.login(request))
        .rejects.toThrow('Invalid credentials');
    });
  });

  // ============================================================
  // Auth Check Flow
  // ============================================================
  describe('Auth Check Flow', () => {
    it('should return user info for authenticated user with permissions', async () => {
      const userData = [{
        last_name: 'Test',
        first_name: 'User',
        permission: {
          users: ['read', 'write']
        }
      }];

      const mockMenuData = [{
        module_name: 'Admin',
        module_id: 'admin',
        children: [
          { module_id: 'users', module_name: 'Users', key: 'users' }
        ]
      }];

      sqlRequest.mockResolvedValueOnce(mockMenuData);

      const request = authenticateRequest(createMockRequest(), userData);
      const reply = createMockReply();

      await authService.checkAuth(request, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Test User'
        })
      );
    });

    it('should return null access_group for user without permissions', async () => {
      const userData = [{
        last_name: 'Test',
        first_name: 'User',
        permission: null
      }];

      const request = authenticateRequest(createMockRequest(), userData);
      const reply = createMockReply();

      await authService.checkAuth(request, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Test User',
          access_group: null
        })
      );
    });
  });

  // ============================================================
  // Security Tests
  // ============================================================
  describe('Security', () => {
    it('should log failed login attempts', async () => {
      sqlRequest
        .mockResolvedValueOnce([]) // Not blocked
        .mockResolvedValueOnce([]) // User not found
        .mockResolvedValueOnce([]); // Log

      const request = createMockRequest({
        body: { username: 'hacker', password: 'attempt' }
      });

      try {
        await authService.login(request);
      } catch (e) {
        // Expected
      }

      // Verify log was inserted
      expect(sqlRequest).toHaveBeenCalledTimes(3);
      expect(sqlRequest).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO log.secure'),
        expect.any(Array)
      );
    });

    it('should record successful login in logs', async () => {
      const validUser = [{
        users_id: 1,
        username: 'admin',
        password: '$2b$10$hash',
        is_active: true,
        enabled: true,
        permission: {}
      }];

      sqlRequest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(validUser)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      bcrypt.compare.mockResolvedValue(true);
      sessionStore.setSession.mockResolvedValue(true);

      const request = createMockRequest({
        body: { username: 'admin', password: 'correct' }
      });

      await authService.login(request);

      // Verify success log was inserted
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO log.secure'),
        expect.arrayContaining([1, '127.0.0.1'])
      );
    });
  });
});
