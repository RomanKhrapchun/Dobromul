/**
 * Unit tests for VST Payment Controller
 * Tests tax and service payment endpoints with mocked dependencies
 */

// Mock all dependencies before requiring the module
jest.mock('../../../helpers/database');
jest.mock('../../../utils/vstTaxCodes');
jest.mock('crypto');

const { sqlRequest } = require('../../../helpers/database');
const { getTaxByIdentifier } = require('../../../utils/vstTaxCodes');
const crypto = require('crypto');

const {
  getTaxPayment,
  getServicePayment
} = require('../../../modules/vst_payment/controller/vstPaymentController');

describe('VST Payment Controller', () => {
  let mockReply;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock reply object
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Default crypto mock
    crypto.randomUUID = jest.fn().mockReturnValue('test-uuid-12345');
  });

  // ============================================================
  // getTaxPayment
  // ============================================================
  describe('getTaxPayment', () => {
    const mockTaxInfo = {
      code: '18010200',
      name: 'Податок на нерухоме майно',
      type: '101',
      account: 'UA248999980314070617000013913',
      edrpou: '38008294',
      recipientName: 'Одержувач ГУК Львів/тест тг/18010200'
    };

    const mockDebtorData = [{
      id: 12345678,
      name: 'Тестовий Боржник',
      identification: '1234567890',
      non_residential_debt: 1500.50,
      residential_debt: 2500.75,
      land_debt: 300.00,
      orenda_debt: 450.25,
      mpz: 100.00,
      date: '2025-01-01'
    }];

    describe('Валідація identifier', () => {
      it('should return 400 when identifier is missing', async () => {
        const req = { query: {} };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should return 400 when identifier is null', async () => {
        const req = { query: { identifier: null } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should return 400 when identifier is not a string', async () => {
        const req = { query: { identifier: 12345 } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should return 400 when last digit is 0', async () => {
        const req = { query: { identifier: '123456780' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INVALID_TAX_CODE',
            message: expect.stringContaining('остання цифра має бути від 1 до 5')
          })
        );
      });

      it('should return 400 when last digit is 6', async () => {
        const req = { query: { identifier: '123456786' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INVALID_TAX_CODE'
          })
        );
      });

      it('should return 400 when last digit is 9', async () => {
        const req = { query: { identifier: '123456789' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INVALID_TAX_CODE'
          })
        );
      });

      it('should return 400 when last character is not a digit', async () => {
        const req = { query: { identifier: '12345678a' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INVALID_TAX_CODE'
          })
        );
      });
    });

    describe('Пошук боржника в БД', () => {
      it('should return 404 when debtor not found', async () => {
        const req = { query: { identifier: '999999991' } };

        sqlRequest.mockResolvedValue([]);
        getTaxByIdentifier.mockReturnValue(mockTaxInfo);

        await getTaxPayment(req, mockReply);

        expect(sqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          ['99999999']
        );
        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'DEBTOR_NOT_FOUND'
          })
        );
      });

      it('should return 404 when sqlRequest returns null', async () => {
        const req = { query: { identifier: '123456781' } };

        sqlRequest.mockResolvedValue(null);
        getTaxByIdentifier.mockReturnValue(mockTaxInfo);

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'DEBTOR_NOT_FOUND'
          })
        );
      });
    });

    describe('Пошук податку за identifier', () => {
      it('should return 404 when tax info not found', async () => {
        const req = { query: { identifier: '123456781' } };

        sqlRequest.mockResolvedValue(mockDebtorData);
        getTaxByIdentifier.mockReturnValue(null);

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'TAX_NOT_FOUND'
          })
        );
      });
    });

    describe('Обробка різних типів податків (1-5)', () => {
      beforeEach(() => {
        getTaxByIdentifier.mockReturnValue(mockTaxInfo);
        sqlRequest.mockResolvedValue(mockDebtorData);
      });

      it('should return residential_debt for tax type 1', async () => {
        const req = { query: { identifier: '123456781' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456781',
              Sum: 250075 // 2500.75 * 100
            })
          })
        );
      });

      it('should return non_residential_debt for tax type 2', async () => {
        const req = { query: { identifier: '123456782' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456782',
              Sum: 150050 // 1500.50 * 100
            })
          })
        );
      });

      it('should return land_debt for tax type 3', async () => {
        const req = { query: { identifier: '123456783' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456783',
              Sum: 30000 // 300.00 * 100
            })
          })
        );
      });

      it('should return orenda_debt for tax type 4', async () => {
        const req = { query: { identifier: '123456784' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456784',
              Sum: 45025 // 450.25 * 100
            })
          })
        );
      });

      it('should return mpz for tax type 5', async () => {
        const req = { query: { identifier: '123456785' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456785',
              Sum: 10000 // 100.00 * 100
            })
          })
        );
      });
    });

    describe('Конвертація суми в копійки', () => {
      beforeEach(() => {
        getTaxByIdentifier.mockReturnValue(mockTaxInfo);
      });

      it('should convert decimal amount to kopecks correctly', async () => {
        const req = { query: { identifier: '123456781' } };
        const debtorWithDecimal = [{
          ...mockDebtorData[0],
          residential_debt: 123.45
        }];

        sqlRequest.mockResolvedValue(debtorWithDecimal);

        await getTaxPayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              Sum: 12345
            })
          })
        );
      });

      it('should handle zero debt', async () => {
        const req = { query: { identifier: '123456781' } };
        const debtorWithZero = [{
          ...mockDebtorData[0],
          residential_debt: 0
        }];

        sqlRequest.mockResolvedValue(debtorWithZero);

        await getTaxPayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              Sum: 0
            })
          })
        );
      });

      it('should handle null debt as zero', async () => {
        const req = { query: { identifier: '123456781' } };
        const debtorWithNull = [{
          ...mockDebtorData[0],
          residential_debt: null
        }];

        sqlRequest.mockResolvedValue(debtorWithNull);

        await getTaxPayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              Sum: 0
            })
          })
        );
      });

      it('should round fractional kopecks correctly', async () => {
        const req = { query: { identifier: '123456781' } };
        const debtorWithFraction = [{
          ...mockDebtorData[0],
          residential_debt: 100.999 // Should round to 10100
        }];

        sqlRequest.mockResolvedValue(debtorWithFraction);

        await getTaxPayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              Sum: 10100
            })
          })
        );
      });
    });

    describe('Формат відповіді', () => {
      beforeEach(() => {
        getTaxByIdentifier.mockReturnValue(mockTaxInfo);
        sqlRequest.mockResolvedValue(mockDebtorData);
      });

      it('should return correct response structure', async () => {
        const req = { query: { identifier: '123456781' } };

        await getTaxPayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: '123456781',
              Code: mockTaxInfo.code,
              Name: mockTaxInfo.name,
              Type: mockTaxInfo.type,
              Account: mockTaxInfo.account,
              EDRPOU: mockTaxInfo.edrpou,
              RecipientName: mockTaxInfo.recipientName,
              SenderName: 'Тестовий Боржник'
            }),
            CallBackURL: expect.any(String),
            Transaction: expect.objectContaining({
              TerminalID: '1',
              DateTime: expect.any(String),
              TransactionID: 'test-uuid-12345'
            })
          })
        );
      });

      it('should generate unique TransactionID', async () => {
        const req = { query: { identifier: '123456781' } };

        await getTaxPayment(req, mockReply);

        expect(crypto.randomUUID).toHaveBeenCalled();
      });
    });

    describe('Обробка помилок', () => {
      it('should return 500 on database error', async () => {
        const req = { query: { identifier: '123456781' } };

        sqlRequest.mockRejectedValue(new Error('Database connection failed'));

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INTERNAL_SERVER_ERROR'
          })
        );
      });

      it('should handle unexpected errors gracefully', async () => {
        const req = { query: { identifier: '123456781' } };

        sqlRequest.mockResolvedValue(mockDebtorData);
        getTaxByIdentifier.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        await getTaxPayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(500);
      });
    });
  });

  // ============================================================
  // getServicePayment
  // ============================================================
  describe('getServicePayment', () => {
    const mockAccountData = [{
      id: 1,
      account_number: 'ACC0001234',
      service_id: 'SRV001',
      administrator: 'Admin User',
      date: '2025-01-01',
      time: '10:00:00',
      payer: 'Платник Тестовий',
      amount: 3030.50,
      enabled: true,
      service_code: 'SRV001',
      service_name: 'Реєстрація права власності',
      service_price: 3030.50,
      edrpou: '12345678',
      iban: 'UA123456789012345678901234567'
    }];

    describe('Валідація identifier', () => {
      it('should return 400 when identifier is missing', async () => {
        const req = { query: {} };

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should return 400 when identifier is null', async () => {
        const req = { query: { identifier: null } };

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });

      it('should return 400 when identifier is not a string', async () => {
        const req = { query: { identifier: 12345 } };

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'MISSING_IDENTIFIER'
          })
        );
      });
    });

    describe('Пошук рахунку в БД', () => {
      it('should return 404 when account not found', async () => {
        const req = { query: { identifier: 'NONEXISTENT' } };

        sqlRequest.mockResolvedValue([]);

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'ACCOUNT_NOT_FOUND'
          })
        );
      });

      it('should return 404 when sqlRequest returns null', async () => {
        const req = { query: { identifier: 'ACC0001234' } };

        sqlRequest.mockResolvedValue(null);

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'ACCOUNT_NOT_FOUND'
          })
        );
      });
    });

    describe('Перевірка послуги', () => {
      it('should return 404 when service_code is missing', async () => {
        const req = { query: { identifier: 'ACC0001234' } };
        const accountWithoutService = [{
          ...mockAccountData[0],
          service_code: null,
          service_name: 'Test Service'
        }];

        sqlRequest.mockResolvedValue(accountWithoutService);

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'SERVICE_NOT_FOUND'
          })
        );
      });

      it('should return 404 when service_name is missing', async () => {
        const req = { query: { identifier: 'ACC0001234' } };
        const accountWithoutServiceName = [{
          ...mockAccountData[0],
          service_code: 'SRV001',
          service_name: null
        }];

        sqlRequest.mockResolvedValue(accountWithoutServiceName);

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(404);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'SERVICE_NOT_FOUND'
          })
        );
      });
    });

    describe('Успішна відповідь', () => {
      beforeEach(() => {
        sqlRequest.mockResolvedValue(mockAccountData);
      });

      it('should return 200 with correct response structure', async () => {
        const req = { query: { identifier: 'ACC0001234' } };

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(200);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              ID: 'ACC0001234',
              Code: 'SRV001',
              Name: 'Реєстрація права власності',
              Type: '101',
              Account: 'UA123456789012345678901234567',
              EDRPOU: '12345678',
              SenderName: 'Платник Тестовий'
            }),
            CallBackURL: expect.any(String),
            Transaction: expect.objectContaining({
              TerminalID: '1',
              TransactionID: 'test-uuid-12345'
            })
          })
        );
      });

      it('should format RecipientName correctly', async () => {
        const req = { query: { identifier: 'ACC0001234' } };

        await getServicePayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              RecipientName: 'Одержувач/Реєстрація права власності/SRV001'
            })
          })
        );
      });

      it('should convert amount to kopecks', async () => {
        const req = { query: { identifier: 'ACC0001234' } };

        await getServicePayment(req, mockReply);

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            AccountPayment: expect.objectContaining({
              Sum: 303050 // 3030.50 * 100
            })
          })
        );
      });
    });

    describe('Обробка помилок', () => {
      it('should return 500 on database error', async () => {
        const req = { query: { identifier: 'ACC0001234' } };

        sqlRequest.mockRejectedValue(new Error('Database connection failed'));

        await getServicePayment(req, mockReply);

        expect(mockReply.code).toHaveBeenCalledWith(500);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'INTERNAL_SERVER_ERROR'
          })
        );
      });
    });
  });

  // ============================================================
  // Security Tests
  // ============================================================
  describe('Security', () => {
    it('should use parameterized query for getTaxPayment', async () => {
      const req = { query: { identifier: "'; DROP TABLE ower.ower; --1" } };

      sqlRequest.mockResolvedValue([]);

      await getTaxPayment(req, mockReply);

      // Should pass the value as a parameter, not concatenate it
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE ower.ower; --"]
      );
    });

    it('should use parameterized query for getServicePayment', async () => {
      const req = { query: { identifier: "'; DROP TABLE admin.cnap_accounts; --" } };

      sqlRequest.mockResolvedValue([]);

      await getServicePayment(req, mockReply);

      // Should pass the value as a parameter, not concatenate it
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE admin.cnap_accounts; --"]
      );
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle very large debt amounts', async () => {
      const req = { query: { identifier: '123456781' } };
      const largeDebtDebtor = [{
        id: 12345678,
        name: 'Боржник з великим боргом',
        residential_debt: 9999999.99
      }];

      sqlRequest.mockResolvedValue(largeDebtDebtor);
      getTaxByIdentifier.mockReturnValue({
        code: '18010200',
        name: 'Test Tax',
        type: '101',
        account: 'UA123',
        edrpou: '12345678',
        recipientName: 'Test'
      });

      await getTaxPayment(req, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          AccountPayment: expect.objectContaining({
            Sum: 999999999 // 9999999.99 * 100
          })
        })
      );
    });

    it('should handle identifier with only one character tax code', async () => {
      const req = { query: { identifier: '1' } };

      // Single character '1' - debtor ID is empty string
      sqlRequest.mockResolvedValue([]);
      getTaxByIdentifier.mockReturnValue({
        code: '18010200',
        name: 'Test Tax',
        type: '101',
        account: 'UA123',
        edrpou: '12345678',
        recipientName: 'Test'
      });

      await getTaxPayment(req, mockReply);

      // Should extract empty string as debtor ID
      expect(sqlRequest).toHaveBeenCalledWith(
        expect.any(String),
        ['']
      );
    });

    it('should handle special characters in payer name', async () => {
      const req = { query: { identifier: 'ACC0001234' } };
      const accountWithSpecialChars = [{
        id: 1,
        account_number: 'ACC0001234',
        payer: 'Іванов І.І. <test@test.com>',
        amount: 100,
        service_code: 'SRV001',
        service_name: 'Test Service',
        edrpou: '12345678',
        iban: 'UA123'
      }];

      sqlRequest.mockResolvedValue(accountWithSpecialChars);

      await getServicePayment(req, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          AccountPayment: expect.objectContaining({
            SenderName: 'Іванов І.І. <test@test.com>'
          })
        })
      );
    });
  });
});
