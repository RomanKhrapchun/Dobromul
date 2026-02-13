/**
 * Скрипт автоматичної міграції даних з communityConstants в базу даних
 *
 * Використання:
 *   node migrations/migrate-community-settings.js
 *
 * Цей скрипт:
 * 1. Читає дані з:
 *    - back/utils/communityConstants.js (backend дані)
 *    - back/utils/communityConstants.jsx (frontend дані)
 * 2. Створює схему та таблицю (якщо не існує)
 * 3. Вставляє дані в таблицю community_settings
 *
 * ВАЖЛИВО: На сервері мають бути ОБА файли:
 * - communityConstants.js (CommonJS для backend)
 * - communityConstants.jsx (ES6 exports для frontend)
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Конфігурація бази даних
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 5432
});

// Функція для читання даних з communityConstants.js
function readCommunityConstants() {
    try {
        // Спробуємо прочитати з backend
        const backendPath = path.join(__dirname, '../utils/communityConstants.js');

        if (fs.existsSync(backendPath)) {
            const constants = require(backendPath);
            console.log('Дані завантажено з backend communityConstants.js');
            return constants;
        }

        throw new Error('Файл communityConstants.js не знайдено');
    } catch (error) {
        console.error('Помилка читання communityConstants:', error.message);
        return null;
    }
}

// Функція для читання даних з frontend (communityConstants.jsx)
function readFrontendConstants() {
    try {
        // Читаємо з .jsx файлу (той самий, що використовується на frontend)
        const jsxPath = path.join(__dirname, '../utils/communityConstants.jsx');

        if (fs.existsSync(jsxPath)) {
            const content = fs.readFileSync(jsxPath, 'utf8');

            // Парсимо export const змінні
            const extractValue = (name) => {
                const regex = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*["'\`]([^"'\`]*)["'\`]`, 'i');
                const match = content.match(regex);
                return match ? match[1] : '';
            };

            const result = {
                cityName: extractValue('cityName'),
                cityCouncil: extractValue('cityCouncil'),
                altCityName: extractValue('altCityName'),
                territory_title: extractValue('territory_title'),
                territory_title_instrumental: extractValue('territory_title_instrumental'),
                website_name: extractValue('website_name'),
                website_url: extractValue('website_url'),
                website_url_p4v: extractValue('website_url_p4v'),
                telegram_name: extractValue('telegram_name'),
                telegram_url: extractValue('telegram_url'),
                phone_number_GU_DPS: extractValue('phone_number_GU_DPS'),
                alt_qr_code: extractValue('alt_qr_code'),
                GU_DPS_region: extractValue('GU_DPS_region'),
                COMMUNITY_NAME: extractValue('COMMUNITY_NAME')
            };

            console.log('✓ Дані завантажено з communityConstants.jsx');
            return result;
        }

        console.log('⚠ Файл communityConstants.jsx не знайдено');
        console.log('  Скопіюйте файл front/src/utils/communityConstants.jsx');
        console.log('  в папку back/utils/communityConstants.jsx');

        return null;
    } catch (error) {
        console.error('⚠ Помилка читання frontend констант:', error.message);
        return null;
    }
}

// SQL для створення схеми та таблиці
const createTableSQL = `
-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS config;

-- Create community_settings table
CREATE TABLE IF NOT EXISTS config.community_settings (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    city_council VARCHAR(100) NOT NULL,
    alt_city_name VARCHAR(200),
    territory_title VARCHAR(200) NOT NULL,
    territory_title_instrumental VARCHAR(200),
    website_name VARCHAR(200),
    website_url VARCHAR(255),
    website_url_p4v VARCHAR(255),
    telegram_name VARCHAR(200),
    telegram_url VARCHAR(255),
    phone_number_gu_dps VARCHAR(50),
    phone_number_kindergarten VARCHAR(50),
    current_region JSONB DEFAULT '{}'::jsonb,
    gu_dps_region VARCHAR(200),
    gu_dps_address VARCHAR(500),
    debt_charge_account VARCHAR(50),
    community_name VARCHAR(100) NOT NULL,
    alt_qr_code VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_community_settings_community_name
ON config.community_settings(community_name);

-- Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION config.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_community_settings_updated_at ON config.community_settings;
CREATE TRIGGER update_community_settings_updated_at
    BEFORE UPDATE ON config.community_settings
    FOR EACH ROW
    EXECUTE FUNCTION config.update_updated_at_column();
`;

// SQL для вставки даних
const insertSQL = `
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
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
ON CONFLICT DO NOTHING
RETURNING id
`;

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('Підключення до бази даних...');
        console.log(`Host: ${process.env.DB_HOST}, Database: ${process.env.DB_DATABASE}`);

        // Читаємо дані з обох джерел
        const backendConstants = readCommunityConstants();
        const frontendConstants = readFrontendConstants();

        // Об'єднуємо дані (backend має пріоритет)
        const constants = { ...frontendConstants, ...backendConstants };

        if (!constants || (!constants.territory_title && !constants.cityName)) {
            console.error('Не вдалося прочитати дані з communityConstants');
            console.log('Створюю таблицю без даних...');

            await client.query(createTableSQL);
            console.log('Таблиця створена успішно');
            return;
        }

        console.log('\nЗнайдені дані:');
        console.log('- territory_title:', constants.territory_title);
        console.log('- cityName:', constants.cityName);
        console.log('- community_name:', constants.COMMUNITY_NAME || constants.community_name);

        // Створюємо таблицю
        console.log('\nСтворення схеми та таблиці...');
        await client.query(createTableSQL);
        console.log('Таблиця створена успішно');

        // Перевіряємо чи є вже дані
        const existingData = await client.query('SELECT COUNT(*) FROM config.community_settings');
        if (parseInt(existingData.rows[0].count) > 0) {
            console.log('\nДані вже існують в таблиці. Пропускаю вставку.');
            console.log('Для оновлення використовуйте адмін-панель: /settings/community');
            return;
        }

        // Підготовка даних для вставки
        const currentRegion = constants.CURRENT_REGION || {
            name: '',
            genitive: constants.GU_DPS_region || '',
            dative: constants.GU_DPS_region || '',
            accusative: '',
            instrumental: '',
            locative: constants.GU_DPS_region || ''
        };

        const values = [
            constants.cityName || constants.territory_title?.split(' ')[0] || '',
            constants.cityCouncil || 'міська рада',
            constants.altCityName || `Логотип ${constants.territory_title}`,
            constants.territory_title || '',
            constants.territory_title_instrumental || '',
            constants.website_name || '',
            constants.website_url || '',
            constants.website_url_p4v || '',
            constants.telegram_name || '',
            constants.telegram_url || '',
            constants.phone_number_GU_DPS || '',
            '', // phone_number_kindergarten
            JSON.stringify(currentRegion),
            constants.GU_DPS_region || '',
            constants.GU_DPS_ADDRESS || '',
            constants.debt_charge_account || '',
            constants.COMMUNITY_NAME || constants.community_name || '',
            constants.alt_qr_code || ''
        ];

        console.log('\nВставка даних...');
        const result = await client.query(insertSQL, values);

        if (result.rows.length > 0) {
            console.log(`Дані успішно вставлено з ID: ${result.rows[0].id}`);
        } else {
            console.log('Дані вже існують або вставка не відбулася');
        }

        console.log('\n✅ Міграція завершена успішно!');
        console.log('Тепер ви можете редагувати налаштування через: /settings/community');

    } catch (error) {
        console.error('Помилка міграції:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Запуск міграції
migrate().catch(error => {
    console.error('Фатальна помилка:', error);
    process.exit(1);
});
