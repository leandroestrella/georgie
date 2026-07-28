import { createContext, useContext } from 'react'

/**
 * A slot inside the sticky header that pages can fill (via a portal) so their
 * own toolbar — e.g. the catalog's filter bar — anchors together with the brand
 * row as a single sticky header. Holds the slot's DOM node, or null before mount.
 */
export const SubHeaderContext = createContext<HTMLElement | null>(null)

/** The sticky-header slot element to portal page toolbar content into. */
export function useSubHeaderContainer(): HTMLElement | null {
  return useContext(SubHeaderContext)
}

/**
 * A slot in the header's brand row, next to the sign-in control, that a page
 * can fill with its primary write-gated action (e.g. "add book") so that
 * action always sits beside sign-in, on whichever page renders it, without
 * each page reinventing header placement.
 */
export const AdminSlotContext = createContext<HTMLElement | null>(null)

/** The header's admin-action slot element to portal a write CTA into. */
export function useAdminSlotContainer(): HTMLElement | null {
  return useContext(AdminSlotContext)
}
