import type { HealthInfo } from '@/types'
import { requestData } from './request'

export function fetchHealth(): Promise<HealthInfo> {
  return requestData<HealthInfo>({ method: 'GET', url: '/health' })
}
