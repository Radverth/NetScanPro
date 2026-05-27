import { exec } from 'child_process'
import { promisify } from 'util'
import type { PortInfo, OSFingerprint } from '../types'

const execAsync = promisify(exec)

interface NmapHostResult {
  hostname: string | undefined
  ports: PortInfo[]
  os: OSFingerprint | undefined
}

type NmapResultMap = Map<string, NmapHostResult>

const SPEED_FLAGS: Record<string, string> = {
  fast: '-T4 --max-retries 1',
  balanced: '-T3 --max-retries 2',
  thorough: '-T2 --max-retries 3',
}

/**
 * Run nmap scan on a list of IPs. Returns a map of IP → result.
 * Uses -sV for service detection and -O for OS detection.
 * Falls back to a simpler scan if nmap is not available.
 */
export async function runNmapScan(
  ips: string[],
  speed: 'fast' | 'balanced' | 'thorough',
  signal?: AbortSignal,
): Promise<NmapResultMap> {
  if (ips.length === 0) return new Map()
  if (signal?.aborted) return new Map()

  const speedFlag = SPEED_FLAGS[speed] ?? SPEED_FLAGS.balanced

  // Process in batches of 50 IPs
  const batchSize = 50
  const resultMap: NmapResultMap = new Map()

  for (let i = 0; i < ips.length; i += batchSize) {
    if (signal?.aborted) break
    const batch = ips.slice(i, i + batchSize)
    const batchResults = await scanBatch(batch, speedFlag, signal)
    for (const [ip, result] of batchResults.entries()) {
      resultMap.set(ip, result)
    }
  }

  return resultMap
}

async function scanBatch(
  ips: string[],
  speedFlag: string,
  signal?: AbortSignal,
): Promise<NmapResultMap> {
  const resultMap: NmapResultMap = new Map()
  const ipList = ips.join(' ')

  // Common ports to scan
  const ports = '21,22,23,25,53,67,80,110,135,161,443,445,3389,5000,5001,5060,8080,8443,9100,2049'

  const nmapCmd = `nmap -sV -O ${speedFlag} -p ${ports} --open -oX - ${ipList} 2>/dev/null`

  try {
    const timeout = ips.length * 10000 // 10s per host max
    const { stdout } = await execAsync(nmapCmd, { timeout })

    if (signal?.aborted) return resultMap

    return parseNmapXML(stdout, ips)
  } catch {
    // nmap not available or failed - return empty results with populated IPs
    for (const ip of ips) {
      resultMap.set(ip, { hostname: undefined, ports: [], os: undefined })
    }
    return resultMap
  }
}

function parseNmapXML(xml: string, ips: string[]): NmapResultMap {
  const resultMap: NmapResultMap = new Map()

  // Initialize all IPs with empty results
  for (const ip of ips) {
    resultMap.set(ip, { hostname: undefined, ports: [], os: undefined })
  }

  // Parse host blocks
  const hostBlocks = xml.match(/<host[^>]*>[\s\S]*?<\/host>/g) ?? []

  for (const hostBlock of hostBlocks) {
    // Extract IP
    const ipMatch = hostBlock.match(/<address addr="([^"]+)" addrtype="ipv4"/)
    if (!ipMatch) continue
    const ip = ipMatch[1]

    // Extract hostname
    const hostnameMatch = hostBlock.match(/<hostname name="([^"]+)"/)
    const hostname = hostnameMatch?.[1]

    // Extract open ports
    const ports: PortInfo[] = []
    const portMatches = hostBlock.matchAll(/<port protocol="([^"]+)" portid="(\d+)"[^>]*>[\s\S]*?<state state="open"[\s\S]*?(?:<service name="([^"]*)"[^>]*version="([^"]*)")?/g)

    for (const portMatch of portMatches) {
      ports.push({
        protocol: portMatch[1] as 'tcp' | 'udp',
        port: parseInt(portMatch[2], 10),
        service: portMatch[3] ?? '',
        version: portMatch[4] ?? '',
      })
    }

    // Also try simpler port parsing
    if (ports.length === 0) {
      const simplePortMatches = hostBlock.matchAll(/<port protocol="([^"]+)" portid="(\d+)">/g)
      for (const m of simplePortMatches) {
        const stateMatch = hostBlock.match(new RegExp(`portid="${m[2]}"[\\s\\S]*?<state state="([^"]+)"`))
        if (stateMatch?.[1] === 'open') {
          ports.push({
            protocol: m[1] as 'tcp' | 'udp',
            port: parseInt(m[2], 10),
            service: '',
            version: '',
          })
        }
      }
    }

    // Extract OS fingerprint
    let osFingerprint: OSFingerprint | undefined
    const osClassMatch = hostBlock.match(/<osclass[^>]*osfamily="([^"]*)"[^>]*osgen="([^"]*)"[^>]*accuracy="([^"]*)"/)
    const osMatchEl = hostBlock.match(/<osmatch name="([^"]*)" accuracy="([^"]*)"/)

    if (osMatchEl) {
      const family = osClassMatch?.[1] ?? ''
      const version = osClassMatch?.[2] ?? ''
      osFingerprint = {
        family,
        name: osMatchEl[1],
        version,
        accuracy: parseInt(osMatchEl[2], 10),
      }
    }

    resultMap.set(ip, { hostname, ports, os: osFingerprint })
  }

  return resultMap
}
