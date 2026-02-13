-- Migration: 002_create_sms_templates
-- Description: Create table for SMS templates with placeholders
-- Date: 2025-12-04

CREATE TABLE IF NOT EXISTS ower.sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    description VARCHAR(500),
    placeholders JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- Index for faster queries on active templates
CREATE INDEX IF NOT EXISTS idx_sms_templates_is_active ON ower.sms_templates(is_active);

-- Insert default templates
INSERT INTO ower.sms_templates (name, text, description, placeholders) VALUES
(
    'Нагадування про заборгованість',
    'Шановний {{name}}! Нагадуємо про заборгованість {{debt_amount}} грн. Прохання сплатити найближчим часом.',
    'Стандартне нагадування про борг',
    '[{"name": "name", "description": "ПІБ боржника"}, {"name": "debt_amount", "description": "Сума боргу"}]'
),
(
    'Інформування про нарахування',
    'Шановний {{name}}! Станом на {{date}} Ваша заборгованість складає {{debt_amount}} грн. Адреса: {{address}}.',
    'Інформаційне повідомлення',
    '[{"name": "name", "description": "ПІБ боржника"}, {"name": "date", "description": "Дата"}, {"name": "debt_amount", "description": "Сума боргу"}, {"name": "address", "description": "Адреса"}]'
);
