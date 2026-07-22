/**
 * A "marker" is the per-owner / per-zone visual cue read from the spreadsheet
 * (the `Owner marker` and `Marker` columns). Its value is auto-detected: an
 * http(s) URL is rendered as an image, anything else as emoji/text.
 */

/** True when a marker value should be rendered as an image rather than emoji/text. */
export function isImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}
