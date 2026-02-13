/**
 * Integration Test Helper
 * Provides utilities for setting up and running integration tests
 */

const fastify = require('fastify');

/**
 * Creates a test Fastify server instance with mocked dependencies
 * @param {Object} options - Configuration options
 * @returns {Object} Fastify app instance
 */
async function createTestServer(options = {}) {
  const app = fastify({
    logger: false
  });

  // Register CORS if needed
  await app.register(require('@fastify/cors'), {
    origin: '*'
  });

  // Register cookie support
  await app.register(require('@fastify/cookie'));

  return app;
}

/**
 * Creates a mock request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent'
    },
    ip: '127.0.0.1',
    hostname: 'localhost',
    user: null,
    ...overrides
  };
}

/**
 * Creates a mock reply object with tracking
 * @returns {Object} Mock reply object with spy functions
 */
function createMockReply() {
  const reply = {
    _statusCode: 200,
    _sent: null,
    _headers: {},

    code: jest.fn(function(code) {
      this._statusCode = code;
      return this;
    }),

    // Alias for code() - some controllers use status() instead
    status: jest.fn(function(code) {
      this._statusCode = code;
      return this;
    }),

    send: jest.fn(function(data) {
      this._sent = data;
      return this;
    }),

    header: jest.fn(function(key, value) {
      this._headers[key] = value;
      return this;
    }),

    type: jest.fn(function(type) {
      this._headers['content-type'] = type;
      return this;
    }),

    redirect: jest.fn(function(url) {
      this._statusCode = 302;
      this._headers['location'] = url;
      return this;
    }),

    getStatus: function() {
      return this._statusCode;
    },

    getSentData: function() {
      return this._sent;
    }
  };

  return reply;
}

/**
 * Authenticated request helper
 * @param {Object} request - Base request object
 * @param {Object} userData - User data to attach
 * @returns {Object} Request with authentication
 */
function authenticateRequest(request, userData = {}) {
  const defaultUser = [{
    users_id: 1,
    username: 'testuser',
    last_name: 'Test',
    first_name: 'User',
    permission: {},
    enabled: true,
    is_active: true
  }];

  return {
    ...request,
    user: userData.length ? userData : defaultUser
  };
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the timeout
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string for unique test data
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 * @returns {string} Random email
 */
function randomEmail() {
  return `test_${randomString(6)}@example.com`;
}

/**
 * Assert response structure
 * @param {Object} reply - Mock reply object
 * @param {number} expectedStatus - Expected status code
 * @param {Object} expectedShape - Expected response shape
 */
function assertResponse(reply, expectedStatus, expectedShape = null) {
  expect(reply.code).toHaveBeenCalledWith(expectedStatus);

  if (expectedShape) {
    const sentData = reply.getSentData();
    for (const key of Object.keys(expectedShape)) {
      expect(sentData).toHaveProperty(key);
    }
  }
}

module.exports = {
  createTestServer,
  createMockRequest,
  createMockReply,
  authenticateRequest,
  wait,
  randomString,
  randomEmail,
  assertResponse
};
