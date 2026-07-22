/**
 * Built-in **fallback** owner logos, used only when the sheet doesn't supply an
 * `Owner marker` for that owner (see docs/markers.md). Prefer the sheet column;
 * this map exists so the app still shows a logo before the column is filled and
 * for anyone cloning the repo without one. External image URLs (no assets stored).
 * Owners with neither a marker nor an entry here fall back to their initial.
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
