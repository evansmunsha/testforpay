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
    title: 'Application Approved! 🎉',
    body: `Your application to test "${appName}" has been approved. Start testing now!`,
    type: 'application_approved',
  }),

  applicationRejected: (appName: string) => ({
    title: 'Application Update',
    body: `Your application to test "${appName}" was not approved this time.`,
    type: 'application_rejected',
  }),

  verificationApproved: (appName: string) => ({
    title: 'Verification Approved! ✅',
    body: `Your screenshot for "${appName}" has been verified. Testing period has started!`,
    type: 'verification_approved',
  }),

  testingComplete: (appName: string, amountCents: number) => ({
    title: 'Testing Complete! 💰',
    body: `You've completed testing "${appName}". ${formatEurFromCents(amountCents)} will be sent to your account.`,
    type: 'testing_complete',
  }),

  paymentReceived: (amountCents: number) => ({
    title: 'Payment Received! 🎊',
    body: `You've received a payment of ${formatEurFromCents(amountCents)} for completed testing.`,
    type: 'payment_received',
  }),

  newApplication: (testerName: string, appName: string) => ({
    title: 'New Application',
    body: `${testerName} applied to test "${appName}". Review their application.`,
    type: 'new_application',
  }),

  newVerification: (testerName: string, appName: string) => ({
    title: 'Verification Submitted',
    body: `${testerName} submitted verification for "${appName}". Review it now.`,
    type: 'new_verification',
  }),

  newFeedback: (testerName: string, appName: string) => ({
    title: 'New Feedback Received',
    body: `${testerName} left feedback for "${appName}".`,
    type: 'new_feedback',
  }),
}



