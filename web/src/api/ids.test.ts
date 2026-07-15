import { describe, expect, it } from 'vitest'
import { makeId, threeOf, uniqueId } from './ids'

describe('threeOf', () => {
  it('takes three letters, uppercased, accents stripped', () => {
    expect(threeOf('Greer')).toBe('GRE')
    expect(threeOf('Saint-Exupéry')).toBe('SAI')
  })
  it('skips leading articles and keeps digits', () => {
    expect(threeOf('The Master')).toBe('MAS')
    expect(threeOf('1984')).toBe('198')
  })
  it('pads short tokens with X', () => {
    expect(threeOf('VV.')).toBe('VVX')
    expect(threeOf('')).toBe('XXX')
  })
})

describe('makeId', () => {
  it('matches real catalog examples', () => {
    expect(makeId('1984', 'George Orwell', 1950)).toBe('ORW-198-1950')
    expect(makeId('Less', 'Andrew Sean Greer', 2018)).toBe('GRE-LES-2018')
    expect(makeId('III Warsaw Media Art', 'AA. VV.', 2010)).toBe('VVX-III-2010')
  })
  it('uses 0000 for an unknown year', () => {
    expect(makeId('OSM Kids', 'Paolo A. Ruggeri', '')).toBe('RUG-OSM-0000')
    expect(makeId('OSM Kids', 'Paolo A. Ruggeri', null)).toBe('RUG-OSM-0000')
  })
})

describe('uniqueId', () => {
  it('appends collision suffixes against used IDs', () => {
    const used = new Set(['ORW-198-1950', 'ORW-198-1950-2'])
    expect(uniqueId('1984', 'George Orwell', 1950, used)).toBe('ORW-198-1950-3')
  })
  it('returns the base ID when there is no collision', () => {
    expect(uniqueId('Fresh', 'New Author', 2020, new Set())).toBe('AUT-FRE-2020')
  })
})
