/**
 * The call-number ID rule, on its own: the one place it is written. The backend
 * mints with it, a sync uses it for a row typed in the sheet without an ID, and
 * the SPA imports it for the Add book form's preview.
 */
import { describe, expect, it } from 'vitest'
import { makeId } from './schema.js'

describe('makeId', () => {
  it('matches real catalog examples', () => {
    expect(makeId('1984', 'George Orwell', 1950)).toBe('ORW-198-1950')
    expect(makeId('Less', 'Andrew Sean Greer', 2018)).toBe('GRE-LES-2018')
    expect(makeId('III Warsaw Media Art', 'AA. VV.', 2010)).toBe('VVX-III-2010')
  })

  it('takes the first author\'s surname, and skips a leading article in the title', () => {
    expect(makeId('The Left Hand of Darkness', 'Ursula K. Le Guin', 1969)).toBe('GUI-LEF-1969')
    expect(makeId('Il nome della rosa', 'Umberto Eco & Altri', 1980)).toBe('ECO-NOM-1980')
    expect(makeId('Le Petit Prince', 'Antoine de Saint-Exupéry; Someone Else', 1943)).toBe('SAI-PET-1943')
  })

  it('pads short tokens with X', () => {
    expect(makeId('A', '', 2020)).toBe('XXX-XXX-2020')
    expect(makeId('Go', 'Li', 2020)).toBe('LIX-GOX-2020')
  })

  it('uses 0000 for a year that is unknown or not four digits', () => {
    expect(makeId('OSM Kids', 'Paolo A. Ruggeri', '')).toBe('RUG-OSM-0000')
    expect(makeId('OSM Kids', 'Paolo A. Ruggeri', null)).toBe('RUG-OSM-0000')
    expect(makeId('Beowulf', 'Anonymous', 868)).toBe('ANO-BEO-0000')
  })
})
