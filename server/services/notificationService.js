const admin = require('firebase-admin');
const db = admin.firestore();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

async function sendNotification({ recipientId, title, message, type = 'System', link = '#' }) {
    try {
        // 1. Look up the user safely
        const userDoc = await db.collection('users').doc(recipientId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const prefs = userData.notifications || { inApp: true, email: true };

        // 2. IN-APP NOTIFICATION
        if (prefs.inApp !== false) {
            await db.collection('notifications').add({
                recipientId: recipientId,
                title: title,
                message: message,
                type: type,
                link: link,
                isRead: false,
                // CRITICAL FIX: This exact timestamp format wakes up the React frontend listener
                createdAt: admin.firestore.FieldValue.serverTimestamp() 
            });
        }

        // 3. EMAIL NOTIFICATION (with polished HTML styling)
        if (prefs.email !== false && userData.email) {
            const mailOptions = {
                from: `"NexBA System" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: `NexBA Update: ${title}`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="background-color: #0A66C2; padding: 24px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${title}</h2>
                    </div>
                    <div style="padding: 32px; background-color: #F8FAFC;">
                        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">
                            ${message}
                        </p>
                        <div style="text-align: center; margin-top: 32px;">
                            <a href="http://localhost:5173${link}" style="background-color: #0A66C2; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                                View Details in Dashboard
                            </a>
                        </div>
                    </div>
                    <div style="padding: 16px; text-align: center; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            You received this email because you have notifications enabled in your NexBA account settings.
                        </p>
                    </div>
                  </div>
                `
            };
            await transporter.sendMail(mailOptions);
        }

    } catch (error) {
        console.error(`Error in notificationService:`, error);
    }
}

module.exports = { sendNotification };