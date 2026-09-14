const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Vybe API is running perfectly.' });
});

// Routes (We will create these files in the next step)
app.use('/api/v1/auth', require('./routes/auth.js'));
app.use('/api/v1/events', require('./routes/events'));
app.use('/api/v1/checkout', require('./routes/checkout'));
app.use('/api/v1/tickets', require('./routes/tickets'));
app.use('/api/v1/payouts', require('./routes/payouts'));
app.use('/api/v1/scanners', require('./routes/scanners.js'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Vybe backend running on port ${PORT}`);
});