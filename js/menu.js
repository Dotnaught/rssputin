import { app, shell } from 'electron';
import {
  mainWindow,
  createFeedWindow,
  importDB,
  exportDB,
  setMainWindow,
  resetColumnWidths,
  userData,
  logfilePath,
  configFile,
  config,
} from '../index.js';
const isMac = process.platform === 'darwin';
const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
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
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {
        label: 'Show Feeds',
        accelerator: 'CmdOrCtrl+F',
        async click() {
          if (mainWindow) {
            createFeedWindow();
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Import Database',
        accelerator: 'CmdOrCtrl+=',
        async click() {
          if (mainWindow) {
            importDB();
          }
        },
      },
      {
        label: 'Export Database',
        accelerator: 'CmdOrCtrl+B',
        async click() {
          if (mainWindow) {
            exportDB();
          }
        },
      },
      {
        type: 'separator',
      },
      {
        type: 'separator',
      },
      {
        label: 'Open Main Window',
        accelerator: 'CmdOrCtrl+D',
        enabled: false,
        id: 'mainWindow',
        async click() {
          setMainWindow();
        },
      },
      {
        label: 'Reset Column Widths',
        async click() {
          if (mainWindow) {
            resetColumnWidths();
          }
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'close',
      },
    ],
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      {
        label: 'Show Settings',
        click() {
          shell.openPath(configFile);
        },
      },
      {
        label: 'Show App Data',
        click() {
          shell.openPath(userData);
        },
      },
      {
        label: 'Show Log Data',
        click() {
          shell.openPath(logfilePath);
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Delete Settings',
        click() {
          config.clear();
          app.relaunch();
          app.quit();
        },
      },
      {
        label: 'Delete App Data',
        click() {
          shell.trashItem(app.getPath('userData'));
          app.relaunch();
          app.quit();
        },
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
        : [{ role: 'close' }]),
    ],
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          await shell.openExternal('https://electronjs.org');
        },
      },
    ],
  },
];

export default template;
