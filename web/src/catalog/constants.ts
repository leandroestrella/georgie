/**
 * The literal sentinel stored in the `ISBN / EAN` column meaning "this printing
 * genuinely has no ISBN". Every ISBN-consuming path (validation, metadata
 * lookup, cover fallback) must treat it as absent rather than malformed.
 * Defined once, next to the data model.
 */
export { NO_ISBN } from '../../../server/src/schema'
