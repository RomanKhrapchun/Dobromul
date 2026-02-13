const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");

class TouristRegistryRepository {

    // Мапінг назв полів на SQL вирази з префіксами таблиць
    getSortFieldSQL(fieldName) {
        const mapping = {
            'id': 't.id',
            'host_name': 'h.host_name',
            'full_name': 't.full_name',
            'arrival': 't.arrival',
            'departure': 't.departure',
            'rental_days': 't.rental_days',
            'tax': 't.tax',
            'is_paid': 't.is_paid'
        };
        return mapping[fieldName] || 't.id';
    }

    // Мапінг назв полів для WHERE умов
    getFilterFieldSQL(fieldName) {
        const mapping = {
            'host_name': 'h.host_name',
            'full_name': 't.full_name',
            'arrival': 't.arrival',
            'departure': 't.departure',
            'is_paid': 't.is_paid'
        };
        return mapping[fieldName] || fieldName;
    }

    // Додає префікси таблиць до WHERE умов (аналогічно до debtor)
    addTablePrefixesToWhereCondition(whereText, filterFieldMapping) {
        // Замінюємо назви полів на поля з префіксами таблиць
        let modifiedText = whereText;
        Object.keys(filterFieldMapping).forEach(fieldName => {
            const sqlField = filterFieldMapping[fieldName];
            // Замінюємо fieldName на sqlField в WHERE умовах
            const regex = new RegExp(`(\\s+)${fieldName}(\\s*[=<>!])`, 'g');
            modifiedText = modifiedText.replace(regex, `$1${sqlField}$2`);
        });
        return modifiedText;
    }

    async findTouristsByFilter(limit, offset, title, allowedFields, displayFields, sortBy, sortDirection) {
        const values = [];
        let sql = `select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(
                'id', t.id,
                'host_name', h.host_name,
                'full_name', t.full_name,
                'arrival', t.arrival,
                'departure', t.departure,
                'rental_days', t.rental_days,
                'tax', t.tax,
                'is_paid', t.is_paid
            ) as rw,
            count(*) over () as cnt
            from tourism.tourists t
            inner join tourism.hosts h on t.host_id = h.id
            where 1=1`;

        // Додаємо пошук по title (загальний пошук по full_name, host_name)
        if (title) {
            sql += ` AND (t.full_name ILIKE $${values.length + 1} OR h.host_name ILIKE $${values.length + 1})`;
            values.push(`%${title}%`);
        }

        // Додаємо WHERE умови з buildWhereCondition та додаємо префікси таблиць
        if (Object.keys(allowedFields).length) {
            const whereData = buildWhereCondition(allowedFields);
            // Додаємо префікси таблиць до WHERE умов
            const filterFieldMapping = {
                'host_name': 'h.host_name',
                'full_name': 't.full_name',
                'arrival': 't.arrival',
                'departure': 't.departure',
                'is_paid': 't.is_paid'
            };
            const modifiedWhereText = this.addTablePrefixesToWhereCondition(whereData.text, filterFieldMapping);
            sql += modifiedWhereText;
            values.push(...whereData.value);
        }

        // Додаємо сортування з префіксом таблиці
        const sortFieldSQL = this.getSortFieldSQL(sortBy);
        sql += ` ORDER BY ${sortFieldSQL} ${sortDirection.toUpperCase()}`;
        if (sortFieldSQL !== 't.id') {
            sql += `, t.id ${sortDirection.toUpperCase()}`;
        }

        // Додаємо пагінацію
        sql += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        sql += ` ) q`;

        return await sqlRequest(sql, values);
    }

    async findHostIdByName(hostName) {
        const sql = `SELECT id FROM tourism.hosts WHERE host_name = $1 LIMIT 1`;
        const result = await sqlRequest(sql, [hostName]);
        return result && result.length > 0 ? result[0].id : null;
    }

    async createTourist(touristData) {
        const { host_id, full_name, arrival, departure, rental_days, tax, is_paid } = touristData;
        
        const sql = `
            INSERT INTO tourism.tourists (host_id, full_name, arrival, departure, rental_days, tax, is_paid)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, host_id, full_name, arrival, departure, rental_days, tax, is_paid
        `;
        
        const values = [host_id, full_name, arrival, departure, rental_days, tax, is_paid];
        
        const result = await sqlRequest(sql, values);
        return result[0];
    }
}

module.exports = new TouristRegistryRepository();

