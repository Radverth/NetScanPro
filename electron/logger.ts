import log from 'electron-log/main'
import path from 'path'
import { app } from 'electron'

log.initialize()

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('logs'), 'netscanpro.log')

log.transports.file.level = 'debug'
log.transports.file.maxSize = 10 * 1024 * 1024 // 10 MB, then rotated
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

log.transports.console.level = 'debug'
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}'

export default log
