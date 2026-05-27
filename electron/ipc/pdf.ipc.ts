import { ipcMain, dialog, app } from 'electron'
import path from 'path'
import type { ScanSession } from '../types'
import { generatePDF } from '../pdf/generator'

export function registerPDFHandlers(): void {
  ipcMain.handle(
    'pdf:generate',
    async (_event, session: ScanSession, options: { outputPath?: string }): Promise<string> => {
      let outputPath = options.outputPath

      if (!outputPath) {
        const defaultName = `NetScan-${session.orgName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
        const downloadsDir = app.getPath('downloads')
        outputPath = path.join(downloadsDir, defaultName)

        // Show save dialog if no path provided
        const result = await dialog.showSaveDialog({
          defaultPath: outputPath,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
          title: 'Save Network Report',
        })

        if (result.canceled || !result.filePath) {
          throw new Error('PDF export cancelled')
        }
        outputPath = result.filePath
      }

      await generatePDF(session, outputPath)
      return outputPath
    },
  )
}
