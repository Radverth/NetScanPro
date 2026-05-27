import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import { registerScanHandlers } from './ipc/scan.ipc'
import { registerITGlueHandlers } from './ipc/itglue.ipc'
import { registerPDFHandlers } from './ipc/pdf.ipc'
import { getStoreValue, setStoreValue } from './store'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

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
    mainWindow?.webContents.send('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:update-downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates after window is ready
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(console.error)
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

app.whenReady().then(() => {
  createWindow()
  registerScanHandlers(mainWindow)
  registerITGlueHandlers()
  registerPDFHandlers()
  registerStoreHandlers()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (isDev && parsedUrl.origin === 'http://localhost:5173') return
    event.preventDefault()
  })
})
