import { Resend } from 'resend'
import { formatEurFromCents } from './currency'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'TestForPay <noreply@testforpay.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'


export async function sendApplicationApprovedEmail(
  to: string,
  data: {
    testerName: string
    appName: string
    googlePlayLink: string
    paymentCents: number
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 Your application was approved - ${data.appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Application Approved!</h1>
        <p>Hi ${data.testerName},</p>
        <p>Great news! Your application to test <strong>${data.appName}</strong> has been approved.</p>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1e40af;">Next Steps:</h2>
          <ol>
            <li>Opt-in to the Google Play closed test using the link below</li>
            <li>Upload a screenshot to verify your opt-in</li>
            <li>Test the app for 14 days</li>
            <li>Get paid ${formatEurFromCents(data.paymentCents)}</li>
          </ol>
        </div>
        
        <a href="${data.googlePlayLink}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 10px 0;">
          Opt-in to Google Play Test
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Questions? Reply to this email or visit your dashboard.
        </p>
      </div>
    `,
  })
}

export async function sendApplicationReceivedEmail(
  to: string,
  data: {
    developerName: string
    appName: string
    testerEmail: string
    dashboardLink: string
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New application received - ${data.appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Application Received</h1>
        <p>Hi ${data.developerName},</p>
        <p>A new tester has applied to test <strong>${data.appName}</strong>.</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Tester:</strong> ${data.testerEmail}</p>
        </div>
        
        <a href="${data.dashboardLink}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 10px 0;">
          Review Application
        </a>
      </div>
    `,
  })
}

export async function sendTestingStartedEmail(
  to: string,
  data: {
    testerName: string
    appName: string
    endDate: string
    paymentCents: number
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Testing started - ${data.appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Testing Period Started! 🎯</h1>
        <p>Hi ${data.testerName},</p>
        <p>Your 14-day testing period for <strong>${data.appName}</strong> has officially started.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Testing ends:</strong> ${data.endDate}</p>
          <p><strong>Payment:</strong> ${formatEurFromCents(data.paymentCents)}</p>
          <p style="margin-top: 15px; color: #166534;">
            Just use the app naturally and provide honest feedback. 
            Payment will be processed automatically after 14 days.
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendTestingCompletedEmail(
  to: string,
  data: {
    testerName: string
    appName: string
    paymentCents: number
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Testing completed - Payment processing`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Testing Completed! 🎉</h1>
        <p>Hi ${data.testerName},</p>
        <p>Congratulations! You've completed the 14-day testing period for <strong>${data.appName}</strong>.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #166534;">Payment Processing</h2>
          <p>Your payment of <strong>${formatEurFromCents(data.paymentCents)}</strong> is being processed and will arrive in your bank account within 2-3 business days.</p>
        </div>
        
        <p>Thank you for being a valuable tester! Look for more opportunities in your dashboard.</p>
      </div>
    `,
  })
}

export async function sendPaymentConfirmationEmail(
  to: string,
  data: {
    developerName: string
    appName: string
    amountCents: number
    testersCount: number
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Payment confirmed - ${data.appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Payment Confirmed ✓</h1>
        <p>Hi ${data.developerName},</p>
        <p>Your payment for <strong>${data.appName}</strong> has been processed successfully.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${formatEurFromCents(data.amountCents)}</p>
          <p style="margin: 5px 0;"><strong>Testers:</strong> ${data.testersCount}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Active and accepting applications</p>
        </div>
        
        <p>Your job is now live and visible to testers. You'll receive notifications as applications come in.</p>
      </div>
    `,
  })
}

export async function sendTestingReminderEmail(
  to: string,
  data: {
    testerName: string
    appName: string
    daysRemaining: number
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Testing reminder - ${data.daysRemaining} days left`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Testing Reminder</h1>
        <p>Hi ${data.testerName},</p>
        <p>Just a friendly reminder that you have <strong>${data.daysRemaining} days</strong> left to test <strong>${data.appName}</strong>.</p>
        
        <p style="color: #6b7280;">Keep using the app naturally and feel free to explore all features.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(
  to: string,
  data: {
    resetToken: string
  }
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your TestForPay password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset</h1>
        <p>We received a request to reset your password.</p>
        <p>Use this code to reset your password:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 16px 0;">
          ${data.resetToken}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This code expires in 30 minutes. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })
}

export async function sendEmailVerificationEmail(
  to: string,
  data: {
    name?: string | null
    verificationToken: string
  }
) {
  const verificationUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(data.verificationToken)}`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verify your TestForPay email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Verify your email</h1>
        <p>Hi ${data.name || 'there'},</p>
        <p>Confirm your email address to unlock job creation, applications, and payouts.</p>
        <a href="${verificationUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify email
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 24 hours. If you didn't create this account, you can ignore this email.
        </p>
      </div>
    `,
  })
}

