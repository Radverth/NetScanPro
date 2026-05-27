import { rateLimitedGet, rateLimitedPost, rateLimitedPatch } from './client'
import type { ITGlueFlexibleAsset, SubnetInfo } from '../types'

interface FlexibleAssetData {
  id: string
  attributes: {
    name: string
    'organization-id': number
    'flexible-asset-type-id': number
    traits: Record<string, unknown>
  }
}

interface FlexibleAssetsResponse {
  data: FlexibleAssetData[]
  meta?: {
    total_count: number
    current_page: number
    total_pages: number
  }
}

interface FlexibleAssetResponse {
  data: FlexibleAssetData
}

// Network Documentation flexible asset type ID (standard in most IT Glue accounts)
const NETWORK_ASSET_TYPE_ID = 3

/**
 * Get all network documentation flexible assets for an organization.
 */
export async function getNetworkAssets(orgId: string): Promise<ITGlueFlexibleAsset[]> {
  const assets: ITGlueFlexibleAsset[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await rateLimitedGet<FlexibleAssetsResponse>('/flexible_assets', {
      'filter[organization-id]': orgId,
      'filter[flexible-asset-type-id]': NETWORK_ASSET_TYPE_ID,
      'page[size]': 100,
      'page[number]': page,
    })

    const data = response.data
    if (!data.data || !Array.isArray(data.data)) break

    assets.push(...data.data.map(mapAsset))
    totalPages = data.meta?.total_pages ?? 1
    page++

    if (page > totalPages) break
  }

  return assets
}

/**
 * Create a new network documentation asset in IT Glue.
 */
export async function createNetworkAsset(orgId: string, subnet: SubnetInfo): Promise<ITGlueFlexibleAsset> {
  const payload = {
    data: {
      type: 'flexible-assets',
      attributes: {
        'organization-id': parseInt(orgId, 10),
        'flexible-asset-type-id': NETWORK_ASSET_TYPE_ID,
        traits: buildSubnetTraits(subnet),
      },
    },
  }

  const response = await rateLimitedPost<FlexibleAssetResponse>('/flexible_assets', payload)
  return mapAsset(response.data.data)
}

/**
 * Update an existing network documentation asset.
 */
export async function updateNetworkAsset(
  id: string,
  subnet: SubnetInfo,
): Promise<ITGlueFlexibleAsset> {
  const payload = {
    data: {
      type: 'flexible-assets',
      id,
      attributes: {
        traits: buildSubnetTraits(subnet),
      },
    },
  }

  const response = await rateLimitedPatch<FlexibleAssetResponse>(`/flexible_assets/${id}`, payload)
  return mapAsset(response.data.data)
}

function buildSubnetTraits(subnet: SubnetInfo): Record<string, unknown> {
  return {
    name: subnet.cidr,
    'network-address': subnet.cidr,
    'default-gateway': subnet.gateway ?? '',
    'dhcp-server': subnet.dhcpServer ?? '',
    'vlan-id': subnet.vlanId ?? '',
    'host-count': subnet.hosts.length,
    'last-scanned': new Date().toISOString(),
  }
}

function mapAsset(data: FlexibleAssetData): ITGlueFlexibleAsset {
  return {
    id: String(data.id),
    organizationId: String(data.attributes['organization-id']),
    flexibleAssetTypeId: String(data.attributes['flexible-asset-type-id']),
    name: data.attributes.name,
    traits: data.attributes.traits,
  }
}
