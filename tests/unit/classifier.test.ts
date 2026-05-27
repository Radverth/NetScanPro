import { describe, it, expect } from 'vitest'
import { classifyHost } from '../../electron/scanner/classifier'
import { FIXTURE_HOSTS } from '../fixtures/hosts'
import type { DiscoveredHost } from '../../electron/types'

type ClassifyInput = Parameters<typeof classifyHost>[0]

function toInput(partial: Partial<DiscoveredHost>): ClassifyInput {
  return {
    ip: partial.ip ?? '0.0.0.0',
    mac: partial.mac ?? '',
    hostname: partial.hostname ?? null,
    vendor: partial.vendor ?? null,
    os: partial.os ?? null,
    openPorts: partial.openPorts ?? [],
    services: partial.services ?? [],
    snmpInfo: partial.snmpInfo ?? null,
  }
}

describe('Device Classifier', () => {
  it('classifies router/firewall by hostname keyword', () => {
    const result = classifyHost(
      toInput({ hostname: 'fw-01.local', openPorts: [{ port: 22, protocol: 'tcp', service: 'ssh', version: '' }, { port: 443, protocol: 'tcp', service: 'https', version: '' }] }),
    )
    expect(result).toBe('router_firewall')
  })

  it('classifies router/firewall by vendor OS', () => {
    const fortigate = FIXTURE_HOSTS.find((h) => h.vendor === 'Fortinet')!
    expect(classifyHost(toInput(fortigate))).toBe('router_firewall')
  })

  it('classifies managed switch by SNMP sysDescr', () => {
    const sw = FIXTURE_HOSTS.find((h) => h.hostname === 'sw-core-01')!
    expect(classifyHost(toInput(sw))).toBe('managed_switch')
  })

  it('classifies wireless AP by OUI prefix', () => {
    const ap = FIXTURE_HOSTS.find((h) => h.mac === '00:0b:86:ab:cd:ef')!
    expect(classifyHost(toInput(ap))).toBe('wireless_ap')
  })

  it('classifies wireless AP by hostname', () => {
    const ap = FIXTURE_HOSTS.find((h) => h.hostname === 'unifi-ap-office')!
    expect(classifyHost(toInput(ap))).toBe('wireless_ap')
  })

  it('classifies Windows Server by OS + ports', () => {
    const srv = FIXTURE_HOSTS.find((h) => h.hostname === 'dc01.corp.local')!
    expect(classifyHost(toInput(srv))).toBe('windows_server')
  })

  it('classifies Linux Server by OS + service', () => {
    const srv = FIXTURE_HOSTS.find((h) => h.hostname === 'web01.corp.local')!
    expect(classifyHost(toInput(srv))).toBe('linux_server')
  })

  it('classifies NAS by Synology OUI + ports', () => {
    const nas = FIXTURE_HOSTS.find((h) => h.mac === '00:11:32:ab:cd:ef')!
    expect(classifyHost(toInput(nas))).toBe('nas_storage')
  })

  it('classifies NAS by SNMP sysDescr', () => {
    const nas = FIXTURE_HOSTS.find((h) => h.hostname === 'nas01.local')!
    expect(classifyHost(toInput(nas))).toBe('nas_storage')
  })

  it('classifies printer by port 9100', () => {
    const printer = FIXTURE_HOSTS.find((h) => h.hostname === 'printer-reception')!
    expect(classifyHost(toInput(printer))).toBe('printer_mfp')
  })

  it('classifies VoIP phone by SIP port', () => {
    const phone = FIXTURE_HOSTS.find((h) => h.hostname === 'phone-reception')!
    expect(classifyHost(toInput(phone))).toBe('voip_phone')
  })

  it('classifies Windows PC by OS + hostname pattern', () => {
    const pc = FIXTURE_HOSTS.find((h) => h.hostname === 'DESKTOP-A1B2C3D')!
    expect(classifyHost(toInput(pc))).toBe('windows_pc')
  })

  it('classifies Mac endpoint by Apple OUI', () => {
    const mac = FIXTURE_HOSTS.find((h) => h.mac === '3c:d0:f8:aa:bb:cc')!
    expect(classifyHost(toInput(mac))).toBe('mac_endpoint')
  })

  it('classifies Mac endpoint by macOS fingerprint', () => {
    const mac = FIXTURE_HOSTS.find((h) => h.hostname === 'Toms-MacBook-Air.local')!
    expect(classifyHost(toInput(mac))).toBe('mac_endpoint')
  })

  it('classifies DHCP server by port 67 + service', () => {
    const dhcp = FIXTURE_HOSTS.find((h) => h.hostname === 'dhcp-svr.corp.local')!
    expect(classifyHost(toInput(dhcp))).toBe('dhcp_server')
  })

  it('classifies DNS server by port 53 + service', () => {
    const dns = FIXTURE_HOSTS.find((h) => h.hostname === 'dns01.corp.local')!
    expect(classifyHost(toInput(dns))).toBe('dns_server')
  })

  it('classifies unknown device when no rule matches', () => {
    const unknown = toInput({ ip: '192.168.1.250', openPorts: [{ port: 8080, protocol: 'tcp', service: 'http-alt', version: '' }] })
    expect(classifyHost(unknown)).toBe('unknown')
  })

  it('classifies all 20+ fixture hosts without throwing', () => {
    for (const host of FIXTURE_HOSTS) {
      expect(() => classifyHost(toInput(host))).not.toThrow()
    }
  })

  it('first-match-wins: DHCP server wins over Windows Server when port 67 present', () => {
    const host = toInput({
      hostname: 'dhcp-svr.corp.local',
      os: { family: 'Windows', name: 'Windows Server 2019', version: '2019', accuracy: 90 },
      openPorts: [
        { port: 67, protocol: 'udp', service: 'dhcp', version: '' },
        { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' },
        { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: '' },
      ],
      services: [{ name: 'dhcp', version: '', info: '' }],
    })
    expect(classifyHost(host)).toBe('dhcp_server')
  })
})
