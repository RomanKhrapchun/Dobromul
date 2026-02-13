/**
 * Integration tests for VST Payment API endpoints
 * Tests the full request/response cycle including callback idempotency
 */

const {
  createMockRequest,
  createMockReply,
  randomString
} = require('./testHelper');

// Mock all dependencies
jest.mock('../../helpers/database', () => ({
  sqlRequest: jest.fn(),
  withTransaction: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Import modules after mocking
const { sqlRequest, withTransaction } = require('../../helpers/database');
const vstCallbackController = require('../../modules/vst_payment/controller/vstCallbackController');

describe('VST Payment Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Callback Processing
  // ============================================================
  describe('Callback Processing', () => {
    describe('vstSuccessCallback', () => {
      it('should process valid callback successfully', async () => {
        const transactionResult = {
          id: 1,
          account_number: 'ACC001234',
          operation_status: 'success'
        };

        withTransaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [] }) // No existing success
              .mockResolvedValueOnce({ rows: [] }) // No existing by payment_id
              .mockResolvedValueOnce({ rows: [{ id: 1, account_number: 'ACC001234', operation_status: 'initiated' }] }) // Lock
              .mockResolvedValueOnce({ rows: [transactionResult] }) // Update
          };
          return await callback(mockClient);
        });

        const request = createMockRequest({
          body: {
            transaction_id: 'TXN123456',
            payment_id: 'ACC001234',
            status: 'success',
            amount: 100.50
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true
          })
        );
      });

      it('should return success for idempotent duplicate callback', async () => {
        const existingTransaction = {
          id: 1,
          account_number: 'ACC001234',
          operation_status: 'success',
          response_status: 'success',
          editor_date: '2024-01-01'
        };

        withTransaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [existingTransaction] }) // Already processed
          };
          return await callback(mockClient);
        });

        const request = createMockRequest({
          body: {
            transaction_id: 'TXN123456',
            payment_id: 'ACC001234',
            status: 'success',
            amount: 100.50
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        // Should return success (idempotent)
        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            already_processed: true
          })
        );
      });

      it('should handle concurrent processing (SKIP LOCKED)', async () => {
        withTransaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [] }) // No existing success
              .mockResolvedValueOnce({ rows: [] }) // No existing by payment_id
              .mockResolvedValueOnce({ rows: [] }) // SKIP LOCKED - no rows available
          };
          return await callback(mockClient);
        });

        const request = createMockRequest({
          body: {
            transaction_id: 'TXN123456',
            payment_id: 'ACC001234',
            status: 'success',
            amount: 100.50
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            reason: 'concurrent_processing'
          })
        );
      });
    });

    describe('Input Validation', () => {
      it('should reject missing payment_id', async () => {
        const request = createMockRequest({
          body: {
            status: 'success',
            amount: 100
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'MISSING_REQUIRED_FIELDS'
          })
        );
      });

      it('should reject invalid amount', async () => {
        const request = createMockRequest({
          body: {
            payment_id: 'ACC001234',
            status: 'success',
            amount: 'invalid'
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'INVALID_AMOUNT'
          })
        );
      });

      it('should reject negative amount', async () => {
        const request = createMockRequest({
          body: {
            payment_id: 'ACC001234',
            status: 'success',
            amount: -100
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'INVALID_AMOUNT'
          })
        );
      });

      it('should reject too long payment_id', async () => {
        const request = createMockRequest({
          body: {
            payment_id: 'A'.repeat(101),
            status: 'success',
            amount: 100
          }
        });
        const reply = createMockReply();

        await vstCallbackController.vstSuccessCallback(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'INVALID_PAYMENT_ID'
          })
        );
      });
    });
  });

  // ============================================================
  // Status Endpoint
  // ============================================================
  describe('Payment Status', () => {
    describe('getPaymentStatus', () => {
      it('should return status for existing payment', async () => {
        const mockTransaction = {
          id: 1,
          account_number: 'ACC001234',
          operation_status: 'success',
          response_status: 'success',
          cdate: '2024-01-01',
          editor_date: '2024-01-02'
        };

        sqlRequest.mockResolvedValueOnce([mockTransaction]);

        const request = createMockRequest({
          query: { payment_id: 'ACC001234' }
        });
        const reply = createMockReply();

        await vstCallbackController.getPaymentStatus(request, reply);

        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            status: 'success'
          })
        );
      });

      it('should return not_found for non-existent payment', async () => {
        sqlRequest.mockResolvedValueOnce([]);

        const request = createMockRequest({
          query: { payment_id: 'NONEXISTENT' }
        });
        const reply = createMockReply();

        await vstCallbackController.getPaymentStatus(request, reply);

        expect(reply.code).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'TRANSACTION_NOT_FOUND'
          })
        );
      });

      it('should reject missing payment_id', async () => {
        const request = createMockRequest({
          query: {}
        });
        const reply = createMockReply();

        await vstCallbackController.getPaymentStatus(request, reply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should find by transaction_id if provided', async () => {
        const mockTransaction = {
          id: 1,
          account_number: 'ACC001234',
          operation_status: 'success'
        };

        sqlRequest.mockResolvedValueOnce([mockTransaction]);

        const request = createMockRequest({
          query: {
            payment_id: 'ACC001234',
            transaction_id: 'TXN123456'
          }
        });
        const reply = createMockReply();

        await vstCallbackController.getPaymentStatus(request, reply);

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('operation_id'),
          expect.arrayContaining(['TXN123456'])
        );
      });
    });
  });

  // ============================================================
  // Tax Payment Processing
  // ============================================================
  describe('Tax Payment Processing', () => {
    it('should identify and process tax payment ID format', async () => {
      // Tax payment ID: 20 digits (debtor ID + tax type digit)
      const taxPaymentId = '37883900210614120641'; // 19 digits + tax type

      withTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 1, account_number: taxPaymentId, operation_status: 'initiated' }] })
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Debtor update
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Transaction update
        };
        return await callback(mockClient);
      });

      const request = createMockRequest({
        body: {
          payment_id: taxPaymentId,
          status: 'success',
          amount: 500.00
        }
      });
      const reply = createMockReply();

      await vstCallbackController.vstSuccessCallback(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // Service Payment Processing
  // ============================================================
  describe('Service Payment Processing', () => {
    it('should identify and process service payment ID format', async () => {
      const servicePaymentId = 'ACC0001234';

      withTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 1, account_number: servicePaymentId, operation_status: 'initiated' }] })
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Transaction update
        };
        return await callback(mockClient);
      });

      const request = createMockRequest({
        body: {
          payment_id: servicePaymentId,
          status: 'success',
          amount: 1000.00
        }
      });
      const reply = createMockReply();

      await vstCallbackController.vstSuccessCallback(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      withTransaction.mockRejectedValue(new Error('Database connection lost'));

      const request = createMockRequest({
        body: {
          payment_id: 'ACC001234',
          status: 'success',
          amount: 100
        }
      });
      const reply = createMockReply();

      await vstCallbackController.vstSuccessCallback(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });

    it('should handle transaction rollback on error', async () => {
      // When withTransaction throws, it should be caught and return 500
      withTransaction.mockRejectedValue(new Error('Transaction rollback'));

      const request = createMockRequest({
        body: {
          payment_id: 'ACC001234',
          status: 'success',
          amount: 100
        }
      });
      const reply = createMockReply();

      await vstCallbackController.vstSuccessCallback(request, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });
});
