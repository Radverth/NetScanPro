import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import log from '../logger'
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
  if (!ipRange) log.info(`Auto-detected subnet: ${range}`)

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

  const { baseIp, size } = parseRange(range)
  const hostCount = Math.min(size - 1, 254)
  const batchSize = 32
  const respondingIps = new Set<string>()

  // Ping sweep in concurrent batches, track which IPs respond
  for (let batch = 0; batch < hostCount; batch += batchSize) {
    if (signal?.aborted) break
    const end = Math.min(batch + batchSize, hostCount)
    const tasks = []
    for (let i = batch + 1; i <= end; i++) {
      const ip = `${baseIp}.${i}`
      const pingCmd = process.platform === 'win32'
        ? `ping -n 1 -w 800 ${ip}`
        : `ping -c 1 -W 1 ${ip}`
      tasks.push(
        execAsync(pingCmd, { timeout: 2500 })
          .then(() => respondingIps.add(ip))
          .catch(() => {}),
      )
    }
    await Promise.allSettled(tasks)
  }

  if (signal?.aborted) return []

  // Read ARP table to get MACs for responding hosts
  const arpEntries = await readArpTable(baseIp)
  const arpMap = new Map(arpEntries.map((e) => [e.ip, e]))

  // Merge: ARP table wins for MAC/vendor; ping-only hosts get unknown MAC
  // (important for environments like Crostini where ARP table is limited)
  const result: ARPEntry[] = []
  for (const ip of respondingIps) {
    if (arpMap.has(ip)) {
      result.push(arpMap.get(ip)!)
    } else {
      result.push({ ip, mac: '00:00:00:00:00:00', vendor: 'Unknown' })
    }
  }

  // Also include ARP-only entries (hosts that didn't respond to ping but are in table)
  for (const entry of arpEntries) {
    if (!respondingIps.has(entry.ip)) result.push(entry)
  }

  return result
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
  const candidates: Array<{ address: string; score: number }> = []

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family !== 'IPv4' || addr.internal) continue
      const first = parseInt(addr.address.split('.')[0], 10)
      const second = parseInt(addr.address.split('.')[1], 10)

      let score = 0
      if (first === 192 && second === 168) score = 100        // classic LAN
      else if (first === 10) score = 80                       // RFC-1918 class A
      else if (first === 172 && second >= 16 && second <= 31
               && second !== 17 && second !== 18) score = 60  // RFC-1918 class B (skip Docker)
      else score = 10                                         // CGNAT, Crostini (100.x), etc.

      candidates.push({ address: addr.address, score })
    }
  }

  if (candidates.length === 0) return '192.168.1.0/24'

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0].address
  const parts = best.split('.')
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
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
