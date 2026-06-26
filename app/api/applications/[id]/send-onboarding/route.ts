import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Rate limit onboarding emails to reduce spam/abuse.
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`onboarding:${ip}`, 3, 60 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get the application with related data
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            developer: true,
          },
        },
        tester: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Verify the current user is the developer
    if (application.job.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Only send if application is approved or later
    if (!['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot send guidelines at this stage' },
        { status: 400 }
      )
    }

    // Generate testing guidelines
    const guidelines = `
TESTING GUIDELINES FOR ${application.job.appName.toUpperCase()}

👋 Thank you for becoming a beta tester!

📋 YOUR TESTING PERIOD
• Duration: ${application.job.testDuration} days
• Status: ACTIVE
• Please use the app during your regular daily activities

🎯 WHAT TO TEST
1. Core Features - Use all main features of the app
2. User Experience - Is the app easy to use?
3. Performance - Does it run smoothly?
4. Stability - Any crashes or errors?
5. Design - Is the UI/UX clear and appealing?

🐛 REPORTING BUGS
When you find a bug:
• Note what you were doing
• Describe what happened unexpectedly
• Include error messages if shown
• Rate the severity (critical/high/medium/low)
• Provide steps to reproduce

💡 SHARING FEEDBACK
We're looking for:
• First impressions - What's your initial reaction?
• Feature suggestions - What would improve the app?
• Crashes/errors - Any technical issues?
• Performance - Lag, battery drain, memory issues?
• Positive feedback - What do you love?

⏰ SUBMISSION REQUIREMENTS
• Keep the app installed for the full ${application.job.testDuration}-day period
• Use the app at least 2-3 times a day during the testing period
• Submit your feedback through the app feedback form
• Check back after: ${application.job.testDuration} days for final feedback

📝 FEEDBACK FORM
• Submit detailed feedback after testing
• Use the star rating (1-5 stars)
• Include specific examples and details
• Your feedback directly impacts the app's success!

✅ COMPLIANCE REMINDER
• Must remain opted-in for at least 14 days continuously
• Uninstalling or opting out early may disqualify you
• Your honest feedback helps us improve!

App Link: ${application.job.googlePlayLink}

Thank you for testing with us! 🙏

—
${application.job.developer.name || 'The Developer'}
${application.job.appName} Developer
    `.trim()

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: 'TestForPay <noreply@testforpay.com>',
      to: application.tester.email,
      subject: `Testing Guidelines: ${application.job.appName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Testing Guidelines for ${application.job.appName}</h2>
          
          <p>Hi ${application.tester.name},</p>
          
          <p>Thank you for becoming a beta tester! Below are the guidelines to help you provide quality feedback.</p>
          
          <h3>Your Testing Period</h3>
          <ul>
            <li>Duration: <strong>${application.job.testDuration} days</strong></li>
            <li>Status: <strong>ACTIVE</strong></li>
            <li>Please use the app during your regular daily activities</li>
          </ul>
          
          <h3>What to Test</h3>
          <ol>
            <li>Core Features - Use all main features of the app</li>
            <li>User Experience - Is the app easy to use?</li>
            <li>Performance - Does it run smoothly?</li>
            <li>Stability - Any crashes or errors?</li>
            <li>Design - Is the UI/UX clear and appealing?</li>
          </ol>
          
          <h3>Reporting Bugs</h3>
          <p>When you find a bug:</p>
          <ul>
            <li>Note what you were doing</li>
            <li>Describe what happened unexpectedly</li>
            <li>Include error messages if shown</li>
            <li>Rate the severity (critical/high/medium/low)</li>
            <li>Provide steps to reproduce</li>
          </ul>
          
          <h3>Sharing Feedback</h3>
          <p>We're looking for:</p>
          <ul>
            <li>First impressions - What's your initial reaction?</li>
            <li>Feature suggestions - What would improve the app?</li>
            <li>Crashes/errors - Any technical issues?</li>
            <li>Performance - Lag, battery drain, memory issues?</li>
            <li>Positive feedback - What do you love?</li>
          </ul>
          
          <h3>⏰ Important Reminders</h3>
          <ul>
            <li>✓ Must remain opted-in for at least 14 days continuously</li>
            <li>✓ Uninstalling or opting out early may disqualify you</li>
            <li>✓ Your honest feedback helps us improve!</li>
          </ul>
          
          <p>
            <a href="${application.job.googlePlayLink}" style="display: inline-block; background-color: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Open App on Google Play
            </a>
          </p>
          
          <p>Thank you for testing with us! 🙏</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            ${application.job.developer.name || 'The Developer'}<br>
            ${application.job.appName} Developer
          </p>
        </div>
      `,
    })

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Testing guidelines sent successfully',
      emailId: emailResult.data?.id,
    })
  } catch (error) {
    console.error('Send onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to send onboarding email' },
      { status: 500 }
    )
  }
}
