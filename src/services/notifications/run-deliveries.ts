import 'server-only'

export type Delivery = { label: string; run: () => Promise<unknown> }

// Runs every delivery independently under Promise.allSettled, so one channel
// failing (or throwing unexpectedly) never blocks another, and this never
// throws. Wrapping each call in an async arrow also turns a synchronous
// throw into a rejection allSettled can absorb.
export async function runDeliveries(requestNumber: string, deliveries: Delivery[]): Promise<void> {
  const results = await Promise.allSettled(deliveries.map(async ({ run }) => run()))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const message = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      console.error(`[notifications] ${deliveries[index].label} for ${requestNumber} threw: ${message}`)
    }
  })
}
