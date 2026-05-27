import { ipcMain } from 'electron'
import type { ITGlueOrg, ScanSession, SyncResult } from '../types'
import { searchOrganizations, createOrganization } from '../itglue/orgs'
import { reconcileDevices } from '../itglue/reconcile'
import { getApiKey } from '../store'
import { createClient } from '../itglue/client'

export function registerITGlueHandlers(): void {
  ipcMain.handle('itglue:search-orgs', async (_event, query: string): Promise<ITGlueOrg[]> => {
    return searchOrganizations(query)
  })

  ipcMain.handle(
    'itglue:create-org',
    async (_event, data: { name: string; primaryDomain?: string }): Promise<ITGlueOrg> => {
      return createOrganization(data)
    },
  )

  ipcMain.handle('itglue:validate-key', async (_event, key: string): Promise<boolean> => {
    try {
      const client = createClient(key)
      const response = await client.get('/organizations', {
        params: { 'page[size]': 1 },
      })
      return response.status === 200
    } catch {
      return false
    }
  })

  ipcMain.handle('itglue:sync-devices', async (_event, session: ScanSession): Promise<SyncResult> => {
    const apiKey = getApiKey()
    if (!apiKey) {
      return {
        created: 0,
        updated: 0,
        unchanged: 0,
        errors: [{ ip: '', hostname: null, error: 'No API key configured' }],
      }
    }
    return reconcileDevices(session)
  })
}
