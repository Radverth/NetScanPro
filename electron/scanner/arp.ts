import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import type { ARPEntry } from '../types'

const execAsync = promisify(exec)

interface RawARPEntry {
  ip: string
  mac: string
}

/**
 * Run an ARP sweep to discover live hosts on the local network.
 * Falls back through: arp-scan → arping → ping sweep + arp table parse
 */
export async function runArpSweep(ipRange?: string, signal?: AbortSignal): Promise<ARPEntry[]> {
  const range = ipRange || detectLocalSubnet()

  // Try arp-scan first (Linux, requires root)
  if (process.platform === 'linux') {
    try {
      const entries = await runArpScan(range, signal)
      if (entries.length > 0) return entries
    } catch {
      // fall through
    }
  }

  // Try arp -a (cross-platform ARP table read after ping sweep)
  try {
    const entries = await pingSweepAndArp(range, signal)
    return entries
  } catch {
    return []
  }
}

async function runArpScan(range: string, signal?: AbortSignal): Promise<ARPEntry[]> {
  if (signal?.aborted) return []

  const entries: ARPEntry[] = []
  try {
    const { stdout } = await execAsync(`arp-scan --localnet --interface=eth0 2>/dev/null || arp-scan ${range} 2>/dev/null`, {
      timeout: 30000,
    })

    const lines = stdout.split('\n')
    for (const line of lines) {
      // arp-scan output: IP\tMAC\tVendor
      const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([\da-f:]{17})\s+(.*)$/i)
      if (match) {
        entries.push({
          ip: match[1],
          mac: match[2].toLowerCase(),
          vendor: match[3].trim() || 'Unknown',
        })
      }
    }
  } catch {
    throw new Error('arp-scan not available')
  }

  return entries
}

async function pingSweepAndArp(range: string, signal?: AbortSignal): Promise<ARPEntry[]> {
  if (signal?.aborted) return []

  // Parse range like "192.168.1.0/24" → base + count
  const { baseIp, size } = parseRange(range)
  const pingPromises: Promise<void>[] = []
  const batchSize = 20

  // Ping sweep to populate ARP cache
  for (let i = 1; i < Math.min(size, 255); i++) {
    if (signal?.aborted) break
    const ip = `${baseIp}.${i}`
    const pingCmd = process.platform === 'win32'
      ? `ping -n 1 -w 500 ${ip}`
      : `ping -c 1 -W 1 ${ip}`

    const p = execAsync(pingCmd, { timeout: 2000 }).catch(() => {})
    pingPromises.push(p as Promise<void>)

    // Batch pings
    if (pingPromises.length >= batchSize) {
      await Promise.allSettled(pingPromises.splice(0, batchSize))
      if (signal?.aborted) break
    }
  }
  await Promise.allSettled(pingPromises)

  if (signal?.aborted) return []

  // Read ARP table
  return readArpTable(baseIp)
}

async function readArpTable(baseIp: string): Promise<ARPEntry[]> {
  const entries: ARPEntry[] = []

  try {
    const cmd = process.platform === 'win32' ? 'arp -a' : 'arp -an'
    const { stdout } = await execAsync(cmd, { timeout: 5000 })
    const lines = stdout.split('\n')

    for (const line of lines) {
      // Linux: ? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0
      // Windows: 192.168.1.1   aa-bb-cc-dd-ee-ff   dynamic
      let ip: string | undefined
      let mac: string | undefined

      const linuxMatch = line.match(/\((\d+\.\d+\.\d+\.\d+)\) at ([\da-f:]{17})/i)
      const winMatch = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([\da-f-]{17})/i)

      if (linuxMatch) {
        ip = linuxMatch[1]
        mac = linuxMatch[2].toLowerCase()
      } else if (winMatch) {
        ip = winMatch[1]
        mac = winMatch[2].toLowerCase().replace(/-/g, ':')
      }

      if (ip && mac && mac !== 'ff:ff:ff:ff:ff:ff' && ip.startsWith(baseIp)) {
        const vendor = await lookupVendor(mac)
        entries.push({ ip, mac, vendor })
      }
    }
  } catch {
    // Return empty on failure
  }

  return entries
}

function detectLocalSubnet(): string {
  const interfaces = os.networkInterfaces()
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.')
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
      }
    }
  }
  return '192.168.1.0/24'
}

function parseRange(cidr: string): { baseIp: string; size: number } {
  const [ip, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr ?? '24', 10)
  const size = Math.pow(2, 32 - prefix)
  const parts = ip.split('.')
  const baseIp = `${parts[0]}.${parts[1]}.${parts[2]}`
  return { baseIp, size }
}

// Simple OUI vendor lookup from MAC prefix
async function lookupVendor(mac: string): Promise<string> {
  const oui = mac.substring(0, 8).toLowerCase()
  const knownVendors: Record<string, string> = {
    '00:50:56': 'VMware',
    '00:0c:29': 'VMware',
    '08:00:27': 'VirtualBox',
    '00:1b:a9': 'Cisco',
    '00:0b:86': 'Aruba Networks',
    '00:1a:1e': 'Ruckus',
    '04:18:d6': 'Cisco Meraki',
    'dc:a6:32': 'Raspberry Pi',
    '00:11:32': 'Synology',
    '00:08:9b': 'QNAP',
    'b4:fb:e4': 'UniFi',
    '3c:d0:f8': 'Apple',
    'f0:18:98': 'Apple',
    '00:03:93': 'Apple',
  }
  return knownVendors[oui] || 'Unknown'
}

export type { RawARPEntry }
