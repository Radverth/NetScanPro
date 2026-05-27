import path from 'path'
import fs from 'fs'
import type { DeviceType, ClassificationRule, OSFingerprint, PortInfo, ServiceInfo, SNMPInfo } from '../types'

let rulesCache: ClassificationRule[] | null = null

function loadRules(): ClassificationRule[] {
  if (rulesCache) return rulesCache

  // Try candidate paths in order: packaged resources, compiled output, source tree
  const electronProcess = process as NodeJS.Process & { resourcesPath?: string }
  const candidates = [
    // Packaged: process.resourcesPath/rules.json
    ...(electronProcess.resourcesPath
      ? [path.join(electronProcess.resourcesPath, 'rules.json')]
      : []),
    // Compiled dist-electron: dist-electron/scanner/../scanner/rules.json
    path.join(__dirname, 'rules.json'),
    path.join(__dirname, '../scanner/rules.json'),
    // Source tree for tests (running from repo root)
    path.join(process.cwd(), 'electron/scanner/rules.json'),
  ]

  for (const rulesPath of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(rulesPath, 'utf-8')) as ClassificationRule[]
      rulesCache = data
      return data
    } catch {
      // try next candidate
    }
  }

  return getBuiltinRules()
}

interface HostForClassification {
  ip: string
  mac: string
  hostname: string | null
  vendor: string | null
  os: OSFingerprint | null
  openPorts: PortInfo[]
  services: ServiceInfo[]
  snmpInfo: SNMPInfo | null
}

/**
 * Classify a host using the rule engine. First-match-wins.
 */
export function classifyHost(host: HostForClassification): DeviceType {
  const rules = loadRules()

  const portSet = new Set(host.openPorts.map((p) => p.port))
  const osText = `${host.os?.name ?? ''} ${host.os?.family ?? ''}`.toLowerCase()
  const hostnameText = (host.hostname ?? '').toLowerCase()
  const snmpDescText = (host.snmpInfo?.sysDescr ?? '').toLowerCase()
  const serviceTexts = host.services.map((s) => `${s.name} ${s.version}`.toLowerCase())
  const macPrefix = host.mac.substring(0, 8).toLowerCase()

  for (const rule of rules) {
    const { conditions, deviceType } = rule

    // Skip unknown (catch-all) rules until the end
    if (deviceType === 'unknown' && !hasAnyCondition(conditions)) continue

    if (matchesRule(conditions, portSet, osText, hostnameText, snmpDescText, serviceTexts, macPrefix)) {
      return deviceType
    }
  }

  return 'unknown'
}

function hasAnyCondition(conditions: ClassificationRule['conditions']): boolean {
  return Object.values(conditions).some((v) => Array.isArray(v) ? v.length > 0 : Boolean(v))
}

function matchesRule(
  conditions: ClassificationRule['conditions'],
  portSet: Set<number>,
  osText: string,
  hostnameText: string,
  snmpDescText: string,
  serviceTexts: string[],
  macPrefix: string,
): boolean {
  const checks: boolean[] = []

  // Port matching: ANY of the specified ports must be open
  if (conditions.ports && conditions.ports.length > 0) {
    checks.push(conditions.ports.some((p) => portSet.has(p)))
  }

  // OS keyword matching: ANY keyword must appear in OS string
  if (conditions.osKeywords && conditions.osKeywords.length > 0) {
    checks.push(conditions.osKeywords.some((kw) => osText.includes(kw.toLowerCase())))
  }

  // Hostname keyword matching: ANY keyword must appear in hostname
  if (conditions.hostnameKeywords && conditions.hostnameKeywords.length > 0) {
    checks.push(conditions.hostnameKeywords.some((kw) => hostnameText.includes(kw.toLowerCase())))
  }

  // SNMP description keyword matching
  if (conditions.snmpDescKeywords && conditions.snmpDescKeywords.length > 0) {
    checks.push(conditions.snmpDescKeywords.some((kw) => snmpDescText.includes(kw.toLowerCase())))
  }

  // Service keyword matching: ANY keyword in ANY service
  if (conditions.serviceKeywords && conditions.serviceKeywords.length > 0) {
    checks.push(
      conditions.serviceKeywords.some((kw) =>
        serviceTexts.some((svc) => svc.includes(kw.toLowerCase())),
      ),
    )
  }

  // OUI prefix matching
  if (conditions.ouiPrefixes && conditions.ouiPrefixes.length > 0) {
    checks.push(conditions.ouiPrefixes.some((prefix) => macPrefix.startsWith(prefix.toLowerCase())))
  }

  // If no conditions, no match (except catch-all)
  if (checks.length === 0) return false

  // ANY condition group matching is sufficient (OR logic between groups)
  return checks.some(Boolean)
}

function getBuiltinRules(): ClassificationRule[] {
  return [
    {
      deviceType: 'router_firewall',
      label: 'Router / Firewall',
      conditions: {
        osKeywords: ['cisco', 'fortinet', 'palo alto', 'pfsense', 'fortigate', 'opnsense'],
        hostnameKeywords: ['router', 'fw', 'firewall', 'gw', 'gateway', 'rtr', 'pf'],
      },
    },
    {
      deviceType: 'managed_switch',
      label: 'Managed Switch',
      conditions: {
        ports: [161],
        snmpDescKeywords: ['switch', 'catalyst', 'procurve'],
        hostnameKeywords: ['sw', 'switch'],
      },
    },
    {
      deviceType: 'wireless_ap',
      label: 'Wireless Access Point',
      conditions: {
        ouiPrefixes: ['00:0b:86', '00:1a:1e', 'dc:a6:32', 'b4:fb:e4'],
        hostnameKeywords: ['ap', 'wap', 'unifi', 'access-point'],
      },
    },
    {
      deviceType: 'dhcp_server',
      label: 'DHCP Server',
      conditions: { ports: [67], serviceKeywords: ['dhcp'] },
    },
    {
      deviceType: 'dns_server',
      label: 'DNS Server',
      conditions: { ports: [53], serviceKeywords: ['bind', 'named', 'windows dns'] },
    },
    {
      deviceType: 'windows_server',
      label: 'Windows Server',
      conditions: { osKeywords: ['windows server'] },
    },
    {
      deviceType: 'linux_server',
      label: 'Linux Server',
      conditions: {
        osKeywords: ['linux', 'ubuntu', 'debian', 'centos', 'rhel'],
        serviceKeywords: ['httpd', 'nginx', 'apache', 'postgres', 'mysql', 'docker'],
      },
    },
    {
      deviceType: 'nas_storage',
      label: 'NAS / Storage',
      conditions: {
        ports: [5000, 5001, 2049],
        ouiPrefixes: ['00:11:32', '00:08:9b'],
        snmpDescKeywords: ['synology', 'qnap', 'netapp', 'nas'],
      },
    },
    {
      deviceType: 'printer_mfp',
      label: 'Printer / MFP',
      conditions: { ports: [9100] },
    },
    {
      deviceType: 'voip_phone',
      label: 'VoIP Phone',
      conditions: { ports: [5060] },
    },
    {
      deviceType: 'windows_pc',
      label: 'End-User PC / Laptop',
      conditions: {
        osKeywords: ['windows 10', 'windows 11'],
        hostnameKeywords: ['desktop-', 'laptop-', 'pc-', 'ws-'],
      },
    },
    {
      deviceType: 'mac_endpoint',
      label: 'Mac Endpoint',
      conditions: {
        osKeywords: ['macos', 'mac os'],
        ouiPrefixes: ['00:03:93', '00:0a:95', '3c:d0:f8', 'f0:18:98'],
      },
    },
    {
      deviceType: 'unknown',
      label: 'Unknown Device',
      conditions: {},
    },
  ]
}

// Allow rules to be reloaded (e.g., after updating rules.json)
export function reloadRules(): void {
  rulesCache = null
}
