import { describe, expect, it } from 'vitest'
import { decodeJwt, tokenUnusable } from './token'

/** Builds an unsigned JWT-shaped string around the given payload. */
function jwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj))
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`
}

describe('decodeJwt', () => {
  it('decodes a base64url payload, including non-ASCII names', () => {
    const claims = decodeJwt(jwt({ email: 'a@b.c', name: 'Leandro Estrellà' }))
    expect(claims).toEqual({ email: 'a@b.c', name: 'Leandro Estrellà' })
  })
})

describe('tokenUnusable', () => {
  const now = 1_700_000_000_000
  const expIn = (ms: number) => jwt({ exp: Math.floor((now + ms) / 1000) })

  it('accepts a token with plenty of life left', () => {
    expect(tokenUnusable(expIn(30 * 60_000), now)).toBe(false)
  })

  it('rejects a token that expires within the next minute', () => {
    expect(tokenUnusable(expIn(30_000), now)).toBe(true)
  })

  it('rejects an already-expired token', () => {
    expect(tokenUnusable(expIn(-60_000), now)).toBe(true)
  })

  it('rejects a token without an exp claim, or garbage', () => {
    expect(tokenUnusable(jwt({ email: 'a@b.c' }), now)).toBe(true)
    expect(tokenUnusable('not-a-jwt', now)).toBe(true)
  })
})
