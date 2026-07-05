import { Resend } from 'resend'
import { formatEurFromCents } from './currency'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'TestForPay <noreply@testforpay.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML shell — keeps all emails visually consistent
// ─────────────────────────────────────────────────────────────────────────────
function emailShell(content: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #2563eb; padding: 24px 32px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">TestForPay</h1>
        <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 13px;">Get paid to test apps · Publish faster on Google Play</p>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        ${content}
      </div>
      <div style="padding: 20px 32px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          TestForPay · Zambia ·
          <a href="${APP_URL}" style="color: #9ca3af;">testforpay.com</a>
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 6px 0 0;">
          You're receiving this because you signed up for TestForPay.
        </p>
      </div>
    </div>
  `
}

function btn(label: string, href: string, color = '#2563eb') {
  return `
    <a href="${href}"
       style="display: inline-block; background: ${color}; color: #ffffff; padding: 13px 28px;
              text-decoration: none; border-radius: 7px; font-weight: 600; font-size: 15px; margin: 8px 0;">
      ${label}
    </a>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email — DEVELOPER
// ─────────────────────────────────────────────────────────────────────────────
export async function sendDeveloperWelcomeEmail(
  to: string,
  data: { name?: string | null }
) {
  const greeting = data.name ? `Hi ${data.name},` : 'Hi there,'
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to TestForPay — post your first testing job',
    html: emailShell(`
      <h2 style="color: #1e293b; margin-top: 0;">Welcome aboard 👋</h2>
      <p style="color: #374151; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; line-height: 1.6;">
        Thanks for joining TestForPay. You're here because you need real testers for your Android app —
        and that's exactly what we do.
      </p>

      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px;">Here's how it works:</p>
        <ol style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Post your app details and set a budget</li>
          <li>Verified testers apply and opt in to your Google Play closed test</li>
          <li>Testers use your app for 14 days and send you daily check-ins</li>
          <li>Testing completes — Google unlocks production publishing for you</li>
          <li>You pay only when testing is done (escrow model)</li>
        </ol>
      </div>

      <p style="color: #374151; line-height: 1.6;">
        Most jobs fill within <strong>24 hours</strong>. Your testers are real Android users —
        not developers, not bots. Google-compliant by design.
      </p>

      ${btn('Post Your First Testing Job →', `${APP_URL}/dashboard/jobs/new`)}

      <p style="color: #6b7280; font-size: 14px; margin-top: 28px; line-height: 1.6;">
        Any questions? Just reply to this email — I read every one.<br/>
        <strong>Evans</strong>, founder of TestForPay
      </p>
    `),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Nudge email — DEVELOPER hasn't posted a job after 48h
// ─────────────────────────────────────────────────────────────────────────────
export async function sendDeveloperNudgeEmail(
  to: string,
  data: { name?: string | null }
) {
  const greeting = data.name ? `Hi ${data.name},` : 'Hi there,'
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Still need testers? Your first job takes 2 minutes to post',
    html: emailShell(`
      <h2 style="color: #1e293b; margin-top: 0;">Ready when you are 🚀</h2>
      <p style="color: #374151; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; line-height: 1.6;">
        You signed up for TestForPay but haven't posted a testing job yet.
        We have testers ready and waiting — they're notified the moment a new job goes live.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #166534; font-weight: 600; margin: 0 0 6px;">What you need to post a job:</p>
        <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Your app name and Google Play closed test link</li>
          <li>How many testers you need (minimum 20)</li>
          <li>How much to pay per tester (€5–€50)</li>
        </ul>
        <p style="color: #166534; margin: 10px 0 0; font-size: 14px;">Takes about 2 minutes. Payment is held in escrow — you don't pay until testing completes.</p>
      </div>

      ${btn('Post a Testing Job Now →', `${APP_URL}/dashboard/jobs/new`)}

      <p style="color: #6b7280; font-size: 14px; margin-top: 28px; line-height: 1.6;">
        Got stuck or have questions? Reply here and I'll help directly.<br/>
        <strong>Evans</strong>, TestForPay
      </p>
    `),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email — TESTER
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTesterWelcomeEmail(
  to: string,
  data: { name?: string | null }
) {
  const greeting = data.name ? `Hi ${data.name},` : 'Hi there,'
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to TestForPay — here\'s how to get paid',
    html: emailShell(`
      <h2 style="color: #1e293b; margin-top: 0;">You're in! 🎉</h2>
      <p style="color: #374151; line-height: 1.6;">${greeting}</p>
      <p style="color: #374151; line-height: 1.6;">
        Welcome to TestForPay. You'll earn money by testing Android apps before they go live on Google Play.
        Developers pay you to install their app, use it normally for 14 days, and share your experience.
      </p>

      <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="color: #5b21b6; font-weight: 600; margin: 0 0 8px;">How to get your first payout:</p>
        <ol style="color: #5b21b6; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Set up Stripe</strong> — go to Settings and connect your bank account</li>
          <li><strong>Browse jobs</strong> — find an app you'd like to test</li>
          <li><strong>Apply</strong> — wait for the developer to approve you</li>
          <li><strong>Install the app</strong> — opt in to the Google Play test</li>
          <li><strong>Test for 14 days</strong> — use the app and send daily check-ins</li>
          <li><strong>Get paid</strong> — payment lands in your bank automatically</li>
        </ol>
      </div>

      <p style="color: #374151; line-height: 1.6;">
        <strong>Important:</strong> Set up your Stripe payout account now so you're ready to receive payment
        the moment your first test completes. It takes about 5 minutes.
      </p>

      ${btn('Set Up Payout Account →', `${APP_URL}/dashboard/settings`, '#7c3aed')}

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 14px 18px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #374151; margin: 0; font-size: 14px;">
          💡 <strong>Tip:</strong> Enable notifications in the dashboard so you're alerted the moment
          a new testing job goes live — spots fill fast.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 28px; line-height: 1.6;">
        Questions? Reply here anytime.<br/>
        <strong>Evans</strong>, TestForPay
      </p>
    `),
  })
}



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

