-- ===============================
-- МІГРАЦІЯ 004: Система пропозицій дітей (child_proposals)
-- ===============================
-- Завдання 3: Вихователі пропонують дітей, адміни затверджують
-- При затвердженні дитина переноситься в children_roster

-- Створення таблиці для пропозицій дітей
CREATE TABLE IF NOT EXISTS ower.child_proposals (
    id SERIAL PRIMARY KEY,

    -- Основна інформація про дитину (як у children_roster)
    child_name VARCHAR(255) NOT NULL,
    child_birth_date DATE,
    parent_name VARCHAR(255),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,

    -- Група для якої пропонується дитина
    group_id INTEGER NOT NULL,

    -- Пільги (опціонально, можна вказати відразу при пропозиції)
    benefit_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (benefit_percentage >= 0 AND benefit_percentage <= 100),
    benefit_reason TEXT,

    -- Статус пропозиції
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Хто запропонував (вихователь)
    proposed_by INTEGER,  -- uid вихователя
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Хто затвердив/відхилив (адміністратор)
    reviewed_by INTEGER,  -- uid адміністратора
    reviewed_at TIMESTAMP,
    review_notes TEXT,  -- Коментар при розгляді

    -- Після затвердження - ID створеної дитини в children_roster
    approved_child_id INTEGER,

    -- Foreign keys
    CONSTRAINT fk_proposal_group
        FOREIGN KEY (group_id)
        REFERENCES ower.kindergarten_groups(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_approved_child
        FOREIGN KEY (approved_child_id)
        REFERENCES ower.children_roster(id)
        ON DELETE SET NULL,

    -- Індекси для швидкого пошуку
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Створення індексів
CREATE INDEX IF NOT EXISTS idx_child_proposals_status ON ower.child_proposals(status);
CREATE INDEX IF NOT EXISTS idx_child_proposals_group_id ON ower.child_proposals(group_id);
CREATE INDEX IF NOT EXISTS idx_child_proposals_proposed_by ON ower.child_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_child_proposals_created_at ON ower.child_proposals(created_at);

-- Коментарі для таблиці
COMMENT ON TABLE ower.child_proposals IS 'Пропозиції дітей від вихователів, які чекають на затвердження адміністратором';
COMMENT ON COLUMN ower.child_proposals.status IS 'Статус: pending (очікує), approved (затверджено), rejected (відхилено)';
COMMENT ON COLUMN ower.child_proposals.benefit_percentage IS 'Відсоток пільги (0-100), якщо вихователь відразу вказав пільгу';
COMMENT ON COLUMN ower.child_proposals.approved_child_id IS 'ID дитини в children_roster після затвердження пропозиції';

-- Перевірочні запити
SELECT 'Таблиця child_proposals створена успішно' as result;
SELECT COUNT(*) as proposals_count FROM ower.child_proposals;
