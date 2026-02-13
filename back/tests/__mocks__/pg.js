// __mocks__/pg.js
// Mock для модуля pg (PostgreSQL driver)

const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
};

const mockClient = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    release: jest.fn()
};

module.exports = {
    Pool: jest.fn(() => mockPool),
    Client: jest.fn(() => mockClient)
};
