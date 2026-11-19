import axios from 'axios'
import type { HealthResponse, InferenceResult, LedgerEntry } from '@/types/inference'

const http = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await http.get<HealthResponse>('/health')
  return data
}

export async function runInfer(file: File, station: string): Promise<InferenceResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('station', station)
  form.append('save_ledger', 'true')
  const { data } = await http.post<InferenceResult>('/infer', form)
  return data
}

export async function fetchLedger(limit = 100): Promise<LedgerEntry[]> {
  const { data } = await http.get<LedgerEntry[]>('/ledger', { params: { limit } })
  return data
}

export async function clearLedger(): Promise<void> {
  await http.delete('/ledger')
}

export function ledgerExportUrl(fmt: 'xlsx' | 'csv' = 'xlsx'): string {
  return `/api/ledger/export?fmt=${fmt}`
}
