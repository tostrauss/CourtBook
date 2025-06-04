const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service error:', error);
      } else {
        console.log('Email service ready');
      }
    });
  }
  
  async sendEmail(options) {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Tennis Court Booking'} <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }
  
  async sendWelcomeEmail(user, verificationUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Tennis Court Booking!</h1>
        <p>Hi ${user.firstName || user.username},</p>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;
    
    await this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Tennis Court Booking',
      html,
      text: `Welcome to Tennis Court Booking! Please verify your email by visiting: ${verificationUrl}`
    });
  }
  
  async sendPasswordResetEmail(user, resetUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>Hi ${user.firstName || user.username},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #FF5722; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
    `;
    
    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset - Tennis Court Booking',
      html,
      text: `Reset your password by visiting: ${resetUrl}`
    });
  }
  
  async sendBookingConfirmation(user, booking, court) {
    const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Booking Confirmed!</h1>
        <p>Hi ${user.firstName || user.username},</p>
        <p>Your tennis court booking has been confirmed:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Booking Details</h3>
          <p><strong>Court:</strong> ${court.name}</p>
          <p><strong>Date:</strong> ${bookingDate}</p>
          <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
          <p><strong>Duration:</strong> ${booking.getDurationMinutes()} minutes</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          ${booking.players?.length > 0 ? `
            <p><strong>Players:</strong></p>
            <ul>
              ${booking.players.map(p => `<li>${p.name}${p.email ? ` (${p.email})` : ''}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <h3>Important Information</h3>
        <ul>
          <li>Please arrive 10 minutes before your booking time</li>
          <li>Cancellations must be made at least ${court.bookingRules?.cancellationDeadlineHours || 2} hours in advance</li>
          <li>Bring appropriate tennis shoes and equipment</li>
        </ul>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          Need to modify or cancel your booking? Visit your dashboard or contact us.
        </p>
      </div>
    `;
    
    await this.sendEmail({
      to: user.email,
      subject: `Booking Confirmed - ${court.name} on ${bookingDate}`,
      html,
      text: `Your booking is confirmed for ${court.name} on ${bookingDate} from ${booking.startTime} to ${booking.endTime}`
    });
  }
}