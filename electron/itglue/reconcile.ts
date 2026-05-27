import { getConfigurations, createConfiguration, updateConfiguration } from './configs'
import { getNetworkAssets, createNetworkAsset, updateNetworkAsset } from './flexible'
import type { ScanSession, DiscoveredHost, ITGlueConfig, SyncResult } from '../types'

/**
 * Reconcile discovered devices with IT Glue configurations.
 * Match strategy (in priority order):
 * 1. MAC address match
 * 2. IP + hostname match
 * 3. Hostname-only match
 * Creates new configs for unmatched devices, updates existing ones.
 */
export async function reconcileDevices(session: ScanSession): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  }

  const orgId = session.orgId
  if (!orgId) {
    result.errors.push({ ip: '', hostname: null, error: 'No organization ID set' })
    return result
  }

  // Fetch existing configurations
  let existingConfigs: ITGlueConfig[] = []
  try {
    existingConfigs = await getConfigurations(orgId)
  } catch (err) {
    result.errors.push({
      ip: '',
      hostname: null,
      error: `Failed to fetch existing configurations: ${String(err)}`,
    })
    return result
  }

  // Build lookup indices
  const byMac = new Map<string, ITGlueConfig>()
  const byIp = new Map<string, ITGlueConfig>()
  const byHostname = new Map<string, ITGlueConfig>()

  for (const config of existingConfigs) {
    if (config.macAddress) {
      byMac.set(normalizeMac(config.macAddress), config)
    }
    if (config.primaryIp) {
      byIp.set(config.primaryIp, config)
    }
    if (config.hostname) {
      byHostname.set(config.hostname.toLowerCase(), config)
    }
  }

  // Process each discovered host
  for (const host of session.hosts) {
    try {
      const matched = findMatch(host, byMac, byIp, byHostname)

      if (matched) {
        const needsUpdate = configNeedsUpdate(matched, host)
        if (needsUpdate) {
          await updateConfiguration(matched.id, host)
          host.itGlueId = matched.id
          host.syncStatus = 'updated'
          result.updated++
        } else {
          host.itGlueId = matched.id
          host.syncStatus = 'unchanged'
          result.unchanged++
        }
      } else {
        const created = await createConfiguration(orgId, host)
        host.itGlueId = created.id
        host.syncStatus = 'created'
        result.created++

        // Update indices so subsequent hosts don't create duplicates
        if (host.mac) byMac.set(normalizeMac(host.mac), created)
        if (host.ip) byIp.set(host.ip, created)
        if (host.hostname) byHostname.set(host.hostname.toLowerCase(), created)
      }
    } catch (err) {
      host.syncStatus = 'error'
      result.errors.push({
        ip: host.ip,
        hostname: host.hostname,
        error: String(err),
      })
    }
  }

  // Sync subnet/network assets
  try {
    await reconcileSubnets(orgId, session)
  } catch {
    // Non-fatal: subnet sync failure doesn't block device sync
  }

  return result
}

async function reconcileSubnets(orgId: string, session: ScanSession): Promise<void> {
  const existingAssets = await getNetworkAssets(orgId)
  const byName = new Map(existingAssets.map((a) => [a.name, a]))

  for (const subnet of session.subnets) {
    const existing = byName.get(subnet.cidr)
    if (existing) {
      await updateNetworkAsset(existing.id, subnet)
    } else {
      await createNetworkAsset(orgId, subnet)
    }
  }
}

function findMatch(
  host: DiscoveredHost,
  byMac: Map<string, ITGlueConfig>,
  byIp: Map<string, ITGlueConfig>,
  byHostname: Map<string, ITGlueConfig>,
): ITGlueConfig | null {
  // Priority 1: MAC match
  if (host.mac) {
    const macMatch = byMac.get(normalizeMac(host.mac))
    if (macMatch) return macMatch
  }

  // Priority 2: IP + hostname match
  if (host.ip && host.hostname) {
    const ipMatch = byIp.get(host.ip)
    if (ipMatch && ipMatch.hostname?.toLowerCase() === host.hostname.toLowerCase()) {
      return ipMatch
    }
  }

  // Priority 3: IP-only match
  if (host.ip) {
    const ipMatch = byIp.get(host.ip)
    if (ipMatch) return ipMatch
  }

  // Priority 4: Hostname-only match
  if (host.hostname) {
    const hostnameMatch = byHostname.get(host.hostname.toLowerCase())
    if (hostnameMatch) return hostnameMatch
  }

  return null
}

function configNeedsUpdate(existing: ITGlueConfig, host: DiscoveredHost): boolean {
  // Check if any significant fields differ
  if (existing.primaryIp !== host.ip) return true
  if (existing.macAddress && host.mac && normalizeMac(existing.macAddress) !== normalizeMac(host.mac)) return true
  if (existing.hostname !== host.hostname) return true
  return false
}

function normalizeMac(mac: string): string {
  return mac.toLowerCase().replace(/[^0-9a-f]/g, '')
}
