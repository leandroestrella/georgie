/**
 * Barcode scanning: camera → EAN-13 → ISBN.
 *
 * The barcode printed on a book's back cover is a "Bookland" EAN-13, which *is*
 * the ISBN-13 (prefix 978/979). So a scan feeds straight into the ISBN lookup.
 *
 * Two decoders, chosen at runtime:
 *  - `BarcodeDetector`, native in Chrome/Android — nothing to download.
 *  - zxing-wasm, dynamically imported ONLY when the native API is missing
 *    (i.e. Safari/iOS), so it never touches the main bundle.
 */
// Emitted as our own asset (a URL string here, not the binary) so the WASM is
// served from this origin rather than jsDelivr — see createFrameDecoder.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { isValidIsbn10, isValidIsbn13 } from '@/catalog/validation'

/**
 * Extracts an ISBN from a scanned barcode value, or null if it isn't a book.
 *
 * Guards against scanning any old product: a valid EAN-13 off a cereal box has a
 * correct checksum but isn't Bookland, and must be rejected rather than written
 * into the catalog as an ISBN.
 */
export function isbnFromBarcode(raw: string): string | null {
  const value = (raw ?? '').trim()

  // Bookland EAN-13 (the back-cover barcode) — 978/979 prefixed.
  const digits = value.replace(/\D/g, '')
  if (/^97[89]\d{10}$/.test(digits) && isValidIsbn13(digits)) return digits

  // Some older books carry a bare ISBN-10.
  const ten = value.toUpperCase().replace(/[^0-9X]/g, '')
  if (/^\d{9}[\dX]$/.test(ten) && isValidIsbn10(ten)) return ten

  return null
}

/** True when the browser can offer a camera at all (needs a secure origin). */
export function cameraAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/**
 * True when the page is on a secure origin. `getUserMedia` is refused otherwise —
 * the usual trap is testing from a phone against `http://<lan-ip>:5173`.
 */
export function secureOriginForCamera(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

/** Decodes one video frame; returns the raw barcode value or null. */
export type FrameDecoder = (video: HTMLVideoElement) => Promise<string | null>

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type NativeBarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats?: () => Promise<string[]>
}

/** Grabs the current video frame as ImageData for the WASM decoder. */
function frameToImageData(video: HTMLVideoElement): ImageData | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

/**
 * Builds the best available frame decoder. Prefers the native BarcodeDetector;
 * otherwise lazily pulls in zxing-wasm.
 */
export async function createFrameDecoder(): Promise<FrameDecoder> {
  const Native = (globalThis as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor })
    .BarcodeDetector

  if (Native) {
    const formats = (await Native.getSupportedFormats?.()) ?? ['ean_13']
    if (formats.includes('ean_13')) {
      const detector = new Native({ formats: ['ean_13'] })
      return async (video) => {
        const codes = await detector.detect(video)
        return codes[0]?.rawValue ?? null
      }
    }
  }

  // Safari/iOS: no native detector — load the WASM reader on demand.
  const { readBarcodes, setZXingModuleOverrides } = await import('zxing-wasm/reader')
  // By default zxing-wasm fetches its ~1MB binary from jsDelivr at scan time.
  // Serve it from our own origin instead: no third-party dependency at the shelf.
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasmUrl : prefix + path,
  })
  return async (video) => {
    const image = frameToImageData(video)
    if (!image) return null
    const results = await readBarcodes(image, { formats: ['EAN13'], tryHarder: true })
    const hit = results.find((r) => r.isValid && r.text)
    return hit?.text ?? null
  }
}
