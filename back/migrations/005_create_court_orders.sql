CREATE TABLE IF NOT EXISTS ower.court_orders (
    id SERIAL PRIMARY KEY,
    community_name VARCHAR(255) NOT NULL,
    community_address VARCHAR(500),
    community_phone VARCHAR(100),
    community_email VARCHAR(255),
    community_edrpou VARCHAR(20),
    council_address VARCHAR(500),
    court_name VARCHAR(255) NOT NULL,
    court_address VARCHAR(500),
    debtor_name VARCHAR(255) NOT NULL,
    debtor_address VARCHAR(500),
    debtor_edrpou VARCHAR(20),
    debtor_contacts VARCHAR(255),
    debt_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    court_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_orders_debtor_name ON ower.court_orders (debtor_name);
CREATE INDEX IF NOT EXISTS idx_court_orders_created_at ON ower.court_orders (created_at);
