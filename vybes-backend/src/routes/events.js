const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// PUBLIC: browse published events (visitor-facing listing page)
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

// PROTECTED: dashboard listing — only the logged-in host's own events
router.get('/mine', requireAuth, requireRole('HOST'), async (req, res) => {
    try {
        const hostId = req.user.id;

        const eventsRes = await db.query(
            `SELECT * FROM events WHERE host_id = $1 ORDER BY start_time ASC`,
            [hostId]
        );

        const eventIds = eventsRes.rows.map(e => e.id);
        let tiersRes = { rows: [] };
        if (eventIds.length > 0) {
            tiersRes = await db.query(
                `SELECT * FROM ticket_tiers WHERE event_id = ANY($1::int[])`,
                [eventIds]
            );
        }

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
        console.error('Fetch my events error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch your events' });
    }
});

// PROTECTED: host_id now comes from the verified token, never from client input
router.post('/', requireAuth, requireRole('HOST'), async (req, res) => {
    const { title, description, category, venue_name, city, start_time } = req.body;
    const host_id = req.user.id;
    try {
        const result = await db.query(
            `INSERT INTO events (host_id, title, description, category, venue_name, city, start_time, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED') RETURNING *`,
            [host_id, title, description, category, venue_name, city, start_time]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create event' });
    }
});

// PROTECTED: only the event's own host can add a ticket tier to it
router.post('/:eventId/tiers', requireAuth, requireRole('HOST'), async (req, res) => {
    const { eventId } = req.params;
    const { name, description, price, total_capacity } = req.body;
    try {
        const ownerCheck = await db.query(`SELECT host_id FROM events WHERE id = $1`, [eventId]);
        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Event not found' });
        }
        if (ownerCheck.rows[0].host_id !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You do not own this event' });
        }

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
