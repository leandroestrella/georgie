/**
 * The literal sentinel stored in the `ISBN / EAN` column meaning "this printing
 * genuinely has no ISBN". Every ISBN-consuming path (validation, metadata
 * lookup, cover fallback) must treat it as absent rather than malformed.
 * Mirrors `NO_ISBN` in `apps-script/catalog.js`.
 */
export const NO_ISBN = 'N/A'
