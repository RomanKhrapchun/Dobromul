-- Міграція 003: Додати kindergarten_id до daily_food_cost
-- Дата: 2026-01-08
-- Автор: Claude
-- Опис: Розділити вартість харчування для кожного садочка окремо

-- ==========================================
-- КРОК 1: Створити довідник садочків
-- ==========================================

CREATE TABLE IF NOT EXISTS ower.kindergartens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    address VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Заповнити з існуючих назв садочків
INSERT INTO ower.kindergartens (name)
SELECT DISTINCT kindergarten_name
FROM ower.kindergarten_groups
WHERE kindergarten_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- КРОК 2: Додати FK до kindergarten_groups
-- ==========================================

ALTER TABLE ower.kindergarten_groups
ADD COLUMN IF NOT EXISTS kindergarten_id INTEGER;

-- Додати foreign key constraint
ALTER TABLE ower.kindergarten_groups
DROP CONSTRAINT IF EXISTS fk_kindergarten_groups_kindergarten;

ALTER TABLE ower.kindergarten_groups
ADD CONSTRAINT fk_kindergarten_groups_kindergarten
FOREIGN KEY (kindergarten_id) REFERENCES ower.kindergartens(id) ON DELETE CASCADE;

-- Заповнити kindergarten_id в kindergarten_groups
UPDATE ower.kindergarten_groups kg
SET kindergarten_id = k.id
FROM ower.kindergartens k
WHERE kg.kindergarten_name = k.name
AND kg.kindergarten_id IS NULL;

-- ==========================================
-- КРОК 3: Додати kindergarten_id до daily_food_cost
-- ==========================================

ALTER TABLE ower.daily_food_cost
ADD COLUMN IF NOT EXISTS kindergarten_id INTEGER;

-- Додати foreign key constraint
ALTER TABLE ower.daily_food_cost
DROP CONSTRAINT IF EXISTS fk_daily_food_cost_kindergarten;

ALTER TABLE ower.daily_food_cost
ADD CONSTRAINT fk_daily_food_cost_kindergarten
FOREIGN KEY (kindergarten_id) REFERENCES ower.kindergartens(id) ON DELETE CASCADE;

-- Заповнити дефолтним значенням (перший садочок)
UPDATE ower.daily_food_cost
SET kindergarten_id = (SELECT id FROM ower.kindergartens ORDER BY id LIMIT 1)
WHERE kindergarten_id IS NULL;

-- Зробити поле обов'язковим
ALTER TABLE ower.daily_food_cost
ALTER COLUMN kindergarten_id SET NOT NULL;

-- ==========================================
-- КРОК 4: Змінити унікальний constraint
-- ==========================================

-- Видалити старий constraint (якщо існує)
ALTER TABLE ower.daily_food_cost
DROP CONSTRAINT IF EXISTS daily_food_cost_date_unique;

ALTER TABLE ower.daily_food_cost
DROP CONSTRAINT IF EXISTS daily_food_cost_date_key;

-- Додати новий constraint (дата + садочок)
ALTER TABLE ower.daily_food_cost
ADD CONSTRAINT daily_food_cost_date_kindergarten_unique
UNIQUE (date, kindergarten_id);

-- ==========================================
-- КРОК 5: Створити індекси для оптимізації
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_daily_food_cost_kindergarten_date
ON ower.daily_food_cost(kindergarten_id, date);

CREATE INDEX IF NOT EXISTS idx_kindergarten_groups_kindergarten_id
ON ower.kindergarten_groups(kindergarten_id);

-- ==========================================
-- КОМЕНТАРІ ДО ТАБЛИЦЬ
-- ==========================================

COMMENT ON TABLE ower.kindergartens IS 'Довідник садочків';
COMMENT ON COLUMN ower.kindergartens.name IS 'Назва садочка (унікальна)';
COMMENT ON COLUMN ower.kindergartens.address IS 'Адреса садочка';

COMMENT ON COLUMN ower.kindergarten_groups.kindergarten_id IS 'Посилання на садочок';
COMMENT ON COLUMN ower.daily_food_cost.kindergarten_id IS 'Посилання на садочок';
COMMENT ON CONSTRAINT daily_food_cost_date_kindergarten_unique ON ower.daily_food_cost IS 'Унікальність: одна вартість харчування на день для кожного садочка';

-- ==========================================
-- ВЕРИФІКАЦІЯ
-- ==========================================

-- Перевірити що всі садочки створені
SELECT 'Садочків створено:' as info, COUNT(*) as count FROM ower.kindergartens;

-- Перевірити що kindergarten_id заповнений у групах
SELECT 'Груп без kindergarten_id:' as info, COUNT(*) as count
FROM ower.kindergarten_groups
WHERE kindergarten_id IS NULL;

-- Перевірити що kindergarten_id заповнений у daily_food_cost
SELECT 'Вартості харчування без kindergarten_id:' as info, COUNT(*) as count
FROM ower.daily_food_cost
WHERE kindergarten_id IS NULL;
