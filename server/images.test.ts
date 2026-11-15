import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// images.ts reads DB_PATH on import, so the path has to be set first.
const dir = mkdtempSync(join(tmpdir(), 'varietal-images-'))
process.env.DB_PATH = join(dir, 'cellar.db')
let images: typeof import('./images.ts')

beforeAll(async () => {
  images = await import('./images.ts')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

function stubFetch(body: Uint8Array<ArrayBuffer> | string, headers: Record<string, string> = { 'content-type': 'image/png' }) {
  const fetch = vi.fn(async () => new Response(body, { headers }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('image ids', () => {
  it('names a URL by a stable hash', () => {
    const id = images.imageId('https://images.vivino.com/a.png')
    expect(id).toBe(images.imageId('https://images.vivino.com/a.png'))
    expect(id).not.toBe(images.imageId('https://images.vivino.com/b.png'))
    expect(images.isImageId(id)).toBe(true)
  })

  it.each(['', '../cellar.db', 'a'.repeat(63), 'A'.repeat(64), `${'a'.repeat(64)}.tmp`, `${'a'.repeat(64)}/`])(
    'rejects %j',
    (id) => {
      expect(images.isImageId(id)).toBe(false)
      expect(images.readImage(id)).toBeNull()
    },
  )
})

describe('imageType', () => {
  it('recognizes PNG, JPEG, WebP and GIF', () => {
    expect(images.imageType(PNG)).toBe('image/png')
    expect(images.imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(images.imageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
    expect(images.imageType(new TextEncoder().encode('GIF89a'))).toBe('image/gif')
  })

  it('rejects anything else', () => {
    expect(images.imageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(images.imageType(new Uint8Array())).toBeNull()
  })
})

describe('saveImage', () => {
  it('stores an image once and serves it', async () => {
    const url = 'https://images.vivino.com/stored.png'
    const fetch = stubFetch(PNG)
    expect(images.localImageUrl(url)).toBeNull()
    await images.saveImage(url)
    await images.saveImage(url)
    expect(fetch).toHaveBeenCalledTimes(1)
    const id = images.imageId(url)
    expect(images.localImageUrl(url)).toBe(`/api/images/${id}`)
    const image = images.readImage(id)
    expect(image?.type).toBe('image/png')
    expect(new Uint8Array(image!.bytes)).toEqual(PNG)
    expect(readdirSync(join(dir, 'images'))).toEqual([id])
  })

  it('only downloads https URLs', async () => {
    const fetch = stubFetch(PNG)
    await expect(images.saveImage('http://images.vivino.com/a.png')).rejects.toThrow('https')
    await expect(images.saveImage('file:///etc/passwd')).rejects.toThrow('https')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a response that is not an image', async () => {
    stubFetch('<html></html>', { 'content-type': 'text/html' })
    await expect(images.saveImage('https://example.com/page')).rejects.toThrow('Not an image')
    stubFetch('<svg/>', { 'content-type': 'image/svg+xml' })
    await expect(images.saveImage('https://example.com/a.svg')).rejects.toThrow('PNG, JPEG')
  })

  it('rejects an image over 5 MB', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(PNG)
    stubFetch(big)
    await expect(images.saveImage('https://example.com/big.png')).rejects.toThrow('too large')
    expect(images.localImageUrl('https://example.com/big.png')).toBeNull()
  })

  it('logs a failure instead of throwing when saving in the background', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(images.saveImages(['https://example.com/missing.png', null])).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
