import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import log from '../logger'
import type { ScanConfig, ScanSession, ScanProgress, DiscoveredHost, SubnetInfo } from '../types'
import { runArpSweep } from '../scanner/arp'
import { runNmapScan } from '../scanner/nmap'
import { readDhcpLeases } from '../scanner/dhcp'
import { resolveAllPTR } from '../scanner/dns'
import { runSnmpWalk } from '../scanner/snmp'
import { classifyHost } from '../scanner/classifier'
import { deriveSubnets } from '../scanner/subnet'
import { addScanToHistory } from '../store'

let scanAbortController: AbortController | null = null

const PHASES = [
  'ARP Sweep',
  'Port Scan',
  'OS Detection',
  'DHCP Lease Read',
  'DNS PTR Lookups',
  'SNMP Walk',
  'Classification',
  'Finalizing',
]

function emitProgress(win: BrowserWindow | null, progress: ScanProgress): void {
  win?.webContents.send('scan:progress', progress)
}

export function registerScanHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('scan:start', async (_event, config: ScanConfig) => {
    scanAbortController = new AbortController()
    const { signal } = scanAbortController

    const sessionId = uuidv4()
    const startedAt = new Date()
    const win = mainWindow

    log.info(`Scan started — session=${sessionId} range=${config.ipRange} speed=${config.speed}`)

    try {
      // Phase 0: ARP Sweep
      emitProgress(win, {
        phase: PHASES[0],
        phaseIndex: 0,
        totalPhases: PHASES.length,
        hostsFound: 0,
        hostsTotal: 0,
        currentHost: '',
        percentComplete: 0,
      })

      const arpEntries = await runArpSweep(config.ipRange, signal)
      log.info(`ARP sweep complete — ${arpEntries.length} hosts found`)
      if (signal.aborted) throw new Error('Scan cancelled')

      const totalHosts = arpEntries.length

      // Build host map
      const hostMap = new Map<string, Partial<DiscoveredHost>>()
      for (const entry of arpEntries) {
        hostMap.set(entry.ip, {
          ip: entry.ip,
          mac: entry.mac,
          vendor: entry.vendor,
          openPorts: [],
          services: [],
          snmpInfo: null,
          dhcpLease: null,
          dnsPtr: null,
          itGlueId: null,
          syncStatus: 'pending',
          lastSeen: new Date(),
        })
      }

      // Phase 1-2: Nmap port + OS scan
      emitProgress(win, {
        phase: PHASES[1],
        phaseIndex: 1,
        totalPhases: PHASES.length,
        hostsFound: totalHosts,
        hostsTotal: totalHosts,
        currentHost: '',
        percentComplete: Math.round((1 / PHASES.length) * 100),
      })

      const ips = arpEntries.map((e) => e.ip)
      log.info(`Nmap scan starting — ${ips.length} hosts`)
      const nmapResults = await runNmapScan(ips, config.speed, signal)
      log.info(`Nmap scan complete — ${nmapResults.size} results`)
      if (signal.aborted) throw new Error('Scan cancelled')

      for (const [ip, nmapInfo] of nmapResults.entries()) {
        const host = hostMap.get(ip)
        if (host) {
          host.openPorts = nmapInfo.ports
          host.services = nmapInfo.ports.map((p) => ({
            name: p.service,
            version: p.version,
            info: '',
          }))
          host.os = nmapInfo.os ?? null
          host.hostname = nmapInfo.hostname ?? null
        }
      }

      // Phase 3: DHCP leases
      emitProgress(win, {
        phase: PHASES[3],
        phaseIndex: 3,
        totalPhases: PHASES.length,
        hostsFound: totalHosts,
        hostsTotal: totalHosts,
        currentHost: '',
        percentComplete: Math.round((3 / PHASES.length) * 100),
      })

      if (config.includeDhcpRead) {
        const leases = await readDhcpLeases(signal)
        if (!signal.aborted) {
          for (const lease of leases) {
            const host = hostMap.get(lease.ip)
            if (host) {
              host.dhcpLease = lease
              if (!host.hostname && lease.hostname) {
                host.hostname = lease.hostname
              }
            }
          }
        }
      }

      // Phase 4: DNS PTR
      emitProgress(win, {
        phase: PHASES[4],
        phaseIndex: 4,
        totalPhases: PHASES.length,
        hostsFound: totalHosts,
        hostsTotal: totalHosts,
        currentHost: '',
        percentComplete: Math.round((4 / PHASES.length) * 100),
      })

      const dnsResults = await resolveAllPTR(ips, signal)
      if (!signal.aborted) {
        for (const [ip, ptr] of dnsResults.entries()) {
          const host = hostMap.get(ip)
          if (host) {
            host.dnsPtr = ptr
            if (!host.hostname) host.hostname = ptr
          }
        }
      }

      // Phase 5: SNMP walk
      if (config.includeSnmp) {
        emitProgress(win, {
          phase: PHASES[5],
          phaseIndex: 5,
          totalPhases: PHASES.length,
          hostsFound: totalHosts,
          hostsTotal: totalHosts,
          currentHost: '',
          percentComplete: Math.round((5 / PHASES.length) * 100),
        })

        let snmpDone = 0
        for (const ip of ips) {
          if (signal.aborted) break
          const snmpInfo = await runSnmpWalk(ip, config.snmpCommunity, signal)
          const host = hostMap.get(ip)
          if (host && snmpInfo) {
            host.snmpInfo = snmpInfo
            if (!host.hostname && snmpInfo.sysName) {
              host.hostname = snmpInfo.sysName
            }
          }
          snmpDone++
          emitProgress(win, {
            phase: PHASES[5],
            phaseIndex: 5,
            totalPhases: PHASES.length,
            hostsFound: snmpDone,
            hostsTotal: totalHosts,
            currentHost: ip,
            percentComplete: Math.round(((5 + snmpDone / totalHosts) / PHASES.length) * 100),
          })
        }
      }

      // Phase 6: Classification
      emitProgress(win, {
        phase: PHASES[6],
        phaseIndex: 6,
        totalPhases: PHASES.length,
        hostsFound: totalHosts,
        hostsTotal: totalHosts,
        currentHost: '',
        percentComplete: Math.round((6 / PHASES.length) * 100),
      })

      const discoveredHosts: DiscoveredHost[] = []
      for (const [ip, partial] of hostMap.entries()) {
        const deviceType = classifyHost({
          ip,
          mac: partial.mac ?? '',
          hostname: partial.hostname ?? null,
          vendor: partial.vendor ?? null,
          os: partial.os ?? null,
          openPorts: partial.openPorts ?? [],
          services: partial.services ?? [],
          snmpInfo: partial.snmpInfo ?? null,
        })

        const subnet = deriveSubnet(ip)
        discoveredHosts.push({
          ip,
          mac: partial.mac ?? '',
          hostname: partial.hostname ?? null,
          vendor: partial.vendor ?? null,
          os: partial.os ?? null,
          openPorts: partial.openPorts ?? [],
          services: partial.services ?? [],
          deviceType,
          subnetCidr: subnet,
          dhcpLease: partial.dhcpLease ?? null,
          dnsPtr: partial.dnsPtr ?? null,
          snmpInfo: partial.snmpInfo ?? null,
          itGlueId: null,
          syncStatus: 'pending',
          lastSeen: new Date(),
        })
      }

      log.info(`Classification complete — ${discoveredHosts.length} hosts classified`)

      // Phase 7: Subnet derivation
      const subnets: SubnetInfo[] = deriveSubnets(discoveredHosts)
      const dhcpServers = discoveredHosts.filter((h) => h.deviceType === 'dhcp_server')
      const dnsServers = discoveredHosts.filter((h) => h.deviceType === 'dns_server')

      const completedAt = new Date()
      const session: ScanSession = {
        id: sessionId,
        orgId: '',
        orgName: '',
        startedAt,
        completedAt,
        hosts: discoveredHosts,
        subnets,
        dhcpServers,
        dnsServers,
        scanDuration: completedAt.getTime() - startedAt.getTime(),
        engineVersion: '1.0.0',
        mode: 'standalone',
      }

      emitProgress(win, {
        phase: PHASES[7],
        phaseIndex: 7,
        totalPhases: PHASES.length,
        hostsFound: discoveredHosts.length,
        hostsTotal: discoveredHosts.length,
        currentHost: '',
        percentComplete: 100,
      })

      const duration = completedAt.getTime() - startedAt.getTime()
      log.info(`Scan complete — ${discoveredHosts.length} hosts, ${subnets.length} subnets, ${duration}ms`)

      addScanToHistory(session)
      win?.webContents.send('scan:complete', session)
      return session
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message !== 'Scan cancelled') {
        log.error(`Scan error — ${message}`)
        win?.webContents.send('scan:error', message)
      } else {
        log.info('Scan cancelled by user')
      }
      throw err
    } finally {
      scanAbortController = null
    }
  })

  ipcMain.handle('scan:stop', async () => {
    if (scanAbortController) {
      scanAbortController.abort()
      scanAbortController = null
    }
  })
}

function deriveSubnet(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return '0.0.0.0/24'
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}
