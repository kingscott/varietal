import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { normalizeWine } from '../shared/normalize.ts'

// `pnpm electron` runs from its own profile, so it never shares a cellar or the single-instance lock with an installed app.
if (!app.isPackaged) app.setPath('userData', join(app.getPath('appData'), 'Varietal Demo'))

async function seedDemoCellar() {
  // Imported here because the server's database reads DB_PATH on import.
  const { createWines } = await import('../server/db.ts')
  const { saveImages } = await import('../server/images.ts')
  const wines = JSON.parse(readFileSync(join(app.getAppPath(), 'electron/demo-wines.json'), 'utf8'))
  void saveImages(createWines(wines.map(normalizeWine)).map((w) => w.imageUrl))
}

function openExternal(url: string) {
  if (/^https?:/.test(url)) void shell.openExternal(url)
}

function openWindow(url: string) {
  const window = new BrowserWindow({ width: 1280, height: 860, autoHideMenuBar: true, title: 'Varietal' })
  window.webContents.setWindowOpenHandler((details) => {
    openExternal(details.url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, target) => {
    if (new URL(target).origin === new URL(url).origin) return
    event.preventDefault()
    openExternal(target)
  })
  return window.loadURL(url)
}

async function start() {
  await app.whenReady()
  // The server reads these on import, so they have to be set first.
  process.env.NODE_ENV = 'production'
  process.env.VARIETAL_DESKTOP = '1'
  process.env.PORT = '0'
  process.env.DB_PATH = join(app.getPath('userData'), 'cellar.db')
  process.env.STATIC_ROOT = join(app.getAppPath(), 'dist')
  const seed = !app.isPackaged && !existsSync(process.env.DB_PATH)
  const { listening } = await import('../server/index.ts')
  if (seed) await seedDemoCellar()
  const url = `http://127.0.0.1:${await listening}`
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void openWindow(url)
  })
  await openWindow(url)
}

app.on('window-all-closed', () => app.quit())

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows()
    if (window?.isMinimized()) window.restore()
    window?.focus()
  })
  start().catch((error: Error) => {
    dialog.showErrorBox('Varietal could not start', error.message)
    app.quit()
  })
} else {
  app.quit()
}
