import { describe, expect, it, vi } from 'vitest'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import { MAX_CAPTURE_SIDE, PhotoCameraSession, classifyCameraError, type CameraEnv } from '../photo-camera'

function fakeStream(tracks = 1) {
  const stops = Array.from({ length: tracks }, () => vi.fn())
  const stream = { getTracks: () => stops.map((stop) => ({ stop })) } as unknown as MediaStream
  return { stream, stops, allStopped: () => stops.every((s) => s.mock.calls.length === 1) }
}

function env(getUserMedia: () => Promise<MediaStream>, videoInputs = 1, secure = true): CameraEnv {
  return {
    isSecureContext: secure,
    mediaDevices: {
      getUserMedia: vi.fn(getUserMedia),
      enumerateDevices: vi.fn(async () => Array.from({ length: videoInputs }, () => ({ kind: 'videoinput' }) as MediaDeviceInfo)),
    },
  }
}

function domError(name: string) {
  return Object.assign(new Error('raw browser message'), { name })
}

function fakeCanvas(blob: Blob | null = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })) {
  const drawImage = vi.fn()
  const toBlob = vi.fn((cb: BlobCallback) => cb(blob))
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob } as unknown as HTMLCanvasElement
  return { canvas, drawImage, toBlob }
}

const video = { videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement

describe('PhotoCameraSession.start', () => {
  it('opens the rear camera without audio and reports the stream', async () => {
    const { stream } = fakeStream()
    const e = env(async () => stream)
    const result = await new PhotoCameraSession(e).start()
    expect(result).toEqual({ ok: true, stream, canSwitch: false })
    expect(e.mediaDevices!.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  })

  it('offers switching only with several video inputs', async () => {
    const result = await new PhotoCameraSession(env(async () => fakeStream().stream, 2)).start()
    expect(result).toMatchObject({ ok: true, canSwitch: true })
  })

  it('maps permission denial to a friendly kind', async () => {
    const result = await new PhotoCameraSession(env(async () => Promise.reject(domError('NotAllowedError')))).start()
    expect(result).toEqual({ ok: false, error: 'permission_denied' })
  })

  it('reports unsupported getUserMedia', async () => {
    const session = new PhotoCameraSession({ isSecureContext: true, mediaDevices: undefined })
    expect(await session.start()).toEqual({ ok: false, error: 'unsupported' })
  })

  it('reports an insecure context before touching the camera', async () => {
    const e = env(async () => fakeStream().stream, 1, false)
    expect(await new PhotoCameraSession(e).start()).toEqual({ ok: false, error: 'insecure' })
    expect(e.mediaDevices!.getUserMedia).not.toHaveBeenCalled()
  })

  it('stops a stream that arrives after the session was stopped', async () => {
    const late = fakeStream()
    let resolve!: (s: MediaStream) => void
    const session = new PhotoCameraSession(env(() => new Promise((r) => (resolve = r))))
    const pending = session.start()
    session.stop() // modal closed while the permission prompt was open
    resolve(late.stream)
    expect(await pending).toEqual({ ok: false, error: 'cancelled' })
    expect(late.allStopped()).toBe(true)
    expect(session.active).toBe(false)
  })

  it('stops the previous stream when restarting (camera switch)', async () => {
    const first = fakeStream()
    const second = fakeStream()
    const streams = [first.stream, second.stream]
    const session = new PhotoCameraSession(env(async () => streams.shift()!, 2))
    await session.start('environment')
    await session.start('user')
    expect(first.allStopped()).toBe(true)
    expect(second.stops[0]).not.toHaveBeenCalled()
  })
})

describe('classifyCameraError', () => {
  it.each([
    ['NotAllowedError', 'permission_denied'],
    ['SecurityError', 'permission_denied'],
    ['NotFoundError', 'not_found'],
    ['OverconstrainedError', 'not_found'],
    ['NotReadableError', 'in_use'],
    ['TypeError', 'unavailable'],
  ])('%s → %s', (name, kind) => {
    expect(classifyCameraError(domError(name))).toBe(kind)
  })

  it('handles non-error values', () => {
    expect(classifyCameraError('boom')).toBe('unavailable')
  })
})

describe('PhotoCameraSession cleanup', () => {
  it('stops every track on cancel', async () => {
    const s = fakeStream(2)
    const session = new PhotoCameraSession(env(async () => s.stream))
    await session.start()
    session.stop()
    expect(s.allStopped()).toBe(true)
    expect(session.active).toBe(false)
  })

  it('stop() is idempotent (cancel followed by unmount)', async () => {
    const s = fakeStream()
    const session = new PhotoCameraSession(env(async () => s.stream))
    await session.start()
    session.stop()
    session.stop()
    expect(s.stops[0]).toHaveBeenCalledTimes(1)
  })
})

describe('PhotoCameraSession.capture', () => {
  it('returns an image/jpeg File that passes the upload type/size rules', async () => {
    const s = fakeStream()
    const session = new PhotoCameraSession(env(async () => s.stream))
    await session.start()
    const { canvas, drawImage, toBlob } = fakeCanvas()
    const file = await session.capture(video, () => canvas)

    expect(file).toBeInstanceOf(File)
    expect(file!.type).toBe('image/jpeg')
    expect(file!.name).toMatch(/\.jpg$/)
    expect(ALLOWED_MIME_TYPES).toContain(file!.type)
    expect(file!.size).toBeLessThanOrEqual(MAX_FILE_SIZE_BYTES)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
  })

  it('stops the camera tracks after capturing', async () => {
    const s = fakeStream(2)
    const session = new PhotoCameraSession(env(async () => s.stream))
    await session.start()
    await session.capture(video, () => fakeCanvas().canvas)
    expect(s.allStopped()).toBe(true)
    expect(session.active).toBe(false)
  })

  it('downscales very large frames', async () => {
    const session = new PhotoCameraSession(env(async () => fakeStream().stream))
    await session.start()
    const { canvas } = fakeCanvas()
    await session.capture({ videoWidth: 4000, videoHeight: 3000 } as HTMLVideoElement, () => canvas)
    expect(canvas.width).toBe(MAX_CAPTURE_SIDE)
    expect(canvas.height).toBe(1920)
  })

  it('returns null without a live stream or a frame', async () => {
    const session = new PhotoCameraSession(env(async () => fakeStream().stream))
    expect(await session.capture(video, () => fakeCanvas().canvas)).toBeNull()
    await session.start()
    expect(await session.capture({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, () => fakeCanvas().canvas)).toBeNull()
  })

  it('returns null when encoding fails', async () => {
    const session = new PhotoCameraSession(env(async () => fakeStream().stream))
    await session.start()
    expect(await session.capture(video, () => fakeCanvas(null).canvas)).toBeNull()
  })
})
