import { rateLimitedGet, rateLimitedPost } from './client'
import type { ITGlueOrg } from '../types'

interface ITGlueOrgResponse {
  data: {
    id: string
    attributes: {
      name: string
      primary_domain: string | null
      phone: string | null
    }
  }[]
  meta?: {
    total_count: number
    current_page: number
    total_pages: number
  }
}

interface ITGlueOrgSingleResponse {
  data: {
    id: string
    attributes: {
      name: string
      primary_domain: string | null
      phone: string | null
    }
  }
}

/**
 * Search IT Glue organizations by name.
 * Returns up to 50 matching orgs.
 */
export async function searchOrganizations(query: string): Promise<ITGlueOrg[]> {
  if (!query.trim()) {
    // Return first page of all orgs
    const response = await rateLimitedGet<ITGlueOrgResponse>('/organizations', {
      'page[size]': 50,
      'page[number]': 1,
    })
    return mapOrgs(response.data)
  }

  const response = await rateLimitedGet<ITGlueOrgResponse>('/organizations', {
    filter: { name: query },
    'page[size]': 50,
  })

  return mapOrgs(response.data)
}

/**
 * Create a new IT Glue organization.
 */
export async function createOrganization(data: {
  name: string
  primaryDomain?: string
}): Promise<ITGlueOrg> {
  const payload = {
    data: {
      type: 'organizations',
      attributes: {
        name: data.name,
        primary_domain: data.primaryDomain ?? null,
      },
    },
  }

  const response = await rateLimitedPost<ITGlueOrgSingleResponse>('/organizations', payload)
  const org = response.data.data
  return {
    id: String(org.id),
    name: org.attributes.name,
    primaryDomain: org.attributes.primary_domain,
    phone: org.attributes.phone,
  }
}

/**
 * Get an organization by ID.
 */
export async function getOrganizationById(id: string): Promise<ITGlueOrg | null> {
  try {
    const response = await rateLimitedGet<ITGlueOrgSingleResponse>(`/organizations/${id}`)
    const org = response.data.data
    return {
      id: String(org.id),
      name: org.attributes.name,
      primaryDomain: org.attributes.primary_domain,
      phone: org.attributes.phone,
    }
  } catch {
    return null
  }
}

function mapOrgs(response: ITGlueOrgResponse): ITGlueOrg[] {
  if (!response.data || !Array.isArray(response.data)) return []
  return response.data.map((item) => ({
    id: String(item.id),
    name: item.attributes.name,
    primaryDomain: item.attributes.primary_domain,
    phone: item.attributes.phone,
  }))
}
