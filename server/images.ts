import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Label images are downloaded once and served from here, so browsing the cellar
 * doesn't contact the image's original host. Files live in an `images` folder next
 * to the database, named by a hash of the image's URL.
 */

const dbPath = process.env.DB_PATH ?? 'data/cellar.db'
const dir = dbPath === ':memory:' ? null : join(dirname(dbPath), 'images')

const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 15_000

export function imageId(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

export function isImageId(id: string): boolean {
  return /^[0-9a-f]{64}$/.test(id)
}

/** The content type of a PNG, JPEG, WebP or GIF file, read from its first bytes. */
export function imageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(0, 4) === 'GIF8') return 'image/gif'
  return null
}

/** The path the app loads a wine's label from once it is stored here, or null if it isn't yet. */
export function localImageUrl(url: string | null): string | null {
  if (!dir || !url) return null
  const id = imageId(url)
  return existsSync(join(dir, id)) ? `/api/images/${id}` : null
}

/** A stored image and its content type, or null for an unknown id. */
export function readImage(id: string): { bytes: Buffer; type: string } | null {
  if (!dir || !isImageId(id) || !existsSync(join(dir, id))) return null
  const bytes = readFileSync(join(dir, id))
  const type = imageType(bytes)
  return type ? { bytes, type } : null
}

async function download(url: string): Promise<Uint8Array> {
  if (!url.startsWith('https://')) throw new Error('Only https images are downloaded')
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok || !response.body) throw new Error(`Image download failed (${response.status})`)
  if (response.url && !response.url.startsWith('https://')) throw new Error('Image redirected away from https')
  if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Not an image')
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Image too large')

  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > MAX_BYTES) throw new Error('Image too large')
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  if (!imageType(bytes)) throw new Error('Not a PNG, JPEG, WebP or GIF image')
  return bytes
}

const pending = new Map<string, Promise<void>>()

/** Download an image unless it is already stored. Throws if the download fails. */
export function saveImage(url: string): Promise<void> {
  if (!dir) return Promise.resolve()
  const target = dir
  const id = imageId(url)
  if (existsSync(join(target, id))) return Promise.resolve()
  let job = pending.get(id)
  if (!job) {
    job = download(url)
      .then((bytes) => {
        mkdirSync(target, { recursive: true })
        // Write then rename, so a half-written file is never served.
        writeFileSync(join(target, `${id}.tmp`), bytes)
        renameSync(join(target, `${id}.tmp`), join(target, id))
      })
      .finally(() => pending.delete(id))
    pending.set(id, job)
  }
  return job
}

/**
 * Store the given images one at a time in the background. A failure is logged and
 * the wine keeps using the remote URL until a later save or restart retries it.
 */
export async function saveImages(urls: (string | null)[]): Promise<void> {
  for (const url of new Set(urls)) {
    if (!url) continue
    try {
      await saveImage(url)
    } catch (error) {
      console.warn(`Could not store label image ${url}: ${(error as Error).message}`)
    }
  }
}
