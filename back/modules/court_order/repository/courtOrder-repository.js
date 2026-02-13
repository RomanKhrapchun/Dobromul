const { sqlRequest } = require("../../../helpers/database");

class CourtOrderRepository {

    async create(data) {
        const sql = `
            INSERT INTO ower.court_orders (
                community_name, community_address, community_phone,
                community_email, community_edrpou, council_address,
                court_name, court_address,
                debtor_name, debtor_address, debtor_edrpou, debtor_contacts,
                debt_amount, court_fee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            data.communityName,
            data.communityAddress || null,
            data.communityPhone || null,
            data.communityEmail || null,
            data.communityEdrpou || null,
            data.councilAddress || null,
            data.courtName,
            data.courtAddress || null,
            data.debtorName,
            data.debtorAddress || null,
            data.debtorEdrpou || null,
            data.debtorContacts || null,
            parseFloat(data.debtAmount) || 0,
            parseFloat(data.courtFee) || 0,
        ];

        return await sqlRequest(sql, values);
    }

    async getById(id) {
        const sql = `SELECT * FROM ower.court_orders WHERE id = $1`;
        return await sqlRequest(sql, [id]);
    }

    async findByFilter(limit, offset, title, sortBy, sortDirection) {
        const values = [];
        let paramIndex = 1;

        let sql = `SELECT json_agg(
            json_build_object(
                'id', id,
                'community_name', community_name,
                'court_name', court_name,
                'debtor_name', debtor_name,
                'debtor_edrpou', debtor_edrpou,
                'debt_amount', debt_amount,
                'court_fee', court_fee,
                'created_at', created_at
            )
        ) as data,
        max(cnt) as count
        FROM (
            SELECT *,
            count(*) over () as cnt
            FROM ower.court_orders
            WHERE 1=1`;

        if (title) {
            sql += ` AND debtor_name ILIKE $${paramIndex}`;
            values.push(`%${title}%`);
            paramIndex++;
        }

        const allowedSortFields = {
            'debtor_name': 'LOWER(debtor_name)',
            'created_at': 'created_at',
            'debt_amount': 'debt_amount',
            'court_fee': 'court_fee',
            'community_name': 'community_name',
            'court_name': 'court_name'
        };

        const sortField = allowedSortFields[sortBy] || 'created_at';
        sql += ` ORDER BY ${sortField} ${sortDirection.toUpperCase()}`;

        sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        sql += ` ) q`;

        return await sqlRequest(sql, values);
    }

    async deleteById(id) {
        const sql = `DELETE FROM ower.court_orders WHERE id = $1 RETURNING id`;
        return await sqlRequest(sql, [id]);
    }
}

module.exports = new CourtOrderRepository();
