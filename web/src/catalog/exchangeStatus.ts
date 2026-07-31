import type { ExchangeStatus } from '@/api/types'

/** i18n key suffix for each non-empty exchange stage (`exchange.status.<key>`). */
export const EXCHANGE_STATUS_KEY: Record<Exclude<ExchangeStatus, ''>, string> = {
  offered: 'offered',
  confirmed: 'confirmed',
  'in transit': 'inTransit',
}
