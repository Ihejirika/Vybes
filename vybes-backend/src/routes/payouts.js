const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
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

// ---- Wallet: saved payout accounts -----------------------------------

// PROTECTED: list the logged-in host's saved bank accounts.
router.get('/accounts', requireAuth, requireRole('HOST'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, bank_code, bank_name, account_number, account_name, created_at
             FROM bank_accounts WHERE host_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.status(200).json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Fetch bank accounts error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch bank accounts' });
    }
});

// PROTECTED: save a bank account for future withdrawals. Re-resolves the
// account server-side (rather than trusting a client-supplied name) and
// creates a Paystack transfer recipient, same "never trust the client for
// identity-bearing data" principle as host_id coming from the JWT.
router.post('/accounts', requireAuth, requireRole('HOST'), async (req, res) => {
    const { account_number, bank_code } = req.body;
    const host_id = req.user.id;
    if (!account_number || !bank_code) {
        return res.status(400).json({ status: 'error', message: 'Account number and bank code are required' });
    }

    try {
        const resolveRes = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        const resolveData = await resolveRes.json();
        if (!resolveData.status) {
            return res.status(400).json({ status: 'error', message: resolveData.message || 'Could not verify account' });
        }
        const account_name = resolveData.data.account_name;

        const bankListRes = await fetch('https://api.paystack.co/bank?currency=NGN', {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        });
        const bankListData = await bankListRes.json();
        const matchedBank = (bankListData.data || []).find(b => b.code === bank_code);
        const bank_name = matchedBank ? matchedBank.name : 'Unknown Bank';

        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'nuban', name: account_name, account_number, bank_code, currency: 'NGN' })
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) {
            return res.status(400).json({ status: 'error', message: recipientData.message || 'Could not save bank account' });
        }

        const result = await db.query(
            `INSERT INTO bank_accounts (host_id, bank_code, bank_name, account_number, account_name, recipient_code)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (host_id, account_number, bank_code)
             DO UPDATE SET recipient_code = EXCLUDED.recipient_code, account_name = EXCLUDED.account_name
             RETURNING id, bank_code, bank_name, account_number, account_name, created_at`,
            [host_id, bank_code, bank_name, account_number, account_name, recipientData.data.recipient_code]
        );

        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Save bank account error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save bank account' });
    }
});

// PROTECTED: a host can only remove their own saved accounts.
router.delete('/accounts/:id', requireAuth, requireRole('HOST'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `DELETE FROM bank_accounts WHERE id = $1 AND host_id = $2 RETURNING id`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Bank account not found or not owned by you' });
        }
        res.status(200).json({ status: 'success', message: 'Bank account removed' });
    } catch (error) {
        console.error('Delete bank account error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to remove bank account' });
    }
});

// ---- Wallet: balance & history -----------------------------------

// PROTECTED: available balance = successful ticket sales for the host's
// events, minus withdrawals already paid out or currently in flight.
router.get('/balance', requireAuth, requireRole('HOST'), async (req, res) => {
    const host_id = req.user.id;
    try {
        const grossRes = await db.query(
            `SELECT COALESCE(SUM(o.total_amount), 0) AS gross
             FROM orders o
             JOIN ticket_tiers t ON o.tier_id = t.id
             JOIN events e ON t.event_id = e.id
             WHERE e.host_id = $1 AND o.status = 'SUCCESS'`,
            [host_id]
        );
        const committedRes = await db.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) AS withdrawn,
                COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING', 'PROCESSING')), 0) AS in_flight
             FROM payouts WHERE host_id = $1`,
            [host_id]
        );

        const gross = Number(grossRes.rows[0].gross);
        const withdrawn = Number(committedRes.rows[0].withdrawn);
        const inFlight = Number(committedRes.rows[0].in_flight);

        res.status(200).json({
            status: 'success',
            data: {
                available: Math.max(gross - withdrawn - inFlight, 0),
                pending: inFlight,
                currency: 'NGN'
            }
        });
    } catch (error) {
        console.error('Fetch balance error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch balance' });
    }
});

// PROTECTED: the logged-in host's own withdrawal history.
router.get('/', requireAuth, requireRole('HOST'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.amount, p.status, p.failure_reason, p.created_at, p.completed_at,
                    b.bank_name, RIGHT(b.account_number, 4) AS account_last4
             FROM payouts p
             JOIN bank_accounts b ON p.bank_account_id = b.id
             WHERE p.host_id = $1
             ORDER BY p.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );
        res.status(200).json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Fetch payout history error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payout history' });
    }
});

// PROTECTED: withdraw available balance to a saved bank account.
router.post('/withdraw', requireAuth, requireRole('HOST'), async (req, res) => {
    const { amount, bank_account_id } = req.body;
    const host_id = req.user.id;

    if (!amount || !bank_account_id) {
        return res.status(400).json({ status: 'error', message: 'amount and bank_account_id are required' });
    }
    if (Number(amount) <= 0) {
        return res.status(400).json({ status: 'error', message: 'Amount must be greater than zero' });
    }

    let payoutId;
    let accountRow;

    try {
        await db.query('BEGIN');

        // Serialize withdrawal requests per host so two concurrent requests
        // can't both read the same available balance and double-spend it.
        // Balance here is a derived aggregate rather than a single row, so
        // an advisory lock stands in for the atomic UPDATE...RETURNING
        // pattern used for ticket_tiers.
        await db.query('SELECT pg_advisory_xact_lock($1)', [host_id]);

        const accountRes = await db.query(
            `SELECT * FROM bank_accounts WHERE id = $1 AND host_id = $2`,
            [bank_account_id, host_id]
        );
        if (accountRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ status: 'error', message: 'Bank account not found or not owned by you' });
        }
        accountRow = accountRes.rows[0];

        const grossRes = await db.query(
            `SELECT COALESCE(SUM(o.total_amount), 0) AS gross
             FROM orders o
             JOIN ticket_tiers t ON o.tier_id = t.id
             JOIN events e ON t.event_id = e.id
             WHERE e.host_id = $1 AND o.status = 'SUCCESS'`,
            [host_id]
        );
        const committedRes = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS committed
             FROM payouts WHERE host_id = $1 AND status IN ('PENDING', 'PROCESSING', 'SUCCESS')`,
            [host_id]
        );
        const available = Number(grossRes.rows[0].gross) - Number(committedRes.rows[0].committed);

        if (Number(amount) > available) {
            await db.query('ROLLBACK');
            return res.status(400).json({ status: 'error', message: 'Amount exceeds available balance' });
        }

        payoutId = `PYO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        await db.query(
            `INSERT INTO payouts (id, host_id, bank_account_id, amount, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
            [payoutId, host_id, bank_account_id, amount]
        );

        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK').catch(() => { });
        console.error('Withdraw init error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to initiate withdrawal' });
    }

    // Call Paystack outside the transaction. The payout row already exists
    // as PENDING, so if this call or the process dies here, the payout is
    // left visibly stuck at PENDING rather than money silently vanishing —
    // same reasoning as checkout.js calling Paystack after the order row
    // already exists.
    try {
        const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: 'balance',
                amount: Math.round(Number(amount) * 100),
                recipient: accountRow.recipient_code,
                reason: `Vybes payout ${payoutId}`,
                reference: payoutId
            })
        });
        const transferData = await transferRes.json();

        if (!transferData.status) {
            await db.query(`UPDATE payouts SET status = 'FAILED', failure_reason = $1 WHERE id = $2`,
                [transferData.message || 'Transfer failed to initiate', payoutId]);
            return res.status(400).json({ status: 'error', message: transferData.message || 'Transfer failed to initiate' });
        }

        // Paystack transfers land as 'pending' or require OTP finalization
        // depending on your account's transfer settings — either way this
        // isn't final yet. The transfer.success/failed/reversed webhook
        // (handled in checkout.js, since Paystack only calls one webhook
        // URL per account) is what moves this to SUCCESS or FAILED.
        await db.query(
            `UPDATE payouts SET status = 'PROCESSING', transfer_code = $1 WHERE id = $2`,
            [transferData.data.transfer_code, payoutId]
        );

        res.status(200).json({ status: 'success', message: 'Withdrawal initiated', data: { id: payoutId, status: 'PROCESSING' } });
    } catch (error) {
        console.error('Paystack transfer error:', error);
        await db.query(`UPDATE payouts SET status = 'FAILED', failure_reason = 'Transfer request error' WHERE id = $1`, [payoutId]).catch(() => { });
        res.status(500).json({ status: 'error', message: 'Failed to initiate transfer' });
    }
});

module.exports = router;
