import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createFrameDecoder, isbnFromBarcode, secureOriginForCamera } from './scanner'

/** How often to sample a frame. ~7/s is plenty and keeps phones cool. */
const SCAN_INTERVAL_MS = 140

/**
 * Camera barcode scanner: reads the EAN-13 off a book's back cover and returns
 * its ISBN. Built for standing at the shelf with a phone.
 *
 * iOS specifics that are easy to get wrong and are handled here:
 *  - `playsInline` (else Safari hijacks the video fullscreen),
 *  - `facingMode: environment` to get the rear camera,
 *  - camera access requires a SECURE origin — testing from a phone against a
 *    plain-http dev server silently fails, so we say so explicitly.
 */
export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (isbn: string) => void
}) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const start = async () => {
      setError(null)
      if (!secureOriginForCamera()) {
        setError(t('scan.insecure'))
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setReady(true)

        const decode = await createFrameDecoder()
        if (cancelled) return

        let busy = false
        timerRef.current = window.setInterval(async () => {
          if (busy || !videoRef.current) return
          busy = true
          try {
            const raw = await decode(videoRef.current)
            const isbn = raw ? isbnFromBarcode(raw) : null
            if (isbn) {
              onDetected(isbn)
              onOpenChange(false)
            }
          } catch {
            // A frame that fails to decode is normal — keep scanning.
          } finally {
            busy = false
          }
        }, SCAN_INTERVAL_MS)
      } catch (err) {
        const name = (err as DOMException)?.name
        setError(name === 'NotAllowedError' ? t('scan.denied') : t('scan.cameraError'))
      }
    }

    void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [open, onDetected, onOpenChange, stop, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stop()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('scan.title')}</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="bg-muted relative overflow-hidden rounded-lg">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
              />
              {/* Aiming guide */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="border-primary/80 h-1/4 w-4/5 rounded-md border-2" />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {ready ? t('scan.hint') : t('scan.starting')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
