import { rateLimitedGet, rateLimitedPost, rateLimitedPatch } from './client'
import type { ITGlueConfig, DiscoveredHost } from '../types'

interface ITGlueConfigData {
  id: string
  attributes: {
    name: string
    'organization-id': number
    'configuration-type-id': number
    'primary-ip': string | null
    'mac-address': string | null
    hostname: string | null
    notes: string | null
    'installed-at': string | null
    'created-at': string
    'updated-at': string
  }
}

interface ITGlueConfigsResponse {
  data: ITGlueConfigData[]
  meta?: {
    total_count: number
    current_page: number
    total_pages: number
  }
}

interface ITGlueConfigResponse {
  data: ITGlueConfigData
}

const CONFIG_TYPE_IDS: Record<string, number> = {
  router_firewall: 29,   // Firewall
  managed_switch: 30,    // Switch
  wireless_ap: 31,       // Wireless AP
  windows_server: 32,    // Server
  linux_server: 32,      // Server
  nas_storage: 33,       // NAS
  printer_mfp: 34,       // Printer
  voip_phone: 35,        // VoIP
  windows_pc: 36,        // Workstation
  mac_endpoint: 36,      // Workstation
  dhcp_server: 32,       // Server
  dns_server: 32,        // Server
  unknown: 37,           // Other
}

/**
 * Get all configurations for an organization.
 * Handles pagination automatically.
 */
export async function getConfigurations(orgId: string): Promise<ITGlueConfig[]> {
  const configs: ITGlueConfig[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await rateLimitedGet<ITGlueConfigsResponse>('/configurations', {
      'filter[organization-id]': orgId,
      'page[size]': 100,
      'page[number]': page,
    })

    const data = response.data
    if (!data.data || !Array.isArray(data.data)) break

    configs.push(...data.data.map(mapConfig))
    totalPages = data.meta?.total_pages ?? 1
    page++

    if (page > totalPages) break
  }

  return configs
}

/**
 * Create a new configuration in IT Glue.
 */
export async function createConfiguration(orgId: string, device: DiscoveredHost): Promise<ITGlueConfig> {
  const configTypeId = CONFIG_TYPE_IDS[device.deviceType] ?? CONFIG_TYPE_IDS.unknown

  const payload = {
    data: {
      type: 'configurations',
      attributes: {
        'organization-id': parseInt(orgId, 10),
        'configuration-type-id': configTypeId,
        name: device.hostname ?? device.ip,
        hostname: device.hostname,
        'primary-ip': device.ip,
        'mac-address': device.mac,
        notes: buildNotes(device),
      },
    },
  }

  const response = await rateLimitedPost<ITGlueConfigResponse>('/configurations', payload)
  return mapConfig(response.data.data)
}

/**
 * Update an existing configuration in IT Glue.
 */
export async function updateConfiguration(id: string, device: DiscoveredHost): Promise<ITGlueConfig> {
  const configTypeId = CONFIG_TYPE_IDS[device.deviceType] ?? CONFIG_TYPE_IDS.unknown

  const payload = {
    data: {
      type: 'configurations',
      id,
      attributes: {
        'configuration-type-id': configTypeId,
        name: device.hostname ?? device.ip,
        hostname: device.hostname,
        'primary-ip': device.ip,
        'mac-address': device.mac,
        notes: buildNotes(device),
      },
    },
  }

  const response = await rateLimitedPatch<ITGlueConfigResponse>(`/configurations/${id}`, payload)
  return mapConfig(response.data.data)
}

function buildNotes(device: DiscoveredHost): string {
  const lines: string[] = [
    `Device Type: ${device.deviceType}`,
    `Vendor: ${device.vendor ?? 'Unknown'}`,
    `OS: ${device.os?.name ?? 'Unknown'}`,
    `Last Seen: ${device.lastSeen.toISOString()}`,
  ]

  if (device.openPorts.length > 0) {
    const ports = device.openPorts.map((p) => `${p.port}/${p.protocol}`).join(', ')
    lines.push(`Open Ports: ${ports}`)
  }

  if (device.snmpInfo?.sysDescr) {
    lines.push(`SNMP Description: ${device.snmpInfo.sysDescr}`)
  }

  return lines.join('\n')
}

function mapConfig(data: ITGlueConfigData): ITGlueConfig {
  return {
    id: String(data.id),
    name: data.attributes.name,
    organizationId: String(data.attributes['organization-id']),
    configurationTypeId: String(data.attributes['configuration-type-id']),
    primaryIp: data.attributes['primary-ip'],
    macAddress: data.attributes['mac-address'],
    hostname: data.attributes.hostname,
    notes: data.attributes.notes,
  }
}
