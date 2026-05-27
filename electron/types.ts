export type DeviceType =
  | 'router_firewall'
  | 'managed_switch'
  | 'wireless_ap'
  | 'windows_server'
  | 'linux_server'
  | 'nas_storage'
  | 'printer_mfp'
  | 'voip_phone'
  | 'windows_pc'
  | 'mac_endpoint'
  | 'dhcp_server'
  | 'dns_server'
  | 'unknown'

export interface PortInfo {
  port: number
  protocol: 'tcp' | 'udp'
  service: string
  version: string
}

export interface OSFingerprint {
  family: string
  name: string
  version: string
  accuracy: number
}

export interface ServiceInfo {
  name: string
  version: string
  info: string
}

export interface DHCPLease {
  ip: string
  mac: string
  hostname: string
  expires: Date | null
}

export interface SNMPInfo {
  sysDescr: string
  sysName: string
  sysLocation: string
  interfaces: SNMPInterface[]
}

export interface SNMPInterface {
  index: number
  descr: string
  type: number
  speed: number
  physAddress: string
}

export interface SubnetInfo {
  cidr: string
  gateway: string | null
  dhcpServer: string | null
  vlanId: number | null
  hosts: string[]
}

export interface DiscoveredHost {
  ip: string
  mac: string
  hostname: string | null
  vendor: string | null
  os: OSFingerprint | null
  openPorts: PortInfo[]
  services: ServiceInfo[]
  deviceType: DeviceType
  subnetCidr: string
  dhcpLease: DHCPLease | null
  dnsPtr: string | null
  snmpInfo: SNMPInfo | null
  itGlueId: string | null
  syncStatus: 'pending' | 'created' | 'updated' | 'unchanged' | 'error'
  lastSeen: Date
}

export interface ScanConfig {
  speed: 'fast' | 'balanced' | 'thorough'
  ipRange?: string
  snmpCommunity: string
  includeDhcpRead: boolean
  includeSnmp: boolean
}

export interface ScanSession {
  id: string
  orgId: string
  orgName: string
  startedAt: Date
  completedAt: Date | null
  hosts: DiscoveredHost[]
  subnets: SubnetInfo[]
  dhcpServers: DiscoveredHost[]
  dnsServers: DiscoveredHost[]
  scanDuration: number
  engineVersion: string
  mode: 'itglue' | 'standalone'
}

export interface ScanProgress {
  phase: string
  phaseIndex: number
  totalPhases: number
  hostsFound: number
  hostsTotal: number
  currentHost: string
  percentComplete: number
}

export interface ITGlueOrg {
  id: string
  name: string
  primaryDomain: string | null
  phone: string | null
}

export interface SyncResult {
  created: number
  updated: number
  unchanged: number
  errors: SyncError[]
}

export interface SyncError {
  ip: string
  hostname: string | null
  error: string
}

export interface ARPEntry {
  ip: string
  mac: string
  vendor: string
}

export interface ClassificationRule {
  deviceType: DeviceType
  label: string
  conditions: {
    ports?: number[]
    osKeywords?: string[]
    hostnameKeywords?: string[]
    snmpDescKeywords?: string[]
    serviceKeywords?: string[]
    ouiPrefixes?: string[]
  }
}

export interface ITGlueConfig {
  id: string
  name: string
  organizationId: string
  configurationTypeId: string
  primaryIp: string | null
  macAddress: string | null
  hostname: string | null
  notes: string | null
}

export interface ITGlueFlexibleAsset {
  id: string
  organizationId: string
  flexibleAssetTypeId: string
  name: string
  traits: Record<string, unknown>
}

export interface StoreSchema {
  apiKey: string
  mode: 'itglue' | 'standalone'
  orgId: string
  orgName: string
  scanHistory: ScanSession[]
}
