const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");

class KindergartenRepository {


    /**
     * Отримати назви таблиць в залежності від типу садочка
     * @param {string|null} kindergartenType - '1', '2', або null
     * @returns {object} - об'єкт з назвами таблиць
     */
    getTableNames(kindergartenType) {
        if (kindergartenType === '1') {
            return {
                children: 'children_1_roster',
                attendance: 'attendance_1',
                pastAttendance: 'past_attendance_1',
                groups: 'kindergarten_groups',
                dailyFoodCost: 'daily_food_cost',
                billing: 'kindergarten_billing',
                paymentStatements: 'payment_statements',
                admins: 'kindergarten_admins'
            };
        }
        
        if (kindergartenType === '2') {
            return {
                children: 'children_2_roster',
                attendance: 'attendance_2',
                pastAttendance: 'past_attendance_2',
                groups: 'kindergarten_groups',
                dailyFoodCost: 'daily_food_cost',
                billing: 'kindergarten_billing',
                paymentStatements: 'payment_statements',
                admins: 'kindergarten_admins'
            };
        }
        
        // Дефолтні таблиці
        return {
            children: 'children_roster',
            attendance: 'attendance',
            pastAttendance: 'past_attendance',
            groups: 'kindergarten_groups',
            dailyFoodCost: 'daily_food_cost',
            billing: 'kindergarten_billing',
            paymentStatements: 'payment_statements',
            admins: 'kindergarten_admins'
        };
    }


    /**
     * Отримати назву садочка для фільтрації
     * @param {string|null} kindergartenType - '1', '2', або null
     * @returns {string|null} - назва садочка або null
     */
    getKindergartenName(kindergartenType) {
        // Мапінг типу садочка на назву в БД
        const mapping = {
            '1': 'Дубочок',  // ← Зміни на справжню назву коли буде потрібно
            '2': 'ЗДО с.Солонка',  // ← Зміни на справжню назву коли буде потрібно
        };
        
        return mapping[kindergartenType] || null;
    }

    async findDebtorById(id) {
        const sql = `
            select
                o.id,
                json_agg(
                    json_build_object(
                        'id', od.id,
                        'child_name', od.child_name,
                        'debt_amount', od.debt_amount,
                        'group_number', od.group_number,
                        'kindergarten_name', od.kindergarten_name
                    )
                ) as debts
            from ower.ower o
            left join ower.ower_debt od on o.id = od.ower_id
            where o.id = ?
            group by o.id
        `;
        return await sqlRequest(sql, [id]);
    }

    async findDebtByFilter(limit, offset, whereConditions = {}) {
        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', od.id,
                    'child_name', od.child_name,
                    'debt_amount', od.debt_amount,
                    'group_number', od.group_number,
                    'kindergarten_name', od.kindergarten_name
                ) as rw,
                count(*) over () as cnt
            from ower.ower_debt od
            where 1=1
        `;

        if (Object.keys(whereConditions).length) {
            const data = buildWhereCondition(whereConditions, 'od');
            sql += data.text;
            values.push(...data.value);
        }

        values.push(limit);
        values.push(offset);
        sql += ` order by od.id desc limit ? offset ? ) q`;

        return await sqlRequest(sql, values);
    }

    async generateWordByDebtId(request, reply) {
        // Логіка генерації Word документа
        // Повертає файл
        return null;
    }

    async printDebtId(request, reply) {
        // Логіка друку
        // Повертає PDF або інший формат
        return null;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ГРУП САДОЧКА
    // ===============================

    async findGroupsByFilter(options, kindergartenType = null) {
        const {
            limit,
            offset,
            sort_by = 'id',
            sort_direction = 'desc',
            kindergarten_name,  // ✅ ДОДАНО: параметр для фільтрації
            group_name,
            group_type
        } = options;

        // Отримати назву садочка для фільтрації
        const filterKindergartenName = this.getKindergartenName(kindergartenType);

        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', kg.id,
                    'kindergarten_name', kg.kindergarten_name,
                    'group_name', kg.group_name,
                    'group_type', kg.group_type,
                    'created_at', kg.created_at
                ) as rw,
                count(*) over () as cnt
            from ower.kindergarten_groups kg
            where 1=1
        `;

        // ФІЛЬТР ПО САДОЧКУ - головна логіка!
        if (filterKindergartenName) {
            sql += ` AND kg.kindergarten_name = ?`;
            values.push(filterKindergartenName);
        }

        // Додаємо фільтри
        if (kindergarten_name) {
            sql += ` AND kg.kindergarten_name ILIKE ?`;
            values.push(`%${kindergarten_name}%`);
        }

        if (group_name) {
            sql += ` AND kg.group_name ILIKE ?`;
            values.push(`%${group_name}%`);
        }

        if (group_type) {
            sql += ` AND kg.group_type = ?`;
            values.push(group_type);
        }

        // Додаємо сортування
        // ✅ ЗМІНЕНО: Додано 'kindergarten_name' до списку дозволених полів для сортування
        const allowedSortFields = ['id', 'kindergarten_name', 'group_name', 'group_type', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'id';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'DESC';
        
        sql += ` ORDER BY kg.${validSortBy} ${validSortDirection}`;
        
        // Додаємо пагінацію
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);
        
        sql += `) q`;

        return await sqlRequest(sql, values);
    }
    
    async getGroupByName(groupName, excludeId = null) {
        let sql = `
            SELECT id, group_name, group_type 
            FROM ower.kindergarten_groups 
            WHERE group_name = ?
        `;
        const values = [groupName];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async createGroup(groupData) {

    const { kindergarten_name, group_name, group_type, created_at } = groupData;

        const sql = `
            INSERT INTO ower.kindergarten_groups 
            (kindergarten_name, group_name, group_type, created_at)
            VALUES (?, ?, ?, ?)
            RETURNING id, kindergarten_name, group_name, group_type, created_at
        `;

    const values = [kindergarten_name, group_name, group_type, created_at];

        return await sqlRequest(sql, values);
    }

    async getGroupById(id) {
        const sql = `
            SELECT id, kindergarten_name, group_name, group_type, created_at 
            FROM ower.kindergarten_groups 
            WHERE id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async updateGroup(id, groupData) {
        const fields = Object.keys(groupData).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(groupData), id];
        
        const sql = `
            UPDATE ower.kindergarten_groups 
            SET ${fields}
            WHERE id = ?
            RETURNING id, kindergarten_name, group_name, group_type, created_at
        `;
        
        return await sqlRequest(sql, values);
    }

    async deleteGroup(id) {
        const sql = `
            DELETE FROM ower.kindergarten_groups 
            WHERE id = ?
            RETURNING id
        `;
        
        return await sqlRequest(sql, [id]);
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДІТЕЙ САДОЧКА
    // ===============================

    async findChildrenByFilter(options, kindergartenType = null) {
        const {
            limit,
            offset,
            sort_by = 'id',
            sort_direction = 'desc',
            child_name,
            parent_name,
            phone_number,
            kindergarten_name,
            group_id,
            group_name
        } = options;

        // Отримати назву садочка для фільтрації
        const filterKindergartenName = this.getKindergartenName(kindergartenType);

        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', cr.id,
                    'child_name', cr.child_name,
                    'parent_name', cr.parent_name,
                    'phone_number', cr.phone_number,
                    'kindergarten_name', kg.kindergarten_name,
                    'group_id', cr.group_id,
                    'created_at', cr.created_at,
                    'group_name', kg.group_name
                ) as rw,
                count(*) over () as cnt
            from ower.children_roster cr
            left join ower.kindergarten_groups kg on kg.id = cr.group_id
            where 1=1
        `;

        // ФІЛЬТР ПО САДОЧКУ - головна логіка!
        if (filterKindergartenName) {
            sql += ` AND kg.kindergarten_name = ?`;
            values.push(filterKindergartenName);
        }

        // Додаємо фільтри
        if (child_name) {
            sql += ` AND cr.child_name ILIKE ?`;
            values.push(`%${child_name}%`);
        }

        if (parent_name) {
            sql += ` AND cr.parent_name ILIKE ?`;
            values.push(`%${parent_name}%`);
        }

        if (phone_number) {
            sql += ` AND cr.phone_number ILIKE ?`;
            values.push(`%${phone_number}%`);
        }

        if (kindergarten_name) {
            sql += ` AND kg.kindergarten_name ILIKE ?`;
            values.push(`%${kindergarten_name}%`);
        }

        // Пріоритет group_id над group_name для точного фільтрування
        if (group_id) {
            sql += ` AND cr.group_id = ?`;
            values.push(group_id);
        } else if (group_name) {
            sql += ` AND kg.group_name ILIKE ?`;
            values.push(`%${group_name}%`);
        }

        // Додаємо сортування
        const allowedSortFields = ['id', 'child_name', 'parent_name', 'phone_number', 'kindergarten_name', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'id';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'DESC';
        
        sql += ` ORDER BY cr.${validSortBy} ${validSortDirection}`;
        
        // Додаємо пагінацію
        sql += ` LIMIT ? OFFSET ? ) q`;
        values.push(limit, offset);

        return await sqlRequest(sql, values);
    }


    async getChildById(id) {
        const sql = `
            SELECT 
                cr.id,
                cr.child_name,
                cr.parent_name,
                cr.phone_number,
                kg.kindergarten_name,
                cr.group_id,
                cr.created_at,
                kg.group_name
            FROM ower.children_roster cr
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            WHERE cr.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async getChildByNameAndGroup(childName, groupName) {
        const sql = `
            SELECT 
                cr.id,
                cr.child_name,
                cr.parent_name,
                cr.phone_number,
                cr.group_id,
                cr.created_at,
                kg.group_name,
                kg.kindergarten_name
            FROM ower.children_roster cr
            INNER JOIN ower.kindergarten_groups kg ON cr.group_id = kg.id
            WHERE TRIM(LOWER(cr.child_name)) = TRIM(LOWER(?))
            AND TRIM(LOWER(kg.group_name)) = TRIM(LOWER(?))
            LIMIT 1
        `;
        const result = await sqlRequest(sql, [childName, groupName]);
        return result && result.length > 0 ? result[0] : null;
    }

    async getChildByNameAndGroupId(childName, groupId, excludeId = null) {
        let sql = `
            SELECT id, child_name, group_id 
            FROM ower.children_roster 
            WHERE child_name = ? AND group_id = ?
        `;
        const values = [childName, groupId];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async getChildByNameAndParent(childName, parentName, excludeId = null) {
        let sql = `
            SELECT id, child_name, parent_name
            FROM ower.children_roster             WHERE child_name = ? AND parent_name = ?
        `;
        const values = [childName, parentName];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async createChild(childData) {
        const {
            child_name,
            parent_name,
            phone_number,
            group_id,
            created_at
        } = childData;

        const sql = `
            INSERT INTO ower.children_roster
            (child_name, parent_name, phone_number, group_id, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, child_name, parent_name, phone_number, group_id, created_at
        `;

        const values = [
            child_name,
            parent_name,
            phone_number || null,
            group_id,
            created_at
        ];

        return await sqlRequest(sql, values);
    }

    async updateChild(id, childData) {
        // Виключаємо kindergarten_type з полів для оновлення
        const { kindergarten_type, ...dataToUpdate } = childData;

        const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(dataToUpdate), id];

        const sql = `
            UPDATE ower.children_roster
            SET ${fields}
            WHERE id = ?
            RETURNING id, child_name, parent_name, phone_number, group_id, created_at
        `;

        return await sqlRequest(sql, values);
    }

    async deleteChild(id, kindergartenType = null) {
        const sql = `
            DELETE FROM ower.children_roster
            WHERE id = ?
            RETURNING id
        `;

        return await sqlRequest(sql, [id]);
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВІДВІДУВАНОСТІ
    // ===============================

    async findAttendanceByFilter(options, kindergartenType = null) {
        const {
            limit,
            offset,
            sort_by = 'child_name',
            sort_direction = 'asc',
            child_name,
            group_id,
            group_name,
            kindergarten_name,
            date,
            attendance_status
        } = options;

        // Отримати назву садочка для фільтрації
        const filterKindergartenName = this.getKindergartenName(kindergartenType);

        const values = [];
        let paramIndex = 1;

        // Якщо дата не вказана, використовуємо поточну дату України
        const filterDate = date || new Date().toLocaleDateString('uk-UA', {
            timeZone: 'Europe/Kyiv',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).split('.').reverse().join('-');

        let sql = `
            SELECT json_agg(rw) as data,
                max(cnt) as count
            FROM (
                SELECT json_build_object(
                    'child_id', cr.id,
                    'child_name', cr.child_name,
                    'group_name', kg.group_name,
                    'kindergarten_name', kg.kindergarten_name,
                    'attendance_id', a.id,
                    'attendance_status', COALESCE(a.attendance_status, 'absent')
                ) as rw,
                count(*) over () as cnt
                FROM ower.children_roster cr
                LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                LEFT JOIN ower.attendance a ON a.child_id = cr.id AND a.date = $${paramIndex}
                WHERE 1=1
        `;

        values.push(filterDate);
        paramIndex++;

        // ФІЛЬТР ПО САДОЧКУ - головна логіка!
        if (filterKindergartenName) {
            sql += ` AND kg.kindergarten_name = $${paramIndex}`;
            values.push(filterKindergartenName);
            paramIndex++;
        }

        // Додаємо фільтри
        if (child_name) {
            sql += ` AND cr.child_name ILIKE $${paramIndex}`;
            values.push(`%${child_name}%`);
            paramIndex++;
        }

        // Пріоритет group_id над group_name для точного фільтрування
        if (group_id) {
            sql += ` AND cr.group_id = $${paramIndex}`;
            values.push(group_id);
            paramIndex++;
        } else if (group_name) {
            sql += ` AND kg.group_name ILIKE $${paramIndex}`;
            values.push(`%${group_name}%`);
            paramIndex++;
        }

        if (kindergarten_name) {
            sql += ` AND kg.kindergarten_name ILIKE $${paramIndex}`;
            values.push(`%${kindergarten_name}%`);
            paramIndex++;
        }

        if (attendance_status) {
            sql += ` AND COALESCE(a.attendance_status, 'absent') = $${paramIndex}`;
            values.push(attendance_status);
            paramIndex++;
        }

        // Додаємо сортування: спочатку молодші групи, потім старші, потім по назві групи, потім по імені дитини
        sql += ` ORDER BY 
            CASE 
                WHEN kg.group_type = 'young' THEN 1
                WHEN kg.group_type = 'older' THEN 2
                ELSE 3
            END ASC,
            kg.group_name ASC,
            cr.child_name ASC`;
        
        // Додаємо пагінацію
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        sql += `) q`;

        return await sqlRequest(sql, values);
    }

    async getAttendanceById(id) {
        const sql = `
            SELECT 
                a.id, 
                a.date, 
                a.child_id,
                a.attendance_status,
                a.notes,
                a.created_at,
                cr.child_name,
                cr.parent_name,
                kg.group_name,
                kg.kindergarten_name
            FROM ower.attendance a
            LEFT JOIN ower.children_roster cr ON cr.id = a.child_id
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            WHERE a.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async getAttendanceByDateAndChild(date, childId, excludeId = null) {
        let sql = `
            SELECT id, date, child_id, attendance_status 
            FROM ower.attendance 
            WHERE date = ? AND child_id = ?
        `;
        const values = [date, childId];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async createAttendance(attendanceData) {
        const {
            date,
            child_id,
            attendance_status,
            notes,
            created_at
        } = attendanceData;

        const sql = `
            INSERT INTO ower.attendance
            (date, child_id, attendance_status, notes, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, date, child_id, attendance_status, notes, created_at
        `;

        const values = [
            date,
            child_id,
            attendance_status,
            notes,
            created_at
        ];

        return await sqlRequest(sql, values);
    }

    async updateAttendance(id, attendanceData) {
        // Виключаємо kindergarten_type з полів для оновлення
        const { kindergarten_type, ...dataToUpdate } = attendanceData;

        const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(dataToUpdate), id];

        const sql = `
            UPDATE ower.attendance
            SET ${fields}
            WHERE id = ?
            RETURNING id, date, child_id, attendance_status, notes, created_at
        `;

        return await sqlRequest(sql, values);
    }

    async deleteAttendance(id, kindergartenType = null) {
        const sql = `
            DELETE FROM ower.attendance
            WHERE id = ?
            RETURNING id
        `;

        return await sqlRequest(sql, [id]);
    }

    async getAttendanceByChildId(childId) {
        const sql = `
            SELECT 
                a.id, 
                a.date, 
                a.child_id,
                a.attendance_status,
                a.notes,
                a.created_at
            FROM ower.attendance a
            WHERE a.child_id = ?
            ORDER BY a.date DESC
        `;
        return await sqlRequest(sql, [childId]);
    }

    async getAttendanceStatsByChild(childId, dateFrom = null, dateTo = null) {
        let sql = `
            SELECT 
                attendance_status,
                COUNT(*) as count
            FROM ower.attendance 
            WHERE child_id = ?
        `;
        const values = [childId];

        if (dateFrom) {
            sql += ` AND date >= ?`;
            values.push(dateFrom);
        }

        if (dateTo) {
            sql += ` AND date <= ?`;
            values.push(dateTo);
        }

        sql += ` GROUP BY attendance_status`;

        return await sqlRequest(sql, values);
    }

    async getAttendanceDates(filters) {
        const values = [];

        let sql = `
            SELECT DISTINCT combined.date
            FROM (
                SELECT date, child_id
                FROM ower.attendance

                UNION ALL

                SELECT date, child_id
                FROM ower.past_attendance
            ) AS combined
            LEFT JOIN ower.children_roster c ON combined.child_id = c.id
            LEFT JOIN ower.kindergarten_groups g ON c.group_id = g.id
            WHERE 1=1
        `;

        // Фільтр по дитині
        if (filters.child_id) {
            sql += ` AND combined.child_id = ?`;
            values.push(filters.child_id);
        }

        // Фільтр по групі
        if (filters.group_id) {
            sql += ` AND c.group_id = ?`;
            values.push(filters.group_id);
        }

        // Фільтр по датах
        if (filters.date_from) {
            sql += ` AND combined.date >= ?`;
            values.push(filters.date_from);
        }

        if (filters.date_to) {
            sql += ` AND combined.date <= ?`;
            values.push(filters.date_to);
        }

        sql += ` ORDER BY combined.date DESC`;

        return await sqlRequest(sql, values);
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
    // ===============================

    async findDailyFoodCostByFilter(options, kindergartenType = null) {
        const {
            limit,
            offset,
            sort_by = 'date',
            sort_direction = 'desc',
            date_from,
            date_to,
            kindergarten_id  // ✅ ДОДАНО
        } = options;

        // Отримати назву садочка для фільтрації (якщо передано kindergartenType)
        const filterKindergartenName = this.getKindergartenName(kindergartenType);
        let filterKindergartenId = kindergarten_id;

        // Якщо є тип садочка, отримати його ID
        if (filterKindergartenName && !filterKindergartenId) {
            filterKindergartenId = await this.getKindergartenIdByName(filterKindergartenName);
        }

        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', dfc.id,
                    'date', dfc.date,
                    'kindergarten_id', dfc.kindergarten_id,
                    'kindergarten_name', k.name,
                    'young_group_cost', dfc.young_group_cost,
                    'older_group_cost', dfc.older_group_cost,
                    'created_at', dfc.created_at
                ) as rw,
                count(*) over () as cnt
            from ower.daily_food_cost dfc
            left join ower.kindergartens k on k.id = dfc.kindergarten_id
            where 1=1
        `;

        // ✅ ДОДАНО: Фільтр по садочку
        if (filterKindergartenId) {
            sql += ` AND dfc.kindergarten_id = ?`;
            values.push(filterKindergartenId);
        }

        // Додаємо фільтри
        if (date_from) {
            sql += ` AND dfc.date >= ?`;
            values.push(date_from);
        }

        if (date_to) {
            sql += ` AND dfc.date <= ?`;
            values.push(date_to);
        }

        // Додаємо сортування
        const allowedSortFields = ['id', 'date', 'kindergarten_name', 'young_group_cost', 'older_group_cost', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'date';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'DESC';

        if (validSortBy === 'kindergarten_name') {
            sql += ` ORDER BY k.name ${validSortDirection}`;
        } else {
            sql += ` ORDER BY dfc.${validSortBy} ${validSortDirection}`;
        }

        // Додаємо пагінацію
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);

        sql += `) q`;

        return await sqlRequest(sql, values);
    }

    // ✅ ЗМІНЕНО: Перейменовано та додано kindergarten_id
    async getDailyFoodCostByDateAndKindergarten(date, kindergartenId, excludeId = null) {
        let sql = `
            SELECT id, date, kindergarten_id, young_group_cost, older_group_cost
            FROM ower.daily_food_cost
            WHERE date = ? AND kindergarten_id = ?
        `;
        const values = [date, kindergartenId];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    // Зворотна сумісність (deprecated, використовуйте getDailyFoodCostByDateAndKindergarten)
    async getDailyFoodCostByDateAndExcludeId(date, excludeId = null) {
        // Для зворотної сумісності: отримати перший садочок
        const kindergartens = await this.getAllKindergartens();
        const kindergartenId = kindergartens && kindergartens.length > 0 ? kindergartens[0].id : 1;
        return await this.getDailyFoodCostByDateAndKindergarten(date, kindergartenId, excludeId);
    }

    async createDailyFoodCost(data) {
        const {
            date,
            kindergarten_id,  // ✅ ДОДАНО
            young_group_cost,
            older_group_cost,
            created_at
        } = data;

        const sql = `
            INSERT INTO ower.daily_food_cost
            (date, kindergarten_id, young_group_cost, older_group_cost, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, date, kindergarten_id, young_group_cost, older_group_cost, created_at
        `;

        const values = [
            date,
            kindergarten_id,  // ✅ ДОДАНО
            young_group_cost,
            older_group_cost,
            created_at
        ];

        return await sqlRequest(sql, values);
    }

    async getDailyFoodCostById(id) {
        const sql = `
            SELECT id, date, kindergarten_id, young_group_cost, older_group_cost, created_at
            FROM ower.daily_food_cost
            WHERE id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async updateDailyFoodCost(id, data) {
        const fields = Object.keys(data).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(data), id];

        const sql = `
            UPDATE ower.daily_food_cost
            SET ${fields}
            WHERE id = ?
            RETURNING id, date, kindergarten_id, young_group_cost, older_group_cost, created_at
        `;

        return await sqlRequest(sql, values);
    }

    async deleteDailyFoodCost(id) {
        const sql = `
            DELETE FROM ower.daily_food_cost 
            WHERE id = ?
            RETURNING id
        `;
        
        return await sqlRequest(sql, [id]);
    }

    // ===============================
    // МЕТОДИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
    // ===============================

    async findBillingByFilter(options) {
        const {
            limit,
            offset,
            sort_by = 'payment_month',
            sort_direction = 'desc',
            payment_month_from,
            payment_month_to,
            payment_month,  // ✅ ДОДАНО: фільтр по конкретному місяцю
            child_name,
            kindergarten_name,
            group_id,
            group_name,
            balance_min,
            balance_max
        } = options;

        const values = [];

        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', kb.id,
                    'child_name', kb.child_name,
                    'kindergarten_name', kg.kindergarten_name,
                    'group_name', kg.group_name,
                    'payment_month', kb.payment_month,
                    'current_debt', kb.current_debt,
                    'current_accrual', -COALESCE(dynamic_accrual.total_amount, 0),
                    'current_payment', kb.current_payment,
                    'balance', (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment),
                    'notes', kb.notes,
                    'created_at', kb.created_at,
                    'updated_at', kb.updated_at
                ) as rw,
                count(*) over () as cnt
            from ower.kindergarten_billing kb
            left join ower.children_roster cr on cr.child_name = kb.child_name
            left join ower.kindergarten_groups kg on kg.id = cr.group_id
            left join (
                select
                    cr_inner.child_name,
                    TO_CHAR(combined.date, 'YYYY-MM') as month,
                    SUM(
                        CASE
                            WHEN kg_inner.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                            WHEN kg_inner.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                            ELSE 0
                        END
                    ) as total_amount
                from (
                    select child_id, date
                    from ower.attendance
                    where attendance_status = 'present'

                    union all

                    select child_id, date
                    from ower.past_attendance
                    where attendance_status = 'present'
                ) combined
                inner join ower.children_roster cr_inner on cr_inner.id = combined.child_id
                inner join ower.kindergarten_groups kg_inner on kg_inner.id = cr_inner.group_id
                left join ower.daily_food_cost dfc on dfc.date = combined.date
                group by cr_inner.child_name, TO_CHAR(combined.date, 'YYYY-MM')
            ) dynamic_accrual on dynamic_accrual.child_name = kb.child_name
                and dynamic_accrual.month = TO_CHAR(kb.payment_month, 'YYYY-MM')
            where 1=1
        `;

        // ✅ ДОДАНО: фільтр по конкретному місяцю (має пріоритет над діапазоном)
        if (payment_month) {
            sql += ` AND TO_CHAR(kb.payment_month, 'YYYY-MM') = ?`;
            values.push(payment_month);
        } else {
            // Використовуємо діапазон тільки якщо не вказано конкретний місяць
            if (payment_month_from) {
                sql += ` AND kb.payment_month >= ?`;
                values.push(payment_month_from);
            }

            if (payment_month_to) {
                sql += ` AND kb.payment_month <= ?`;
                values.push(payment_month_to);
            }
        }

        if (child_name) {
            sql += ` AND kb.child_name ILIKE ?`;
            values.push(`%${child_name}%`);
        }

        if (kindergarten_name) {
            sql += ` AND kg.kindergarten_name ILIKE ?`;
            values.push(`%${kindergarten_name}%`);
        }

        if (group_id) {
            sql += ` AND cr.group_id = ?`;
            values.push(group_id);
        } else if (group_name) {
            sql += ` AND kg.group_name ILIKE ?`;
            values.push(`%${group_name}%`);
        }

        if (balance_min !== undefined && balance_min !== null) {
            sql += ` AND (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment) >= ?`;
            values.push(balance_min);
        }

        if (balance_max !== undefined && balance_max !== null) {
            sql += ` AND (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment) <= ?`;
            values.push(balance_max);
        }

        const allowedSortFields = [
            'id', 'child_name', 'payment_month', 'kindergarten_name', 'group_name',
            'current_debt', 'current_accrual', 'current_payment', 'balance', 'created_at'
        ];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'payment_month';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ?
            sort_direction.toLowerCase() : 'desc';

        if (validSortBy === 'kindergarten_name' || validSortBy === 'group_name') {
            sql += ` order by kg.${validSortBy} ${validSortDirection}`;
        } else if (validSortBy === 'current_accrual') {
            sql += ` order by -COALESCE(dynamic_accrual.total_amount, 0) ${validSortDirection}`;
        } else if (validSortBy === 'balance') {
            sql += ` order by (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment) ${validSortDirection}`;
        } else {
            sql += ` order by kb.${validSortBy} ${validSortDirection}`;
        }

        sql += ` limit ? offset ? ) q`;
        values.push(limit, offset);

        return await sqlRequest(sql, values);
    }

    async getBillingById(id) {
        const sql = `
            SELECT
                kb.id,
                kb.child_name,
                kg.kindergarten_name,
                kg.group_name,
                kb.payment_month,
                kb.current_debt,
                -COALESCE(dynamic_accrual.total_amount, 0) as current_accrual,
                kb.current_payment,
                (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment) as balance,
                kb.notes,
                kb.created_at,
                kb.updated_at
            FROM ower.kindergarten_billing kb
            LEFT JOIN ower.children_roster cr ON cr.child_name = kb.child_name
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            LEFT JOIN (
                SELECT
                    cr_inner.child_name,
                    TO_CHAR(combined.date, 'YYYY-MM') as month,
                    SUM(
                        CASE
                            WHEN kg_inner.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                            WHEN kg_inner.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                            ELSE 0
                        END
                    ) as total_amount
                FROM (
                    SELECT child_id, date
                    FROM ower.attendance
                    WHERE attendance_status = 'present'

                    UNION ALL

                    SELECT child_id, date
                    FROM ower.past_attendance
                    WHERE attendance_status = 'present'
                ) combined
                INNER JOIN ower.children_roster cr_inner ON cr_inner.id = combined.child_id
                INNER JOIN ower.kindergarten_groups kg_inner ON kg_inner.id = cr_inner.group_id
                LEFT JOIN ower.daily_food_cost dfc ON dfc.date = combined.date
                GROUP BY cr_inner.child_name, TO_CHAR(combined.date, 'YYYY-MM')
            ) dynamic_accrual ON dynamic_accrual.child_name = kb.child_name
                AND dynamic_accrual.month = TO_CHAR(kb.payment_month, 'YYYY-MM')
            WHERE kb.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async getBillingByChildAndMonth(child_name, payment_month, excludeId = null) {
        let sql = `
            SELECT
                kb.id,
                kb.child_name,
                kb.payment_month,
                kb.current_debt,
                -COALESCE(dynamic_accrual.total_amount, 0) as current_accrual,
                kb.current_payment,
                (kb.current_debt - COALESCE(dynamic_accrual.total_amount, 0) - kb.current_payment) as balance,
                kb.notes
            FROM ower.kindergarten_billing kb
            LEFT JOIN (
                SELECT
                    cr_inner.child_name,
                    TO_CHAR(combined.date, 'YYYY-MM') as month,
                    SUM(
                        CASE
                            WHEN kg_inner.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                            WHEN kg_inner.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                            ELSE 0
                        END
                    ) as total_amount
                FROM (
                    SELECT child_id, date
                    FROM ower.attendance
                    WHERE attendance_status = 'present'

                    UNION ALL

                    SELECT child_id, date
                    FROM ower.past_attendance
                    WHERE attendance_status = 'present'
                ) combined
                INNER JOIN ower.children_roster cr_inner ON cr_inner.id = combined.child_id
                INNER JOIN ower.kindergarten_groups kg_inner ON kg_inner.id = cr_inner.group_id
                LEFT JOIN ower.daily_food_cost dfc ON dfc.date = combined.date
                GROUP BY cr_inner.child_name, TO_CHAR(combined.date, 'YYYY-MM')
            ) dynamic_accrual ON dynamic_accrual.child_name = kb.child_name
                AND dynamic_accrual.month = TO_CHAR(kb.payment_month, 'YYYY-MM')
            WHERE kb.child_name = ? AND kb.payment_month = ?
        `;

        const params = [child_name, payment_month];

        // Додатково виключаємо поточний запис при оновленні
        if (excludeId) {
            sql += ` AND kb.id != ?`;
            params.push(excludeId);
        }

        return await sqlRequest(sql, params);
    }


    /*async getBillingByParentAndMonthExcludeId(parent_name, payment_month, excludeId) {
        const sql = `
            SELECT id, parent_name, payment_month
            FROM ower.kindergarten_billing 
            WHERE parent_name = ? AND payment_month = ? AND id != ?
        `;
        return await sqlRequest(sql, [parent_name, payment_month, excludeId]);
    }*/

    async createBilling(billingData) {
        const {
            child_name,
            payment_month,
            current_debt,
            current_accrual,
            current_payment,
            notes,
            created_at
        } = billingData;

        const values = [
            child_name,
            payment_month,
            current_debt || 0,
            current_accrual || 0,
            current_payment || 0,
            notes || null
        ];

        const sql = `
            INSERT INTO ower.kindergarten_billing 
            (child_name, payment_month, current_debt, current_accrual, current_payment, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, child_name, payment_month, current_debt, current_accrual, current_payment, balance, notes, created_at
        `;
        
        return await sqlRequest(sql, values);
    }

    async updateBilling(id, updateData) {
        const allowedFields = [
            'child_name',
            'payment_month', 
            'current_debt', 
            'current_accrual', 
            'current_payment', 
            'notes'
        ];
        
        const updateFields = [];
        const values = [];
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });
        
        if (updateFields.length === 0) {
            throw new Error('Немає полів для оновлення');
        }
        
        values.push(id);
        
        const sql = `
            UPDATE ower.kindergarten_billing 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, child_name, payment_month, current_debt, current_accrual, current_payment, balance, notes, updated_at
        `;
        
        return await sqlRequest(sql, values);
    }

    async deleteBilling(id) {
        const sql = `
            DELETE FROM ower.kindergarten_billing 
            WHERE id = ?
            RETURNING id
        `;
        
        return await sqlRequest(sql, [id]);
    }

    async getBillingStatsByChild(childName, dateFrom = null, dateTo = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_records,
                SUM(current_debt) as total_debt,
                SUM(current_accrual) as total_accrual,
                SUM(current_payment) as total_payment,
                SUM(balance) as total_balance,
                AVG(balance) as avg_balance
            FROM ower.kindergarten_billing 
            WHERE child_name = ?
        `;
        const values = [childName];

        if (dateFrom) {
            sql += ` AND payment_month >= ?`;
            values.push(dateFrom);
        }

        if (dateTo) {
            sql += ` AND payment_month <= ?`;
            values.push(dateTo);
        }

        return await sqlRequest(sql, values);
    }

    async getBillingMonthlyStats(year = null) {
        let sql = `
            SELECT 
                DATE_TRUNC('month', payment_month) as month,
                COUNT(*) as records_count,
                SUM(current_debt) as total_debt,
                SUM(current_accrual) as total_accrual,
                SUM(current_payment) as total_payment,
                SUM(balance) as total_balance
            FROM ower.kindergarten_billing
        `;
        
        const values = [];
        
        if (year) {
            sql += ` WHERE EXTRACT(YEAR FROM payment_month) = ?`;
            values.push(year);
        }
        
        sql += `
            GROUP BY DATE_TRUNC('month', payment_month)
            ORDER BY month DESC
        `;

        return await sqlRequest(sql, values);
    }

    // ===============================
    // МЕТОД ДЛЯ МОБІЛЬНОГО ДОДАТКУ
    // ===============================

    async getMobileAttendanceByDate(date) {
        const sql = `
            SELECT
                kg.id as group_id,
                kg.group_name,
                json_agg(
                    json_build_object(
                        'child_id', cr.id,
                        'child_name', cr.child_name,
                        'attendance_status', COALESCE(combined.attendance_status, 'absent')
                    ) ORDER BY cr.child_name
                ) as children
            FROM ower.kindergarten_groups kg
            LEFT JOIN ower.children_roster cr ON cr.group_id = kg.id
            LEFT JOIN (
                SELECT child_id, attendance_status
                FROM ower.attendance
                WHERE date = $1

                UNION ALL

                SELECT child_id, attendance_status
                FROM ower.past_attendance
                WHERE date = $1
            ) combined ON combined.child_id = cr.id
            WHERE cr.id IS NOT NULL
            GROUP BY kg.id, kg.group_name
            ORDER BY kg.group_name
        `;

        const result = await sqlRequest(sql, [date]);

        // Парсимо JSON з children
        return result.map(row => ({
            ...row,
            children: row.children || []
        }));
    }

    // ===============================
    // МЕТОДИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКА
    // ===============================

    async findAdminsByFilter(options) {
        const {
            limit,
            offset,
            sort_by = 'id',
            sort_direction = 'desc',
            username,
            full_name,
            kindergarten_name,
            group_id,
            role
        } = options;

        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', ka.id,
                    'username', ka.username,
                    'full_name', ka.full_name,
                    'kindergarten_name', ka.kindergarten_name,
                    'group_id', ka.group_id,
                    'group_name', kg.group_name,
                    'role', ka.role,
                    'created_at', ka.created_at
                ) as rw,
                count(*) over () as cnt
            from ower.kindergarten_admins ka
            left join ower.kindergarten_groups kg on kg.id = ka.group_id
            where 1=1
        `;

        // Фільтр по логіну
        if (username) {
            sql += ` AND ka.username ILIKE ?`;
            values.push(`%${username}%`);
        }

        // Фільтр по ПІБ
        if (full_name) {
            sql += ` AND ka.full_name ILIKE ?`;
            values.push(`%${full_name}%`);
        }

        // Фільтр по садочку
        if (kindergarten_name) {
            sql += ` AND ka.kindergarten_name ILIKE ?`;
            values.push(`%${kindergarten_name}%`);
        }

        // Фільтр по групі
        if (group_id) {
            sql += ` AND ka.group_id = ?`;
            values.push(group_id);
        }

        // Фільтр по ролі
        if (role) {
            sql += ` AND ka.role = ?`;
            values.push(role);
        }

        // Додаємо сортування
        const allowedSortFields = ['id', 'username', 'full_name', 'kindergarten_name', 'group_name', 'role', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'id';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toLowerCase() : 'desc';
        
        const sortColumn = sort_by === 'group_name' ? 'kg.group_name' : `ka.${validSortBy}`;
        sql += ` order by ${sortColumn} ${validSortDirection}`;
        
        // Додаємо пагінацію
        sql += ` limit ? offset ? ) q`;
        values.push(limit, offset);

        return await sqlRequest(sql, values);
    }

    async getAdminById(id) {
        const sql = `
            SELECT 
                ka.id, 
                ka.username,
                ka.full_name, 
                ka.kindergarten_name,
                ka.group_id,
                kg.group_name,
                ka.role, 
                ka.created_at, 
                ka.updated_at
            FROM ower.kindergarten_admins ka
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = ka.group_id
            WHERE ka.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async getAdminByUsername(username, excludeId = null) {
        let sql = `
            SELECT id, username, full_name
            FROM ower.kindergarten_admins
            WHERE LOWER(username) = LOWER(?)
        `;
        const values = [username];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async createAdmin(adminData) {
        const {
            username,
            full_name,
            kindergarten_name,
            group_id,
            role,
            created_at
        } = adminData;

        const sql = `
            INSERT INTO ower.kindergarten_admins
            (username, full_name, kindergarten_name, group_id, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, username, full_name, kindergarten_name, group_id, role, created_at
        `;

        const values = [
            username,
            full_name,
            kindergarten_name,
            group_id || null,
            role || 'educator',
            created_at
        ];

        return await sqlRequest(sql, values);
    }

    async updateAdmin(id, adminData) {
        const fields = Object.keys(adminData).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(adminData), id];
        
        const sql = `
            UPDATE ower.kindergarten_admins
            SET ${fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING id, username, full_name, kindergarten_name, group_id, role, created_at, updated_at
        `;
        
        return await sqlRequest(sql, values);
    }

    async deleteAdmin(id) {
        const sql = `
            DELETE FROM ower.kindergarten_admins
            WHERE id = ?
            RETURNING id
        `;
        
        return await sqlRequest(sql, [id]);
    }

    async getGroupsByKindergartenName(kindergartenName) {
        console.log('🗄️ Repository getGroupsByKindergartenName:');
        console.log('   kindergartenName:', kindergartenName);

        if (!kindergartenName) {
            console.log('   ❌ kindergartenName пустий! Повертаємо []');
            return [];
        }
        
        const sql = `
            SELECT 
                id,
                group_name,
                kindergarten_name,
                group_type
            FROM ower.kindergarten_groups
            WHERE kindergarten_name = ?
            ORDER BY group_name ASC
        `;
        
        const result = await sqlRequest(sql, [kindergartenName]);
        
        console.log('   📊 SQL result:', result ? result.length : 0, 'груп');
        if (result && result.length > 0) {
            console.log('   Перша група:', result[0]);
        }
        
        return result;
    }

    // ===============================
    // ОТРИМАННЯ ГРУП ПО САДОЧКУ
    // ===============================

    async getGroupsByKindergarten(kindergartenType) {
        // ✅ ВИПРАВЛЕНО: Використовуємо getKindergartenName для отримання назви
        const kindergartenName = this.getKindergartenName(kindergartenType);
        
        console.log('🗄️ Repository getGroupsByKindergarten:');
        console.log('   kindergartenType:', kindergartenType);
        console.log('   kindergartenName:', kindergartenName);

        if (!kindergartenName) {
            console.log('   ❌ kindergartenName пустий! Повертаємо []');
            return [];  // Якщо не вдалося визначити садочок - повертаємо порожній масив
        }
        
        const sql = `
            SELECT 
                id,
                group_name,
                kindergarten_name,
                group_type
            FROM ower.kindergarten_groups
            WHERE kindergarten_name = ?
            ORDER BY group_name ASC
        `;
        
        console.log('   📊 SQL result:', result ? result.length : 0, 'груп');
        
        return await sqlRequest(sql, [kindergartenName]);
    }

    // ===============================
    // ПЕРЕВІРКА ЧИ Є ВИХОВАТЕЛЕМ
    // ===============================

    async verifyEducatorByUsername(username) {
        const sql = `
            SELECT 
                a.id as educator_id,
                a.username,
                a.full_name as educator_name,
                a.kindergarten_name,
                a.group_id,
                g.group_name as group_name,
                c.id as child_id,
                c.child_name as child_name,
                c.parent_name,
                c.phone_number as parent_phone
            FROM ower.kindergarten_admins a
            LEFT JOIN ower.kindergarten_groups g ON a.group_id = g.id
            LEFT JOIN ower.children_roster c ON a.group_id = c.group_id
            WHERE LOWER(a.username) = LOWER(?)
            AND a.role = 'educator'
            ORDER BY c.child_name ASC
        `;
        
        const rows = await sqlRequest(sql, [username]);
        
        if (!rows || rows.length === 0) {
            return null;
        }
        
        const educator = {
            id: rows[0].educator_id,
            username: rows[0].username,
            full_name: rows[0].educator_name,
            kindergarten_name: rows[0].kindergarten_name,
            group_id: rows[0].group_id,
            group_name: rows[0].group_name,
            children: []
        };
        
        rows.forEach(row => {
            if (row.child_id) {
                educator.children.push({
                    id: row.child_id,
                    full_name: row.child_name,
                    parent_name: row.parent_name,
                    parent_phone: row.parent_phone
                });
            }
        });
        
        return educator;
    }
     // ===============================
    // МЕТОДИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    async findPaymentStatementsByFilter(options) {
        const {
            limit,
            offset,
            sort_by = 'date',
            sort_direction = 'desc',
            date_from,
            date_to,
            month,
            child_name,
            group_id,
            group_name
        } = options;

        const values = [];
        let sql = `
            SELECT json_agg(rw) as data,
                max(cnt) as count
            FROM (
                SELECT json_build_object(
                    'id', ps.id,
                    'date', ps.date,
                    'month', TO_CHAR(ps.date, 'YYYY-MM'),
                    'child_id', ps.child_id,
                    'child_name', cr.child_name,
                    'parent_name', cr.parent_name,
                    'group_id', cr.group_id,
                    'group_name', kg.group_name,
                    'kindergarten_name', kg.kindergarten_name,
                    'payment_amount', ps.payment_amount,
                    'created_at', ps.created_at
                ) as rw,
                count(*) over () as cnt
                FROM ower.payment_statements ps
                LEFT JOIN ower.children_roster cr ON cr.id = ps.child_id
                LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                WHERE 1=1
        `;

        if (month) {
            sql += ` AND TO_CHAR(ps.date, 'YYYY-MM') = ?`;
            values.push(month);
        } else {
            if (date_from) {
                sql += ` AND ps.date >= ?`;
                values.push(date_from);
            }

            if (date_to) {
                sql += ` AND ps.date <= ?`;
                values.push(date_to);
            }
        }

        if (child_name) {
            sql += ` AND cr.child_name ILIKE ?`;
            values.push(`%${child_name}%`);
        }

        if (group_name) {
            sql += ` AND kg.group_name ILIKE ?`;
            values.push(`%${group_name}%`);
        }

        if (group_id) {
            sql += ` AND cr.group_id = ?`;
            values.push(group_id);
        }

        const allowedSortFields = ['id', 'date', 'child_name', 'payment_amount', 'created_at'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'date';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'DESC';
        
        if (validSortBy === 'child_name') {
            sql += ` ORDER BY cr.child_name ${validSortDirection}`;
        } else {
            sql += ` ORDER BY ps.${validSortBy} ${validSortDirection}`;
        }
        
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);
        sql += `) q`;

        return await sqlRequest(sql, values);
    }

    async getPaymentStatementById(id) {
        const sql = `
            SELECT 
                ps.id,
                ps.date,
                ps.child_id,
                ps.payment_amount,
                ps.created_at,
                cr.child_name,
                cr.parent_name,
                cr.group_id,
                kg.group_name,
                kg.kindergarten_name
            FROM ower.payment_statements ps
            LEFT JOIN ower.children_roster cr ON cr.id = ps.child_id
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            WHERE ps.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async getPaymentStatementByDateAndChild(date, childId, excludeId = null) {
        let sql = `
            SELECT id, date, child_id, payment_amount 
            FROM ower.payment_statements 
            WHERE date = ? AND child_id = ?
        `;
        const values = [date, childId];

        if (excludeId) {
            sql += ` AND id != ?`;
            values.push(excludeId);
        }

        return await sqlRequest(sql, values);
    }

    async getPaymentStatementsByDate(date) {
        const sql = `
            SELECT id, date, child_id, payment_amount, created_at
            FROM ower.payment_statements 
            WHERE date = ?
        `;
        return await sqlRequest(sql, [date]);
    }

    async getDailyFoodCostByDateAndGroup(date, groupName) {
        const sql = `
            SELECT 
                CASE 
                    WHEN LOWER(TRIM(?)) = 'молодша група' THEN young_group_cost
                    WHEN LOWER(TRIM(?)) = 'старша група' THEN older_group_cost
                    ELSE 0
                END as cost
            FROM ower.daily_food_cost
            WHERE date = ?
            LIMIT 1
        `;
        return await sqlRequest(sql, [groupName, groupName, date]);
    }

    async createPaymentStatement(data) {
        const {
            date,
            child_id,
            payment_amount,
            created_at
        } = data;

        const sql = `
            INSERT INTO ower.payment_statements 
            (date, child_id, payment_amount, created_at)
            VALUES (?, ?, ?, ?)
            RETURNING id, date, child_id, payment_amount, created_at
        `;

        const values = [date, child_id, payment_amount, created_at];
        return await sqlRequest(sql, values);
    }

    async updatePaymentStatement(id, data) {
        const fields = Object.keys(data).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(data), id];
        
        const sql = `
            UPDATE ower.payment_statements 
            SET ${fields}
            WHERE id = ?
            RETURNING id, date, child_id, payment_amount, created_at
        `;
        
        return await sqlRequest(sql, values);
    }

    async deletePaymentStatement(id) {
        const sql = `
            DELETE FROM ower.payment_statements 
            WHERE id = ?
            RETURNING id
        `;
        
        return await sqlRequest(sql, [id]);
    }

    // Отримати вартість харчування по ТИПУ групи (а не по назві)
    // ✅ ДОДАНО: параметр kindergarten_id
    async getDailyFoodCostByDateAndGroupType(date, groupType, kindergartenId) {
        const column = groupType === 'young' ? 'young_group_cost' :
                    groupType === 'older' ? 'older_group_cost' : null;

        if (!column) {
            return [{ cost: 0 }];
        }

        const sql = `
            SELECT ${column} as cost
            FROM ower.daily_food_cost
            WHERE date = ? AND kindergarten_id = ?
            LIMIT 1
        `;

        return await sqlRequest(sql, [date, kindergartenId]);
    }

    // ===============================
    // ✅ ЗАВДАННЯ 2: BREAKDOWN ВАРТОСТІ
    // ===============================

    /**
     * Отримати breakdown вартості харчування по групах за дату
     * @param {string} date - Дата у форматі YYYY-MM-DD
     * @param {number|null} kindergartenId - ID садочка (опціонально)
     * @returns {Array} Масив з даними по кожній групі
     */
    async getDailyCostBreakdownByDate(date, kindergartenId = null) {
        let sql = `
            SELECT
                kg.id as group_id,
                kg.group_name,
                kg.group_type,
                k.id as kindergarten_id,
                k.name as kindergarten_name,
                CASE
                    WHEN kg.group_type = 'young' THEN dfc.young_group_cost
                    WHEN kg.group_type = 'older' THEN dfc.older_group_cost
                    ELSE 0
                END as total_group_cost,
                COUNT(CASE WHEN a.attendance_status = 'present' THEN 1 END) as present_count
            FROM ower.kindergarten_groups kg
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            LEFT JOIN ower.children_roster cr ON cr.group_id = kg.id
            LEFT JOIN ower.attendance a ON a.child_id = cr.id AND a.date = ?
            LEFT JOIN ower.daily_food_cost dfc ON dfc.date = ? AND dfc.kindergarten_id = kg.kindergarten_id
            WHERE 1=1
        `;

        const values = [date, date];

        if (kindergartenId) {
            sql += ` AND kg.kindergarten_id = ?`;
            values.push(kindergartenId);
        }

        sql += `
            GROUP BY kg.id, kg.group_name, kg.group_type, k.id, k.name, dfc.young_group_cost, dfc.older_group_cost
            HAVING COUNT(CASE WHEN a.attendance_status = 'present' THEN 1 END) > 0
            ORDER BY k.name, kg.group_name
        `;

        return await sqlRequest(sql, values);
    }

    /**
     * Отримати breakdown вартості для конкретної дитини
     * @param {string} date - Дата у форматі YYYY-MM-DD
     * @param {number} childId - ID дитини
     * @returns {Array} Дані про вартість для цієї дитини
     */
    async getChildDailyCostBreakdown(date, childId) {
        const sql = `
            SELECT
                cr.id as child_id,
                cr.child_name,
                cr.parent_name,
                kg.id as group_id,
                kg.group_name,
                kg.group_type,
                k.id as kindergarten_id,
                k.name as kindergarten_name,
                a.attendance_status,
                CASE
                    WHEN kg.group_type = 'young' THEN dfc.young_group_cost
                    WHEN kg.group_type = 'older' THEN dfc.older_group_cost
                    ELSE 0
                END as total_group_cost,
                (
                    SELECT COUNT(*)
                    FROM ower.attendance a2
                    INNER JOIN ower.children_roster cr2 ON cr2.id = a2.child_id
                    WHERE a2.date = ?
                    AND a2.attendance_status = 'present'
                    AND cr2.group_id = kg.id
                ) as present_count,
                ps.payment_amount
            FROM ower.children_roster cr
            INNER JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            LEFT JOIN ower.attendance a ON a.child_id = cr.id AND a.date = ?
            LEFT JOIN ower.daily_food_cost dfc ON dfc.date = ? AND dfc.kindergarten_id = kg.kindergarten_id
            LEFT JOIN ower.payment_statements ps ON ps.child_id = cr.id AND ps.date = ?
            WHERE cr.id = ?
        `;

        return await sqlRequest(sql, [date, date, date, date, childId]);
    }

    async findMonthlyPaymentStatements(options) {
        const {
            limit,
            offset,
            sort_by = 'child_name',
            sort_direction = 'asc',
            month,
            group_type,
            group_id,
            group_name,
            child_name
        } = options;

        const values = [];

        const startDate = `${month}-01`;
        const endDate = new Date(`${month}-01T00:00:00Z`);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log('📅 Date conversion:', { month, startDate, endDateStr });

        let sql = `
            SELECT json_agg(rw) as data,
                max(cnt) as count
            FROM (
                SELECT json_build_object(
                    'id', cr.id,
                    'month', CAST(? AS TEXT),
                    'child_id', cr.id,
                    'child_name', cr.child_name,
                    'parent_name', cr.parent_name,
                    'group_id', cr.group_id,
                    'group_name', kg.group_name,
                    'kindergarten_name', kg.kindergarten_name,
                    'group_type', kg.group_type,
                    'total_amount', COALESCE(attendance_payment_agg.total_amount, 0),
                    'attendance_days', COALESCE(attendance_payment_agg.attendance_days, 0),
                    'created_at', NOW()
                ) as rw,
                count(*) over () as cnt
                FROM ower.children_roster cr
                LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                LEFT JOIN (
                    SELECT
                        child_id,
                        SUM(food_cost_with_benefit) as total_amount,
                        COUNT(*) as attendance_days
                    FROM (
                        SELECT
                            a.child_id,
                            a.date,
                            -- Розраховуємо вартість з урахуванням пільги
                            CASE
                                WHEN cb.benefit_percentage >= 100 THEN 0
                                ELSE (
                                    CASE
                                        WHEN kg_inner.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                                        WHEN kg_inner.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                                        ELSE 0
                                    END * (1 - COALESCE(cb.benefit_percentage, 0) / 100)
                                )
                            END as food_cost_with_benefit
                        FROM ower.attendance a
                        INNER JOIN ower.children_roster cr_inner ON cr_inner.id = a.child_id
                        INNER JOIN ower.kindergarten_groups kg_inner ON kg_inner.id = cr_inner.group_id
                        LEFT JOIN ower.daily_food_cost dfc ON dfc.date = a.date
                        -- ✅ Пільги: знаходимо активну пільгу для дитини на дату відвідування
                        LEFT JOIN ower.child_benefits cb ON cb.child_id = a.child_id
                            AND cb.status = 'active'
                            AND cb.valid_from <= a.date
                            AND (cb.valid_to IS NULL OR cb.valid_to >= a.date)
                        WHERE a.attendance_status = 'present'
                        AND a.date >= CAST(? AS DATE)
                        AND a.date < CAST(? AS DATE)

                        UNION ALL

                        SELECT
                            pa.child_id,
                            pa.date,
                            -- Розраховуємо вартість з урахуванням пільги
                            CASE
                                WHEN cb.benefit_percentage >= 100 THEN 0
                                ELSE (
                                    CASE
                                        WHEN kg_inner.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                                        WHEN kg_inner.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                                        ELSE 0
                                    END * (1 - COALESCE(cb.benefit_percentage, 0) / 100)
                                )
                            END as food_cost_with_benefit
                        FROM ower.past_attendance pa
                        INNER JOIN ower.children_roster cr_inner ON cr_inner.id = pa.child_id
                        INNER JOIN ower.kindergarten_groups kg_inner ON kg_inner.id = cr_inner.group_id
                        LEFT JOIN ower.daily_food_cost dfc ON dfc.date = pa.date
                        -- ✅ Пільги: знаходимо активну пільгу для дитини на дату відвідування
                        LEFT JOIN ower.child_benefits cb ON cb.child_id = pa.child_id
                            AND cb.status = 'active'
                            AND cb.valid_from <= pa.date
                            AND (cb.valid_to IS NULL OR cb.valid_to >= pa.date)
                        WHERE pa.attendance_status = 'present'
                        AND pa.date >= CAST(? AS DATE)
                        AND pa.date < CAST(? AS DATE)
                    ) combined_attendance
                    GROUP BY child_id
                ) attendance_payment_agg ON attendance_payment_agg.child_id = cr.id
                WHERE 1=1
        `;

        // Параметри: month, startDate (для attendance), endDateStr (для attendance),
        // startDate (для past_attendance), endDateStr (для past_attendance)
        values.push(month, startDate, endDateStr, startDate, endDateStr);

        if (group_id) {
            sql += ` AND cr.group_id = ?`;
            values.push(group_id);
        } else if (group_name) {
            sql += ` AND kg.group_name ILIKE ?`;
            values.push(`%${group_name}%`);
        }

        if (group_type) {
            sql += ` AND kg.group_type = ?`;
            values.push(group_type);
        }

        if (child_name) {
            sql += ` AND cr.child_name ILIKE ?`;
            values.push(`%${child_name}%`);
        }

        const allowedSortFields = ['child_name', 'group_name', 'total_amount', 'attendance_days'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'child_name';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'ASC';
        
        if (validSortBy === 'child_name') {
            sql += ` ORDER BY cr.child_name ${validSortDirection}`;
        } else if (validSortBy === 'group_name') {
            sql += ` ORDER BY kg.group_name ${validSortDirection}`;
        } else if (validSortBy === 'total_amount') {
            sql += ` ORDER BY -COALESCE(attendance_payment_agg.total_amount, 0) ${validSortDirection}`;
        } else if (validSortBy === 'attendance_days') {
            sql += ` ORDER BY COALESCE(attendance_payment_agg.attendance_days, 0) ${validSortDirection}`;
        }
        
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);
        
        sql += `) q`;

        return await sqlRequest(sql, values);
    }

    async getMonthlyPaymentStatement(month, childId) {
        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        const sql = `
            SELECT
                ? as child_id,
                -COALESCE(attendance_payment_agg.total_amount, 0) as total_amount,
                COALESCE(attendance_payment_agg.attendance_days, 0) as attendance_days
            FROM (SELECT 1) dummy
            LEFT JOIN (
                SELECT
                    child_id,
                    SUM(food_cost) as total_amount,
                    COUNT(*) as attendance_days
                FROM (
                    SELECT
                        a.child_id,
                        a.date,
                        CASE
                            WHEN kg.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                            WHEN kg.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                            ELSE 0
                        END as food_cost
                    FROM ower.attendance a
                    INNER JOIN ower.children_roster cr ON cr.id = a.child_id
                    INNER JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                    LEFT JOIN ower.daily_food_cost dfc ON dfc.date = a.date
                    WHERE a.child_id = ?
                        AND a.attendance_status = 'present'
                        AND a.date >= CAST(? AS DATE)
                        AND a.date < CAST(? AS DATE)

                    UNION ALL

                    SELECT
                        pa.child_id,
                        pa.date,
                        CASE
                            WHEN kg.group_type = 'young' THEN COALESCE(dfc.young_group_cost, 0)
                            WHEN kg.group_type = 'older' THEN COALESCE(dfc.older_group_cost, 0)
                            ELSE 0
                        END as food_cost
                    FROM ower.past_attendance pa
                    INNER JOIN ower.children_roster cr ON cr.id = pa.child_id
                    INNER JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                    LEFT JOIN ower.daily_food_cost dfc ON dfc.date = pa.date
                    WHERE pa.child_id = ?
                        AND pa.attendance_status = 'present'
                        AND pa.date >= CAST(? AS DATE)
                        AND pa.date < CAST(? AS DATE)
                ) combined_attendance
                GROUP BY child_id
            ) attendance_payment_agg ON TRUE
        `;

        return await sqlRequest(sql, [childId, childId, startDate, endDateStr, childId, startDate, endDateStr]);
    }

    // ===============================
    // МЕТОДИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ
    // ===============================

    async getPastAttendanceById(id) {
        const sql = `
            SELECT
                pa.id,
                pa.date,
                pa.child_id,
                pa.attendance_status,
                pa.notes,
                pa.created_at,
                pa.archived_at,
                cr.child_name,
                cr.parent_name,
                kg.group_name,
                kg.kindergarten_name
            FROM ower.past_attendance pa
            LEFT JOIN ower.children_roster cr ON cr.id = pa.child_id
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            WHERE pa.id = ?
        `;
        return await sqlRequest(sql, [id]);
    }

    async archiveYesterdayAttendance() {
        const sql = `SELECT ower.archive_yesterday_attendance()`;
        return await sqlRequest(sql);
    }

    // ===============================
    // МЕТОДИ ДЛЯ АРХІВНИХ ВІДВІДУВАНЬ (PAST_ATTENDANCE)
    // ===============================

    async findPastAttendanceByFilter(options, kindergartenType = null) {
        const {
            limit,
            offset,
            sort_by = 'child_name',
            sort_direction = 'asc',
            child_name,
            group_id,
            group_name,
            kindergarten_name,
            date,
            month,
            attendance_status
        } = options;

        // Отримати назву садочка для фільтрації
        const filterKindergartenName = this.getKindergartenName(kindergartenType);

        const values = [];
        let paramIndex = 1;

        let sql = `
            SELECT json_agg(rw) as data,
                max(cnt) as count
            FROM (
                SELECT json_build_object(
                    'id', pa.id,
                    'date', pa.date,
                    'child_id', pa.child_id,
                    'child_name', cr.child_name,
                    'group_name', kg.group_name,
                    'kindergarten_name', kg.kindergarten_name,
                    'attendance_status', pa.attendance_status,
                    'notes', pa.notes,
                    'created_at', pa.created_at,
                    'archived_at', pa.archived_at
                ) as rw,
                count(*) over () as cnt
                FROM ower.past_attendance pa
                LEFT JOIN ower.children_roster cr ON cr.id = pa.child_id
                LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
                WHERE 1=1
        `;

        // Фільтр по місяцю має пріоритет над конкретною датою
        if (month) {
            sql += ` AND TO_CHAR(pa.date, 'YYYY-MM') = $${paramIndex}`;
            values.push(month);
            paramIndex++;
        } else if (date) {
            // Фільтр по даті (тільки якщо місяць не вказано)
            sql += ` AND pa.date = $${paramIndex}`;
            values.push(date);
            paramIndex++;
        }

        // ФІЛЬТР ПО САДОЧКУ - головна логіка!
        if (filterKindergartenName) {
            sql += ` AND kg.kindergarten_name = $${paramIndex}`;
            values.push(filterKindergartenName);
            paramIndex++;
        }

        // Додаємо фільтри
        if (child_name) {
            sql += ` AND cr.child_name ILIKE $${paramIndex}`;
            values.push(`%${child_name}%`);
            paramIndex++;
        }

        // Пріоритет group_id над group_name для точного фільтрування
        if (group_id) {
            sql += ` AND cr.group_id = $${paramIndex}`;
            values.push(group_id);
            paramIndex++;
        } else if (group_name) {
            sql += ` AND kg.group_name ILIKE $${paramIndex}`;
            values.push(`%${group_name}%`);
            paramIndex++;
        }

        if (kindergarten_name) {
            sql += ` AND kg.kindergarten_name ILIKE $${paramIndex}`;
            values.push(`%${kindergarten_name}%`);
            paramIndex++;
        }

        if (attendance_status) {
            sql += ` AND pa.attendance_status = $${paramIndex}`;
            values.push(attendance_status);
            paramIndex++;
        }

        // Додаємо сортування
        const allowedSortFields = ['child_name', 'group_name', 'date'];
        const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'child_name';
        const validSortDirection = ['asc', 'desc'].includes(sort_direction.toLowerCase()) ? sort_direction.toUpperCase() : 'ASC';

        if (validSortBy === 'child_name') {
            sql += ` ORDER BY cr.child_name ${validSortDirection}`;
        } else if (validSortBy === 'group_name') {
            sql += ` ORDER BY kg.group_name ${validSortDirection}`;
        } else if (validSortBy === 'date') {
            sql += ` ORDER BY pa.date ${validSortDirection}`;
        }
        
        // Додаємо пагінацію
        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        
        sql += `) q`;

        return await sqlRequest(sql, values);
    }

    async getPastAttendanceById(id) {
        const sql = `
            SELECT 
                pa.id, 
                pa.date, 
                pa.child_id,
                pa.child_name,
                pa.group_name,
                pa.kindergarten_name,
                pa.attendance_status,
                pa.notes,
                pa.created_at,
                pa.archived_at
            FROM ower.past_attendance pa
            WHERE pa.id = $1
        `;
        return await sqlRequest(sql, [id]);
    }

    async archiveYesterdayAttendance() {
        const sql = `SELECT ower.archive_yesterday_attendance()`;
        return await sqlRequest(sql);
    }

    async syncBillingForMonth(child_name, payment_month) {
        try {
            console.log(`🔄 Синхронізація billing для ${child_name} за ${payment_month}`);
            
            // 1️⃣ Отримати child_id
            const sqlGetChild = `SELECT id FROM ower.children_roster WHERE child_name = $1`;
            const childResult = await sqlRequest(sqlGetChild, [child_name]);
            if (!childResult || childResult.length === 0) {
                console.log(`⚠️ Дитину не знайдено`);
                return null;
            }

            const child_id = childResult[0].id;

            // 2️⃣ Агрегувати payment_statements (ЗАВЖДИ, навіть якщо 0)
            const sqlAggregate = `
                SELECT COALESCE(SUM(payment_amount), 0) as total_amount
                FROM ower.payment_statements
                WHERE child_id = $1 
                AND TO_CHAR(date, 'YYYY-MM') = $2
            `;
            const aggregateResult = await sqlRequest(sqlAggregate, [child_id, payment_month]);
            
            const current_accrual = parseFloat(aggregateResult[0].total_amount) || 0;
            
            console.log(`📊 Нарахування за місяць: ${current_accrual} ₴`);

            // 3️⃣ Перевірити чи є запис у billing
            const sqlCheck = `
                SELECT id FROM ower.kindergarten_billing
                WHERE child_name = $1 
                AND TO_CHAR(payment_month, 'YYYY-MM') = $2
            `;
            const existing = await sqlRequest(sqlCheck, [child_name, payment_month]);

            if (existing && existing.length > 0) {
                // ОНОВИТИ (навіть якщо 0)
                await sqlRequest(
                    `UPDATE ower.kindergarten_billing 
                    SET current_accrual = $1, updated_at = NOW() 
                    WHERE id = $2`,
                    [current_accrual, existing[0].id]
                );
                console.log(`✅ Оновлено billing: ${current_accrual} ₴`);
                return { action: 'updated', billing_id: existing[0].id, current_accrual };
            } else if (current_accrual > 0) {
                // СТВОРИТИ (тільки якщо є нарахування)
                const result = await sqlRequest(
                    `INSERT INTO ower.kindergarten_billing 
                    (child_name, payment_month, current_debt, current_accrual, current_payment, notes, created_at, updated_at)
                    VALUES ($1, $2, 0, $3, 0, 'Автоматично', NOW(), NOW())
                    RETURNING id`,
                    [child_name, `${payment_month}-01`, current_accrual]
                );
                console.log(`✅ Створено billing: ${current_accrual} ₴`);
                return { action: 'created', billing_id: result[0].id, current_accrual };
            }
            
            console.log(`ℹ️ Немає нарахувань, запис не створено`);
            return null;
        } catch (error) {
            console.error('❌ Помилка:', error);
            throw error;
        }
    }

    async syncAllBillingRecords() {
        try {
            console.log('🔄 Універсальна синхронізація ВСІХ billing записів');
            
            const sqlGetAll = `
                SELECT DISTINCT 
                    cr.child_name,
                    TO_CHAR(ps.date, 'YYYY-MM') as payment_month
                FROM ower.payment_statements ps
                JOIN ower.children_roster cr ON cr.id = ps.child_id
                ORDER BY payment_month DESC, cr.child_name
            `;
            const allRecords = await sqlRequest(sqlGetAll);
            
            if (!allRecords || allRecords.length === 0) {
                console.log('⚠️ Немає даних у payment_statements для синхронізації');
                return {
                    success: true,
                    message: 'Немає даних для синхронізації',
                    synced_count: 0,
                    created_count: 0,
                    updated_count: 0,
                    error_count: 0,
                    results: []
                };
            }
            
            console.log(`📊 Знайдено ${allRecords.length} унікальних комбінацій (дитина + місяць)`);
            
            let created_count = 0;
            let updated_count = 0;
            let error_count = 0;
            const results = [];
            
            // 2️⃣ Синхронізувати кожну комбінацію
            for (const record of allRecords) {
                try {
                    const result = await this.syncBillingForMonth(
                        record.child_name,
                        record.payment_month
                    );
                    
                    if (result) {
                        if (result.action === 'created') {
                            created_count++;
                        } else if (result.action === 'updated') {
                            updated_count++;
                        }
                        results.push(result);
                    }
                } catch (error) {
                    error_count++;
                    console.error(`❌ Помилка синхронізації ${record.child_name} за ${record.payment_month}:`, error);
                    results.push({
                        action: 'error',
                        child_name: record.child_name,
                        payment_month: record.payment_month,
                        error: error.message
                    });
                }
            }
            
            const synced_count = created_count + updated_count;
            
            console.log(`✅ Синхронізація завершена:`);
            console.log(`   Всього: ${allRecords.length}`);
            console.log(`   Створено: ${created_count}`);
            console.log(`   Оновлено: ${updated_count}`);
            console.log(`   Помилок: ${error_count}`);
            
            return {
                success: true,
                message: `Синхронізовано ${synced_count} записів (створено: ${created_count}, оновлено: ${updated_count})`,
                total_count: allRecords.length,
                synced_count,
                created_count,
                updated_count,
                error_count,
                results
            };
        } catch (error) {
            console.error('❌ Помилка універсальної синхронізації:', error);
            throw error;
        }
    }

    // ===============================
    // МЕТОДИ ДЛЯ РОБОТИ З САДОЧКАМИ (ЗАВДАННЯ 1)
    // ===============================

    /**
     * Отримати всі садочки
     */
    async getAllKindergartens() {
        const sql = `
            SELECT id, name, address, created_at
            FROM ower.kindergartens
            ORDER BY name ASC
        `;
        return await sqlRequest(sql);
    }

    /**
     * Отримати ID садочка по назві
     * @param {string} kindergartenName - назва садочка
     * @returns {number|null} - ID садочка або null
     */
    async getKindergartenIdByName(kindergartenName) {
        if (!kindergartenName) {
            return null;
        }

        const sql = `
            SELECT id
            FROM ower.kindergartens
            WHERE name = ?
        `;
        const result = await sqlRequest(sql, [kindergartenName]);
        return result && result.length > 0 ? result[0].id : null;
    }

    // ===============================
    // ✅ ЗАВДАННЯ 3: CHILD PROPOSALS (ПРОПОЗИЦІЇ ДІТЕЙ)
    // ===============================

    /**
     * Створити пропозицію дитини
     */
    async createChildProposal(proposalData) {
        const fields = Object.keys(proposalData).join(', ');
        const placeholders = Object.keys(proposalData).map(() => '?').join(', ');
        const values = Object.values(proposalData);

        const sql = `
            INSERT INTO ower.child_proposals (${fields})
            VALUES (${placeholders})
        `;

        return await sqlRequest(sql, values);
    }

    /**
     * Отримати список пропозицій з фільтрами та пагінацією
     */
    async findChildProposals(options) {
        const {
            limit,
            offset,
            sort_by = 'proposed_at',
            sort_direction = 'desc',
            status,
            group_id,
            proposed_by,
            child_name,
            kindergarten_id
        } = options;

        let sql = `
            SELECT
                cp.*,
                kg.group_name,
                kg.group_type,
                k.name as kindergarten_name,
                k.id as kindergarten_id
            FROM ower.child_proposals cp
            INNER JOIN ower.kindergarten_groups kg ON kg.id = cp.group_id
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            WHERE 1=1
        `;

        const values = [];

        if (status) {
            sql += ` AND cp.status = ?`;
            values.push(status);
        }

        if (group_id) {
            sql += ` AND cp.group_id = ?`;
            values.push(group_id);
        }

        if (proposed_by) {
            sql += ` AND cp.proposed_by = ?`;
            values.push(proposed_by);
        }

        if (child_name) {
            sql += ` AND cp.child_name LIKE ?`;
            values.push(`%${child_name}%`);
        }

        if (kindergarten_id) {
            sql += ` AND kg.kindergarten_id = ?`;
            values.push(kindergarten_id);
        }

        // Count query
        const countSql = sql.replace(
            /SELECT.*FROM/s,
            'SELECT COUNT(*) as total FROM'
        );
        const countResult = await sqlRequest(countSql, values);

        // Data query
        sql += ` ORDER BY cp.${sort_by} ${sort_direction}`;
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);

        const data = await sqlRequest(sql, values);

        return [{
            data,
            total: countResult[0]?.total || 0
        }];
    }

    /**
     * Отримати пропозицію за ID
     */
    async getChildProposalById(id) {
        const sql = `
            SELECT
                cp.*,
                kg.group_name,
                kg.group_type,
                k.name as kindergarten_name,
                k.id as kindergarten_id
            FROM ower.child_proposals cp
            INNER JOIN ower.kindergarten_groups kg ON kg.id = cp.group_id
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            WHERE cp.id = ?
        `;

        return await sqlRequest(sql, [id]);
    }

    /**
     * Оновити пропозицію
     */
    async updateChildProposal(id, updateData) {
        updateData.updated_at = new Date();

        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updateData), id];

        const sql = `
            UPDATE ower.child_proposals
            SET ${fields}
            WHERE id = ?
        `;

        return await sqlRequest(sql, values);
    }

    /**
     * Видалити пропозицію
     */
    async deleteChildProposal(id) {
        const sql = 'DELETE FROM ower.child_proposals WHERE id = ?';
        return await sqlRequest(sql, [id]);
    }

    /**
     * Затвердити пропозицію (approve) - оновлює статус
     */
    async approveChildProposal(id, reviewedBy, reviewNotes, approvedChildId) {
        const sql = `
            UPDATE ower.child_proposals
            SET
                status = 'approved',
                reviewed_by = ?,
                reviewed_at = ?,
                review_notes = ?,
                approved_child_id = ?,
                updated_at = ?
            WHERE id = ?
        `;

        return await sqlRequest(sql, [
            reviewedBy,
            new Date(),
            reviewNotes,
            approvedChildId,
            new Date(),
            id
        ]);
    }

    /**
     * Відхилити пропозицію (reject)
     */
    async rejectChildProposal(id, reviewedBy, reviewNotes) {
        const sql = `
            UPDATE ower.child_proposals
            SET
                status = 'rejected',
                reviewed_by = ?,
                reviewed_at = ?,
                review_notes = ?,
                updated_at = ?
            WHERE id = ?
        `;

        return await sqlRequest(sql, [
            reviewedBy,
            new Date(),
            reviewNotes,
            new Date(),
            id
        ]);
    }

    // ===============================
    // ✅ ЗАВДАННЯ 4: CHILD BENEFITS (ПІЛЬГИ)
    // ===============================

    /**
     * Отримати активну пільгу для дитини на певну дату
     * CRITICAL: Використовується в createAttendance для розрахунку payment_amount
     */
    async getActiveBenefitForChild(childId, date) {
        const sql = `
            SELECT
                id,
                child_id,
                benefit_percentage,
                benefit_reason,
                valid_from,
                valid_to,
                status
            FROM ower.child_benefits
            WHERE child_id = ?
            AND status = 'active'
            AND valid_from <= ?
            AND (valid_to IS NULL OR valid_to >= ?)
            ORDER BY benefit_percentage DESC
            LIMIT 1
        `;

        return await sqlRequest(sql, [childId, date, date]);
    }

    /**
     * Створити пільгу для дитини
     */
    async createChildBenefit(benefitData) {
        const fields = Object.keys(benefitData).join(', ');
        const placeholders = Object.keys(benefitData).map(() => '?').join(', ');
        const values = Object.values(benefitData);

        const sql = `
            INSERT INTO ower.child_benefits (${fields})
            VALUES (${placeholders})
        `;

        return await sqlRequest(sql, values);
    }

    /**
     * Отримати пільгу за ID
     */
    async getChildBenefitById(id) {
        const sql = `
            SELECT
                cb.*,
                cr.child_name,
                cr.parent_name,
                kg.group_name,
                k.name as kindergarten_name
            FROM ower.child_benefits cb
            INNER JOIN ower.children_roster cr ON cr.id = cb.child_id
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            WHERE cb.id = ?
        `;

        return await sqlRequest(sql, [id]);
    }

    /**
     * Отримати всі пільги для дитини
     */
    async getChildBenefitsByChildId(childId) {
        const sql = `
            SELECT *
            FROM ower.child_benefits
            WHERE child_id = ?
            ORDER BY valid_from DESC
        `;

        return await sqlRequest(sql, [childId]);
    }

    /**
     * Фільтрація пільг з пагінацією
     */
    async findChildBenefits(options) {
        const {
            limit,
            offset,
            sort_by = 'created_at',
            sort_direction = 'desc',
            child_id,
            status,
            benefit_percentage_min,
            benefit_percentage_max,
            kindergarten_id
        } = options;

        let sql = `
            SELECT
                cb.*,
                cr.child_name,
                cr.parent_name,
                kg.group_name,
                k.name as kindergarten_name,
                k.id as kindergarten_id
            FROM ower.child_benefits cb
            INNER JOIN ower.children_roster cr ON cr.id = cb.child_id
            LEFT JOIN ower.kindergarten_groups kg ON kg.id = cr.group_id
            LEFT JOIN ower.kindergartens k ON k.id = kg.kindergarten_id
            WHERE 1=1
        `;

        const values = [];

        if (child_id) {
            sql += ` AND cb.child_id = ?`;
            values.push(child_id);
        }

        if (status) {
            sql += ` AND cb.status = ?`;
            values.push(status);
        }

        if (benefit_percentage_min !== undefined) {
            sql += ` AND cb.benefit_percentage >= ?`;
            values.push(benefit_percentage_min);
        }

        if (benefit_percentage_max !== undefined) {
            sql += ` AND cb.benefit_percentage <= ?`;
            values.push(benefit_percentage_max);
        }

        if (kindergarten_id) {
            sql += ` AND kg.kindergarten_id = ?`;
            values.push(kindergarten_id);
        }

        // Count query
        const countSql = sql.replace(
            /SELECT.*FROM/s,
            'SELECT COUNT(*) as total FROM'
        );
        const countResult = await sqlRequest(countSql, values);

        // Data query
        sql += ` ORDER BY cb.${sort_by} ${sort_direction}`;
        sql += ` LIMIT ? OFFSET ?`;
        values.push(limit, offset);

        const data = await sqlRequest(sql, values);

        return [{
            data,
            total: countResult[0]?.total || 0
        }];
    }

    /**
     * Оновити пільгу
     */
    async updateChildBenefit(id, updateData) {
        updateData.updated_at = new Date();

        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updateData), id];

        const sql = `
            UPDATE ower.child_benefits
            SET ${fields}
            WHERE id = ?
        `;

        return await sqlRequest(sql, values);
    }

    /**
     * Видалити пільгу
     */
    async deleteChildBenefit(id) {
        const sql = 'DELETE FROM ower.child_benefits WHERE id = ?';
        return await sqlRequest(sql, [id]);
    }
}

module.exports = new KindergartenRepository();