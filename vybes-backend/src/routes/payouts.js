const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// PROTECTED: only logged-in hosts can query bank lists / resolve accounts.
// Previously open to anyone, which let unauthenticated requests burn your Paystack API quota.
router.get('/banks', requireAuth, requireRole('HOST'), async (req, res) => {
    try {
        const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        });
        const data = await response.json();
        res.status(response.ok ? 200 : response.status).json(data);
    } catch (error) {
        console.error('Fetch banks error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch banks' });
    }
});

router.post('/resolve', requireAuth, requireRole('HOST'), async (req, res) => {
    const { account_number, bank_code } = req.body;
    if (!account_number || !bank_code) {
        return res.status(400).json({ status: 'error', message: 'Account number and bank code are required' });
    }
    try {
        const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
            headers: {
                'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        });
        const data = await response.json();
        res.status(response.ok ? 200 : response.status).json(data);
    } catch (error) {
        console.error('Resolve account error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to resolve account' });
    }
});

module.exports = router;