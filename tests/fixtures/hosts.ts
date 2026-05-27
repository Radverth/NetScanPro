import type { DiscoveredHost } from '../../electron/types'

export const FIXTURE_HOSTS: Partial<DiscoveredHost>[] = [
  // Router/Firewall
  {
    ip: '192.168.1.1',
    mac: '00:1a:2b:3c:4d:5e',
    hostname: 'fw-01.local',
    vendor: 'Fortinet',
    os: { family: 'FortiOS', name: 'FortiGate', version: '7.2', accuracy: 90 },
    openPorts: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.0' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'nginx' },
      { port: 443, protocol: 'tcp', service: 'https', version: '' },
    ],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '10.0.0.1',
    mac: 'aa:bb:cc:dd:ee:ff',
    hostname: 'gateway',
    vendor: 'Cisco',
    os: { family: 'IOS', name: 'Cisco IOS', version: '15.2', accuracy: 85 },
    openPorts: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: '' },
      { port: 443, protocol: 'tcp', service: 'https', version: '' },
    ],
    services: [],
    snmpInfo: { sysDescr: 'Cisco IOS Router', sysName: 'gateway', sysLocation: '', interfaces: [] },
  },

  // Managed Switch
  {
    ip: '192.168.1.2',
    mac: '11:22:33:44:55:66',
    hostname: 'sw-core-01',
    vendor: 'Cisco',
    os: null,
    openPorts: [{ port: 161, protocol: 'udp', service: 'snmp', version: '' }],
    services: [],
    snmpInfo: { sysDescr: 'Cisco Catalyst 2960 Switch', sysName: 'sw-core-01', sysLocation: 'Server Room', interfaces: [] },
  },
  {
    ip: '192.168.1.3',
    mac: '22:33:44:55:66:77',
    hostname: 'switch-access-floor2',
    vendor: 'HP',
    os: null,
    openPorts: [{ port: 161, protocol: 'udp', service: 'snmp', version: '' }],
    services: [],
    snmpInfo: { sysDescr: 'HP ProCurve Switch 2848', sysName: 'switch-access-floor2', sysLocation: 'Floor 2', interfaces: [] },
  },

  // Wireless AP
  {
    ip: '192.168.1.10',
    mac: '00:0b:86:ab:cd:ef',
    hostname: 'ap-lobby',
    vendor: 'Aruba',
    os: null,
    openPorts: [{ port: 443, protocol: 'tcp', service: 'https', version: '' }],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.11',
    mac: 'dc:a6:32:11:22:33',
    hostname: 'unifi-ap-office',
    vendor: 'Ubiquiti',
    os: null,
    openPorts: [{ port: 443, protocol: 'tcp', service: 'https', version: '' }],
    services: [],
    snmpInfo: null,
  },

  // Windows Server
  {
    ip: '192.168.1.20',
    mac: '33:44:55:66:77:88',
    hostname: 'dc01.corp.local',
    vendor: 'Dell',
    os: { family: 'Windows', name: 'Windows Server 2022', version: '2022', accuracy: 95 },
    openPorts: [
      { port: 135, protocol: 'tcp', service: 'msrpc', version: '' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' },
      { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: '' },
      { port: 389, protocol: 'tcp', service: 'ldap', version: '' },
    ],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.21',
    mac: '44:55:66:77:88:99',
    hostname: 'sql-svr01.corp.local',
    vendor: 'HP',
    os: { family: 'Windows', name: 'Windows Server 2019', version: '2019', accuracy: 92 },
    openPorts: [
      { port: 135, protocol: 'tcp', service: 'msrpc', version: '' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' },
      { port: 1433, protocol: 'tcp', service: 'ms-sql-s', version: 'SQL Server 2019' },
      { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: '' },
    ],
    services: [{ name: 'ms-sql-s', version: 'SQL Server 2019', info: '' }],
    snmpInfo: null,
  },

  // Linux Server
  {
    ip: '192.168.1.30',
    mac: '55:66:77:88:99:aa',
    hostname: 'web01.corp.local',
    vendor: null,
    os: { family: 'Linux', name: 'Ubuntu 22.04', version: '22.04', accuracy: 88 },
    openPorts: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.9' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'nginx 1.22' },
      { port: 443, protocol: 'tcp', service: 'https', version: 'nginx 1.22' },
    ],
    services: [{ name: 'nginx', version: '1.22', info: '' }],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.31',
    mac: '66:77:88:99:aa:bb',
    hostname: 'db01.corp.local',
    vendor: null,
    os: { family: 'Linux', name: 'Debian 11', version: '11', accuracy: 82 },
    openPorts: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.4' },
      { port: 5432, protocol: 'tcp', service: 'postgresql', version: 'PostgreSQL 14' },
    ],
    services: [{ name: 'postgres', version: '14', info: '' }],
    snmpInfo: null,
  },

  // NAS/Storage
  {
    ip: '192.168.1.40',
    mac: '00:11:32:ab:cd:ef',
    hostname: 'nas01.local',
    vendor: 'Synology',
    os: null,
    openPorts: [
      { port: 5000, protocol: 'tcp', service: 'http', version: 'DSM 7.1' },
      { port: 5001, protocol: 'tcp', service: 'https', version: 'DSM 7.1' },
      { port: 2049, protocol: 'tcp', service: 'nfs', version: '' },
    ],
    services: [],
    snmpInfo: { sysDescr: 'Synology DiskStation DS920+', sysName: 'nas01', sysLocation: '', interfaces: [] },
  },
  {
    ip: '192.168.1.41',
    mac: '00:08:9b:11:22:33',
    hostname: 'qnap-backup',
    vendor: 'QNAP',
    os: null,
    openPorts: [
      { port: 5000, protocol: 'tcp', service: 'http', version: '' },
      { port: 2049, protocol: 'tcp', service: 'nfs', version: '' },
    ],
    services: [],
    snmpInfo: null,
  },

  // Printer/MFP
  {
    ip: '192.168.1.50',
    mac: '00:1b:a9:11:22:33',
    hostname: 'printer-reception',
    vendor: 'HP',
    os: null,
    openPorts: [{ port: 9100, protocol: 'tcp', service: 'jetdirect', version: '' }],
    services: [],
    snmpInfo: { sysDescr: 'HP LaserJet Pro MFP M428fdw', sysName: 'printer-reception', sysLocation: 'Reception', interfaces: [] },
  },
  {
    ip: '192.168.1.51',
    mac: '00:60:57:aa:bb:cc',
    hostname: 'ricoh-mfp-floor1',
    vendor: 'Ricoh',
    os: null,
    openPorts: [
      { port: 9100, protocol: 'tcp', service: 'jetdirect', version: '' },
      { port: 443, protocol: 'tcp', service: 'https', version: '' },
    ],
    services: [],
    snmpInfo: { sysDescr: 'RICOH MP C3004 / RICOH MP C3504', sysName: 'ricoh-mfp-floor1', sysLocation: 'Floor 1', interfaces: [] },
  },

  // VoIP Phone
  {
    ip: '192.168.1.60',
    mac: '00:04:f2:aa:bb:cc',
    hostname: 'phone-reception',
    vendor: 'Polycom',
    os: null,
    openPorts: [{ port: 5060, protocol: 'tcp', service: 'sip', version: '' }],
    services: [{ name: 'sip', version: '', info: '' }],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.61',
    mac: '80:5e:c0:11:22:33',
    hostname: 'yealink-t46s',
    vendor: 'Yealink',
    os: null,
    openPorts: [{ port: 5060, protocol: 'tcp', service: 'sip', version: '' }],
    services: [{ name: 'sip', version: '', info: '' }],
    snmpInfo: null,
  },

  // Windows PC/Laptop
  {
    ip: '192.168.1.100',
    mac: '77:88:99:aa:bb:cc',
    hostname: 'DESKTOP-A1B2C3D',
    vendor: 'Dell',
    os: { family: 'Windows', name: 'Windows 11', version: '11', accuracy: 90 },
    openPorts: [
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' },
      { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: '' },
    ],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.101',
    mac: '88:99:aa:bb:cc:dd',
    hostname: 'LAPTOP-E4F5G6H',
    vendor: 'Lenovo',
    os: { family: 'Windows', name: 'Windows 10', version: '10', accuracy: 87 },
    openPorts: [{ port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' }],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.102',
    mac: '99:aa:bb:cc:dd:ee',
    hostname: 'WS-ACCOUNTS-01',
    vendor: 'HP',
    os: { family: 'Windows', name: 'Windows 10', version: '10', accuracy: 91 },
    openPorts: [{ port: 445, protocol: 'tcp', service: 'microsoft-ds', version: '' }],
    services: [],
    snmpInfo: null,
  },

  // Mac Endpoint
  {
    ip: '192.168.1.110',
    mac: '3c:d0:f8:aa:bb:cc',
    hostname: 'Janes-MacBook-Pro.local',
    vendor: 'Apple',
    os: { family: 'macOS', name: 'macOS Ventura', version: '13.4', accuracy: 95 },
    openPorts: [{ port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 9.0' }],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.111',
    mac: 'f0:18:98:11:22:33',
    hostname: 'Toms-MacBook-Air.local',
    vendor: 'Apple',
    os: { family: 'macOS', name: 'macOS Sonoma', version: '14.0', accuracy: 93 },
    openPorts: [],
    services: [],
    snmpInfo: null,
  },

  // DHCP Server
  {
    ip: '192.168.1.200',
    mac: 'ab:cd:ef:01:23:45',
    hostname: 'dhcp-svr.corp.local',
    vendor: 'Dell',
    os: { family: 'Windows', name: 'Windows Server 2019', version: '2019', accuracy: 90 },
    openPorts: [
      { port: 67, protocol: 'udp', service: 'dhcp', version: '' },
      { port: 135, protocol: 'tcp', service: 'msrpc', version: '' },
    ],
    services: [{ name: 'dhcp', version: '', info: '' }],
    snmpInfo: null,
  },

  // DNS Server
  {
    ip: '192.168.1.201',
    mac: 'bc:de:f0:12:34:56',
    hostname: 'dns01.corp.local',
    vendor: null,
    os: { family: 'Linux', name: 'Ubuntu 22.04', version: '22.04', accuracy: 88 },
    openPorts: [
      { port: 53, protocol: 'tcp', service: 'domain', version: 'BIND 9.18' },
      { port: 53, protocol: 'udp', service: 'domain', version: 'BIND 9.18' },
    ],
    services: [{ name: 'named', version: '9.18', info: '' }],
    snmpInfo: null,
  },

  // Unknown
  {
    ip: '192.168.1.250',
    mac: 'ff:ee:dd:cc:bb:aa',
    hostname: null,
    vendor: null,
    os: null,
    openPorts: [{ port: 8080, protocol: 'tcp', service: 'http-alt', version: '' }],
    services: [],
    snmpInfo: null,
  },
  {
    ip: '192.168.1.251',
    mac: 'fe:dc:ba:98:76:54',
    hostname: 'unknown-device-1',
    vendor: 'Unknown',
    os: null,
    openPorts: [],
    services: [],
    snmpInfo: null,
  },
]
