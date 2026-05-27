import * as snmp from 'net-snmp'
import type { SNMPInfo, SNMPInterface } from '../types'

// OID constants
const OID_SYS_DESCR = '1.3.6.1.2.1.1.1.0'
const OID_SYS_NAME = '1.3.6.1.2.1.1.5.0'
const OID_SYS_LOCATION = '1.3.6.1.2.1.1.6.0'
const OID_IF_TABLE = '1.3.6.1.2.1.2.2'

/**
 * Walk SNMP on a single host. Returns SNMPInfo or null if unreachable/error.
 */
export async function runSnmpWalk(
  ip: string,
  community: string,
  signal?: AbortSignal,
): Promise<SNMPInfo | null> {
  if (signal?.aborted) return null

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null)
      return
    }

    const session = snmp.createSession(ip, community || 'public', {
      version: snmp.Version2c,
      timeout: 3000,
      retries: 1,
    })

    const result: SNMPInfo = {
      sysDescr: '',
      sysName: '',
      sysLocation: '',
      interfaces: [],
    }

    let completed = false
    const done = (data: SNMPInfo | null) => {
      if (completed) return
      completed = true
      session.close()
      resolve(data)
    }

    // Set a global timeout
    const globalTimeout = setTimeout(() => done(null), 8000)

    // Get system info OIDs
    const sysOids = [OID_SYS_DESCR, OID_SYS_NAME, OID_SYS_LOCATION]

    session.get(sysOids, (error: Error | null, varbinds: snmp.VarBind[]) => {
      if (error || !varbinds) {
        clearTimeout(globalTimeout)
        done(null)
        return
      }

      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) continue
        const oid = vb.oid
        const val = vb.value?.toString() ?? ''

        if (oid === OID_SYS_DESCR) result.sysDescr = val
        else if (oid === OID_SYS_NAME) result.sysName = val
        else if (oid === OID_SYS_LOCATION) result.sysLocation = val
      }

      // Walk interface table
      const interfaces: SNMPInterface[] = []
      let ifIndex = 0

      session.walk(
        OID_IF_TABLE,
        20,
        (vb: snmp.VarBind) => {
          if (snmp.isVarbindError(vb)) return
          // ifDescr is 1.3.6.1.2.1.2.2.1.2.X
          const oidParts = vb.oid.split('.')
          const column = parseInt(oidParts[oidParts.length - 2] ?? '0', 10)
          const idx = parseInt(oidParts[oidParts.length - 1] ?? '0', 10)

          if (idx > ifIndex) {
            ifIndex = idx
            interfaces.push({
              index: idx,
              descr: '',
              type: 0,
              speed: 0,
              physAddress: '',
            })
          }

          const iface = interfaces.find((i) => i.index === idx)
          if (!iface) return

          const val = vb.value
          if (column === 2) iface.descr = val?.toString() ?? ''       // ifDescr
          else if (column === 3) iface.type = parseInt(val?.toString() ?? '0', 10)  // ifType
          else if (column === 5) iface.speed = parseInt(val?.toString() ?? '0', 10) // ifSpeed
          else if (column === 6) iface.physAddress = formatMacFromBuffer(val)         // ifPhysAddress
        },
        (error: Error | null) => {
          clearTimeout(globalTimeout)
          if (!error) {
            result.interfaces = interfaces
          }
          done(result)
        },
      )
    })
  })
}

function formatMacFromBuffer(val: unknown): string {
  if (!val) return ''
  if (Buffer.isBuffer(val)) {
    return Array.from(val)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':')
  }
  return String(val)
}

// Re-export snmp type for use in other modules
export type { SNMPInfo }
