import { readFile, readdir } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { DHCPLease } from '../types'

const execAsync = promisify(exec)

/**
 * Read DHCP leases from the OS.
 * Linux: reads /var/lib/dhcp/dhcpd.leases or /var/lib/dhcpd/dhcpd.leases
 * Windows: uses WMI via PowerShell
 */
export async function readDhcpLeases(signal?: AbortSignal): Promise<DHCPLease[]> {
  if (signal?.aborted) return []

  if (process.platform === 'linux') {
    return readLinuxLeases(signal)
  } else if (process.platform === 'win32') {
    return readWindowsLeases(signal)
  }
  return []
}

async function readLinuxLeases(signal?: AbortSignal): Promise<DHCPLease[]> {
  const leasePaths = [
    '/var/lib/dhcp/dhcpd.leases',
    '/var/lib/dhcpd/dhcpd.leases',
    '/var/lib/dhcpcd/dhcpcd.leases',
    '/var/db/dhcpd.leases',
  ]

  for (const leasePath of leasePaths) {
    if (signal?.aborted) break
    try {
      const content = await readFile(leasePath, 'utf-8')
      return parseISCDhcpdLeases(content)
    } catch {
      // Try next path
    }
  }

  // Try reading from /var/lib/NetworkManager or systemd-networkd leases
  try {
    const nmDir = '/var/lib/NetworkManager'
    const files = await readdir(nmDir)
    const leaseFiles = files.filter((f) => f.endsWith('.lease') || f.includes('dhcp'))
    const leases: DHCPLease[] = []

    for (const file of leaseFiles.slice(0, 5)) {
      if (signal?.aborted) break
      try {
        const content = await readFile(path.join(nmDir, file), 'utf-8')
        leases.push(...parseNetworkManagerLease(content))
      } catch {
        // Skip
      }
    }
    return leases
  } catch {
    return []
  }
}

async function readWindowsLeases(signal?: AbortSignal): Promise<DHCPLease[]> {
  if (signal?.aborted) return []

  try {
    // Use PowerShell to query DHCP server leases via WMI
    const psScript = `
      try {
        $leases = Get-DhcpServerv4Lease -ScopeId (Get-DhcpServerv4Scope).ScopeId -ErrorAction Stop
        $leases | Select-Object IPAddress,ClientId,HostName,LeaseExpiryTime | ConvertTo-Json
      } catch {
        Write-Output '[]'
      }
    `
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
      { timeout: 15000 },
    )

    const data = JSON.parse(stdout.trim() || '[]')
    const items = Array.isArray(data) ? data : [data]

    return items.map((item: Record<string, string>) => ({
      ip: String(item.IPAddress ?? ''),
      mac: formatMac(String(item.ClientId ?? '')),
      hostname: String(item.HostName ?? ''),
      expires: item.LeaseExpiryTime ? new Date(item.LeaseExpiryTime) : null,
    }))
  } catch {
    return []
  }
}

function parseISCDhcpdLeases(content: string): DHCPLease[] {
  const leases: DHCPLease[] = []
  const leaseBlocks = content.match(/lease\s+[\d.]+\s*\{[^}]+\}/g) ?? []

  for (const block of leaseBlocks) {
    const ipMatch = block.match(/lease\s+([\d.]+)/)
    const macMatch = block.match(/hardware ethernet\s+([\da-f:]+)/i)
    const hostnameMatch = block.match(/client-hostname\s+"([^"]+)"/)
    const endsMatch = block.match(/ends\s+\d+\s+([\d/]+\s+[\d:]+)/)

    if (!ipMatch) continue

    let expires: Date | null = null
    if (endsMatch) {
      try {
        expires = new Date(endsMatch[1].replace(/\//g, '-'))
      } catch {
        expires = null
      }
    }

    leases.push({
      ip: ipMatch[1],
      mac: macMatch?.[1] ?? '',
      hostname: hostnameMatch?.[1] ?? '',
      expires,
    })
  }

  return leases
}

function parseNetworkManagerLease(content: string): DHCPLease[] {
  // NetworkManager lease files use a simple key=value format
  const leases: DHCPLease[] = []
  const ipMatch = content.match(/^ADDRESS=(.+)$/m)
  const macMatch = content.match(/^CLIENTID=(.+)$/m)

  if (ipMatch) {
    leases.push({
      ip: ipMatch[1].trim(),
      mac: macMatch ? formatMac(macMatch[1].trim()) : '',
      hostname: '',
      expires: null,
    })
  }

  return leases
}

function formatMac(raw: string): string {
  // Normalize MAC address formats
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length === 12) {
    return cleaned.match(/.{2}/g)?.join(':').toLowerCase() ?? ''
  }
  return raw.toLowerCase()
}
