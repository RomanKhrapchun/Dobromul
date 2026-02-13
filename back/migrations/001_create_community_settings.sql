-- Migration: Create community_settings table
-- Date: 2024
-- Description: Stores instance-specific community configuration

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS config;

-- Create community_settings table
CREATE TABLE IF NOT EXISTS config.community_settings (
    id SERIAL PRIMARY KEY,

    -- Branding
    city_name VARCHAR(100) NOT NULL,
    city_council VARCHAR(100) NOT NULL,
    alt_city_name VARCHAR(200),

    -- Official names
    territory_title VARCHAR(200) NOT NULL,
    territory_title_instrumental VARCHAR(200),

    -- Websites
    website_name VARCHAR(200),
    website_url VARCHAR(255),
    website_url_p4v VARCHAR(255),

    -- Telegram
    telegram_name VARCHAR(200),
    telegram_url VARCHAR(255),

    -- Contacts
    phone_number_gu_dps VARCHAR(50),
    phone_number_kindergarten VARCHAR(50),

    -- Region (JSON with grammatical cases)
    current_region JSONB DEFAULT '{
        "name": "",
        "genitive": "",
        "dative": "",
        "accusative": "",
        "instrumental": "",
        "locative": ""
    }'::jsonb,

    -- DPS
    gu_dps_region VARCHAR(200),
    gu_dps_address VARCHAR(500),

    -- Finance
    debt_charge_account VARCHAR(50),

    -- System
    community_name VARCHAR(100) NOT NULL,
    alt_qr_code VARCHAR(200),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on community_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_settings_community_name
ON config.community_settings(community_name);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION config.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_community_settings_updated_at ON config.community_settings;
CREATE TRIGGER update_community_settings_updated_at
    BEFORE UPDATE ON config.community_settings
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at_column();

-- Insert default/example data (can be modified per instance)
INSERT INTO config.community_settings (
    city_name,
    city_council,
    alt_city_name,
    territory_title,
    territory_title_instrumental,
    website_name,
    website_url,
    website_url_p4v,
    telegram_name,
    telegram_url,
    phone_number_gu_dps,
    phone_number_kindergarten,
    current_region,
    gu_dps_region,
    gu_dps_address,
    debt_charge_account,
    community_name,
    alt_qr_code
) VALUES (
    'Тестова',
    'міська рада',
    'Логотип Тестової міської ради',
    'Тестова міська рада',
    'Тестової міської територіальної громади',
    'Портал місцевих податків Тестової громади',
    'https://testova.skydatagroup.com/',
    'https://p4v.testova.skydatagroup.com/',
    'Місцеві податки Тестової ТГ',
    'https://t.me/Testova_taxes_bot',
    '(03229) 7-30-91',
    '',
    '{
        "name": "Львівська область",
        "genitive": "Львівської області",
        "dative": "Львівській області",
        "accusative": "Львівську область",
        "instrumental": "Львівською областю",
        "locative": "Львівській області"
    }'::jsonb,
    'Львівській області',
    '79003, м. Львів, вул. Стрийська, 35',
    'UA1111111111111111111111111111',
    'testova',
    'Qr-code Тестова'
) ON CONFLICT DO NOTHING;

-- Comment on table
COMMENT ON TABLE config.community_settings IS 'Instance-specific community configuration settings';
