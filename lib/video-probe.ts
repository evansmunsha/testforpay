import { createWriteStream } from 'node:fs'
import { mkdtemp, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { get } from '@vercel/blob'
import { path as ffprobePath } from 'ffprobe-static'

const execFileAsync = promisify(execFile)

/** Downloads a private Blob to a temporary file and reads its duration using ffprobe. */
export async function getVideoDurationSeconds(pathname: string): Promise<number> {
  if (!ffprobePath) throw new Error('FFprobe binary is unavailable')

  const blob = await get(pathname, { access: 'private' })
  if (!blob || blob.statusCode !== 200) throw new Error('Uploaded video could not be read')

  const directory = await mkdtemp(join(tmpdir(), 'testforpay-video-'))
  const filePath = join(directory, 'upload')
  try {
    const stream = Readable.from((async function* () {
      const reader = blob.stream.getReader()
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) return
          yield Buffer.from(chunk.value)
        }
      } finally {
        reader.releaseLock()
      }
    })())
    await pipeline(stream, createWriteStream(filePath, { flags: 'wx' }))

    const { stdout } = await execFileAsync(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath],
      { timeout: 20_000, maxBuffer: 1024 * 1024, windowsHide: true },
    )
    const metadata = JSON.parse(stdout) as { format?: { duration?: string } }
    const duration = Number(metadata.format?.duration)
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Could not read video duration')
    }
    return duration
  } finally {
    try {
      await unlink(filePath)
    } finally {
      await rmdir(directory)
    }
  }
}
