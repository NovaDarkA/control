import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { abrirBaseDeDatos, cerrarBaseDeDatos } from './db'
import { registrarIpc } from './ipc'

// Los datos van en %APPDATA%\ProjectControl, independientes de la carpeta de instalación.
// Debe fijarse antes de que la app esté lista.
app.setPath('userData', join(app.getPath('appData'), 'ProjectControl'))

// Una sola instancia: dos procesos sobre la misma base de datos podrían corromper el estado.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let ventana: BrowserWindow | null = null

function crearVentana(): void {
  ventana = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'Project Control',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  ventana.once('ready-to-show', () => ventana?.show())
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void ventana.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void ventana.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (ventana) {
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  }
})

app.whenReady().then(() => {
  try {
    abrirBaseDeDatos()
  } catch (error) {
    dialog.showErrorBox(
      'Project Control no pudo abrir sus datos',
      error instanceof Error ? error.message : String(error)
    )
    app.quit()
    return
  }
  registrarIpc()
  crearVentana()
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => cerrarBaseDeDatos())
