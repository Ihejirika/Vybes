const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendTicketEmail } = require('../utils/mailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const RESERVATION_TIMEOUT_MINUTES = 15;

async function releaseExpiredReservations() {
    const expiredRes = await db.query(
        `SELECT id, tier_id FROM orders
         WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '${RESERVATION_TIMEOUT_MINUTES} minutes'`
    );

    for (const order of expiredRes.rows) {
        await db.query('BEGIN');
        try {
            await db.query(
                `UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE id = $1`,
                [order.tier_id]
            );
            await db.query(`UPDATE orders SET status = 'EXPIRED' WHERE id = $1`, [order.id]);
            await db.query('COMMIT');
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Failed to release expired reservation for order', order.id, err);
        }
    }
}

router.post('/initialize', async (req, res) => {
    const { buyer_email, tier_id } = req.body;
    if (!buyer_email || !tier_id) {
        return res.status(400).json({ status: 'error', message: 'buyer_email and tier_id are required' });
    }

    try {
        await releaseExpiredReservations();

        const reserveRes = await db.query(
            `UPDATE ticket_tiers
             SET quantity_sold = quantity_sold + 1
             WHERE id = $1 AND quantity_sold < total_capacity
             RETURNING price`,
            [tier_id]
        );

        if (reserveRes.rows.length === 0) {
            const tierCheck = await db.query('SELECT id FROM ticket_tiers WHERE id = $1', [tier_id]);
            if (tierCheck.rows.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Ticket tier not found' });
            }
            return res.status(400).json({ status: 'error', message: 'Ticket tier is sold out' });
        }

        const totalAmount = Number(reserveRes.rows[0].price);
        const orderId = `ORD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        try {
            await db.query(
                `INSERT INTO orders (id, tier_id, buyer_email, total_amount, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
                [orderId, tier_id, buyer_email, totalAmount]
            );

            const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: buyer_email,
                    amount: Math.round(totalAmount * 100),
                    reference: orderId,
                    callback_url: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:3000/success',
                    metadata: { tier_id: tier_id }
                }),
            });

            const paystackData = await paystackResponse.json();
            if (!paystackData.status) {
                await db.query(`UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE id = $1`, [tier_id]);
                await db.query(`UPDATE orders SET status = 'FAILED' WHERE id = $1`, [orderId]);
                return res.status(400).json({ status: 'error', message: paystackData.message || 'Paystack initialization failed' });
            }

            res.status(200).json({ status: 'success', authorization_url: paystackData.data.authorization_url, orderId });
        } catch (innerError) {
            await db.query(`UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE id = $1`, [tier_id]);
            await db.query(`UPDATE orders SET status = 'FAILED' WHERE id = $1`, [orderId]).catch(() => { });
            throw innerError;
        }
    } catch (error) {
        console.error('Checkout init error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to initialize checkout' });
    }
});

// PUBLIC: the /success page polls this by the order reference from the
// Paystack redirect URL. No auth — a buyer isn't logged in at this point,
// and the reference itself is the only thing that gets you a result, same
// trust level as a receipt lookup. Returns only order/ticket status, never
// anything belonging to the host's account.
router.get('/order/:reference', async (req, res) => {
    const { reference } = req.params;
    try {
        const result = await db.query(
            `SELECT o.id, o.status, o.buyer_email, o.total_amount, o.created_at,
                    t.name AS tier_name, e.title AS event_title
             FROM orders o
             JOIN ticket_tiers t ON o.tier_id = t.id
             JOIN events e ON t.event_id = e.id
             WHERE o.id = $1`,
            [reference]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        res.status(200).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Fetch order status error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch order status' });
    }
});

router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const payloadString = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(payloadString).digest('hex');

    if (hash !== signature) {
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
        const orderId = event.data.reference;
        const tierId = event.data.metadata?.tier_id;
        const buyerEmail = event.data.customer?.email;

        try {
            const orderRes = await db.query(`SELECT status FROM orders WHERE id = $1`, [orderId]);
            if (orderRes.rows.length === 0 || orderRes.rows[0].status === 'SUCCESS') {
                return res.status(200).send('Webhook already processed or order not found');
            }

            await db.query(`UPDATE orders SET status = 'SUCCESS' WHERE id = $1`, [orderId]);

            if (tierId) {
                const ticketCode = `VYBE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                const qrPayload = { ticket_code: ticketCode, order_id: orderId, tier_id: tierId, buyer: buyerEmail };
                const qrHash = jwt.sign(qrPayload, JWT_SECRET);

                await db.query(
                    `INSERT INTO tickets (ticket_code, order_id, tier_id, qr_hash, is_used) VALUES ($1, $2, $3, $4, FALSE) ON CONFLICT DO NOTHING`,
                    [ticketCode, orderId, tierId, qrHash]
                );

                const eventInfo = await db.query(
                    `SELECT e.title, t.name AS tier_name FROM ticket_tiers t JOIN events e ON t.event_id = e.id WHERE t.id = $1`,
                    [tierId]
                );

                if (eventInfo.rows.length > 0 && buyerEmail) {
                    const { title, tier_name } = eventInfo.rows[0];
                    try {
                        if (typeof sendTicketEmail === 'function') {
                            await sendTicketEmail(buyerEmail, title, tier_name, qrHash, ticketCode, orderId);
                        }
                    } catch (mailErr) {
                        console.error('Mail error during webhook:', mailErr.message);
                    }
                }
            }
        } catch (dbError) {
            console.error('Database error during webhook:', dbError);
            return res.status(500).send('Webhook database processing error');
        }
    }

    if (event.event === 'charge.failed') {
        const orderId = event.data.reference;
        const tierId = event.data.metadata?.tier_id;

        try {
            const orderRes = await db.query(`SELECT status FROM orders WHERE id = $1`, [orderId]);
            if (orderRes.rows.length > 0 && orderRes.rows[0].status === 'PENDING') {
                await db.query(`UPDATE ticket_tiers SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE id = $1`, [tierId]);
                await db.query(`UPDATE orders SET status = 'FAILED' WHERE id = $1`, [orderId]);
            }
        } catch (dbError) {
            console.error('Database error releasing failed charge:', dbError);
        }
    }

    // Wallet withdrawals: Paystack fires these against the transfer_code we
    // stored when /api/v1/payouts/withdraw initiated the transfer. Handled
    // here rather than in payouts.js because Paystack only sends webhooks
    // to the one URL configured on the account — this route is already it.
    if (event.event === 'transfer.success' || event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
        const transferCode = event.data.transfer_code;
        const newStatus = event.event === 'transfer.success' ? 'SUCCESS' : 'FAILED';
        const failureReason = event.event !== 'transfer.success' ? (event.data.reason || event.data.gateway_response || null) : null;

        try {
            await db.query(
                `UPDATE payouts
                 SET status = $1,
                     completed_at = CASE WHEN $1 = 'SUCCESS' THEN NOW() ELSE completed_at END,
                     failure_reason = $2
                 WHERE transfer_code = $3`,
                [newStatus, failureReason, transferCode]
            );
        } catch (dbError) {
            console.error('Database error updating payout from transfer webhook:', dbError);
        }
    }

    res.status(200).send('Webhook processed');
});

module.exports = router;
