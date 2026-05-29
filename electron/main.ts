import { app, BrowserWindow, ipcMain, shell, Menu, MenuItem } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import log from './logger'
import { registerScanHandlers } from './ipc/scan.ipc'
import { registerITGlueHandlers } from './ipc/itglue.ipc'
import { registerPDFHandlers } from './ipc/pdf.ipc'
import { getStoreValue, setStoreValue } from './store'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function buildMenu(): Menu | null {
  if (process.platform !== 'darwin') return null

  return Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ])
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupAutoUpdater(): void {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: ${info.version}`)
    mainWindow?.webContents.send('updater:update-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update downloaded: ${info.version}`)
    mainWindow?.webContents.send('updater:update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err)
    mainWindow?.webContents.send('updater:error', { message: err.message })
  })

  ipcMain.handle('updater:install-now', () => {
    log.info('User requested install now — quitting and installing')
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('updater:check', async () => {
    if (isDev) return
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      log.error('Manual update check failed:', err)
    }
  })

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => log.error('Update check failed:', err))
  }, 3000)
}

function registerStoreHandlers(): void {
  ipcMain.handle('store:get', (_event, key: string) => {
    return getStoreValue(key as never)
  })

  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    setStoreValue(key as never, value)
  })
}

function registerAppHandlers(): void {
  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('app:show-log', () => {
    shell.showItemInFolder(log.transports.file.getFile().path)
  })

  ipcMain.handle('app:detect-subnet', async () => {
    const { detectLocalSubnet } = await import('./scanner/arp')
    return detectLocalSubnet()
  })
}

app.whenReady().then(() => {
  log.info(`NetScan Pro starting — electron ${process.versions.electron}, node ${process.versions.node}`)
  log.info(`Log file: ${log.transports.file.getFile().path}`)

  const menu = buildMenu()
  Menu.setApplicationMenu(menu)

  createWindow()
  registerScanHandlers(mainWindow)
  registerITGlueHandlers()
  registerPDFHandlers()
  registerStoreHandlers()
  registerAppHandlers()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (isDev && parsedUrl.origin === 'http://localhost:5173') return
    event.preventDefault()
  })
})
