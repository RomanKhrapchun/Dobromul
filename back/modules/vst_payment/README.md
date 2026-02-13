# VST Payment API

API для отримання інформації про податкові платежі та адміністративні послуги з бази даних.

## Endpoints

### 1. Універсальний Endpoint (отримання інформації про платіж)

**GET** `/api/vst-payment?identifier={identifier}`

Один endpoint для обох типів платежів. Автоматично визначає тип за форматом identifier.

### 2. Status Endpoint (перевірка статусу платежу)

**GET** `/api/vst-payment/status?payment_id={id}&transaction_id={id}`

Дозволяє перевірити поточний статус транзакції перед повторною відправкою колбеку.

### 3. Callback Endpoint (обробка успішного платежу)

**POST** `/api/vst-success`

Endpoint для обробки відповіді від VST платіжного сервісу після успішного/неуспішного платежу.

**⚡ ІДЕМПОТЕНТНІСТЬ:** Колбеки можна надсилати **необмежену кількість разів**. При повторній відправці повертається `success: true` замість помилки.

### Як визначається тип платежу:

**1. Податковий платіж:**
- Формат: `{ID_боржника}{цифра_1-5}`
- Остання цифра від 1 до 5
- Решта - числовий ID
- Приклад: `37883900210614120643` → ID: `3788390021061412064`, тип: `3` (земельний податок)

**2. Адміністративна послуга:**
- Формат: `account_number` з БД
- Будь-який інший формат (до 10 символів)
- Приклад: `ACC0001234`, `1234567890`

### Параметри запиту
- `identifier` (string, required) - Унікальний ідентифікатор платежу

---

## Приклади використання

### Податковий платіж
```bash
# ID боржника: 3788390021061412064
# Тип податку: 3 (земельний податок)
# Identifier: 37883900210614120643
curl -X GET "http://localhost:5000/api/vst-payment?identifier=37883900210614120643" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

**Відповідь:**
```json
{
  "AccountPayment": {
    "ID": "37883900210614120643",
    "Code": "18010700",
    "Name": "Земельний податок з фізичних осіб",
    "Sum": 125000,
    "Type": "101",
    "Account": "UA248999980314070617000013913",
    "EDRPOU": "38008294",
    "RecipientName": "Одержувач ГУК Львів/тест тг/18010700",
    "SenderName": "ІВАНЕНКО ІВАН ІВАНОВИЧ"
  },
  "CallBackURL": "https://test.skydatagroup.com/vst-success",
  "Transaction": {
    "TerminalID": "1",
    "DateTime": "2025-12-18 14:30:45",
    "TransactionID": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Адміністративна послуга
```bash
# Account number: ACC0001234
curl -X GET "http://localhost:5000/api/vst-payment?identifier=ACC0001234" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

**Відповідь:**
```json
{
  "AccountPayment": {
    "ID": "ACC0001234",
    "Code": "22012900",
    "Name": "Державна реєстрація права власності (2 робочі дні)",
    "Sum": 303000,
    "Type": "101",
    "Account": "UA248999980314070617000013913",
    "EDRPOU": "38008294",
    "RecipientName": "Одержувач/Державна реєстрація.../22012900",
    "SenderName": "ПЕТРЕНКО ПЕТРО ПЕТРОВИЧ"
  },
  "CallBackURL": "https://test.skydatagroup.com/vst-success",
  "Transaction": {
    "TerminalID": "1",
    "DateTime": "2025-12-18 14:30:45",
    "TransactionID": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Status Endpoint

### GET /api/vst-payment/status

Дозволяє VST перевіряти стан транзакції перед повторною відправкою колбеку.

#### Query параметри
| Параметр | Тип | Обов'язковий | Опис |
|----------|-----|--------------|------|
| payment_id | string | Ні* | Ідентифікатор платежу (account_number) |
| transaction_id | string | Ні* | ID транзакції від платіжного сервісу |

\* Потрібен хоча б один з параметрів

#### Приклад запиту
```bash
# За payment_id
curl -X GET "http://localhost:5000/api/vst-payment/status?payment_id=37903366558738041481" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"

# За transaction_id
curl -X GET "http://localhost:5000/api/vst-payment/status?transaction_id=2ffff507-b471-419c-8ee0-9c8f155f1f64" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

#### Приклад відповіді (знайдено)
```json
{
  "success": true,
  "status": "success",
  "data": {
    "payment_id": "37903366558738041481",
    "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
    "internal_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "operation_status": "success",
    "response_status": "SUCCESS",
    "operation_date": "2025-12-24T15:43:21.000Z",
    "processed_date": "2025-12-24T15:43:22.000Z",
    "info": {
      "identifier": "37903366558738041481",
      "debtorId": "3790336655873804148",
      "debtorName": "Іваненко Іван Іванович",
      "taxType": 1,
      "amount": 100000
    },
    "response_info": {
      "transactionId": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
      "oldDebt": 1500.00,
      "paidAmount": 1000.00,
      "newDebt": 500.00,
      "fieldUpdated": "residential_debt"
    }
  }
}
```

#### Можливі статуси
| Статус | Опис |
|--------|------|
| `initiated` | Платіж створений, очікує колбек |
| `success` | Платіж успішно оброблений |
| `failed` | Платіж не вдався |

#### Використання для retry логіки
```javascript
async function sendCallbackWithRetry(callbackData) {
  // Перед відправкою перевіряємо чи платіж вже оброблений
  const statusResponse = await fetch(
    `/api/vst-payment/status?payment_id=${callbackData.payment_id}`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  const status = await statusResponse.json();

  // Якщо вже оброблений - не відправляємо колбек
  if (status.data?.operation_status === 'success') {
    console.log('Payment already processed, skipping callback');
    return { success: true, already_processed: true };
  }

  // Якщо initiated або не знайдено - відправляємо колбек
  return await sendCallback(callbackData);
}
```

---

## Callback Endpoint

### POST /api/vst-success

Приймає дані від VST платіжного сервісу після завершення платежу.

#### Тіло запиту (JSON)
```json
{
  "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
  "payment_id": "37903366558738041481",
  "status": "SUCCESS",
  "timestamp": "2025-12-24T15:43:21.4643452+02:00",
  "amount": 1000,
  "commission": 18.00,
  "total_amount": 1018.00,
  "payer_name": "Тестовий Боржник Іванович",
  "payment_method": "CARD",
  "card_mask": "4149 **** **** 7470"
}
```

#### Параметри
| Поле | Тип | Обов'язкове | Опис |
|------|-----|-------------|------|
| transaction_id | string | Ні | ID транзакції платіжного сервісу (UUID) |
| payment_id | string | Так | Identifier платежу (ID боржника + цифра або account_number) |
| status | string | Так | Статус платежу (SUCCESS, FAILED, і т.д.) |
| timestamp | string | Ні | Час платежу (ISO 8601) |
| amount | number | Так | Сума платежу в копійках |
| commission | number | Ні | Комісія платіжного сервісу |
| total_amount | number | Ні | Загальна сума з комісією |
| payer_name | string | Ні | ПІБ платника |
| payment_method | string | Ні | Метод оплати (CARD, і т.д.) |
| card_mask | string | Ні | Маска картки |

#### Логіка обробки

**Для податкових платежів:**
1. Витягується остання цифра з `payment_id` (тип податку 1-5)
2. Видаляється остання цифра → отримується ID боржника
3. Знаходиться боржник в БД `ower.ower`
4. Віднімається сплачена сума з відповідного поля боргу
5. Якщо борг став < 0, встановлюється 0

**Для адміністративних послуг:**
1. Знаходиться рахунок в БД `admin.cnap_accounts` за `payment_id` (account_number)
2. Встановлюється `enabled = false` (рахунок оплачений)

#### Приклад запиту
```bash
curl -X POST "http://localhost:5000/api/vst-success" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
    "payment_id": "37903366558738041481",
    "status": "SUCCESS",
    "amount": 100000,
    "payer_name": "Іваненко Іван Іванович"
  }'
```

#### Приклад відповіді (SUCCESS - податок, перша обробка)
```json
{
  "success": true,
  "message": "Платіж успішно оброблений",
  "processed": true,
  "already_processed": false,
  "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
  "debtor": {
    "id": "3790336655873804148",
    "name": "Іваненко Іван Іванович",
    "taxType": 1,
    "fieldUpdated": "residential_debt",
    "oldDebt": 1500.00,
    "paidAmount": 1000.00,
    "newDebt": 500.00
  }
}
```

#### Приклад відповіді (SUCCESS - повторна відправка колбеку / ІДЕМПОТЕНТНІСТЬ)
```json
{
  "success": true,
  "message": "Платіж вже був успішно оброблений раніше",
  "processed": true,
  "already_processed": true,
  "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
  "original_processed_at": "2025-12-24T15:43:22.000Z",
  "response_info": {
    "transactionId": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
    "oldDebt": 1500.00,
    "paidAmount": 1000.00,
    "newDebt": 500.00,
    "fieldUpdated": "residential_debt"
  }
}
```

**⚡ Важливо:** При повторній відправці колбеку система:
- Повертає `success: true` (не помилку!)
- Встановлює `already_processed: true`
- Не змінює дані в БД повторно
- Включає інформацію про оригінальну обробку

#### Приклад відповіді (SUCCESS - адмін послуга)
```json
{
  "success": true,
  "message": "Платіж успішно оброблений",
  "processed": true,
  "already_processed": false,
  "transaction_id": "2ffff507-b471-419c-8ee0-9c8f155f1f64",
  "account": {
    "accountNumber": "ACC0001234",
    "payer": "Петренко Петро Петрович",
    "serviceName": "Державна реєстрація права власності",
    "amount": 3030.00
  }
}
```

#### Приклад відповіді (FAILED/інший статус)
```json
{
  "success": true,
  "message": "Платіж не успішний. Статус: FAILED",
  "processed": false,
  "status": "FAILED"
}
```

**Можливі статуси:**
- `SUCCESS` - платіж успішний, оновлюється БД
- `FAILED` - платіж провалений, БД не оновлюється
- `PENDING` - платіж в обробці, БД не оновлюється
- `CANCELLED` - платіж скасований, БД не оновлюється
- Інші статуси - БД не оновлюється

**Примітка:** Статус перевіряється регістронезалежно (`success`, `Success`, `SUCCESS` - всі обробляються однаково)

#### Помилки

**400 - Відсутні обов'язкові поля**
```json
{
  "success": false,
  "message": "Відсутні обов'язкові поля: payment_id, status, amount",
  "error": "MISSING_REQUIRED_FIELDS"
}
```

**500 - Помилка обробки**
```json
{
  "success": false,
  "message": "Помилка обробки платежу",
  "error": "Боржника з ID 123456 не знайдено"
}
```

#### Примітки
- Endpoint **НЕ** вимагає API ключ (callback від платіжного сервісу)
- Обробляються тільки платежі зі статусом `SUCCESS` (регістронезалежно)
- Інші статуси (`FAILED`, `PENDING`, `CANCELLED`) повертають success=true, але processed=false
- Сума в `amount` приходить у копійках, автоматично конвертується в гривні
- Всі дії логуються для аудиту
- При статусі не SUCCESS, БД не змінюється, але відповідь успішна (200)

#### ⚡ Ідемпотентність та повторні спроби
- **Немає обмеження на кількість спроб** - можна надсилати колбеки необмежено
- При повторній відправці того ж колбеку повертається `success: true` (не помилка)
- Поле `already_processed: true` вказує що платіж вже був оброблений раніше
- БД не змінюється повторно - гарантована ідемпотентність
- Рекомендовано використовувати `/vst-payment/status` для перевірки стану перед відправкою

---

## Типи податків

Тип визначається за **останньою цифрою** identifier:

| Остання цифра | Код податку | Назва податку | Поле в БД |
|---------------|-------------|---------------|-----------|
| 1 | 18010200 | Податок на житлову нерухомість | residential_debt |
| 2 | 18010300 | Податок на нежитлову нерухомість | non_residential_debt |
| 3 | 18010700 | Земельний податок | land_debt |
| 4 | 18010900 | Орендна плата | orenda_debt |
| 5 | 11011300 | Податок на доходи (МПЗ) | mpz |

**Приклади:**
- `12345671` → житлова нерухомість (код 18010200)
- `12345672` → нежитлова нерухомість (код 18010300)
- `12345673` → земельний податок (код 18010700)
- `12345674` → орендна плата (код 18010900)
- `12345675` → МПЗ (код 11011300)

---

## База даних

### Податки
**Таблиця:** `ower.ower`

**Поля:**
- `id` - унікальний ID боржника
- `name` - ПІБ боржника
- `identification` - ІПН боржника
- `residential_debt` - борг за житлову нерухомість (грн)
- `non_residential_debt` - борг за нежитлову нерухомість (грн)
- `land_debt` - борг за землю (грн)
- `orenda_debt` - борг за оренду (грн)
- `mpz` - борг МПЗ (грн)

**Логіка:**
1. Витягується остання цифра identifier (1-5) → тип податку
2. Видаляється остання цифра → отримується ID боржника
3. Пошук в БД: `WHERE id = {ID_боржника}`
4. Повертається борг за відповідним типом

### Адміністративні послуги
**Таблиці:**
- `admin.cnap_accounts` - рахунки
- `admin.cnap_services` - послуги

**Структура cnap_accounts:**
- `account_number` - номер рахунку (до 10 символів)
- `service_id` - код послуги
- `payer` - ПІБ платника
- `amount` - сума до сплати (грн)
- `enabled` - статус (true = активний, false = оплачений)

**Структура cnap_services:**
- `identifier` - код послуги (22010300, 22012500, і т.д.)
- `name` - назва послуги
- `edrpou` - ЄДРПОУ одержувача
- `iban` - IBAN рахунок

**Логіка:**
1. Пошук в БД: `WHERE account_number = {identifier} AND enabled = true`
2. JOIN з таблицею послуг для отримання деталей
3. Повертається інформація про рахунок

---

## Авторизація

Всі endpoints вимагають API ключ в заголовку запиту.

### Формати передачі API ключа

**Варіант 1** (рекомендований):
```
X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8
```

**Варіант 2**:
```
Authorization: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8
```

**Варіант 3**:
```
Authorization: Bearer vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8
```

---

## Коди відповідей

| Код | Опис |
|-----|------|
| 200 | Успішно отримано дані |
| 400 | Некоректний запит або невалідний identifier |
| 401 | Невалідний або відсутній API ключ |
| 404 | Платіж/послугу з вказаним identifier не знайдено |
| 500 | Внутрішня помилка сервера |

---

## Приклади помилок

### Невалідний API ключ
```bash
curl -X GET "http://localhost:5000/api/vst-payment?identifier=12345" \
  -H "X-API-Key: invalid_key"
```

**Відповідь (401):**
```json
{
  "success": false,
  "message": "Невалідний API ключ",
  "error": "INVALID_API_KEY"
}
```

### Платіж не знайдений
```bash
curl -X GET "http://localhost:5000/api/vst-payment?identifier=999999999" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

**Відповідь (404):**
```json
{
  "success": false,
  "message": "Платіж/послугу з вказаним identifier не знайдено",
  "error": "PAYMENT_NOT_FOUND"
}
```

### Відсутній identifier
```bash
curl -X GET "http://localhost:5000/api/vst-payment" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

**Відповідь (400):**
```json
{
  "success": false,
  "message": "Некоректний запит: відсутній або невалідний параметр identifier",
  "error": "MISSING_IDENTIFIER"
}
```

---

## Налаштування

### 1. Додайте змінні у файл `.env`:

```bash
# VST Payment API
VST_API_KEY=vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8
VST_CALLBACK_URL=https://test.skydatagroup.com/vst-success
```

### 2. Переконайтеся що БД налаштована:

База даних повинна містити:
- Схему `ower` з таблицею `ower` (боржники)
- Схему `admin` з таблицями `cnap_accounts` та `cnap_services`

### 3. Запустіть сервер:

```bash
cd back
npm run dev
```

---

## Тестування

### Тест 1: Податок - житлова нерухомість
```bash
# ID боржника з останньою цифрою 1
curl -X GET "http://localhost:5000/api/vst-payment?identifier=37883900210614120641" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

### Тест 2: Податок - земельний
```bash
# ID боржника з останньою цифрою 3
curl -X GET "http://localhost:5000/api/vst-payment?identifier=37883900210614120643" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

### Тест 3: Адміністративна послуга
```bash
# Account number з БД
curl -X GET "http://localhost:5000/api/vst-payment?identifier=ACC0001234" \
  -H "X-API-Key: vst_live_a7b9c4d8e2f1g3h5j6k8m9n0p2q4r6s8"
```

---

## Структура файлів

```
back/modules/vst_payment/
├── controller/
│   ├── vstPaymentUnifiedController.js  # Універсальний контролер платежів
│   ├── vstPaymentController.js         # Окремі контролери (старі)
│   └── vstCallbackController.js        # Контролер колбеків та статусу
├── router/
│   ├── vstPaymentRouter.js             # Роутинг (всі endpoints)
│   └── vstApiKeyMiddleware.js          # Middleware для авторизації
├── README.md                           # Документація
└── DOCUMENTACION.md                    # Детальна документація

back/utils/
├── vstTaxCodes.js                 # Маппер податкових кодів
└── vstServiceCodes.js             # Не використовується (дані з БД)
```

---

## Старі endpoints (закоментовані)

Для зворотної сумісності залишені окремі endpoints (закоментовані в роутері):

- `GET /api/vst-payment/taxes?identifier={identifier}` - тільки податки
- `GET /api/vst-payment/services?identifier={identifier}` - тільки адмін послуги

Щоб розкоментувати, відредагуйте `vstPaymentRouter.js` та видаліть коментарі `/* */`.

---

## Примітки

- Всі суми у відповіді вказані у **копійках** (помножені на 100)
- Формат дати: `YYYY-MM-DD HH:mm:ss`
- TransactionID генерується автоматично (UUID v4)
- Універсальний endpoint спочатку перевіряє чи це податок, потім адмін послуга
- Рахунки з `enabled = false` вважаються оплаченими/скасованими і не повертаються
- Для production середовища змініть VST_API_KEY на унікальний ключ
