/**
 * Unit tests for KindergartenService
 * Tests kindergarten business logic with mocked dependencies
 */

// Mock all dependencies before requiring the module
jest.mock('../../../modules/kindergarten/repository/kindergarten-repository');
jest.mock('../../../modules/log/repository/log-repository');
jest.mock('../../../utils/function');
jest.mock('../../../utils/generateDocx');

const kindergartenService = require('../../../modules/kindergarten/service/kindergarten-service');
const KindergartenRepository = require('../../../modules/kindergarten/repository/kindergarten-repository');
const logRepository = require('../../../modules/log/repository/log-repository');
const { paginate, paginationData } = require('../../../utils/function');

describe('KindergartenService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        paginate.mockReturnValue({ offset: 0 });
        paginationData.mockImplementation((data, page, limit, extra) => ({
            data: data,
            page: page,
            limit: limit,
            total: data?.length || 0
        }));
        logRepository.createLog.mockResolvedValue({ id: 1 });
    });

    // ============================================================
    // getKindergartenType
    // ============================================================
    describe('getKindergartenType', () => {
        it('should return "1" when body.kindergarten_type is "1"', () => {
            const request = { body: { kindergarten_type: '1' } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('1');
        });

        it('should return "1" when body.kindergarten_type is number 1', () => {
            const request = { body: { kindergarten_type: 1 } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('1');
        });

        it('should return "2" when body.kindergarten_type is "2"', () => {
            const request = { body: { kindergarten_type: '2' } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('2');
        });

        it('should return "2" when body.kindergarten_type is number 2', () => {
            const request = { body: { kindergarten_type: 2 } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('2');
        });

        it('should return "1" from query when body is empty', () => {
            const request = { body: {}, query: { kindergarten_type: '1' } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('1');
        });

        it('should return "2" from query when body is empty', () => {
            const request = { body: {}, query: { kindergarten_type: '2' } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('2');
        });

        it('should return null when kindergarten_type is not provided', () => {
            const request = { body: {} };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBeNull();
        });

        it('should return null when request has no body', () => {
            const request = {};
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBeNull();
        });

        it('should return null for invalid kindergarten_type "3"', () => {
            const request = { body: { kindergarten_type: '3' } };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBeNull();
        });

        it('should prefer body over query for kindergarten_type', () => {
            const request = {
                body: { kindergarten_type: '1' },
                query: { kindergarten_type: '2' }
            };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBe('1');
        });
    });

    // ============================================================
    // findGroupsByFilter
    // ============================================================
    describe('findGroupsByFilter', () => {
        const mockGroups = [
            [
                { id: 1, group_name: 'Сонечко', group_type: 'молодша група' },
                { id: 2, group_name: 'Веселка', group_type: 'старша група' }
            ]
        ];

        beforeEach(() => {
            KindergartenRepository.findGroupsByFilter.mockResolvedValue(mockGroups);
        });

        it('should return paginated groups with default parameters', async () => {
            const request = { body: {} };

            const result = await kindergartenService.findGroupsByFilter(request);

            expect(paginate).toHaveBeenCalledWith(1, 16);
            expect(KindergartenRepository.findGroupsByFilter).toHaveBeenCalled();
            expect(paginationData).toHaveBeenCalled();
        });

        it('should apply custom pagination parameters', async () => {
            const request = { body: { page: 2, limit: 10 } };

            await kindergartenService.findGroupsByFilter(request);

            expect(paginate).toHaveBeenCalledWith(2, 10);
        });

        it('should pass kindergarten_name filter to repository', async () => {
            const request = {
                body: { kindergarten_name: 'Дубочок' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            await kindergartenService.findGroupsByFilter(request);

            expect(KindergartenRepository.findGroupsByFilter).toHaveBeenCalledWith(
                expect.objectContaining({ kindergarten_name: 'Дубочок' }),
                null
            );
        });

        it('should pass group_name filter to repository', async () => {
            const request = {
                body: { group_name: 'Сонечко' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            await kindergartenService.findGroupsByFilter(request);

            expect(KindergartenRepository.findGroupsByFilter).toHaveBeenCalledWith(
                expect.objectContaining({ group_name: 'Сонечко' }),
                null
            );
        });

        it('should create search log when filters are provided', async () => {
            const request = {
                body: { group_name: 'Сонечко' },
                user: { id: 1 },
                ip: '192.168.1.1'
            };

            await kindergartenService.findGroupsByFilter(request);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SEARCH',
                    application_name: 'Пошук груп садочку'
                })
            );
        });

        it('should not create log when no filters provided', async () => {
            const request = { body: {} };

            await kindergartenService.findGroupsByFilter(request);

            expect(logRepository.createLog).not.toHaveBeenCalled();
        });

        it('should pass kindergarten type to repository', async () => {
            const request = { body: { kindergarten_type: '1' } };

            await kindergartenService.findGroupsByFilter(request);

            expect(KindergartenRepository.findGroupsByFilter).toHaveBeenCalledWith(
                expect.any(Object),
                '1'
            );
        });
    });

    // ============================================================
    // createGroup
    // ============================================================
    describe('createGroup', () => {
        const mockRequest = {
            body: {
                kindergarten_name: 'Дубочок',
                group_name: 'Сонечко',
                group_type: 'молодша група'
            },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should create group successfully when name is unique', async () => {
            KindergartenRepository.getGroupByName.mockResolvedValue([]);
            KindergartenRepository.createGroup.mockResolvedValue({ id: 1 });

            const result = await kindergartenService.createGroup(mockRequest);

            expect(KindergartenRepository.createGroup).toHaveBeenCalledWith(
                expect.objectContaining({
                    kindergarten_name: 'Дубочок',
                    group_name: 'Сонечко',
                    group_type: 'молодша група'
                })
            );
            expect(result).toEqual({ id: 1 });
        });

        it('should throw error when group name already exists', async () => {
            KindergartenRepository.getGroupByName.mockResolvedValue([{ id: 1, group_name: 'Сонечко' }]);

            await expect(kindergartenService.createGroup(mockRequest))
                .rejects.toThrow('Група з такою назвою вже існує');
        });

        it('should create INSERT log after successful creation', async () => {
            KindergartenRepository.getGroupByName.mockResolvedValue([]);
            KindergartenRepository.createGroup.mockResolvedValue({ id: 5 });

            await kindergartenService.createGroup(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'INSERT',
                    application_name: 'Створення групи садочка',
                    table_name: 'kindergarten_groups'
                })
            );
        });

        it('should include created_at timestamp in group data', async () => {
            KindergartenRepository.getGroupByName.mockResolvedValue([]);
            KindergartenRepository.createGroup.mockResolvedValue({ id: 1 });

            await kindergartenService.createGroup(mockRequest);

            expect(KindergartenRepository.createGroup).toHaveBeenCalledWith(
                expect.objectContaining({
                    created_at: expect.any(Date)
                })
            );
        });
    });

    // ============================================================
    // updateGroup
    // ============================================================
    describe('updateGroup', () => {
        const mockRequest = {
            params: { id: 1 },
            body: { group_name: 'Нова назва' },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should update group successfully when it exists', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1, group_name: 'Стара назва' }]);
            KindergartenRepository.getGroupByName.mockResolvedValue([]);
            KindergartenRepository.updateGroup.mockResolvedValue({ affected: 1 });

            const result = await kindergartenService.updateGroup(mockRequest);

            expect(KindergartenRepository.updateGroup).toHaveBeenCalledWith(1, { group_name: 'Нова назва' });
            expect(result).toEqual({ affected: 1 });
        });

        it('should throw error when group does not exist', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([]);

            await expect(kindergartenService.updateGroup(mockRequest))
                .rejects.toThrow('Групу не знайдено');
        });

        it('should throw error when new name already exists for another group', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.getGroupByName.mockResolvedValue([{ id: 2, group_name: 'Нова назва' }]);

            await expect(kindergartenService.updateGroup(mockRequest))
                .rejects.toThrow('Група з такою назвою вже існує');
        });

        it('should allow update without changing name', async () => {
            const requestWithoutName = {
                params: { id: 1 },
                body: { group_type: 'старша група' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.updateGroup.mockResolvedValue({ affected: 1 });

            await kindergartenService.updateGroup(requestWithoutName);

            expect(KindergartenRepository.getGroupByName).not.toHaveBeenCalled();
        });

        it('should create UPDATE log after successful update', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.getGroupByName.mockResolvedValue([]);
            KindergartenRepository.updateGroup.mockResolvedValue({ affected: 1 });

            await kindergartenService.updateGroup(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    row_pk_id: 1,
                    action: 'UPDATE',
                    application_name: 'Оновлення групи садочка'
                })
            );
        });
    });

    // ============================================================
    // deleteGroup
    // ============================================================
    describe('deleteGroup', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should delete group successfully when it exists', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.deleteGroup.mockResolvedValue({ affected: 1 });

            const result = await kindergartenService.deleteGroup(mockRequest);

            expect(KindergartenRepository.deleteGroup).toHaveBeenCalledWith(1);
            expect(result).toEqual({ affected: 1 });
        });

        it('should throw error when group does not exist', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([]);

            await expect(kindergartenService.deleteGroup(mockRequest))
                .rejects.toThrow('Групу не знайдено');
        });

        it('should create DELETE log after successful deletion', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.deleteGroup.mockResolvedValue({ affected: 1 });

            await kindergartenService.deleteGroup(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    row_pk_id: 1,
                    action: 'DELETE',
                    application_name: 'Видалення групи садочку'
                })
            );
        });

        it('should not delete if group not found (null result)', async () => {
            KindergartenRepository.getGroupById.mockResolvedValue(null);

            await expect(kindergartenService.deleteGroup(mockRequest))
                .rejects.toThrow('Групу не знайдено');

            expect(KindergartenRepository.deleteGroup).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // findChildrenByFilter
    // ============================================================
    describe('findChildrenByFilter', () => {
        const mockChildren = [
            [
                { id: 1, child_name: 'Іванов Іван', group_id: 1 },
                { id: 2, child_name: 'Петров Петро', group_id: 2 }
            ],
            2 // total count
        ];

        beforeEach(() => {
            KindergartenRepository.findChildrenByFilter.mockResolvedValue(mockChildren);
        });

        it('should return paginated children with default parameters', async () => {
            const request = { body: {} };

            await kindergartenService.findChildrenByFilter(request);

            expect(paginate).toHaveBeenCalledWith(1, 16);
            expect(paginationData).toHaveBeenCalledWith(
                mockChildren[0], 1, 16, 2
            );
        });

        it('should apply custom pagination parameters', async () => {
            const request = { body: { page: 3, limit: 5 } };

            await kindergartenService.findChildrenByFilter(request);

            expect(paginate).toHaveBeenCalledWith(3, 5);
        });

        it('should create search log when filters are provided', async () => {
            const request = {
                body: { child_name: 'Іванов' },
                user: { id: 1 },
                ip: '192.168.1.1'
            };

            await kindergartenService.findChildrenByFilter(request);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SEARCH',
                    application_name: 'Пошук дітей садочка'
                })
            );
        });

        it('should not create log when no filters provided', async () => {
            const request = { body: { page: 1, limit: 10 } };

            await kindergartenService.findChildrenByFilter(request);

            expect(logRepository.createLog).not.toHaveBeenCalled();
        });

        it('should handle logging error gracefully', async () => {
            const request = {
                body: { child_name: 'Test' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };
            logRepository.createLog.mockRejectedValue(new Error('Log error'));

            // Should not throw, just continue
            const result = await kindergartenService.findChildrenByFilter(request);

            expect(result).toBeDefined();
        });

        it('should pass kindergarten type to repository', async () => {
            const request = { body: { kindergarten_type: '2' } };

            await kindergartenService.findChildrenByFilter(request);

            expect(KindergartenRepository.findChildrenByFilter).toHaveBeenCalledWith(
                expect.any(Object),
                '2'
            );
        });
    });

    // ============================================================
    // createChild
    // ============================================================
    describe('createChild', () => {
        const mockRequest = {
            body: {
                child_name: 'Іванов Іван',
                parent_name: 'Іванов Петро',
                phone_number: '+380501234567',
                group_id: 1
            },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should create child successfully with all data', async () => {
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.createChild.mockResolvedValue({ id: 1 });

            const result = await kindergartenService.createChild(mockRequest);

            expect(KindergartenRepository.createChild).toHaveBeenCalledWith(
                expect.objectContaining({
                    child_name: 'Іванов Іван',
                    parent_name: 'Іванов Петро',
                    phone_number: '+380501234567',
                    group_id: 1
                })
            );
            expect(result).toEqual({ id: 1 });
        });

        it('should throw error when child with same name and parent exists', async () => {
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([{ id: 1 }]);

            await expect(kindergartenService.createChild(mockRequest))
                .rejects.toThrow('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
        });

        it('should throw error when group does not exist', async () => {
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.getGroupById.mockResolvedValue([]);

            await expect(kindergartenService.createChild(mockRequest))
                .rejects.toThrow('Група не знайдена');
        });

        it('should allow creating child without group_id', async () => {
            const requestWithoutGroup = {
                body: {
                    child_name: 'Іванов Іван',
                    parent_name: 'Іванов Петро',
                    phone_number: '+380501234567'
                },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.createChild.mockResolvedValue({ id: 1 });

            await kindergartenService.createChild(requestWithoutGroup);

            expect(KindergartenRepository.getGroupById).not.toHaveBeenCalled();
        });

        it('should create INSERT log after successful creation', async () => {
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.createChild.mockResolvedValue({ id: 5, insertId: 5 });

            await kindergartenService.createChild(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'INSERT',
                    application_name: 'Створення дитини',
                    table_name: 'children_roster'
                })
            );
        });

        it('should include created_at timestamp', async () => {
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.getGroupById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.createChild.mockResolvedValue({ id: 1 });

            await kindergartenService.createChild(mockRequest);

            expect(KindergartenRepository.createChild).toHaveBeenCalledWith(
                expect.objectContaining({
                    created_at: expect.any(Date)
                })
            );
        });
    });

    // ============================================================
    // updateChild
    // ============================================================
    describe('updateChild', () => {
        const mockRequest = {
            params: { id: 1 },
            body: { phone_number: '+380509876543' },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should update child successfully', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.updateChild.mockResolvedValue({ affected: 1 });

            const result = await kindergartenService.updateChild(mockRequest);

            expect(KindergartenRepository.updateChild).toHaveBeenCalledWith(1, { phone_number: '+380509876543' });
            expect(result).toEqual({ affected: 1 });
        });

        it('should throw error when child does not exist', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([]);

            await expect(kindergartenService.updateChild(mockRequest))
                .rejects.toThrow('Дитину не знайдено');
        });

        it('should validate group exists when updating group_id', async () => {
            const requestWithGroup = {
                params: { id: 1 },
                body: { group_id: 2 },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.getGroupById.mockResolvedValue([]);

            await expect(kindergartenService.updateChild(requestWithGroup))
                .rejects.toThrow('Група не знайдена');
        });

        it('should check for duplicate when updating name and parent', async () => {
            const requestWithNameAndParent = {
                params: { id: 1 },
                body: { child_name: 'Нове Імя', parent_name: 'Новий Батько' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([{ id: 2 }]);

            await expect(kindergartenService.updateChild(requestWithNameAndParent))
                .rejects.toThrow('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
        });

        it('should allow update when no duplicate found', async () => {
            const requestWithNameAndParent = {
                params: { id: 1 },
                body: { child_name: 'Нове Імя', parent_name: 'Новий Батько' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.getChildByNameAndParent.mockResolvedValue([]);
            KindergartenRepository.updateChild.mockResolvedValue({ affected: 1 });

            const result = await kindergartenService.updateChild(requestWithNameAndParent);

            expect(result).toEqual({ affected: 1 });
        });

        it('should create UPDATE log after successful update', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.updateChild.mockResolvedValue({ affected: 1 });

            await kindergartenService.updateChild(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    row_pk_id: 1,
                    action: 'UPDATE',
                    application_name: 'Оновлення даних дитини'
                })
            );
        });
    });

    // ============================================================
    // deleteChild
    // ============================================================
    describe('deleteChild', () => {
        const mockRequest = {
            params: { id: 1 },
            user: { id: 1 },
            ip: '127.0.0.1'
        };

        it('should delete child successfully when it exists', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.deleteChild.mockResolvedValue({ affected: 1 });

            const result = await kindergartenService.deleteChild(mockRequest);

            expect(KindergartenRepository.deleteChild).toHaveBeenCalledWith(1);
            expect(result).toEqual({ affected: 1 });
        });

        it('should throw error when child does not exist', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([]);

            await expect(kindergartenService.deleteChild(mockRequest))
                .rejects.toThrow('Дитину не знайдено');
        });

        it('should create DELETE log after successful deletion', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.deleteChild.mockResolvedValue({ affected: 1 });

            await kindergartenService.deleteChild(mockRequest);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    row_pk_id: 1,
                    action: 'DELETE',
                    application_name: 'Видалення дитини з садочка'
                })
            );
        });

        it('should handle logging error gracefully', async () => {
            KindergartenRepository.getChildById.mockResolvedValue([{ id: 1 }]);
            KindergartenRepository.deleteChild.mockResolvedValue({ affected: 1 });
            logRepository.createLog.mockRejectedValue(new Error('Log error'));

            const result = await kindergartenService.deleteChild(mockRequest);

            expect(result).toEqual({ affected: 1 });
        });

        it('should not delete if child not found (null result)', async () => {
            KindergartenRepository.getChildById.mockResolvedValue(null);

            await expect(kindergartenService.deleteChild(mockRequest))
                .rejects.toThrow('Дитину не знайдено');

            expect(KindergartenRepository.deleteChild).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    // findAttendanceByFilter
    // ============================================================
    describe('findAttendanceByFilter', () => {
        const mockAttendance = [
            [
                { id: 1, child_name: 'Іванов Іван', attendance_status: 'present', date: '2024-01-15' },
                { id: 2, child_name: 'Петров Петро', attendance_status: 'absent', date: '2024-01-15' }
            ]
        ];

        beforeEach(() => {
            KindergartenRepository.findAttendanceByFilter.mockResolvedValue(mockAttendance);
            KindergartenRepository.archiveYesterdayAttendance.mockResolvedValue({ archived: 0 });
        });

        it('should return paginated attendance with default parameters', async () => {
            const request = { body: { date: '2024-01-15' } };

            await kindergartenService.findAttendanceByFilter(request);

            expect(paginate).toHaveBeenCalledWith(1, 16);
            expect(paginationData).toHaveBeenCalled();
        });

        it('should apply custom pagination parameters', async () => {
            const request = { body: { page: 2, limit: 20, date: '2024-01-15' } };

            await kindergartenService.findAttendanceByFilter(request);

            expect(paginate).toHaveBeenCalledWith(2, 20);
        });

        it('should create search log when filters are provided', async () => {
            const request = {
                body: { child_name: 'Іванов', date: '2024-01-15' },
                user: { id: 1 },
                ip: '192.168.1.1'
            };

            await kindergartenService.findAttendanceByFilter(request);

            expect(logRepository.createLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SEARCH',
                    application_name: 'Пошук відвідуваності'
                })
            );
        });

        it('should not create log when only date filter provided', async () => {
            const request = { body: { date: '2024-01-15' } };

            await kindergartenService.findAttendanceByFilter(request);

            expect(logRepository.createLog).not.toHaveBeenCalled();
        });

        it('should pass attendance_status filter to repository', async () => {
            const request = {
                body: { attendance_status: 'present' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            await kindergartenService.findAttendanceByFilter(request);

            expect(KindergartenRepository.findAttendanceByFilter).toHaveBeenCalledWith(
                expect.objectContaining({ attendance_status: 'present' }),
                null
            );
        });

        it('should pass kindergarten_name filter to repository', async () => {
            const request = {
                body: { kindergarten_name: 'Дубочок' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            await kindergartenService.findAttendanceByFilter(request);

            expect(KindergartenRepository.findAttendanceByFilter).toHaveBeenCalledWith(
                expect.objectContaining({ kindergarten_name: 'Дубочок' }),
                null
            );
        });

        it('should pass group_name filter to repository', async () => {
            const request = {
                body: { group_name: 'Сонечко' },
                user: { id: 1 },
                ip: '127.0.0.1'
            };

            await kindergartenService.findAttendanceByFilter(request);

            expect(KindergartenRepository.findAttendanceByFilter).toHaveBeenCalledWith(
                expect.objectContaining({ group_name: 'Сонечко' }),
                null
            );
        });

        it('should pass kindergarten type to repository', async () => {
            const request = { body: { kindergarten_type: '1' } };

            await kindergartenService.findAttendanceByFilter(request);

            expect(KindergartenRepository.findAttendanceByFilter).toHaveBeenCalledWith(
                expect.any(Object),
                '1'
            );
        });

        it('should handle archive error gracefully', async () => {
            KindergartenRepository.archiveYesterdayAttendance.mockRejectedValue(new Error('Archive error'));
            const request = { body: {} };

            // Should not throw
            const result = await kindergartenService.findAttendanceByFilter(request);

            expect(result).toBeDefined();
        });
    });

    // ============================================================
    // Edge cases and error handling
    // ============================================================
    describe('Edge Cases', () => {
        it('should handle empty request body gracefully in getKindergartenType', () => {
            const request = { body: null };
            const result = kindergartenService.getKindergartenType(request);
            expect(result).toBeNull();
        });

        it('should handle undefined body properties', async () => {
            const request = {
                body: { page: undefined, limit: undefined }
            };

            KindergartenRepository.findGroupsByFilter.mockResolvedValue([[]]);

            await kindergartenService.findGroupsByFilter(request);

            expect(paginate).toHaveBeenCalledWith(1, 16);
        });

        it('should handle repository returning null', async () => {
            const request = { body: {} };
            KindergartenRepository.findGroupsByFilter.mockResolvedValue([null]);

            const result = await kindergartenService.findGroupsByFilter(request);

            expect(paginationData).toHaveBeenCalledWith(null, 1, 16);
        });
    });
});
