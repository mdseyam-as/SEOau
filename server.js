import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- SMTP CONFIGURATION ---
// You must configure this with your real email provider details.
// For Gmail, you need to generate an "App Password" in your Google Account security settings.
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'hotmail', 'yahoo', or use host/port for custom SMTP
  auth: {
    user: 'YOUR_EMAIL@gmail.com', // Replace with your email
    pass: 'YOUR_APP_PASSWORD'     // Replace with your app password
  }
});

// Route to send verification code
app.post('/api/send-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const mailOptions = {
    from: '"SEO Generator Security" <no-reply@seogenerator.app>',
    to: email,
    subject: 'Код подтверждения регистрации',
    text: `Ваш код подтверждения: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00A859;">SEO Generator</h2>
        <p>Здравствуйте!</p>
        <p>Для завершения регистрации введите следующий код:</p>
        <h1 style="letter-spacing: 5px; background: #f0fdf4; padding: 10px; display: inline-block; border-radius: 5px; color: #0F172A;">${code}</h1>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Если вы не запрашивали этот код, проигнорируйте это письмо.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});