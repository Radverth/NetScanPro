# NetScan Pro — Affinity IT Edition

> **Technology. Together.**

A cross-platform Electron desktop application for Affinity IT sales engineers. Boot the app on-site, select or create the prospect in IT Glue, trigger a scan, review auto-categorised results, and export a polished branded PDF — all in under five minutes.

---

## Features

- **Network Discovery** — ARP sweep, Nmap port + OS detection, DHCP lease harvesting, DNS PTR resolution, optional SNMP walk
- **Device Classification** — 13 device types (routers, switches, APs, Windows/Linux servers, NAS, printers, VoIP phones, end-user PCs, Macs, DHCP/DNS servers, unknown), driven by a hot-reloadable `rules.json`
- **IT Glue Integration** — Fuzzy-match org selector (Fuse.js), reconciliation engine (match on MAC → IP+hostname → hostname), never duplicates or deletes records
- **Standalone Mode** — Full scan + PDF export with no IT Glue account required
- **Branded PDF Export** — Puppeteer-generated report with cover page, exec summary, per-type device tables, subnet topology section (Affinity IT navy + amber)
- **Auto-Update** — Silent background updates via electron-updater from GitHub Releases; no user action required

---

## Workflow

```
Launch → Select Org (or enter customer name) → Start Scan → Review Results → Export & Sync
```

Four screens, strictly linear. The full workflow takes ≤ 5 button presses from a fresh launch.

| Screen | IT Glue Mode | Standalone Mode |
|---|---|---|
| 1. Start | Fuzzy org search / create org | Free-text customer name + scan options |
| 2. Scan Progress | Animated ring, live host counter, phase list | Same |
| 3. Results | Card grid, filter, device detail, sync badges | Card grid, filter, device detail |
| 4. Export | PDF export + IT Glue sync summary | PDF export only |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Electron 30 |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State | Zustand |
| Network scanning | Node.js + nmap + arp-scan |
| DHCP / DNS | Node.js `dns` module + lease file parsing |
| SNMP | net-snmp (optional) |
| Fuzzy search | Fuse.js |
| IT Glue API | Axios + p-limit rate limiter |
| PDF export | Puppeteer (headless Chromium) |
| Auto-update | electron-updater |
| Packaging | electron-builder (Windows NSIS + Linux .deb) |
| Tests | Vitest |

---

## Getting Started

### Prerequisites

- Node.js 20+
- [nmap](https://nmap.org/download.html) installed and on `PATH`
- Administrator / root privileges for ARP sweep and OS fingerprinting (the installer requests this once)

### Development

```bash
npm install
npm run dev
```

This starts the Vite dev server and Electron simultaneously.

### Build

```bash
# Type-check only
npm run typecheck

# Run tests
npm test

# Production build (renderer + electron)
npm run build

# Package for current platform
npm run dist
```

### First Launch

1. The app opens in **Standalone Mode** by default — no API key needed
2. To enable IT Glue sync, open **Settings** (gear icon, top-right) and switch to **IT Glue Mode**
3. Paste your IT Glue API key and click **Test** to validate

---

## IT Glue API Key

Generate a key at **IT Glue → Account → API Keys**. The key is stored encrypted on-device via Electron `safeStorage` (OS keychain delegation on Windows/macOS). It is never transmitted anywhere except IT Glue's own API.

---

## Scan Phases

| # | Phase | Method |
|---|---|---|
| 1 | Host Discovery | ARP sweep + ICMP ping |
| 2 | Port Scan | Nmap `-sV` top 1000 ports |
| 3 | OS Detection | Nmap `-O`; falls back to TTL heuristic |
| 4 | DHCP Leases | Local lease file or WMI (Windows) |
| 5 | DNS PTR | Reverse lookups for all found IPs |
| 6 | SNMP Walk | SNMPv2c community string (optional) |
| 7 | Classification | Rule engine against `rules.json` |
| 8 | Finalizing | Subnet derivation, session assembly |

Scan speed presets: **Fast** (ARP + top 100 ports, < 60 s) · **Balanced** (top 1000 + OS, 2–3 min) · **Thorough** (all ports + SNMP + full OS, 5–10 min)

---

## Device Classification

Rules live in `electron/scanner/rules.json` and are loaded at runtime — no code release needed to update detection logic.

| Device Type | Primary Signals |
|---|---|
| Router / Firewall | OS keyword (Cisco, Fortinet, etc.) or hostname (fw, gw, router) |
| Managed Switch | SNMP sysDescr (switch, catalyst, procurve) + port 161 |
| Wireless AP | Vendor OUI (Ubiquiti, Aruba) + hostname (ap, unifi) |
| DHCP Server | Port 67 + DHCP service banner |
| DNS Server | Port 53 + BIND/named/Windows DNS service |
| Windows Server | OS fingerprint "Windows Server" |
| Linux Server | Linux OS + web/DB service (nginx, postgres, etc.) |
| NAS / Storage | Synology/QNAP OUI + ports 5000/2049 |
| Printer / MFP | Port 9100 |
| VoIP Phone | Port 5060 (SIP) |
| End-User PC | Windows 10/11 OS + DESKTOP-/LAPTOP- hostname |
| Mac Endpoint | macOS fingerprint or Apple OUI |
| Unknown | No rule matched — flagged for review |

---

## IT Glue Write-Back

- Pulls existing configurations for the org before writing
- Match priority: **MAC address** → **IP + hostname** → **hostname only**
- Creates new records for new devices; updates changed records; leaves unchanged records alone
- **Never deletes** IT Glue records — a `Last Seen` custom field tracks stale devices
- Rate limited to 10 concurrent requests (IT Glue allows 100 req / 10 s)
- Failed writes logged and downloadable as CSV from the Export screen

---

## PDF Report

Generated by Puppeteer from the live React component tree. Contents:

1. **Cover page** — Affinity IT logo, "Technology. Together.", customer name, scan date
2. **Executive summary** — Device counts by type, subnet count, scan duration
3. **Per-type tables** — IP, hostname, MAC, vendor, OS, open ports, notes
4. **Subnet section** — Derived /24 subnets with gateway and DHCP server
5. **Unknown devices** — Flagged for manual review
6. **Footer** — Affinity IT branding, page X of Y, scan timestamp, IT Glue sync status

In Standalone Mode the footer reads *"Standalone export — Affinity IT · local data only"*.

---

## Auto-Update

On every launch the app checks GitHub Releases for a newer version. If found, it downloads in the background and installs on next launch — no user action, no visit to a website. A non-blocking toast notifies the engineer.

Update check timeout: **8 seconds** (app continues normally if offline).

---

## CI / CD

| Trigger | Workflow | Output |
|---|---|---|
| Push to `main` / PR | `build.yml` | TypeScript check + Vitest tests |
| Push tag `v*` | `release.yml` | Signed `.exe` (Windows) + `.deb` (Linux) uploaded to GitHub Releases |

### Release a new version

```bash
npm version patch   # or minor / major
git push --follow-tags
```

The `release.yml` workflow builds both platforms, signs the Windows installer with the EV certificate stored in GitHub Secrets, and publishes the release. electron-updater picks it up automatically on the next app launch.

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `WINDOWS_CERTIFICATE_PFX` | Base64-encoded EV code signing certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password |

---

## Project Structure

```
netscan-pro/
├── .github/workflows/
│   ├── build.yml          # CI: typecheck + tests
│   └── release.yml        # CD: build + sign + publish
├── electron/
│   ├── main.ts            # Electron entry point
│   ├── preload.ts         # contextBridge IPC definitions
│   ├── ipc/               # IPC handler registrations
│   ├── scanner/           # ARP, Nmap, DHCP, DNS, SNMP, classifier, subnet
│   ├── itglue/            # IT Glue API client + reconciliation
│   ├── pdf/               # Puppeteer PDF generator
│   └── store.ts           # electron-store (encrypted API key)
├── src/                   # React renderer
│   ├── screens/           # OrgSelector, ScanProgress, Results, ExportConfirm
│   ├── components/        # DeviceCard, FilterBar, OrgSearchInput, UpdateToast, SettingsModal
│   ├── store/             # Zustand app store
│   ├── hooks/             # useIPC, useScan
│   └── types/             # window.electronAPI type declarations
├── tests/
│   ├── unit/              # Vitest: classifier, subnet
│   └── fixtures/          # 20+ host profile fixtures
├── electron-builder.config.js
├── vite.config.ts
└── package.json
```

---

## Security

- `contextIsolation: true` — renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — all native access via typed IPC channels only
- `webSecurity: true` — no mixed content
- API key encrypted at rest via `safeStorage` (OS keychain on Windows/macOS)
- Scan data held in memory only — not persisted beyond the exported PDF
- No telemetry, analytics, or crash reporting by default
- Outbound network: IT Glue API only (`api.itglue.com`)

---

## License

MIT — see [LICENSE](LICENSE) for details.
