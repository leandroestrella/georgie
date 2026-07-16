/**
 * Per-owner logos shown on catalog cards to identify whose shelf a book is on.
 * External image URLs (no assets stored). Add an entry when a new owner appears
 * in the `Lists` tab; owners without a logo fall back to their initial.
 */
export const OWNER_LOGOS: Record<string, string> = {
  leandro: 'https://www.leandroestrella.com/img/favicon.ico',
  maria: 'https://cinquecento79lab.com/wp-content/uploads/2023/09/cropped-favicon-150x150.png',
  hugo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Anarchist_black_cat.svg/250px-Anarchist_black_cat.svg.png',
}

/** The logo URL for an owner (case-insensitive), or undefined if none is set. */
export function ownerLogo(owner: string): string | undefined {
  return OWNER_LOGOS[owner.trim().toLowerCase()]
}
