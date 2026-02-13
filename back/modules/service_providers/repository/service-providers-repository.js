const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");

class ServiceProvidersRepository {

    async findHostsByFilter(limit, offset, title, allowedFields, displayFields, sortBy, sortDirection) {
        const values = [];
        let sql = `select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(${displayFields.map(field => `'${field}', ${field}`).join(', ')})  as rw,
            count(*) over () as cnt
            from tourism.hosts
            where 1=1`;

        // Додаємо пошук по title (загальний пошук по location_name, host_name, host_ipn)
        if (title) {
            sql += ` AND (location_name ILIKE $${values.length + 1} OR host_name ILIKE $${values.length + 1} OR host_ipn ILIKE $${values.length + 1})`;
            values.push(`%${title}%`);
        }

        // Додаємо WHERE умови з buildWhereCondition
        if (Object.keys(allowedFields).length) {
            const whereData = buildWhereCondition(allowedFields);
            sql += whereData.text;
            values.push(...whereData.value);
        }

        // Додаємо сортування
        sql += ` ORDER BY ${sortBy} ${sortDirection.toUpperCase()}`;
        if (sortBy !== 'id') {
            sql += `, id ${sortDirection.toUpperCase()}`;
        }

        // Додаємо пагінацію
        sql += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        sql += ` ) q`;

        return await sqlRequest(sql, values);
    }

    async addHost(hostData) {
        const fields = Object.keys(hostData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(hostData);
        
        const sql = `INSERT INTO tourism.hosts (${fields.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        return await sqlRequest(sql, values);
    }
}

module.exports = new ServiceProvidersRepository();

