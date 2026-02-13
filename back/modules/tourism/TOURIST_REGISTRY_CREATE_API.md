# Tourist Registry Create API - Документація

## Endpoint для створення запису туриста

### POST `/api/touristtax/tourist-registry/create`

Endpoint для створення нового запису туриста в реєстрі туристичного податку.

**Важливо:**
- Перед створенням перевіряється існування хоста в базі даних
- Автоматично обчислюється кількість днів проживання, якщо не передано
- Всі дати повинні бути у форматі YYYY-MM-DD

---

## Структура запиту

### Обов'язкові поля

| Поле | Тип | Опис | Приклад |
|------|-----|------|---------|
| `host_id` | integer | ID хоста (власника житла). Хост повинен існувати в БД | `123` |
| `full_name` | string | Повне ім'я туриста. Не може бути пустим | `"Іванов Іван Іванович"` |
| `arrival` | date | Дата прибуття у форматі YYYY-MM-DD | `"2026-01-10"` |
| `departure` | date | Дата виїзду у форматі YYYY-MM-DD. Не може бути раніше за arrival | `"2026-01-15"` |
| `tax` | numeric | Сума туристичного податку. Не може бути від'ємною | `250.50` |


### Опціональні поля

| Поле | Тип | Опис | За замовчуванням | Приклад |
|------|-----|------|------------------|---------|
| `rental_days` | integer | Кількість днів оренди. Якщо не передано - обчислюється автоматично як різниця між departure та arrival | Автоматично обчислюється | `5` |
| `is_paid` | boolean | Чи оплачено податок | `true` | `false` |

---

## Приклад запиту

```json
POST /api/touristtax/tourist-registry/create
Content-Type: application/json


{
  "host_id": 123,
  "full_name": "Іванов Іван Іванович",
  "arrival": "2026-01-10",
  "departure": "2026-01-15",
  "tax": 250.50,
  "rental_days": 5,
  "is_paid": true
}
```

### Мінімальний запит (з автоматичним обчисленням rental_days)

```json
{
  "host_id": 123,
  "full_name": "Іванов Іван Іванович",
  "arrival": "2026-01-10",
  "departure": "2026-01-15",
  "tax": 250.50
}
```

---

## Структура відповіді

### Успішна відповідь

**Статус код:** `200 OK`

```json
{
  "message": "Запис успішно створено",
  "data": {
    "id": 456,
    "host_id": 123,
    "full_name": "Іванов Іван Іванович",
    "arrival": "2026-01-10",
    "departure": "2026-01-15",
    "rental_days": 5,
    "tax": 250.50,
    "is_paid": true
  }
}
```

### Помилка валідації

**Статус код:** `400 Bad Request`

```json
{
  "error": "host_id є обов'язковим полем"
}
```

---

## Валідація полів

### 1. Валідація host_id

**Правила:**
- Поле є обов'язковим
- Хост з вказаним ID повинен існувати в БД

**Можливі помилки:**
```json
{ "error": "host_id є обов'язковим полем" }
{ "error": "Хост з ID 123 не знайдено в базі даних" }
```

---

### 2. Валідація full_name

**Правила:**
- Поле є обов'язковим
- Не може бути пустим рядком або складатися тільки з пробілів

**Можливі помилки:**
```json
{ "error": "full_name є обов'язковим полем" }
```

---

### 3. Валідація arrival (дата прибуття)

**Правила:**
- Поле є обов'язковим
- Формат: YYYY-MM-DD
- Повинна бути валідною датою

**Можливі помилки:**
```json
{ "error": "arrival є обов'язковим полем" }
{ "error": "Невірний формат дати arrival. Очікується формат YYYY-MM-DD" }
{ "error": "Невірний формат дати arrival" }
```

**Приклади валідних значень:**
- `"2026-01-10"` ✅
- `"2026-12-31"` ✅

**Приклади невалідних значень:**
- `"10-01-2026"` ❌ (неправильний формат)
- `"2026/01/10"` ❌ (використані слеші замість дефісів)
- `"2026-13-01"` ❌ (невалідний місяць)
- `"2026-02-30"` ❌ (невалідний день)

---

### 4. Валідація departure (дата виїзду)

**Правила:**
- Поле є обов'язковим
- Формат: YYYY-MM-DD
- Повинна бути валідною датою
- Не може бути раніше за дату arrival

**Можливі помилки:**
```json
{ "error": "departure є обов'язковим полем" }
{ "error": "Невірний формат дати departure. Очікується формат YYYY-MM-DD" }
{ "error": "Невірний формат дати departure" }
{ "error": "departure не може бути раніше за arrival" }
```

**Приклади:**
```json
// ✅ Коректно
{ "arrival": "2026-01-10", "departure": "2026-01-15" }
{ "arrival": "2026-01-10", "departure": "2026-01-10" } // той самий день - допустимо

// ❌ Помилка
{ "arrival": "2026-01-15", "departure": "2026-01-10" } // departure раніше arrival
```

---

### 5. Валідація tax (сума податку)

**Правила:**
- Поле є обов'язковим
- Повинно бути числом (може бути дробовим)
- Не може бути від'ємним (>= 0)

**Можливі помилки:**
```json
{ "error": "tax є обов'язковим полем" }
{ "error": "tax не може бути від'ємним" }
```

**Приклади валідних значень:**
- `250.50` ✅
- `0` ✅ (нульовий податок допустимий)
- `1000` ✅

**Приклади невалідних значень:**
- `-50` ❌ (від'ємне значення)
- `null` ❌ (обов'язкове поле)

---

### 6. Валідація rental_days (кількість днів)

**Правила:**
- Поле опціональне
- Якщо не передано - обчислюється автоматично як `(departure - arrival)` у днях
- Якщо передано - повинно бути цілим числом
- Не може бути від'ємним (>= 0)

**Можливі помилки:**
```json
{ "error": "rental_days не може бути від'ємним" }
```

**Автоматичне обчислення:**
```json
// Запит БЕЗ rental_days
{
  "arrival": "2026-01-10",
  "departure": "2026-01-15",
  // rental_days не передано
}

// Буде автоматично обчислено: rental_days = 5 днів
```

**Приклади:**
- `5` ✅
- `0` ✅ (для випадку arrival = departure)
- `-1` ❌ (від'ємне значення)

---

### 7. Валідація is_paid (статус оплати)

**Правила:**
- Поле опціональне
- За замовчуванням: `true`
- Повинно бути boolean значенням

**За замовчуванням:**
```json
// Запит БЕЗ is_paid
{
  "host_id": 123,
  "full_name": "Іванов Іван",
  "arrival": "2026-01-10",
  "departure": "2026-01-15",
  "tax": 250.50
  // is_paid не передано
}

// У БД буде збережено is_paid = true
```

---

## Можливі сценарії відповідей

### 1. ✅ Успішне створення туриста

**Умови:**
- Всі обов'язкові поля присутні та валідні
- Хост з вказаним ID існує в БД
- Дати у правильному форматі
- departure >= arrival
- tax >= 0

**Відповідь:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Запис успішно створено",
  "data": {
    "id": 456,
    "host_id": 123,
    "full_name": "Іванов Іван Іванович",
    "arrival": "2026-01-10",
    "departure": "2026-01-15",
    "rental_days": 5,
    "tax": 250.50,
    "is_paid": true
  }
}
```

---

### 2. ❌ Відсутнє обов'язкове поле

**Умови:**
- Не передано одне з обов'язкових полів: host_id, full_name, arrival, departure, tax

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "host_id є обов'язковим полем"
}
```

**Можливі повідомлення:**
- `"host_id є обов'язковим полем"`
- `"full_name є обов'язковим полем"`
- `"arrival є обов'язковим полем"`
- `"departure є обов'язковим полем"`
- `"tax є обов'язковим полем"`

---

### 3. ❌ Хост не знайдено в БД

**Умови:**
- Передано host_id, якого не існує в таблиці tourism.hosts

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Хост з ID 999 не знайдено в базі даних"
}
```

**Альтернативні повідомлення** (при помилці foreign key на рівні БД):
```json
{
  "error": "Хост з вказаним ID не знайдено. Перевірте правильність host_id."
}
```

---

### 4. ❌ Невірний формат дати

**Умови:**
- Дата передана не у форматі YYYY-MM-DD
- Або дата невалідна (наприклад, 2026-02-30)

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Невірний формат дати arrival. Очікується формат YYYY-MM-DD"
}
```

**Можливі повідомлення:**
- `"Невірний формат дати arrival. Очікується формат YYYY-MM-DD"`
- `"Невірний формат дати departure. Очікується формат YYYY-MM-DD"`
- `"Невірний формат дати arrival"`
- `"Невірний формат дати departure"`

---

### 5. ❌ Логічна помилка в датах

**Умови:**
- Дата departure раніше за arrival

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "departure не може бути раніше за arrival"
}
```

**Приклад невалідного запиту:**
```json
{
  "arrival": "2026-01-15",
  "departure": "2026-01-10"  // ❌ раніше за arrival
}
```

---

### 6. ❌ Від'ємне значення tax

**Умови:**
- Передано від'ємне значення для tax

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "tax не може бути від'ємним"
}
```

---

### 7. ❌ Від'ємне значення rental_days

**Умови:**
- Передано від'ємне значення для rental_days

**Відповідь:**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "rental_days не може бути від'ємним"
}
```

---

## Логіка обробки запиту

### Покрокова обробка

```
1. Отримання запиту
   ↓
2. Валідація обов'язкових полів (host_id, full_name, arrival, departure, tax)
   ↓ якщо валідація пройшла
3. Валідація tax на від'ємні значення
   ↓ якщо валідація пройшла
4. Валідація формату дат (YYYY-MM-DD)
   ↓ якщо валідація пройшла
5. Валідація логіки дат (departure >= arrival)
   ↓ якщо валідація пройшла
6. Автоматичне обчислення rental_days (якщо не передано)
   ↓
7. Валідація rental_days на від'ємні значення
   ↓ якщо валідація пройшла
8. Встановлення is_paid = true (якщо не передано)
   ↓
9. Перевірка існування хоста в БД (checkHostExists)
   ↓ якщо хост знайдено
10. Створення запису в БД (INSERT INTO tourism.tourists)
    ↓
11. Повернення створеного запису з ID
```

---

## Таблиця в БД

### Структура таблиці `tourism.tourists`

```sql
CREATE TABLE tourism.tourists (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES tourism.hosts(id),
  full_name VARCHAR NOT NULL,
  arrival DATE NOT NULL,
  departure DATE NOT NULL,
  rental_days INTEGER NOT NULL,
  tax NUMERIC NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true
);
```

---

## Приклади використання

### Приклад 1: Базове створення з усіма полями

**Запит:**
```bash
curl -X POST https://api.example.com/api/touristtax/tourist-registry/create \
  -H "Content-Type: application/json" \
  -d '{
    "host_id": 45,
    "full_name": "Петренко Петро Петрович",
    "arrival": "2026-02-01",
    "departure": "2026-02-07",
    "rental_days": 6,
    "tax": 300.00,
    "is_paid": true
  }'
```

**Відповідь:**
```json
{
  "message": "Запис успішно створено",
  "data": {
    "id": 789,
    "host_id": 45,
    "full_name": "Петренко Петро Петрович",
    "arrival": "2026-02-01",
    "departure": "2026-02-07",
    "rental_days": 6,
    "tax": 300.00,
    "is_paid": true
  }
}
```

---

### Приклад 2: Створення з автоматичним обчисленням rental_days

**Запит:**
```json
{
  "host_id": 45,
  "full_name": "Сидоренко Сидір",
  "arrival": "2026-03-10",
  "departure": "2026-03-15",
  "tax": 250.00
}
```

**Що відбудеться:**
- `rental_days` буде автоматично обчислено: `(2026-03-15) - (2026-03-10) = 5 днів`
- `is_paid` буде встановлено `true` за замовчуванням

**Відповідь:**
```json
{
  "message": "Запис успішно створено",
  "data": {
    "id": 790,
    "host_id": 45,
    "full_name": "Сидоренко Сидір",
    "arrival": "2026-03-10",
    "departure": "2026-03-15",
    "rental_days": 5,
    "tax": 250.00,
    "is_paid": true
  }
}
```

---

### Приклад 3: Створення з is_paid = false

**Запит:**
```json
{
  "host_id": 45,
  "full_name": "Коваленко Олена",
  "arrival": "2026-04-01",
  "departure": "2026-04-03",
  "tax": 100.00,
  "is_paid": false
}
```

**Відповідь:**
```json
{
  "message": "Запис успішно створено",
  "data": {
    "id": 791,
    "host_id": 45,
    "full_name": "Коваленко Олена",
    "arrival": "2026-04-01",
    "departure": "2026-04-03",
    "rental_days": 2,
    "tax": 100.00,
    "is_paid": false
  }
}
```

---

### Приклад 4: Помилка - хост не існує

**Запит:**
```json
{
  "host_id": 99999,
  "full_name": "Тестовий Турист",
  "arrival": "2026-01-10",
  "departure": "2026-01-15",
  "tax": 250.00
}
```

**Відповідь:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "Хост з ID 99999 не знайдено в базі даних"
}
```

---

### Приклад 5: Помилка - departure раніше arrival

**Запит:**
```json
{
  "host_id": 45,
  "full_name": "Помилковий Запит",
  "arrival": "2026-01-20",
  "departure": "2026-01-15",
  "tax": 250.00
}
```

**Відповідь:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "departure не може бути раніше за arrival"
}
```

---

## Коди помилок та їх значення

| HTTP код | Значення | Коли виникає |
|----------|----------|--------------|
| 200 | OK | Запис успішно створено |
| 400 | Bad Request | Помилка валідації (відсутні поля, невалідні дані, хост не знайдено) |
| 401 | Unauthorized | Відсутній або невалідний токен авторизації |
| 500 | Internal Server Error | Внутрішня помилка сервера або БД |


## Безпека


### Валідація даних

- Всі дані проходять валідацію перед збереженням в БД
- SQL injection захищений через параметризовані запити
- Foreign key constraint забезпечує цілісність даних (host_id повинен існувати)

---

## Рекомендації для фронтенду

### Валідація на клієнті

Рекомендується виконувати базову валідацію на фронтенді перед відправкою запиту:

```javascript
function validateTouristData(data) {
  const errors = [];

  // Перевірка обов'язкових полів
  if (!data.host_id) errors.push('host_id є обов\'язковим');
  if (!data.full_name || !data.full_name.trim()) errors.push('full_name є обов\'язковим');
  if (!data.arrival) errors.push('arrival є обов\'язковим');
  if (!data.departure) errors.push('departure є обов\'язковим');
  if (data.tax === undefined || data.tax === null) errors.push('tax є обов\'язковим');

  // Перевірка формату дат (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (data.arrival && !datePattern.test(data.arrival)) {
    errors.push('Невірний формат arrival. Очікується YYYY-MM-DD');
  }
  if (data.departure && !datePattern.test(data.departure)) {
    errors.push('Невірний формат departure. Очікується YYYY-MM-DD');
  }

  // Перевірка логіки дат
  if (data.arrival && data.departure) {
    const arrivalDate = new Date(data.arrival);
    const departureDate = new Date(data.departure);
    if (departureDate < arrivalDate) {
      errors.push('departure не може бути раніше за arrival');
    }
  }

  // Перевірка від'ємних значень
  if (data.tax < 0) errors.push('tax не може бути від\'ємним');
  if (data.rental_days !== undefined && data.rental_days < 0) {
    errors.push('rental_days не може бути від\'ємним');
  }

  return errors;
}
```

### Приклад використання у React

```javascript
import { useState } from 'react';

function CreateTouristForm() {
  const [formData, setFormData] = useState({
    host_id: '',
    full_name: '',
    arrival: '',
    departure: '',
    tax: '',
    is_paid: true
  });
  const [errors, setErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Валідація на клієнті
    const validationErrors = validateTouristData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const response = await fetch('/api/touristtax/tourist-registry/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Турист створений:', result.data);
        // Показати повідомлення про успіх
        // Очистити форму або перенаправити користувача
      } else {
        setErrors([result.error]);
      }
    } catch (error) {
      console.error('Помилка запиту:', error);
      setErrors(['Помилка з\'єднання з сервером']);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Поля форми */}
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((err, idx) => <p key={idx}>{err}</p>)}
        </div>
      )}
      <button type="submit">Створити запис</button>
    </form>
  );
}
```

---

## Часті запитання (FAQ)

### 1. Чи можна створити туриста з однаковою датою прибуття та виїзду?

**Так, можна.** Якщо `arrival` та `departure` співпадають, `rental_days` буде дорівнювати 0, що є валідним значенням.

```json
{
  "arrival": "2026-01-15",
  "departure": "2026-01-15",
  // rental_days = 0
}
```

---

### 2. Що буде, якщо не передати rental_days?

**Поле буде автоматично обчислено** як різниця між `departure` та `arrival` у днях.

```javascript
rental_days = Math.floor((departure - arrival) / (1000 * 60 * 60 * 24))
```

---

### 3. Чи можна передати tax = 0?

**Так, можна.** Нульовий податок є валідним значенням. Обмеження тільки на від'ємні значення.

---

### 4. Що станеться, якщо хост буде видалений після створення туриста?

Залежить від налаштувань foreign key constraint у БД:
- Якщо `ON DELETE CASCADE` - турист буде також видалений
- Якщо `ON DELETE RESTRICT` - видалення хоста буде заблоковано

---

### 5. Чи можна змінити створений запис туриста?

Цей endpoint тільки створює записи. Для редагування потрібен окремий UPDATE endpoint (якщо реалізовано).

---

### 6. Який максимальний розмір поля full_name?

Обмеження залежить від БД. У PostgreSQL VARCHAR без обмеження може містити до 1 GB тексту, але рекомендується обмежити до розумної довжини (наприклад, 255 символів) на рівні схеми або валідації.

---

## Посилання на код

- **Router:** `back/modules/tourism/router/tourist-registry-router.js:15-19`
- **Controller:** `back/modules/tourism/controller/tourist-registry-controller.js:30-56`
- **Service:** `back/modules/tourism/service/tourist-registry-service.js:84-157`
- **Repository:** `back/modules/tourism/repository/tourist-registry-repository.js:54-73`

---

## Контакти

При виникненні питань або проблем звертайтесь до команди розробки.
