const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.post('/', async (req, res) => {
    const { name, email, password, host_id } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, host_id) 
             VALUES ($1, $2, $3, 'SCANNER', $4) 
             RETURNING id, name, email, role, host_id, created_at`,
            [name || 'Scanner', email, hashedPassword, host_id || null]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create scanner error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create scanner login' });
    }
});

router.get('/', async (req, res) => {
    const { host_id } = req.query;
    try {
        const queryText = host_id
            ? `SELECT id, name, email, role, host_id, created_at FROM users WHERE role = 'SCANNER' AND host_id = $1`
            : `SELECT id, name, email, role, host_id, created_at FROM users WHERE role = 'SCANNER'`;
        const params = host_id ? [host_id] : [];
        const result = await db.query(queryText, params);
        res.status(200).json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Fetch scanners error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch scanners' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query(`DELETE FROM users WHERE id = $1 AND role = 'SCANNER'`, [id]);
        res.status(200).json({ status: 'success', message: 'Scanner access revoked' });
    } catch (error) {
        console.error('Revoke scanner error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to revoke scanner' });
    }
});

module.exports = router;