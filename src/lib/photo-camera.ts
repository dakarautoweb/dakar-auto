// In-app camera for taking a single still photo (part recognition modal).
// Framework-free so the stream lifecycle can be unit-tested with a mocked
// navigator.mediaDevices — the React side only renders what this returns.
//
// getUserMedia needs a secure context: it works on the HTTPS site and on
// http://localhost, but browsers hide navigator.mediaDevices entirely on
// plain-HTTP hosts (e.g. a LAN IP during development).

export type CameraFacing = 'environment' | 'user'

export type CameraErrorKind = 'insecure' | 'unsupported' | 'permission_denied' | 'not_found' | 'in_use' | 'unavailable'

export type CameraEnv = {
  isSecureContext: boolean
  mediaDevices: Pick<MediaDevices, 'getUserMedia'> & Partial<Pick<MediaDevices, 'enumerateDevices'>> | undefined
}

export type CameraStartResult =
  | { ok: true; stream: MediaStream; canSwitch: boolean }
  | { ok: false; error: CameraErrorKind }
  // Superseded by stop()/another start() while getUserMedia was pending;
  // the late stream has already been released.
  | { ok: false; error: 'cancelled' }

// Longest side of the captured photo. Phone cameras can deliver 4K frames;
// this keeps the JPEG comfortably under the upload limit while leaving far
// more detail than recognition needs.
export const MAX_CAPTURE_SIDE = 2560
export const CAPTURE_TYPE = 'image/jpeg'
export const CAPTURE_QUALITY = 0.9

export function cameraConstraints(facing: CameraFacing): MediaStreamConstraints {
  return { video: { facingMode: { ideal: facing } }, audio: false }
}

export function browserCameraEnv(): CameraEnv {
  return {
    isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
    mediaDevices: typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined,
  }
}

export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission_denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not_found'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in_use'
    default:
      return 'unavailable'
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}

// Owns at most one live stream. Every start()/stop() bumps `generation`, so
// a getUserMedia call that resolves after the user cancelled (or the modal
// closed) is recognised as stale and its tracks are stopped immediately —
// the camera can never be left running in the background.
export class PhotoCameraSession {
  private stream: MediaStream | null = null
  private generation = 0

  constructor(private readonly env: CameraEnv) {}

  get active() {
    return this.stream !== null
  }

  async start(facing: CameraFacing = 'environment'): Promise<CameraStartResult> {
    this.releaseTracks()
    const generation = ++this.generation

    if (!this.env.isSecureContext) return { ok: false, error: 'insecure' }
    const devices = this.env.mediaDevices
    if (!devices?.getUserMedia) return { ok: false, error: 'unsupported' }

    let stream: MediaStream
    try {
      stream = await devices.getUserMedia(cameraConstraints(facing))
    } catch (err) {
      const kind = classifyCameraError(err)
      // Short, safe type only — never the raw message.
      console.warn('[photo-camera] getUserMedia failed:', kind)
      return generation === this.generation ? { ok: false, error: kind } : { ok: false, error: 'cancelled' }
    }
    if (generation !== this.generation) {
      stopStream(stream)
      return { ok: false, error: 'cancelled' }
    }
    this.stream = stream

    // Device list is only meaningful once permission is granted.
    let cameras = 1
    try {
      const list = (await devices.enumerateDevices?.()) ?? []
      cameras = list.filter((d) => d.kind === 'videoinput').length
    } catch {
      // Switching is optional; treat as a single camera.
    }
    if (generation !== this.generation) return { ok: false, error: 'cancelled' }
    return { ok: true, stream, canSwitch: cameras > 1 }
  }

  stop() {
    this.generation++
    this.releaseTracks()
  }

  // Grabs the current frame as a JPEG File and stops the camera. Resolves
  // to null if there is no frame yet or encoding fails.
  async capture(
    video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'> & CanvasImageSource,
    createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
  ): Promise<File | null> {
    if (!this.stream || !video.videoWidth || !video.videoHeight) return null

    const ratio = Math.min(1, MAX_CAPTURE_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = createCanvas()
    canvas.width = Math.round(video.videoWidth * ratio)
    canvas.height = Math.round(video.videoHeight * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // The frame is on the canvas — release the camera before encoding.
    this.stop()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, CAPTURE_TYPE, CAPTURE_QUALITY))
    if (!blob) return null
    return new File([blob], `photo-${Date.now()}.jpg`, { type: CAPTURE_TYPE })
  }

  private releaseTracks() {
    stopStream(this.stream)
    this.stream = null
  }
}
