import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, ImageDownIcon } from 'lucide-react'
import { saveCover } from '@/api/client'
import type { Book } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { useAdminAction } from '@/catalog/useAdminAction'
import { Button } from '@/components/ui/button'

/**
 * Downscale an image file to a JPEG and return its base64 (without the data-URL
 * prefix). Keeps uploads small — phone photos are multi-MB — while staying sharp
 * at cover sizes.
 */
async function fileToDownscaledBase64(
  file: File,
  maxEdge = 900,
): Promise<{ image: string; contentType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode the image'))
    image.src = dataUrl
  })
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { image: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], contentType: 'image/jpeg' }
}

/**
 * Admin-only controls to persist a book's cover to the library's own host: snapshot
 * the cover the app is currently showing, or upload a photo of the physical book
 * (on a phone the file picker opens the camera). Both write the stored URL back
 * into `Cover URL`. Rendered only for signed-in admins; the backend re-verifies.
 */
export function CoverAdminActions({
  book,
  displayedCoverUrl,
}: {
  book: Book
  displayedCoverUrl: string | null
}) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { run, busy, error } = useAdminAction()
  const fileRef = useRef<HTMLInputElement>(null)
  if (!isAdmin) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={busy || !displayedCoverUrl}
          onClick={() => displayedCoverUrl && run(() => saveCover(book.id, { url: displayedCoverUrl }))}
        >
          <ImageDownIcon className="size-3.5" /> {t('admin.saveCover')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <CameraIcon className="size-3.5" /> {t('admin.uploadCover')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // allow re-picking the same file
            if (file) void run(async () => saveCover(book.id, await fileToDownscaledBase64(file)))
          }}
        />
      </div>
      {busy && <p className="text-muted-foreground text-xs">{t('admin.savingCover')}</p>}
      {error && <p className="text-destructive max-w-56 text-right text-xs">{error}</p>}
    </div>
  )
}
