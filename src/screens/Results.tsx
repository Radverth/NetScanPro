import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import { useIPC } from '../hooks/useIPC'
import DeviceCard, { DEVICE_LABELS } from '../components/DeviceCard'
import FilterBar from '../components/FilterBar'
import type { DiscoveredHost, DeviceType } from '../../electron/types'

export default function Results(): React.ReactElement {
  const { scanSession, mode, selectedOrg, customerName, setScreen, setSyncResult, setIsSyncing } =
    useAppStore()
  const { syncDevices } = useIPC()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<DeviceType | 'all'>('all')
  const [selectedHost, setSelectedHost] = useState<DiscoveredHost | null>(null)
  const [isSyncingLocal, setIsSyncingLocal] = useState(false)

  const hosts = scanSession?.hosts ?? []

  const deviceTypeCounts = useMemo(() => {
    const counts: Partial<Record<DeviceType, number>> = {}
    for (const h of hosts) {
      counts[h.deviceType] = (counts[h.deviceType] ?? 0) + 1
    }
    return counts
  }, [hosts])

  const filtered = useMemo(() => {
    return hosts.filter((h) => {
      if (activeFilter !== 'all' && h.deviceType !== activeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          h.ip.includes(q) ||
          (h.hostname ?? '').toLowerCase().includes(q) ||
          (h.vendor ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [hosts, activeFilter, search])

  const grouped = useMemo(() => {
    const order: DeviceType[] = [
      'router_firewall',
      'managed_switch',
      'wireless_ap',
      'windows_server',
      'linux_server',
      'dhcp_server',
      'dns_server',
      'nas_storage',
      'printer_mfp',
      'voip_phone',
      'windows_pc',
      'mac_endpoint',
      'unknown',
    ]
    const map = new Map<DeviceType, DiscoveredHost[]>()
    for (const h of filtered) {
      const arr = map.get(h.deviceType) ?? []
      arr.push(h)
      map.set(h.deviceType, arr)
    }
    return order.filter((t) => map.has(t)).map((t) => ({ type: t, hosts: map.get(t)! }))
  }, [filtered])

  const handleExportSync = async () => {
    if (!scanSession) return

    if (mode === 'itglue' && selectedOrg) {
      setIsSyncingLocal(true)
      setIsSyncing(true)
      try {
        const result = await syncDevices({
          ...scanSession,
          orgId: selectedOrg.id,
          orgName: selectedOrg.name,
        })
        setSyncResult(result)
      } catch (err) {
        console.error('Sync failed:', err)
      } finally {
        setIsSyncingLocal(false)
        setIsSyncing(false)
      }
    }
    setScreen('export-confirm')
  }

  if (!scanSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">No scan results available.</p>
      </div>
    )
  }

  const durationSec = Math.round(scanSession.scanDuration / 1000)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <svg className="h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {mode === 'itglue' ? selectedOrg?.name : customerName}
            </p>
            <p className="text-xs text-slate-500">
              {hosts.length} devices · {scanSession.subnets.length} subnet
              {scanSession.subnets.length !== 1 ? 's' : ''} · {durationSec}s
            </p>
          </div>
        </div>

        <button
          onClick={handleExportSync}
          disabled={isSyncingLocal}
          className="flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
        >
          {isSyncingLocal ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
              Syncing…
            </>
          ) : (
            <>
              {mode === 'itglue' ? 'Export & Sync' : 'Export PDF'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </header>

      {/* Summary bar */}
      <div className="flex gap-6 border-b border-slate-800 bg-slate-900/50 px-8 py-3">
        {Object.entries(deviceTypeCounts)
          .filter(([, count]) => (count ?? 0) > 0)
          .slice(0, 6)
          .map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{DEVICE_LABELS[type as DeviceType]}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                {count}
              </span>
            </div>
          ))}
        {hosts.filter((h) => h.deviceType === 'unknown').length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-amber-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs">
              {hosts.filter((h) => h.deviceType === 'unknown').length} unclassified
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 px-8 py-6">
        {/* Filter bar */}
        <div className="mb-6">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            deviceTypeCounts={deviceTypeCounts}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-800">
            <p className="text-sm text-slate-500">No devices match your filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ type, hosts: groupHosts }) => (
              <div key={type}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {DEVICE_LABELS[type]} ({groupHosts.length})
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {groupHosts.map((host) => (
                    <DeviceCard
                      key={host.ip}
                      host={host}
                      showSyncStatus={mode === 'itglue'}
                      onClick={() => setSelectedHost(host)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Device detail drawer */}
      {selectedHost && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedHost(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                {selectedHost.hostname ?? selectedHost.ip}
              </h2>
              <button
                onClick={() => setSelectedHost(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {[
                ['IP Address', selectedHost.ip],
                ['MAC Address', selectedHost.mac],
                ['Hostname', selectedHost.hostname],
                ['Vendor', selectedHost.vendor],
                ['Subnet', selectedHost.subnetCidr],
                ['DNS PTR', selectedHost.dnsPtr],
                ['OS', selectedHost.os ? `${selectedHost.os.name} (${selectedHost.os.accuracy}% confidence)` : null],
                ['Device Type', DEVICE_LABELS[selectedHost.deviceType]],
              ].map(([label, value]) =>
                value ? (
                  <div key={label as string}>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-0.5 text-sm text-slate-200">{value}</p>
                  </div>
                ) : null,
              )}

              {selectedHost.openPorts.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Open Ports ({selectedHost.openPorts.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHost.openPorts.map((p) => (
                      <span
                        key={`${p.port}/${p.protocol}`}
                        className="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300"
                        title={`${p.service}${p.version ? ` ${p.version}` : ''}`}
                      >
                        {p.port}/{p.protocol}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedHost.snmpInfo && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">SNMP</p>
                  <p className="text-xs text-slate-400">{selectedHost.snmpInfo.sysDescr}</p>
                </div>
              )}

              {mode === 'itglue' && (
                <div>
                  <p className="text-xs font-medium text-slate-500">IT Glue Status</p>
                  <p className="mt-0.5 text-sm capitalize text-slate-300">
                    {selectedHost.syncStatus}
                    {selectedHost.itGlueId && (
                      <span className="ml-2 text-xs text-slate-500">ID {selectedHost.itGlueId}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
