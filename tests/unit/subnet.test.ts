import { describe, it, expect } from 'vitest'
import { deriveSubnets } from '../../electron/scanner/subnet'
import type { DiscoveredHost } from '../../electron/types'

function makeHost(ip: string, subnet: string): DiscoveredHost {
  return {
    ip,
    mac: '00:11:22:33:44:55',
    hostname: null,
    vendor: null,
    os: null,
    openPorts: [],
    services: [],
    deviceType: 'windows_pc',
    subnetCidr: subnet,
    dhcpLease: null,
    dnsPtr: null,
    snmpInfo: null,
    itGlueId: null,
    syncStatus: 'pending',
    lastSeen: new Date(),
  }
}

describe('Subnet Derivation', () => {
  it('groups hosts in the same /24 into one subnet', () => {
    const hosts = [
      makeHost('192.168.1.10', '192.168.1.0/24'),
      makeHost('192.168.1.20', '192.168.1.0/24'),
      makeHost('192.168.1.30', '192.168.1.0/24'),
    ]
    const subnets = deriveSubnets(hosts)
    expect(subnets).toHaveLength(1)
    expect(subnets[0].cidr).toBe('192.168.1.0/24')
    expect(subnets[0].hosts).toHaveLength(3)
  })

  it('creates separate subnets for different /24 ranges', () => {
    const hosts = [
      makeHost('192.168.1.10', '192.168.1.0/24'),
      makeHost('192.168.2.10', '192.168.2.0/24'),
      makeHost('10.0.0.5', '10.0.0.0/24'),
    ]
    const subnets = deriveSubnets(hosts)
    expect(subnets).toHaveLength(3)
    const cidrs = subnets.map((s) => s.cidr).sort()
    expect(cidrs).toContain('192.168.1.0/24')
    expect(cidrs).toContain('192.168.2.0/24')
    expect(cidrs).toContain('10.0.0.0/24')
  })

  it('returns empty array for empty input', () => {
    expect(deriveSubnets([])).toHaveLength(0)
  })

  it('each subnet lists correct IPs', () => {
    const hosts = [
      makeHost('10.1.1.5', '10.1.1.0/24'),
      makeHost('10.1.1.100', '10.1.1.0/24'),
    ]
    const subnets = deriveSubnets(hosts)
    expect(subnets[0].hosts).toContain('10.1.1.5')
    expect(subnets[0].hosts).toContain('10.1.1.100')
  })

  it('identifies gateway candidate as first host in subnet', () => {
    const hosts = [
      makeHost('192.168.0.1', '192.168.0.0/24'),
      makeHost('192.168.0.50', '192.168.0.0/24'),
    ]
    const subnets = deriveSubnets(hosts)
    expect(subnets[0].gateway).toBe('192.168.0.1')
  })

  it('handles single host subnet', () => {
    const hosts = [makeHost('172.16.0.1', '172.16.0.0/24')]
    const subnets = deriveSubnets(hosts)
    expect(subnets).toHaveLength(1)
    expect(subnets[0].hosts).toHaveLength(1)
  })
})
