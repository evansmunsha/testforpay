const sendNotification = jest.fn()
const create = jest.fn()

jest.mock('@/lib/notifications', () => ({ sendNotification: (...args: unknown[]) => sendNotification(...args) }))
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { communityPost: { create: (...args: unknown[]) => create(...args) } },
}))

import { createJobPost, notifyUsers, communityPostPath } from '@/lib/community'

beforeEach(() => {
  sendNotification.mockReset()
  create.mockReset()
})

describe('createJobPost', () => {
  const job = { id: 'job1', developerId: 'dev1', appName: 'Tangram', testersNeeded: 12 }

  it('creates a JOB post tied to the job', async () => {
    create.mockResolvedValue({ id: 'p1' })
    await expect(createJobPost(job)).resolves.toEqual({ id: 'p1' })
    expect(create.mock.calls[0][0].data).toMatchObject({ kind: 'JOB', jobId: 'job1', authorId: 'dev1' })
  })

  it('returns null when the job already has a post (webhook retry)', async () => {
    create.mockRejectedValue({ code: 'P2002' })
    await expect(createJobPost(job)).resolves.toBeNull()
  })

  it('rethrows other errors', async () => {
    create.mockRejectedValue(new Error('db down'))
    await expect(createJobPost(job)).rejects.toThrow('db down')
  })
})

describe('notifyUsers', () => {
  it('notifies everyone even when some sends fail', async () => {
    sendNotification.mockImplementation(async ({ userId }: { userId: string }) => {
      if (userId === 'u2') throw new Error('push failed')
    })
    const ids = Array.from({ length: 25 }, (_, i) => `u${i}`)
    await notifyUsers(ids, { title: 't', body: 'b', url: communityPostPath('p1'), type: 'x' })
    expect(sendNotification).toHaveBeenCalledTimes(25)
  })
})
