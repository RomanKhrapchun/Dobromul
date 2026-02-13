// tests/unit/vst_payment/vstCallbackController.test.js
// Юніт тести для VST Callback Controller

const { sqlRequest, withTransaction } = require('../../../helpers/database');

// Мокаємо базу даних
jest.mock('../../../helpers/database', () => ({
    sqlRequest: jest.fn(),
    withTransaction: jest.fn()
}));

// Мокаємо Logger
jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const Logger = require('../../../utils/logger');
const {
    vstSuccessCallback,
    getPaymentStatus
} = require('../../../modules/vst_payment/controller/vstCallbackController');

describe('VST Callback Controller Unit Tests', () => {
    let mockReply;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock reply object
        mockReply = {
            code: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =========================================
    // vstSuccessCallback Tests
    // =========================================
    describe('📥 vstSuccessCallback', () => {

        describe('Валідація вхідних даних', () => {
            it('should return 400 when payment_id is missing', async () => {
                const req = {
                    body: {
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'MISSING_REQUIRED_FIELDS'
                    })
                );
            });

            it('should return 400 when status is missing', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'MISSING_REQUIRED_FIELDS'
                    })
                );
            });

            it('should return 400 when amount is missing', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS'
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'MISSING_REQUIRED_FIELDS'
                    })
                );
            });

            it('should return 400 when payment_id is empty string', async () => {
                const req = {
                    body: {
                        payment_id: '',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                // Empty string is falsy, so it's caught by MISSING_REQUIRED_FIELDS check first
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'MISSING_REQUIRED_FIELDS'
                    })
                );
            });

            it('should return 400 when payment_id is too long (>100 chars)', async () => {
                const req = {
                    body: {
                        payment_id: 'a'.repeat(101),
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'INVALID_PAYMENT_ID'
                    })
                );
            });

            it('should return 400 when amount is negative', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: -1000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'INVALID_AMOUNT'
                    })
                );
            });

            it('should return 400 when amount is NaN', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 'not-a-number'
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'INVALID_AMOUNT'
                    })
                );
            });

            it('should warn when amount is zero but continue processing', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 0
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: { success: true }
                });

                await vstSuccessCallback(req, mockReply);

                expect(Logger.warn).toHaveBeenCalledWith(
                    'Zero amount payment received',
                    expect.any(Object)
                );
            });
        });

        describe('Обробка статусів платежу', () => {
            it('should return processed=false for FAILED status', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'FAILED',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: false,
                        status: 'FAILED'
                    })
                );
            });

            it('should return processed=false for PENDING status', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'PENDING',
                        amount: 10000
                    }
                };

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: false,
                        status: 'PENDING'
                    })
                );
            });

            it('should handle status case-insensitively (success)', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'success', // lowercase
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: { success: true }
                });

                await vstSuccessCallback(req, mockReply);

                expect(withTransaction).toHaveBeenCalled();
            });

            it('should handle status case-insensitively (Success)', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'Success', // mixed case
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: { success: true }
                });

                await vstSuccessCallback(req, mockReply);

                expect(withTransaction).toHaveBeenCalled();
            });
        });

        describe('Ідемпотентність', () => {
            it('should return already_processed=true when payment already processed', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        transaction_id: 'tx-123',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                const alreadyProcessedData = {
                    editor_date: '2025-01-20T10:00:00Z',
                    response_info: { oldDebt: 1000, newDebt: 0 }
                };

                withTransaction.mockResolvedValue({
                    type: 'already_processed',
                    data: alreadyProcessedData
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: true,
                        already_processed: true,
                        original_processed_at: alreadyProcessedData.editor_date,
                        response_info: alreadyProcessedData.response_info
                    })
                );
            });

            it('should log when callback already processed', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        transaction_id: 'tx-123',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'already_processed',
                    data: { editor_date: '2025-01-20T10:00:00Z' }
                });

                await vstSuccessCallback(req, mockReply);

                expect(Logger.info).toHaveBeenCalledWith(
                    'Callback already processed, returning success (idempotent)',
                    expect.any(Object)
                );
            });
        });

        describe('Конкурентна обробка (Race Condition Protection)', () => {
            it('should return reason=concurrent_processing when skipped', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'skipped',
                    message: 'Транзакція вже обробляється іншим процесом або не знайдена'
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: false,
                        reason: 'concurrent_processing'
                    })
                );
            });

            it('should log warning when transaction locked by another process', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'skipped',
                    message: 'Транзакція вже обробляється іншим процесом'
                });

                await vstSuccessCallback(req, mockReply);

                expect(Logger.warn).toHaveBeenCalledWith(
                    'Transaction locked by another process or not found',
                    expect.any(Object)
                );
            });
        });

        describe('Успішна обробка платежу', () => {
            it('should process tax payment (payment_id ends with 1-5)', async () => {
                const req = {
                    body: {
                        payment_id: '123456781', // ends with 1 = tax
                        transaction_id: 'tx-123',
                        status: 'SUCCESS',
                        amount: 100000 // 1000 UAH in kopecks
                    }
                };

                const processedData = {
                    success: true,
                    debtor: {
                        id: '12345678',
                        name: 'Тестовий Боржник',
                        taxType: 1,
                        fieldUpdated: 'residential_debt',
                        oldDebt: 1500,
                        paidAmount: 1000,
                        newDebt: 500
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: processedData
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: true,
                        already_processed: false,
                        transaction_id: 'tx-123'
                    })
                );
            });

            it('should process service payment (payment_id not tax format)', async () => {
                const req = {
                    body: {
                        payment_id: 'ACC0001234', // service account
                        transaction_id: 'tx-456',
                        status: 'SUCCESS',
                        amount: 303000 // 3030 UAH in kopecks
                    }
                };

                const processedData = {
                    success: true,
                    account: {
                        accountNumber: 'ACC0001234',
                        payer: 'Платник Тестовий',
                        serviceName: 'Реєстрація права власності',
                        amount: 3030
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: processedData
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        processed: true,
                        already_processed: false
                    })
                );
            });
        });

        describe('Обробка помилок', () => {
            it('should return 500 on database error', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockRejectedValue(new Error('Database connection failed'));

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(500);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        message: 'Помилка обробки платежу',
                        error: 'Database connection failed'
                    })
                );
            });

            it('should log error details on failure', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                const error = new Error('Test error');
                withTransaction.mockRejectedValue(error);

                await vstSuccessCallback(req, mockReply);

                expect(Logger.error).toHaveBeenCalledWith(
                    'Error in vstSuccessCallback',
                    expect.objectContaining({
                        error: 'Test error',
                        body: req.body
                    })
                );
            });

            it('should handle debtor not found error', async () => {
                const req = {
                    body: {
                        payment_id: '999999991',
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockRejectedValue(new Error('Боржника з ID 99999999 не знайдено'));

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(500);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'Боржника з ID 99999999 не знайдено'
                    })
                );
            });
        });

        describe('Обробка transaction_id', () => {
            it('should handle missing transaction_id gracefully', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        status: 'SUCCESS',
                        amount: 10000
                        // no transaction_id
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: { success: true }
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        transaction_id: null
                    })
                );
            });

            it('should handle non-string transaction_id', async () => {
                const req = {
                    body: {
                        payment_id: '123456781',
                        transaction_id: 12345, // number instead of string
                        status: 'SUCCESS',
                        amount: 10000
                    }
                };

                withTransaction.mockResolvedValue({
                    type: 'processed',
                    data: { success: true }
                });

                await vstSuccessCallback(req, mockReply);

                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        transaction_id: null // should be null because it's not a string
                    })
                );
            });
        });
    });

    // =========================================
    // getPaymentStatus Tests
    // =========================================
    describe('📊 getPaymentStatus', () => {

        describe('Валідація параметрів', () => {
            it('should return 400 when both payment_id and transaction_id are missing', async () => {
                const req = { query: {} };

                await getPaymentStatus(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'MISSING_IDENTIFIER'
                    })
                );
            });
        });

        describe('Пошук за payment_id', () => {
            it('should return transaction status by payment_id', async () => {
                const req = {
                    query: {
                        payment_id: '123456781'
                    }
                };

                const mockTransaction = {
                    uuid: 'uuid-123',
                    payment_id: '123456781',
                    transaction_id: 'tx-123',
                    operation_status: 'success',
                    response_status: 'SUCCESS',
                    operation_date: '2025-01-20T10:00:00Z',
                    editor_date: '2025-01-20T10:00:01Z',
                    info: { amount: 10000 },
                    response_info: { oldDebt: 1000 }
                };

                sqlRequest.mockResolvedValue([mockTransaction]);

                await getPaymentStatus(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        status: 'success',
                        data: expect.objectContaining({
                            payment_id: '123456781',
                            operation_status: 'success'
                        })
                    })
                );
            });

            it('should return 404 when transaction not found by payment_id', async () => {
                const req = {
                    query: {
                        payment_id: 'nonexistent'
                    }
                };

                sqlRequest.mockResolvedValue([]);

                await getPaymentStatus(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(404);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'TRANSACTION_NOT_FOUND'
                    })
                );
            });
        });

        describe('Пошук за transaction_id', () => {
            it('should return transaction status by transaction_id', async () => {
                const req = {
                    query: {
                        transaction_id: 'tx-123'
                    }
                };

                const mockTransaction = {
                    uuid: 'uuid-123',
                    payment_id: '123456781',
                    transaction_id: 'tx-123',
                    operation_status: 'initiated',
                    response_status: null,
                    operation_date: '2025-01-20T10:00:00Z'
                };

                sqlRequest.mockResolvedValue([mockTransaction]);

                await getPaymentStatus(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(200);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        status: 'initiated'
                    })
                );
            });

            it('should prefer transaction_id over payment_id when both provided', async () => {
                const req = {
                    query: {
                        payment_id: '123456781',
                        transaction_id: 'tx-123'
                    }
                };

                sqlRequest.mockResolvedValue([{ operation_status: 'success' }]);

                await getPaymentStatus(req, mockReply);

                // Should search by transaction_id (operation_id)
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('operation_id'),
                    ['tx-123']
                );
            });
        });

        describe('Обробка помилок', () => {
            it('should return 500 on database error', async () => {
                const req = {
                    query: {
                        payment_id: '123456781'
                    }
                };

                sqlRequest.mockRejectedValue(new Error('Database error'));

                await getPaymentStatus(req, mockReply);

                expect(mockReply.code).toHaveBeenCalledWith(500);
                expect(mockReply.send).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'Database error'
                    })
                );
            });

            it('should log error on failure', async () => {
                const req = {
                    query: {
                        payment_id: '123456781'
                    }
                };

                sqlRequest.mockRejectedValue(new Error('Test error'));

                await getPaymentStatus(req, mockReply);

                expect(Logger.error).toHaveBeenCalledWith(
                    'Error in getPaymentStatus',
                    expect.objectContaining({
                        error: 'Test error'
                    })
                );
            });
        });
    });

    // =========================================
    // Security Tests
    // =========================================
    describe('🔐 Security', () => {
        it('should handle SQL injection attempts in payment_id', async () => {
            const req = {
                body: {
                    payment_id: "'; DROP TABLE debtor.transaction; --",
                    status: 'SUCCESS',
                    amount: 10000
                }
            };

            withTransaction.mockResolvedValue({
                type: 'skipped',
                message: 'Not found'
            });

            await vstSuccessCallback(req, mockReply);

            // Should not crash and should use parameterized queries
            expect(mockReply.code).toHaveBeenCalledWith(200);
        });

        it('should handle XSS attempts in payment_id', async () => {
            const req = {
                body: {
                    payment_id: '<script>alert("xss")</script>',
                    status: 'SUCCESS',
                    amount: 10000
                }
            };

            withTransaction.mockResolvedValue({
                type: 'skipped',
                message: 'Not found'
            });

            await vstSuccessCallback(req, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(200);
        });
    });
});
