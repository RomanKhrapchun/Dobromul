# Міграції Community Settings

## Структура файлів на сервері

Для коректної роботи проекту потрібні такі файли з налаштуваннями громади:

```
back/
├── utils/
│   ├── communityConstants.js    # Backend налаштування (CommonJS)
│   └── communityConstants.jsx   # Frontend налаштування (ES6 exports)
└── migrations/
    ├── 001_create_community_settings.sql  # SQL міграція
    └── migrate-community-settings.js      # Скрипт автоміграції
```

---

## Крок 1: Підготовка файлів

### 1.1 Backend файл

`back/utils/communityConstants.js` - звичайний CommonJS модуль:

```javascript
const territory_title = "Боярська міська рада"
const territory_title_instrumental = "Боярської міської територіальної громади"
const GU_DPS_ADDRESS = "вул. Київська, буд. 28, м. Фастів"
// ... інші поля

module.exports = {
    territory_title,
    territory_title_instrumental,
    GU_DPS_ADDRESS,
    // ...
}
```

### 1.2 Frontend файл

**Просто скопіюйте** `front/src/utils/communityConstants.jsx` в `back/utils/`:

```bash
cp front/src/utils/communityConstants.jsx back/utils/
```

Або вручну створіть `back/utils/communityConstants.jsx`:

```javascript
export const cityName = "Боярська"
export const cityCouncil = "міська рада"
export const altCityName = "Логотип Боярської міської ради"
export const territory_title = "Боярська міська рада"
export const territory_title_instrumental = "Боярської міської територіальної громади"
export const website_name = "Портал місцевих податків Боярської громади"
export const website_url = "https://boyarka.skydatagroup.com/"
export const website_url_p4v = "https://p4v.boyarka.skydatagroup.com/"
export const telegram_name = "Місцеві податки Боярської ТГ"
export const telegram_url = "https://t.me/Boyarka_taxes_bot"
export const phone_number_GU_DPS = "(04598) 7-13-56"
export const alt_qr_code = "Qr-code Боярська"
export const GU_DPS_region = "Київській області"
export const COMMUNITY_NAME = "Boiarka"
```

---

## Крок 2: Запуск міграції

```bash
cd back
node migrations/migrate-community-settings.js
```

### Що робить скрипт:

1. Підключається до PostgreSQL БД (використовує `.env`)
2. Читає дані з обох файлів
3. Створює схему `config` та таблицю `community_settings`
4. Вставляє дані в БД

### Приклад виводу:

```
Підключення до бази даних...
Host: 127.0.0.1, Database: boruslav
✓ Дані завантажено з backend communityConstants.js
✓ Дані завантажено з communityConstants-frontend.json

Знайдені дані:
- territory_title: Боярська міська рада
- cityName: Боярська
- community_name: Boiarka

Створення схеми та таблиці...
Таблиця створена успішно

Вставка даних...
Дані успішно вставлено з ID: 1

✅ Міграція завершена успішно!
Тепер ви можете редагувати налаштування через: /settings/community
```

---

## Крок 3: Редагування через UI

Після успішної міграції адміністратор може редагувати налаштування через:

**URL:** `https://your-domain.com/settings/community`

### Функції адмін-панелі:

- Редагування всіх полів громади
- Кешування в Redis (автоматично)
- Очищення кешу вручну
- Валідація даних

---

## Структура таблиці

```sql
config.community_settings:
├── id (SERIAL PRIMARY KEY)
├── city_name
├── city_council
├── alt_city_name
├── territory_title
├── territory_title_instrumental
├── website_name
├── website_url
├── website_url_p4v
├── telegram_name
├── telegram_url
├── phone_number_gu_dps
├── phone_number_kindergarten
├── current_region (JSONB)
├── gu_dps_region
├── gu_dps_address
├── debt_charge_account
├── community_name
├── alt_qr_code
├── created_at
└── updated_at
```

---

## Troubleshooting

### Помилка: "Файл не знайдено"

Переконайтесь що існують обидва файли:
- `back/utils/communityConstants.js`
- `back/utils/communityConstants.jsx`

### Помилка підключення до БД

Перевірте `.env` файл:
```env
DB_HOST=127.0.0.1
DB_USERNAME=adminbot
DB_DATABASE=boruslav
DB_PASSWORD=your_password
DB_PORT=5432
```

### Дані вже існують

Якщо в таблиці вже є дані, скрипт пропустить вставку.
Для оновлення використовуйте адмін-панель або SQL:

```sql
UPDATE config.community_settings
SET city_name = 'Нова назва'
WHERE id = 1;
```

---

## Для нових інстансів

1. Скопіюйте `front/src/utils/communityConstants.jsx` в `back/utils/`
2. Змініть дані в обох файлах під конкретну громаду
3. Запустіть міграцію: `node migrations/migrate-community-settings.js`
4. Використовуйте адмін-панель для подальших змін

**Команда для швидкого копіювання:**
```bash
cp front/src/utils/communityConstants.jsx back/utils/
```
