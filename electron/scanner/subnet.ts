import type { DiscoveredHost, SubnetInfo } from '../types'

/**
 * Derive /24 subnet groupings from a list of discovered hosts.
 * Identifies gateway candidates and DHCP servers per subnet.
 */
export function deriveSubnets(hosts: DiscoveredHost[]): SubnetInfo[] {
  const subnetMap = new Map<string, SubnetInfo>()

  for (const host of hosts) {
    const cidr = deriveSubnetCidr(host.ip)

    if (!subnetMap.has(cidr)) {
      subnetMap.set(cidr, {
        cidr,
        gateway: null,
        dhcpServer: null,
        vlanId: null,
        hosts: [],
      })
    }

    const subnet = subnetMap.get(cidr)!
    subnet.hosts.push(host.ip)

    // Identify gateway: typically .1 or .254 in the subnet
    if (isLikelyGateway(host.ip) || host.deviceType === 'router_firewall') {
      subnet.gateway = host.ip
    }

    // Identify DHCP server
    if (host.deviceType === 'dhcp_server') {
      subnet.dhcpServer = host.ip
    }
  }

  return Array.from(subnetMap.values()).sort((a, b) => compareSubnets(a.cidr, b.cidr))
}

/**
 * Derive a /24 CIDR from an IP address.
 */
export function deriveSubnetCidr(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return '0.0.0.0/24'
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

/**
 * Get all IPs in a /24 subnet.
 */
export function getSubnetIps(cidr: string): string[] {
  const [base] = cidr.split('/')
  const parts = base.split('.')
  if (parts.length !== 4) return []

  const ips: string[] = []
  for (let i = 1; i < 255; i++) {
    ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`)
  }
  return ips
}

/**
 * Check if an IP is in a given CIDR block (supports /8, /16, /24).
 */
export function ipInCidr(ip: string, cidr: string): boolean {
  const [base, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr ?? '24', 10)
  const ipParts = ip.split('.').map(Number)
  const baseParts = base.split('.').map(Number)

  const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
  const baseInt = (baseParts[0] << 24) | (baseParts[1] << 16) | (baseParts[2] << 8) | baseParts[3]
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0

  return (ipInt & mask) === (baseInt & mask)
}

function isLikelyGateway(ip: string): boolean {
  const lastOctet = parseInt(ip.split('.')[3] ?? '0', 10)
  return lastOctet === 1 || lastOctet === 254
}

function compareSubnets(a: string, b: string): number {
  const partsA = a.split(/[./]/).map(Number)
  const partsB = b.split(/[./]/).map(Number)

  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] !== partsB[i]) return (partsA[i] ?? 0) - (partsB[i] ?? 0)
  }
  return 0
}

/**
 * Get subnet statistics.
 */
export function getSubnetStats(subnet: SubnetInfo): {
  hostCount: number
  utilization: number
} {
  const hostCount = subnet.hosts.length
  const utilization = (hostCount / 254) * 100
  return { hostCount, utilization }
}
