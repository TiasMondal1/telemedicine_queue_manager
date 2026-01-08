import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@telemedicine.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Telemedicine Queue';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

export const sendEmail = async ({ to, subject, text, html }: SendEmailOptions): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️  SendGrid API key not configured. Email would be sent to:', to);
    console.log('Subject:', subject);
    console.log('Content:', text || html);
    return;
  }

  try {
    await sgMail.send({
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error: any) {
    console.error('❌ Error sending email:', error.response?.body || error.message);
    throw new Error('Failed to send email');
  }
};

export const sendVerificationEmail = async (email: string, token: string, firstName: string) => {
  const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #2563EB; 
          color: #ffffff; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome to Telemedicine Queue Manager!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <div class="footer">
          <p>Best regards,<br>Telemedicine Queue Manager Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html,
    text: `Hi ${firstName}, Please verify your email by visiting: ${verificationUrl}`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string, firstName: string) => {
  const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #EF4444; 
          color: #ffffff; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <div class="warning">
          <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
        </div>
        <div class="footer">
          <p>Best regards,<br>Telemedicine Queue Manager Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
    text: `Hi ${firstName}, Reset your password by visiting: ${resetUrl}`,
  });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
