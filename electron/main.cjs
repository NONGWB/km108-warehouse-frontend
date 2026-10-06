const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const LOOPBACK_HOST = '127.0.0.1';
const START_PORT = 3210;
const SERVER_START_TIMEOUT_MS = 45_000;

let mainWindow;
let serverProcess;
let isQuitting = false;
let appOrigin;
let serverOutput = '';

function getRuntimeRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'desktop-runtime')
    : path.join(__dirname, '..', 'desktop-runtime');
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return values;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) return values;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
    return values;
  }, {});
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const probe = (port) => {
      const tester = net.createServer();

      tester.once('error', (error) => {
        tester.close();
        if (error.code === 'EADDRINUSE' && port < startPort + 100) {
          probe(port + 1);
          return;
        }
        reject(error);
      });

      tester.once('listening', () => {
        tester.close(() => resolve(port));
      });

      tester.listen(port, LOOPBACK_HOST);
    };

    probe(startPort);
  });
}

function rememberServerOutput(chunk) {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-8_000);
}

function startNextServer(port) {
  const runtimeRoot = getRuntimeRoot();
  const serverDirectory = path.join(runtimeRoot, 'next-server');
  const serverEntry = path.join(serverDirectory, 'server.js');

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`ไม่พบ Next.js server ที่ ${serverEntry}`);
  }

  const runtimeEnv = parseEnvFile(path.join(runtimeRoot, 'app.env'));
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDirectory,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...runtimeEnv,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOSTNAME: LOOPBACK_HOST,
      PORT: String(port),
    },
  });

  serverProcess.stdout.on('data', rememberServerOutput);
  serverProcess.stderr.on('data', rememberServerOutput);
  serverProcess.once('exit', (code) => {
    serverProcess = undefined;
    if (!isQuitting && code !== 0) {
      dialog.showErrorBox(
        'KM108 Warehouse POS',
        `เซิร์ฟเวอร์ภายในแอปหยุดทำงาน (code ${code ?? 'unknown'})\n\n${serverOutput}`,
      );
      app.quit();
    }
  });
}

function waitForServer(url) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.setTimeout(2_000, () => request.destroy());
      request.once('error', retry);
    };

    const retry = () => {
      if (Date.now() - startedAt >= SERVER_START_TIMEOUT_MS) {
        reject(new Error(`Next.js server ไม่พร้อมภายใน ${SERVER_START_TIMEOUT_MS / 1000} วินาที\n${serverOutput}`));
        return;
      }
      setTimeout(check, 250);
    };

    check();
  });
}

function isInternalWindowUrl(url) {
  return url === 'about:blank'
    || url.startsWith('blob:')
    || (appOrigin && url.startsWith(appOrigin));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5',
    title: 'KM108 Warehouse POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalWindowUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1100,
          height: 850,
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!appOrigin || url.startsWith(appOrigin)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  return mainWindow.loadURL(appOrigin);
}

function stopNextServer() {
  if (!serverProcess) return;
  serverProcess.removeAllListeners('exit');
  serverProcess.kill();
  serverProcess = undefined;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      const port = await findAvailablePort(START_PORT);
      appOrigin = `http://${LOOPBACK_HOST}:${port}`;
      startNextServer(port);
      await waitForServer(appOrigin);
      await createMainWindow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox('ไม่สามารถเปิด KM108 Warehouse POS', message);
      app.quit();
    }
  });

  app.on('activate', () => {
    if (!mainWindow && appOrigin) createMainWindow();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  stopNextServer();
});

app.on('window-all-closed', () => app.quit());
