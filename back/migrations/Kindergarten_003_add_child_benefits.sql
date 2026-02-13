-- ===============================
-- МІГРАЦІЯ 005: Система пільг для дітей (child_benefits)
-- ===============================
-- Завдання 4: Пільги зменшують вартість для конкретної дитини
-- Формула: payment_amount = base_cost * (1 - benefit_percentage / 100)
-- Якщо пільга 100% - payment_statement не створюється

-- Створення таблиці для пільг дітей
CREATE TABLE IF NOT EXISTS ower.child_benefits (
    id SERIAL PRIMARY KEY,

    -- Дитина, для якої надається пільга
    child_id INTEGER NOT NULL,

    -- Відсоток пільги (0-100%)
    benefit_percentage DECIMAL(5, 2) NOT NULL CHECK (benefit_percentage >= 0 AND benefit_percentage <= 100),

    -- Причина надання пільги
    benefit_reason TEXT,

    -- Період дії пільги
    valid_from DATE NOT NULL,
    valid_to DATE,  -- NULL = безстроково

    -- Статус пільги
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- Документи/підтвердження (опціонально, шлях до файлу або опис)
    documents TEXT,

    -- Хто надав пільгу
    created_by INTEGER,  -- uid адміністратора
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Оновлення
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_benefit_child
        FOREIGN KEY (child_id)
        REFERENCES ower.children_roster(id)
        ON DELETE CASCADE
);

-- Створення індексів для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_child_benefits_child_id ON ower.child_benefits(child_id);
CREATE INDEX IF NOT EXISTS idx_child_benefits_status ON ower.child_benefits(status);
CREATE INDEX IF NOT EXISTS idx_child_benefits_valid_from ON ower.child_benefits(valid_from);
CREATE INDEX IF NOT EXISTS idx_child_benefits_valid_to ON ower.child_benefits(valid_to);

-- Індекс для пошуку активних пільг на конкретну дату
CREATE INDEX IF NOT EXISTS idx_child_benefits_active_period
ON ower.child_benefits(child_id, status, valid_from, valid_to)
WHERE status = 'active';

-- Коментарі для таблиці
COMMENT ON TABLE ower.child_benefits IS 'Пільги для дітей - зменшують вартість харчування відповідно до відсотка пільги';
COMMENT ON COLUMN ower.child_benefits.benefit_percentage IS 'Відсоток пільги (0-100%). При 100% payment_statement не створюється';
COMMENT ON COLUMN ower.child_benefits.valid_from IS 'Дата початку дії пільги';
COMMENT ON COLUMN ower.child_benefits.valid_to IS 'Дата закінчення дії пільги (NULL = безстроково)';
COMMENT ON COLUMN ower.child_benefits.status IS 'Статус: active (діюча), inactive (недіюча)';

-- Перевірочні запити
SELECT 'Таблиця child_benefits створена успішно' as result;
SELECT COUNT(*) as benefits_count FROM ower.child_benefits;

-- Приклад запиту для отримання активної пільги дитини на певну дату
COMMENT ON INDEX ower.idx_child_benefits_active_period IS 'Використовується для швидкого пошуку активних пільг:
SELECT * FROM ower.child_benefits
WHERE child_id = ?
AND status = ''active''
AND valid_from <= CURRENT_DATE
AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)';
