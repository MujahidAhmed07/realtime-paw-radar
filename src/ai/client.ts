/**
 * AI-ready client — calls the FastAPI AI service (server/ai-service).
 * Returns null when the service is unreachable; AI is never a dependency
 * for core functionality. All results are suggestions only.
 */
const AI_URL = import.meta.env.VITE_AI_SERVICE_URL as string | undefined

export async function aiHealthCheck(): Promise<boolean> {
  if (!AI_URL) return false
  try {
    const res = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch { return false }
}

export async function aiSuggestMatch(missingReportId: string, foundReportId: string): Promise<{ similarity: number; method: string } | null> {
  if (!AI_URL) return null
  try {
    const res = await fetch(`${AI_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missing_report_id: missingReportId, found_report_id: foundReportId }),
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}
