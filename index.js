/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  screen,
  shell,
  globalShortcut,
  Notification,
} from 'electron';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from 'node:crypto';

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
}
//change these require statments to import statements
import fs from 'node:fs';
import xml2js from 'xml2js';
import fetch from 'electron-fetch';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import config from './js/config.js';
import DataStore from './js/datastore.js';
import Store from 'electron-store';
const store = new Store();
import rsslib from './js/rsslib.js';

//configure logging
//macOS path ~/Library/Logs/{app name}/{process type}.log
import log from 'electron-log';

const isMac = process.platform === 'darwin';

let logfilePath = log.transports.file.getFile().path;
let logDirectory = path.dirname(logfilePath);

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');
/*
log.info("Hello, log");
log.warn("Some problem appears");
log.debug("A debug error");
log.error("An error");
*/

log.errorHandler.startCatching({
  showDialog: true,
  onError({ createIssue, error, processType, versions }) {
    if (processType === 'renderer') {
      return;
    }
    electron.dialog
      .showMessageBox({
        title: 'An error occurred',
        message: error.message,
        detail: error.stack,
        type: 'error',
        buttons: ['Ignore', 'Report', 'Exit'],
      })
      .then((result) => {
        if (result.response === 1) {
          createIssue('https://github.com/dotnaught/rssputin/issues/new', {
            title: `Error report for ${versions.app}`,
            body: 'Error:\n```' + error.stack + '\n```\n' + `OS: ${versions.os}`,
          });
          return;
        }

        if (result.response === 2) {
          electron.app.quit();
        }
      });
  },
});

//delete log files created more than one week ago
function deleteOldLogs() {
  let files = fs.readdirSync(logDirectory);
  files.forEach((file) => {
    if (file.endsWith('.log')) {
      try {
        const stats = fs.statSync(logfilePath);

        //console.log(`File Data Last Modified: ${stats.mtime}`);
        //console.log(`File Status Last Modified: ${stats.ctime}`);
        //console.log(`File Size: ${stats.size}`);

        let fileDate = new Date(stats.birthtime);
        let now = new Date();
        let diff = now.getTime() - fileDate.getTime();
        let hours = diff / (1000 * 60 * 60);
        //console.log(`${file} is ${hours} hours old`);

        if (stats.size > 1000000) {
          try {
            let fileWithPath = path.join(logDirectory, file);
            console.log(`Modifying ${fileWithPath}`);
            const data = fs.readFileSync(fileWithPath, 'utf8', function (err, data) {
              if (err) {
                throw err;
              }
            });

            let linesCount = data.split('\n').length;
            let linesToCut = Math.floor(linesCount / 2) > 0 ? Math.floor(linesCount / 2) : 0;
            console.log(`${linesCount} lines in file`);
            console.log(`${linesToCut} lines to be removed`);
            let linesToKeep = data.split('\n').slice(linesToCut).join('\n');
            //console.log(linesToKeep);
            fs.writeFileSync(fileWithPath, linesToKeep);
          } catch (err) {
            console.error(`Could not delete ${file}`, err);
          }
        } else if (hours > 168) {
          console.log(`Trying to delete the file`);
          try {
            let fileWithPath = path.join(logDirectory, file);
            console.log(`Deleting ${fileWithPath}`);
            fs.unlinkSync(fileWithPath);
          } catch (err) {
            console.error(`Could not delete ${file}`, err);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  });
}
deleteOldLogs();

import {
  is,
  //appMenu,
  //aboutMenuItem,
  openUrlMenuItem,
  openNewGitHubIssue,
  //debugInfo,
} from 'electron-util';

//test url for github issue scanning, which may get implemented some day
/*
const gh = require("./js/github");

app.whenReady().then(() => {
	//const { net } = require("electron");
	const request = net.request(
		"https://github.com/minimaxir/aitextgen/issues?q=is%3Aissue+is%3Aopen+sort%3Acomments-desc"
	);
	request.on("response", (response) => {
		console.log(`STATUS: ${response.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
		response.on("data", (chunk) => {
			console.log(`BODY: ${chunk}`);
		});
		response.on("end", () => {
			console.log("No more data in response.");
		});
	});
	request.end();
});
*/

unhandled();
//debug({ devToolsMode: 'detach' }); //moved to after windows are created
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.lot49.rssputin');

//check schema
const userData = app.getPath('userData') + '/rssputinDB.json';
const configFile = app.getPath('userData') + '/config.json';
//const jsonSchema = require('./js/schema');
import jsonSchema from './js/schema.js';
const schema = jsonSchema.schema;

const resp = fs.readFileSync(userData, 'utf8', (err, data) => {
  if (err) throw err;
  return data;
});
const rssdb = JSON.parse(resp);

//const Ajv = require('ajv');
import Ajv from 'ajv';
import process from 'node:process';
const ajv = new Ajv();
//console.log(rssdb);
const validate = ajv.compile(schema);

const valid = validate(rssdb);
if (!valid) {
  console.log('validation errors', validate.errors);
  log.error('validation errors', validate.errors);
}

// .json file name at ~/Library/Application\ Support/rssputin/rssputinDB.json
const feedData = new DataStore({ name: 'rssputinDB' });

const initObject = {
  feed: 'Enter valid feed',
  visible: true,
  valid: false,
  color: '#0000aa',
  domain: '',
  filterList: '',
  mode: 'publication',
  pageHash: '',
  linkHash: '',
  timeLastChecked: Date.now(),
  id: 0,
  action: false,
};

feedData.addFeeds(initObject);

// Prevent window from being garbage collected
let mainWindow;
let feedWindow;
let menu;

const createMainWindow = async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.close();
    }

    if (feedWindow) {
      feedWindow.close();
    }

    setMainWindow();
  });

  const win = new BrowserWindow({
    title: app.name,
    show: false,
    width,
    height,
    webPreferences: {
      nodeIntegration: false, // Is default value after Electron v5
      contextIsolation: true, // Protect against prototype pollution
      enableRemoteModule: false, // Turn off remote
      worldSafeExecuteJavaScript: true, // Sanitize JavaScript
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, '/js/preload.mjs'), // Use a preload script
      nativeWindowOpen: true,
    },
  });

  win.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error(`Something went wrong`, err);
      log.error(err);
    });
    //debug();
  });

  win.on('ready-to-show', () => {
    win.show();
    const menuItem = menu.getMenuItemById('mainWindow');
    menuItem.enabled = false;
    win.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url); // Open URL in user's browser.
      let hash = crypto.createHash('sha1').update(details.url).digest('hex');

      win.webContents.send('updateLinks', hash);
      return { action: 'deny' }; // Prevent the app from opening the URL.
    });
  });

  win.on('closed', () => {
    // Dereference the window
    // For multiple windows store them in an array
    mainWindow = undefined;
    const menuItem = menu.getMenuItemById('mainWindow');
    menuItem.enabled = true;
  });

  await win.loadFile(path.join(__dirname, '/html/mainWindow.html'));

  return win;
};

const createFeedWindow = async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  feedWindow = new BrowserWindow({
    title: 'Edit Feeds',
    show: true,
    width,
    height: height / 2,
    webPreferences: {
      nodeIntegration: false, // Is default value after Electron v5
      contextIsolation: true, // Protect against prototype pollution
      enableRemoteModule: false, // Turn off remote
      nodeIntegrationInWorker: true,
      worldSafeExecuteJavaScript: true, // Sanitize JavaScript
      preload: path.join(__dirname, '/js/preload.mjs'), // Use a preload script
      nativeWindowOpen: true,
    },
  });

  feedWindow.on('ready-to-show', () => {
    let feeds = feedData.getFeeds();
    if (feeds && Object.keys(feeds).length === 0) {
      feeds = [initObject];
    }

    feedWindow.webContents.send('sendFeeds', feeds);
    feedWindow.show();
  });

  feedWindow.on('closed', () => {
    // Dereference the window
    // For multiple windows store them in an array
    feedWindow = undefined;
  });

  await feedWindow.loadFile(path.join(__dirname, './html/feedWindow.html'));

  return feedWindow;
};

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', async () => {
  if (!mainWindow) {
    mainWindow = await createMainWindow();
  }
});

async function isFeedValid(arg) {
  return await fetch(`https://validator.w3.org/feed/check.cgi?url=${arg}&output=soap12`)
    .then((res) => res.text())
    .then((body) => xml2js.parseStringPromise(body, { mergeAttrs: true, async: true }))
    .then((res) => JSON.stringify(res))
    .then((res) => JSON.parse(res))
    .then(
      (res) =>
        res['env:Envelope']['env:Body'][0]['m:feedvalidationresponse'][0]['m:validity'][0] ===
        'true'
    )
    .catch((err) => {
      console.log('err', err);
      log.error(err);
      return false;
    });
}

ipcMain.on('validate', async (event, arg) => {
  try {
    let response = await isFeedValid(arg);
    event.returnValue = response;
  } catch (err) {
    console.log(err);
    log.error(err);
    event.returnValue = false;
  }
});

ipcMain.on('requestFeeds', (event, args) => {
  const feeds = feedData.getFeeds();
  feedWindow.webContents.send('sendFeeds', feeds);
});

ipcMain.on('setFeedMode', (event, args) => {
  store.set('feedMode', args);
  mainWindow.close();
  setMainWindow();
});

ipcMain.on('setDocketFilter', (event, args) => {
  console.log('setDocketFilter', args);
  store.set('docketFilter', args);
  mainWindow.close();
  setMainWindow();
});

ipcMain.on('setTimeWindow', (event, args) => {
  store.set('timeWindow', args);
  if (mainWindow) {
    mainWindow.close();
  }

  if (feedWindow) {
    feedWindow.close();
  }

  setMainWindow();
});

ipcMain.on('storeWidthData', (event, args) => {
  store.set(args.id, args.w);
  store.set(args.nxid, args.nxw);
});

ipcMain.on('setFeedItem', (event, args) => {
  feedData.setFeedItem(args);
});

ipcMain.on('addFeeds', (event, args) => {
  feedData.addFeeds(args);
});

ipcMain.on('deleteFeed', (event, args) => {
  feedData.deleteFeed(args);
});

ipcMain.on('openFeedWindow', (event, args) => {
  createFeedWindow();
});

ipcMain.on('restartApp', (event, args) => {
  autoUpdater.quitAndInstall().catch((err) => {
    console.error(`Something went wrong: `, err);
    log.error(err);
  });
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Not Now. On next Restart'],
    title: 'Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version of RSSputin has been downloaded. Restart now to update.',
  };

  dialog
    .showMessageBox(dialogOpts)
    .then((returnValue) => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall().catch((err) => {
          console.error(`Something went wrong: `, err);
          log.error(err);
        });
      }
    })
    .catch((err) => {
      console.error(`Something went wrong: `, err);
      log.error(err);
    });
});

autoUpdater.on('error', (message) => {
  console.error('Someting went wrong with an automatic update.');
  console.error(message);
  log.error(message);
});
/// incorporate menu.js
const showPreferences = () => {
  // Show the app's preferences here
};

function setDefaults() {
  let timeWindow = store.get('timeWindow') || 72;
  store.set('timeWindow', timeWindow);
  let hoursAgo = store.get('hoursAgo') || '10%';
  store.set('hoursAgo', hoursAgo);
  let Title = store.get('Title') || '66%';
  store.set('Title', Title);
  let Author = store.get('Author') || '10%';
  store.set('Author', Author);
  let Source = store.get('Source') || '15%';
  store.set('Source', Source);
  let feedMode = store.get('feedMode') || 'publication';
  store.set('feedMode', feedMode);
  let docketFilter = store.get('docketFilter') || 'complaint';
  store.set('docketFilter', docketFilter);
}

function resetColumnWidths() {
  let timeWindow = 72;
  store.set('timeWindow', timeWindow);
  let hoursAgo = '10%';
  store.set('hoursAgo', hoursAgo);
  let Title = '66%';
  store.set('Title', Title);
  let Author = '10%';
  store.set('Author', Author);
  let Source = '15%';
  store.set('Source', Source);
}

function showNotification(title, body) {
  const notification = {
    title: title,
    body: body,
    silent: true,
    timeoutType: 'default',
  };
  new Notification(notification).show();
}

function exportDB() {
  console.log('Starting export...');

  dialog
    .showSaveDialog(mainWindow, {
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
      buttonLabel: 'Export Feeds',
      defaultPath: userData,
    })
    .then((result) => {
      //console.log(result.canceled);
      //console.log(result.filePath);
      //console.log(userData);
      if (result.filePath === undefined || result.canceled) {
        console.log('No file path defined or cancelled');
        return;
      }

      fs.copyFile(userData, result.filePath, (err) => {
        if (err) {
          //console.log("An error ocurred creating the file " + err.message);
          showNotification('Something went wrong...', err.message);
          log.error('Export error: ', err.message);
        }
        //console.log("The file has been succesfully saved");
        showNotification('Success!', 'Database exported.');
      });
    })
    .catch((err) => {
      console.log(err);
      log.error('Export error: ', err);
    });
}

function importDB() {
  console.log('Starting import...');

  dialog
    .showOpenDialog(mainWindow, {
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: app.getPath('downloads') + '/rssputinDB.json',
    })
    .then((result) => {
      //console.log(result.canceled);
      //console.log(result.filePath);
      //console.log(result.filePaths);
      if (
        result.filePaths === undefined ||
        !fs.existsSync(result.filePaths[0] || result.canceled)
      ) {
        console.log('No file found');
        return;
      } else {
        //write file
        let importFile = result.filePaths[0];
        let resp = fs.readFileSync(importFile, 'utf8', (err, data) => {
          if (err) throw err;
          return data;
        });
        let fileContents = JSON.parse(resp);
        let check = validate(fileContents);
        if (!check) {
          console.log(validate.errors);
          log.error('Validation error: ', validate.errors);
        } else {
          console.log('write file');
          fs.copyFile(importFile, userData, (err) => {
            if (err) {
              showNotification('Something went wrong...', err.message);
            }
            showNotification('Success!', 'Database imported.');
            if (mainWindow) {
              mainWindow.close();
            }
            if (feedWindow) {
              feedWindow.close();
            }
            setMainWindow();
          });
        }
      }
    })
    .catch((err) => {
      console.log(err);
      log.error('Import error: ', err);
    });
}

import template from './js/menu.js';

const setMainWindow = async () => {
  await app.whenReady().then(async () => {
    // Function to open links in browser

    // Setup the menu
    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    const menuItem = menu.getMenuItemById('mainWindow');
    menuItem.enabled = false;
    //setDefaults
    setDefaults();
    let timeWindow = store.get('timeWindow');
    let feedMode = store.get('feedMode');
    let docketFilter = store.get('docketFilter');

    // Create the mainWindow
    mainWindow = await createMainWindow();
    // Intercept navigation event so the URL opens in the browser
    let defaultsObj = {
      timeWindow: timeWindow,
      feedMode: feedMode,
      docketFilter: docketFilter,
      hoursAgo: store.get('hours'),
      Title: store.get('Title'),
      Author: store.get('Author'),
      Source: store.get('Source'),
    };

    mainWindow.webContents.send('receiveDefaults', defaultsObj);
    // Fetch and process RSS feeds
    //create an iterable from defaultsObj
    rsslib.getAllFeedsIncremental(feedData.getFeeds(), defaultsObj, mainWindow);
    /*rsslib
      .getAllFeeds(feedData.getFeeds(), defaultsObj, mainWindow)
      .then((feeds) => rsslib.processFeeds(feeds, timeWindow, defaultsObj))
      .then((result) => mainWindow.webContents.send('fromMain', result))
      .catch((error) => console.error(error.message));*/
  });
};

setMainWindow();

export {
  mainWindow,
  createFeedWindow,
  importDB,
  exportDB,
  setMainWindow,
  resetColumnWidths,
  userData,
  configFile,
  logfilePath,
  config,
};
