import dns from 'dns'
import { promisify } from 'util'

const reverseAsync = promisify(dns.reverse)

/**
 * Resolve PTR records for a list of IPs.
 * Returns a map of IP → PTR hostname.
 */
export async function resolveAllPTR(
  ips: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  if (ips.length === 0) return results

  // Process in batches to avoid overwhelming DNS
  const batchSize = 30
  for (let i = 0; i < ips.length; i += batchSize) {
    if (signal?.aborted) break
    const batch = ips.slice(i, i + batchSize)
    const batchResults = await resolveBatch(batch, signal)
    for (const [ip, ptr] of batchResults.entries()) {
      results.set(ip, ptr)
    }
  }

  return results
}

async function resolveBatch(ips: string[], signal?: AbortSignal): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const promises = ips.map(async (ip) => {
    if (signal?.aborted) return
    try {
      const hostnames = await withTimeout(reverseAsync(ip), 3000)
      if (hostnames.length > 0) {
        // Clean up hostname (remove trailing dot, take first result)
        const hostname = hostnames[0].replace(/\.$/, '')
        results.set(ip, hostname)
      }
    } catch {
      // DNS lookup failed, skip
    }
  })

  await Promise.allSettled(promises)
  return results
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DNS timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * Resolve a single hostname to IP addresses.
 */
export async function resolveHostname(hostname: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) resolve([])
      else resolve(addresses)
    })
  })
}
