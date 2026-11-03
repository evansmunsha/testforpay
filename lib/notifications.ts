import prisma from './prisma'
import webpush from 'web-push'
import { formatEurFromCents } from './currency'

// Initialize web-push if VAPID keys are set
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@testforpay.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

interface NotificationData {
  userId: string
  title: string
  body: string
  url?: string
  type: string
}

function isPushError(error: unknown): error is { statusCode?: number } {
  return typeof error === 'object' && error !== null && 'statusCode' in error
}

// Create notification and send push
export async function sendNotification(data: NotificationData) {
  try {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        url: data.url,
        type: data.type,
      },
    })

    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: data.userId },
    })

    // Send push notifications
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: data.title,
            body: data.body,
            url: data.url || '/dashboard',
            notificationId: notification.id,
          })
        )
      } catch (error) {
        // If subscription is invalid, remove it
        if (
          isPushError(error) &&
          (error.statusCode === 410 || error.statusCode === 404)
        ) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          })
        }
        console.error('Push notification error:', error)
      }
    })

    await Promise.allSettled(pushPromises)

    return notification
  } catch (error) {
    console.error('Send notification error:', error)
    throw error
  }
}

// Notification templates
export const NotificationTemplates = {
  applicationApproved: (appName: string) => ({
    title: 'The developer accepted you! 🎉',
    body: `You can test "${appName}". Open this page, tap Open in Play Store, then tap Send screenshot.`,
    type: 'application_approved',
  }),

  applicationRejected: (appName: string) => ({
    title: 'Your application was closed',
    body: `The developer did not accept your application for "${appName}". Open Browse Jobs to find another job.`,
    type: 'application_rejected',
  }),

  verificationApproved: (appName: string) => ({
    title: 'Your screenshot was accepted ✅',
    body: `The developer accepted your screenshot for "${appName}". Wait for the start date. You will get a message.`,
    type: 'verification_approved',
  }),

  testingComplete: (appName: string, amountCents: number) => ({
    title: 'Testing is finished 💰',
    body: `You finished testing "${appName}". ${formatEurFromCents(amountCents)} will be sent to your account. Open Payments to see it.`,
    type: 'testing_complete',
  }),

  paymentReceived: (amountCents: number) => ({
    title: 'Payment Received! 🎊',
    body: `You've received a payment of ${formatEurFromCents(amountCents)} for completed testing.`,
    type: 'payment_received',
  }),

  newApplication: (testerName: string, appName: string) => ({
    title: 'New Application',
    body: `${testerName} applied to test "${appName}". Open the job, then click Accept tester or Close tester.`,
    type: 'new_application',
  }),

  newVerification: (testerName: string, appName: string) => ({
    title: 'A tester sent a screenshot',
    body: `${testerName} sent a Play Store screenshot for "${appName}". Open the job, check the screenshot, then click Accept tester.`,
    type: 'new_verification',
  }),

  newFeedback: (testerName: string, appName: string) => ({
    title: 'New Feedback Received',
    body: `${testerName} left feedback for "${appName}".`,
    type: 'new_feedback',
  }),
}



