-- Міграція: Створення таблиць ower.tax_records та ower.tax_records_history

-- ============================================
-- 1. Основна таблиця tax_records
-- ============================================

CREATE SEQUENCE IF NOT EXISTS ower.tax_records_id_seq;

CREATE TABLE IF NOT EXISTS ower.tax_records
(
    id integer NOT NULL DEFAULT nextval('ower.tax_records_id_seq'::regclass),
    report_period date NOT NULL,
    taxpayer_code character varying(20) NOT NULL,
    taxpayer_name character varying(255) NOT NULL,
    katottg character varying(20),
    income_code character varying(20) NOT NULL,
    income_name character varying(255) NOT NULL,
    budget_account character varying(50),
    accrued numeric(15,2) DEFAULT 0,
    received numeric(15,2) DEFAULT 0,
    debt numeric(15,2) DEFAULT 0,
    overpaid numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT tax_records_pkey PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS ower.tax_records OWNER to adminbot;

CREATE INDEX IF NOT EXISTS idx_tax_records_income
    ON ower.tax_records USING btree (income_code ASC NULLS LAST, report_period ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tax_records_period
    ON ower.tax_records USING btree (report_period ASC NULLS LAST, taxpayer_code ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tax_records_taxpayer
    ON ower.tax_records USING btree (taxpayer_code ASC NULLS LAST, report_period ASC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_records_unique
    ON ower.tax_records USING btree (report_period ASC NULLS LAST, taxpayer_code ASC NULLS LAST, income_code ASC NULLS LAST);

-- ============================================
-- 2. Таблиця історії tax_records_history
-- ============================================

CREATE TABLE IF NOT EXISTS ower.tax_records_history (
    id SERIAL PRIMARY KEY,
    taxpayer_code VARCHAR(20),
    taxpayer_name VARCHAR(500),
    report_period DATE,
    income_code VARCHAR(20),
    income_name VARCHAR(500),
    accrued NUMERIC(15,2) DEFAULT 0,
    received NUMERIC(15,2) DEFAULT 0,
    debt NUMERIC(15,2) DEFAULT 0,
    overpaid NUMERIC(15,2) DEFAULT 0,
    imported_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trh_period ON ower.tax_records_history(report_period);
CREATE INDEX IF NOT EXISTS idx_trh_taxpayer ON ower.tax_records_history(taxpayer_code);
CREATE INDEX IF NOT EXISTS idx_trh_income ON ower.tax_records_history(income_code);

-- Composite індекси для типових запитів (UNION з фільтрацією)
CREATE INDEX IF NOT EXISTS idx_trh_taxpayer_period ON ower.tax_records_history(taxpayer_code, report_period);
CREATE INDEX IF NOT EXISTS idx_trh_income_period ON ower.tax_records_history(income_code, report_period);
