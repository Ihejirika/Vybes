const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const sendTicketEmail = async (email, eventTitle, tierName, qrHash, ticketCode) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.log(`[Mock Mailer] Ticket email for ${ticketCode} to ${email} skipped (missing mail creds).`);
        return;
    }

    const qrData = encodeURIComponent(qrHash || ticketCode);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

    await transporter.sendMail({
        from: `"Vybe Ticketing" <${process.env.MAIL_USER}>`,
        to: email,
        subject: `Your Ticket for ${eventTitle} (${ticketCode})`,
        html: `
            <div style="font-family: sans-serif; background: #000; color: #fff; padding: 24px; border-radius: 16px; max-width: 400px; margin: 0 auto;">
                <h2 style="color: #a855f7; text-align: center; margin-top: 0;">Vybe Event Pass</h2>
                
                <div style="background: #ffffff; padding: 12px; border-radius: 12px; width: fit-content; margin: 16px auto;">
                    <img src="${qrImageUrl}" alt="Ticket QR Code" style="width: 150px; height: 150px; display: block;" />
                </div>

                <div style="background: #18181b; padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-top: 16px;">
                    <p style="margin: 6px 0; font-size: 13px;">Event: <strong>${eventTitle}</strong></p>
                    <p style="margin: 6px 0; font-size: 13px;">Tier: <strong>${tierName}</strong></p>
                    <p style="margin: 6px 0; font-size: 13px;">Ticket Code: <code style="background: #27272a; padding: 2px 6px; border-radius: 4px; color: #a855f7;">${ticketCode}</code></p>
                </div>

                <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin-top: 16px;">Present this QR code or serial at the door for check-in.</p>
            </div>
        `
    });
};

module.exports = { sendTicketEmail };