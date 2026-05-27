import React from 'react'
import type { DiscoveredHost, DeviceType } from '../../electron/types'

const DEVICE_ICONS: Record<DeviceType, string> = {
  router_firewall: '🛡️',
  managed_switch: '🔀',
  wireless_ap: '📡',
  windows_server: '🖥️',
  linux_server: '🐧',
  nas_storage: '💾',
  printer_mfp: '🖨️',
  voip_phone: '📞',
  windows_pc: '💻',
  mac_endpoint: '🍎',
  dhcp_server: '📋',
  dns_server: '🌐',
  unknown: '❓',
}

const DEVICE_LABELS: Record<DeviceType, string> = {
  router_firewall: 'Router / Firewall',
  managed_switch: 'Managed Switch',
  wireless_ap: 'Access Point',
  windows_server: 'Windows Server',
  linux_server: 'Linux Server',
  nas_storage: 'NAS / Storage',
  printer_mfp: 'Printer / MFP',
  voip_phone: 'VoIP Phone',
  windows_pc: 'End-User PC',
  mac_endpoint: 'Mac Endpoint',
  dhcp_server: 'DHCP Server',
  dns_server: 'DNS Server',
  unknown: 'Unknown Device',
}

const SYNC_DOT: Record<DiscoveredHost['syncStatus'], { color: string; label: string }> = {
  pending: { color: 'bg-slate-500', label: 'Pending' },
  created: { color: 'bg-green-500', label: 'Created' },
  updated: { color: 'bg-blue-500', label: 'Updated' },
  unchanged: { color: 'bg-slate-600', label: 'Unchanged' },
  error: { color: 'bg-red-500', label: 'Error' },
}

interface Props {
  host: DiscoveredHost
  showSyncStatus?: boolean
  onClick?: () => void
}

export default function DeviceCard({ host, showSyncStatus = false, onClick }: Props): React.ReactElement {
  const sync = SYNC_DOT[host.syncStatus]
  const displayName = host.hostname ?? host.ip
  const osName = host.os?.name ?? host.os?.family ?? null

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition-all hover:border-amber-400/50 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none" role="img" aria-label={DEVICE_LABELS[host.deviceType]}>
            {DEVICE_ICONS[host.deviceType]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100" title={displayName}>
              {displayName}
            </p>
            <p className="text-xs text-slate-400">{host.ip}</p>
          </div>
        </div>
        {showSyncStatus && (
          <div className="flex items-center gap-1.5" title={sync.label}>
            <span className={`h-2 w-2 rounded-full ${sync.color}`} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {osName && (
          <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            {osName}
          </span>
        )}
        {host.vendor && (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {host.vendor}
          </span>
        )}
        {host.openPorts.length > 0 && (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {host.openPorts.length} port{host.openPorts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">{DEVICE_LABELS[host.deviceType]}</p>
    </button>
  )
}

export { DEVICE_LABELS, DEVICE_ICONS }
