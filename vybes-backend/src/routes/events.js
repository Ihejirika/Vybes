const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const eventsRes = await db.query(`SELECT * FROM events WHERE status = 'PUBLISHED' OR status IS NULL ORDER BY start_time ASC`);
        const tiersRes = await db.query(`SELECT * FROM ticket_tiers`);

        const events = eventsRes.rows.map(event => ({
            ...event,
            tiers: tiersRes.rows
                .filter(tier => tier.event_id === event.id)
                .map(tier => ({
                    ...tier,
                    quantity_sold: tier.quantity_sold || 0
                }))
        }));

        res.status(200).json({ status: 'success', data: events });
    } catch (error) {
        console.error('Fetch events error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch events' });
    }
});

router.post('/', async (req, res) => {
    const { host_id, title, description, category, venue_name, city, start_time } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO events (host_id, title, description, category, venue_name, city, start_time, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED') RETURNING *`,
            [host_id || null, title, description, category, venue_name, city, start_time]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create event' });
    }
});

router.post('/:eventId/tiers', async (req, res) => {
    const { eventId } = req.params;
    const { name, description, price, total_capacity } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO ticket_tiers (event_id, name, description, price, total_capacity, quantity_sold) 
             VALUES ($1, $2, $3, $4, $5, 0) RETURNING *`,
            [eventId, name, description, price, total_capacity]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create tier error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create tier' });
    }
});

module.exports = router;