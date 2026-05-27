import puppeteer from 'puppeteer'
import type { ScanSession, DiscoveredHost, DeviceType } from '../types'

const NAVY = '#1B2A4A'
const AMBER = '#F5A623'
const LIGHT_NAVY = '#2a3f6b'
const DARK_BG = '#0f172a'

const DEVICE_LABELS: Record<DeviceType, string> = {
  router_firewall: 'Router / Firewall',
  managed_switch: 'Managed Switch',
  wireless_ap: 'Wireless Access Point',
  windows_server: 'Windows Server',
  linux_server: 'Linux Server',
  nas_storage: 'NAS / Storage',
  printer_mfp: 'Printer / MFP',
  voip_phone: 'VoIP Phone',
  windows_pc: 'End-User PC / Laptop',
  mac_endpoint: 'Mac Endpoint',
  dhcp_server: 'DHCP Server',
  dns_server: 'DNS Server',
  unknown: 'Unknown Device',
}

/**
 * Generate a PDF report for a scan session.
 */
export async function generatePDF(session: ScanSession, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    const html = buildHTML(session)
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    })
  } finally {
    await browser.close()
  }
}

function buildHTML(session: ScanSession): string {
  const scanDate = new Date(session.startedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const duration = formatDuration(session.scanDuration)
  const devicesByType = groupByType(session.hosts)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetScan Pro Report — ${escapeHtml(session.orgName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #1a1a2e;
      font-size: 10pt;
      line-height: 1.5;
    }
    .cover-page {
      height: 297mm;
      background: ${NAVY};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      padding: 40px;
    }
    .logo-area {
      text-align: center;
      margin-bottom: 40px;
    }
    .company-name {
      font-size: 32pt;
      font-weight: 700;
      color: #fff;
      letter-spacing: 2px;
    }
    .company-name span {
      color: ${AMBER};
    }
    .tagline {
      font-size: 14pt;
      color: ${AMBER};
      margin-top: 8px;
      letter-spacing: 1px;
    }
    .divider {
      width: 80px;
      height: 4px;
      background: ${AMBER};
      margin: 30px auto;
    }
    .report-title {
      font-size: 28pt;
      font-weight: 600;
      color: #fff;
      text-align: center;
    }
    .org-name {
      font-size: 18pt;
      color: ${AMBER};
      text-align: center;
      margin-top: 12px;
    }
    .scan-meta {
      color: rgba(255,255,255,0.7);
      text-align: center;
      margin-top: 20px;
      font-size: 11pt;
    }
    .cover-footer {
      position: absolute;
      bottom: 30px;
      color: rgba(255,255,255,0.4);
      font-size: 9pt;
    }
    .page-section {
      padding: 20px 0;
      page-break-inside: avoid;
    }
    h1 {
      font-size: 18pt;
      font-weight: 700;
      color: ${NAVY};
      border-bottom: 3px solid ${AMBER};
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: ${NAVY};
      margin: 20px 0 10px 0;
    }
    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: ${LIGHT_NAVY};
      margin: 12px 0 6px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: ${NAVY};
      color: #fff;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 28pt;
      font-weight: 700;
      color: ${AMBER};
      display: block;
    }
    .stat-label {
      font-size: 9pt;
      opacity: 0.8;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9pt;
    }
    th {
      background: ${NAVY};
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f8f9fa;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }
    .badge-amber {
      background: ${AMBER}33;
      color: #8a5c00;
    }
    .badge-green {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-gray {
      background: #f3f4f6;
      color: #374151;
    }
    .type-header {
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${NAVY}11;
      padding: 10px 12px;
      border-left: 4px solid ${AMBER};
      border-radius: 0 4px 4px 0;
      margin: 16px 0 8px 0;
    }
    .type-count {
      background: ${AMBER};
      color: ${NAVY};
      font-weight: 700;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10pt;
    }
    .subnet-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .subnet-header {
      background: ${NAVY};
      color: #fff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .subnet-cidr {
      font-family: monospace;
      font-size: 12pt;
      font-weight: 700;
    }
    .subnet-body {
      padding: 12px 16px;
    }
    .subnet-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 10px;
      font-size: 9pt;
    }
    .subnet-meta-item label {
      display: block;
      color: #6b7280;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 8pt;
      padding: 20px 0 10px 0;
      border-top: 1px solid #e5e7eb;
      margin-top: 30px;
    }
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    @page :first {
      margin: 0;
    }
  </style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page" style="position: relative;">
  <div class="logo-area">
    <div class="company-name">Affinity<span>IT</span></div>
    <div class="tagline">Technology. Together.</div>
  </div>
  <div class="divider"></div>
  <div class="report-title">Network Discovery Report</div>
  <div class="org-name">${escapeHtml(session.orgName)}</div>
  <div class="scan-meta">
    <div>Scan Date: ${scanDate}</div>
    <div>Duration: ${duration} &bull; ${session.hosts.length} devices discovered</div>
    <div style="margin-top: 8px;">Engine v${session.engineVersion} &bull; Mode: ${session.mode === 'itglue' ? 'IT Glue Sync' : 'Standalone'}</div>
  </div>
  <div class="cover-footer">
    Confidential — Prepared by Affinity IT &bull; ${new Date().getFullYear()}
  </div>
</div>

<!-- Executive Summary -->
<div class="page-section">
  <h1>Executive Summary</h1>
  <div class="summary-grid">
    <div class="stat-card">
      <span class="stat-number">${session.hosts.length}</span>
      <div class="stat-label">Total Devices</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${session.subnets.length}</span>
      <div class="stat-label">Subnets</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${Object.keys(devicesByType).length}</span>
      <div class="stat-label">Device Types</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${session.hosts.filter((h) => h.syncStatus === 'created' || h.syncStatus === 'updated').length}</span>
      <div class="stat-label">IT Glue Synced</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Device Type</th>
        <th>Count</th>
        <th>% of Total</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(devicesByType)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(
          ([type, hosts]) => `
        <tr>
          <td>${DEVICE_LABELS[type as DeviceType] ?? type}</td>
          <td>${hosts.length}</td>
          <td>${Math.round((hosts.length / session.hosts.length) * 100)}%</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>
</div>

<!-- Device Inventory -->
<div class="page-section">
  <h1>Device Inventory</h1>
  ${Object.entries(devicesByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(
      ([type, hosts]) => `
    <div>
      <div class="type-header">
        <div class="type-count">${hosts.length}</div>
        <h2 style="margin: 0; border: none; padding: 0;">${DEVICE_LABELS[type as DeviceType] ?? type}</h2>
      </div>
      ${buildDeviceTable(hosts)}
    </div>`,
    )
    .join('')}
</div>

<!-- Subnet Overview -->
${
  session.subnets.length > 0
    ? `<div class="page-section">
  <h1>Network / Subnet Overview</h1>
  ${session.subnets
    .map(
      (subnet) => `
  <div class="subnet-card">
    <div class="subnet-header">
      <span class="subnet-cidr">${escapeHtml(subnet.cidr)}</span>
      <span>${subnet.hosts.length} hosts</span>
    </div>
    <div class="subnet-body">
      <div class="subnet-meta">
        <div class="subnet-meta-item">
          <label>Gateway</label>
          <span>${escapeHtml(subnet.gateway ?? 'Not detected')}</span>
        </div>
        <div class="subnet-meta-item">
          <label>DHCP Server</label>
          <span>${escapeHtml(subnet.dhcpServer ?? 'Not detected')}</span>
        </div>
        <div class="subnet-meta-item">
          <label>VLAN ID</label>
          <span>${subnet.vlanId ?? 'N/A'}</span>
        </div>
      </div>
    </div>
  </div>`,
    )
    .join('')}
</div>`
    : ''
}

<div class="footer">
  NetScan Pro v${session.engineVersion} &bull; Affinity IT &bull; Technology. Together. &bull;
  Report generated ${new Date().toLocaleString('en-AU')}
</div>

</body>
</html>`
}

function buildDeviceTable(hosts: DiscoveredHost[]): string {
  return `<table>
    <thead>
      <tr>
        <th>Hostname</th>
        <th>IP Address</th>
        <th>MAC Address</th>
        <th>Vendor</th>
        <th>OS</th>
        <th>Open Ports</th>
        <th>IT Glue</th>
      </tr>
    </thead>
    <tbody>
      ${hosts
        .map(
          (host) => `
      <tr>
        <td>${escapeHtml(host.hostname ?? '—')}</td>
        <td style="font-family: monospace;">${escapeHtml(host.ip)}</td>
        <td style="font-family: monospace; font-size: 8pt;">${escapeHtml(host.mac || '—')}</td>
        <td>${escapeHtml(host.vendor ?? '—')}</td>
        <td>${host.os ? `<span class="badge badge-amber">${escapeHtml(host.os.name)}</span>` : '—'}</td>
        <td style="font-size: 8pt;">${host.openPorts.slice(0, 6).map((p) => p.port).join(', ') || '—'}</td>
        <td>${syncStatusBadge(host.syncStatus)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>`
}

function syncStatusBadge(status: string): string {
  switch (status) {
    case 'created':
      return '<span class="badge badge-green">Created</span>'
    case 'updated':
      return '<span class="badge badge-blue">Updated</span>'
    case 'unchanged':
      return '<span class="badge badge-gray">Unchanged</span>'
    case 'error':
      return '<span class="badge" style="background:#fee2e2;color:#991b1b;">Error</span>'
    default:
      return '<span class="badge badge-gray">—</span>'
  }
}

function groupByType(hosts: DiscoveredHost[]): Record<string, DiscoveredHost[]> {
  const groups: Record<string, DiscoveredHost[]> = {}
  for (const host of hosts) {
    if (!groups[host.deviceType]) groups[host.deviceType] = []
    groups[host.deviceType]!.push(host)
  }
  return groups
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
