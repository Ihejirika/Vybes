const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// PROTECTED: only a logged-in HOST can create scanner accounts, always scoped to themselves.
// Previously host_id came from the request body, so anyone could assign a scanner to any host.
router.post('/', requireAuth, requireRole('HOST'), async (req, res) => {
    const { name, email, password } = req.body;
    const host_id = req.user.id;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, host_id) 
             VALUES ($1, $2, $3, 'SCANNER', $4) 
             RETURNING id, name, email, role, host_id, created_at`,
            [name || 'Scanner', email, hashedPassword, host_id]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create scanner error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create scanner login' });
    }
});

// PROTECTED: only returns scanners belonging to the logged-in host.
// Previously host_id came from a query param, so anyone could list any host's scanner team by guessing/passing an id.
router.get('/', requireAuth, requireRole('HOST'), async (req, res) => {
    const host_id = req.user.id;
    try {
        const result = await db.query(
            `SELECT id, name, email, role, host_id, created_at FROM users WHERE role = 'SCANNER' AND host_id = $1`,
            [host_id]
        );
        res.status(200).json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Fetch scanners error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch scanners' });
    }
});

// PROTECTED: a host can only revoke scanners that actually belong to them.
// Previously any id could be deleted by anyone, regardless of ownership.
router.delete('/:id', requireAuth, requireRole('HOST'), async (req, res) => {
    const { id } = req.params;
    const host_id = req.user.id;
    try {
        const result = await db.query(
            `DELETE FROM users WHERE id = $1 AND role = 'SCANNER' AND host_id = $2 RETURNING id`,
            [id, host_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Scanner not found or not owned by you' });
        }
        res.status(200).json({ status: 'success', message: 'Scanner access revoked' });
    } catch (error) {
        console.error('Revoke scanner error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to revoke scanner' });
    }
});

module.exports = router;