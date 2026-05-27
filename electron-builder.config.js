module.exports = {
  appId: 'com.affinityit.netscanpro',
  productName: 'NetScan Pro',
  copyright: 'Copyright © 2026 Affinity IT',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    '!node_modules/**/*',
  ],
  extraResources: [
    { from: 'electron/scanner/rules.json', to: 'rules.json' },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico',
    requestedExecutionLevel: 'requireAdministrator',
    publisherName: 'Affinity IT',
    signingHashAlgorithms: ['sha256'],
    sign: null,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'NetScan Pro',
    installerIcon: 'resources/icon.ico',
    uninstallerIcon: 'resources/icon.ico',
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'resources/icon.png',
    category: 'Network',
    maintainer: 'Affinity IT',
  },
  publish: {
    provider: 'github',
    owner: 'radverth',
    repo: 'netscanpro',
    releaseType: 'release',
  },
  afterSign: 'scripts/notarize.js',
}
