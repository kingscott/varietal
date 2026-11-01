import { join } from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'

function openWindow(url: string) {
  const window = new BrowserWindow({ width: 1280, height: 860, autoHideMenuBar: true, title: 'Varietal' })
  window.webContents.setWindowOpenHandler((details) => {
    if (/^https?:/.test(details.url)) void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  return window.loadURL(url)
}

async function start() {
  await app.whenReady()
  // The server reads these on import, so they have to be set first.
  process.env.NODE_ENV = 'production'
  process.env.HOST = '127.0.0.1'
  process.env.PORT = '0'
  process.env.DB_PATH = join(app.getPath('userData'), 'cellar.db')
  process.env.STATIC_ROOT = join(app.getAppPath(), 'dist')
  const { listening } = await import('../server/index.ts')
  const url = `http://127.0.0.1:${await listening}`
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void openWindow(url)
  })
  await openWindow(url)
}

app.on('window-all-closed', () => app.quit())

start().catch((error: Error) => {
  dialog.showErrorBox('Varietal could not start', error.message)
  app.quit()
})
