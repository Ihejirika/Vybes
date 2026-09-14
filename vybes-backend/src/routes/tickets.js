const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

router.post('/verify', async (req, res) => {
    const { ticket_code, qr_hash, check_in } = req.body;
    if (!ticket_code && !qr_hash) {
        return res.status(400).json({ status: 'error', message: 'ticket_code or qr_hash is required' });
    }

    try {
        let lookupCode = ticket_code;
        if (qr_hash && !lookupCode) {
            try {
                const decoded = jwt.verify(qr_hash, JWT_SECRET);
                lookupCode = decoded.ticket_code;
            } catch (err) {
                return res.status(400).json({ status: 'error', message: 'Invalid or expired QR signature' });
            }
        }

        const result = await db.query(
            `SELECT t.*, tt.name AS tier_name, e.title AS event_title 
             FROM tickets t 
             JOIN ticket_tiers tt ON t.tier_id = tt.id 
             JOIN events e ON tt.event_id = e.id 
             WHERE t.ticket_code = $1`,
            [lookupCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Ticket not found' });
        }

        const ticket = result.rows[0];

        if (ticket.is_used) {
            return res.status(409).json({
                status: 'error',
                message: `Ticket already used at ${ticket.checked_in_at}`,
                data: ticket
            });
        }

        // This block only runs if check_in is truthy in the request body.
        // The frontend must send { check_in: true } or the ticket is never
        // marked as used, even though the response says "valid".
        if (check_in) {
            const updateRes = await db.query(
                `UPDATE tickets SET is_used = TRUE, checked_in_at = NOW() WHERE ticket_code = $1 AND is_used = FALSE RETURNING *`,
                [lookupCode]
            );
            if (updateRes.rows.length === 0) {
                return res.status(409).json({ status: 'error', message: 'Ticket was just checked in by another scanner' });
            }
            return res.status(200).json({ status: 'valid', message: 'Ticket verified and checked in!', data: updateRes.rows[0] });
        }

        res.status(200).json({
            status: 'valid',
            message: 'Ticket is valid and unused',
            data: ticket
        });
    } catch (error) {
        console.error('Verify ticket error:', error);
        res.status(500).json({ status: 'error', message: 'Verification failed' });
    }
});

module.exports = router;
