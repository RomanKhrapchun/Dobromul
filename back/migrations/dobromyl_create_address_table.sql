-- Migration: 006_create_address_table.sql
-- Description: Створення таблиці ower.address для зберігання адрес боржників
-- Date: 2026-01-27
-- Author: System

-- =====================================================
-- КРОК 1: Створення таблиці ower.address
-- =====================================================

CREATE TABLE IF NOT EXISTS ower.address (
    id SERIAL PRIMARY KEY,
    history_record_id INT REFERENCES ower.ower_history(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    ipn VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Коментар до таблиці
COMMENT ON TABLE ower.address IS 'Таблиця для зберігання адрес боржників з прив''язкою до ower_history';
COMMENT ON COLUMN ower.address.history_record_id IS 'ID запису з ower_history (може бути NULL якщо запис видалено)';
COMMENT ON COLUMN ower.address.name IS 'ПІБ боржника';
COMMENT ON COLUMN ower.address.ipn IS 'ІПН боржника (частковий або повний)';
COMMENT ON COLUMN ower.address.address IS 'Адреса боржника';

-- =====================================================
-- КРОК 2: Створення індексів
-- =====================================================

-- Індекс для швидкого пошуку по name + ipn (основний спосіб пошуку)
CREATE INDEX IF NOT EXISTS idx_address_name_ipn ON ower.address(name, ipn);

-- Індекс для пошуку по history_record_id
CREATE INDEX IF NOT EXISTS idx_address_history_id ON ower.address(history_record_id);

-- Унікальний індекс для запобігання дублікатів (один запис на name + ipn)
CREATE UNIQUE INDEX IF NOT EXISTS idx_address_unique_name_ipn ON ower.address(name, ipn);

-- =====================================================
-- КРОК 3: Міграція даних з ower.ower.address
-- =====================================================

-- Вставка адрес з ower.ower (де address IS NOT NULL і не порожній)
-- Для ipn використовуємо identification з ower.ower
INSERT INTO ower.address (name, ipn, address, created_at, updated_at)
SELECT DISTINCT
    o.name,
    o.identification as ipn,
    o.address,
    NOW() as created_at,
    NOW() as updated_at
FROM ower.ower o
WHERE o.address IS NOT NULL
  AND TRIM(o.address) != ''
ON CONFLICT (name, ipn) DO UPDATE
SET
    address = EXCLUDED.address,
    updated_at = NOW();

-- =====================================================
-- КРОК 4: Оновлення history_record_id (опціонально)
-- =====================================================

-- Оновлюємо history_record_id для записів де можемо знайти відповідність
-- ВАЖЛИВО: в ower_history.identification зберігаються лише 3 останні цифри ІПН
-- Тому порівнюємо останні 3 цифри з ower.address.ipn з ower_history.identification
UPDATE ower.address a
SET history_record_id = (
    SELECT h.id
    FROM ower.ower_history h
    WHERE h.person_name = a.name
      AND h.identification = RIGHT(a.ipn, 3)
    ORDER BY h.registry_date DESC
    LIMIT 1
)
WHERE a.history_record_id IS NULL;

-- =====================================================
-- КРОК 5: Створення функції для автоматичного оновлення updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION ower.update_address_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Тригер для автоматичного оновлення updated_at
DROP TRIGGER IF EXISTS trigger_address_updated_at ON ower.address;
CREATE TRIGGER trigger_address_updated_at
    BEFORE UPDATE ON ower.address
    FOR EACH ROW
    EXECUTE FUNCTION ower.update_address_updated_at();

-- =====================================================
-- ІНФОРМАЦІЯ ПРО МІГРАЦІЮ
-- =====================================================

DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM ower.address;
    RAISE NOTICE 'Міграція завершена. Перенесено адрес: %', migrated_count;
END $$;
