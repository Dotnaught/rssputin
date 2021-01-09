"use strict";
const path = require("path");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs");
/// const {autoUpdater} = require('electron-updater');
const { is } = require("electron-util");
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const config = require("./config");
const menu = require("./menu");
const DataStore = require("./datastore");

const rsslib = require("./rsslib");
const test = rsslib.test;
test();

unhandled();
debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("com.lot49.rssputin");

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

const feedData = new DataStore({ name: "links" }); //.json file name at ~/Library/Application Support/[AppName]\[filename].json
feedData.addFeeds("https://www.cnn.com/headlines.atom");
console.log(feedData.feeds);
console.log(app.getPath("userData"));

// Prevent window from being garbage collected
let mainWindow;
let callback;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		show: false,
		width: 600,
		height: 400,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	win.on("ready-to-show", () => {
		win.show();
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	await win.loadFile(path.join(__dirname, "index.html"));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on("window-all-closed", () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on("activate", async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

ipcMain.on("toMain", (event, args) => {
	fs.readFile("test.json", "utf-8", (error, data) => {
		if (error) {
			console.error(error);
			return;
		}
		// Do something with file contents
		console.log(`File data is ${data}`);
	});
});

const setMainWindow = async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();

	const favoriteAnimal = config.get("favoriteAnimal");
	mainWindow.webContents.executeJavaScript(
		`document.querySelector('header p').textContent = 'Your favorite animal is ${favoriteAnimal}'`
	);
	rsslib
		.getAllFeeds(["https://news.ycombinator.com/rss"])
		.then((feeds) => rsslib.processFeeds(feeds))
		.then((result) => mainWindow.webContents.send("fromMain", result))
		.catch((error) => console.error(error.message));

	//let d = [{ feed: "item" }, { feed2: "items2" }]; //JSON.stringify(data, null, "...");
	//mainWindow.webContents.send("fromMain", d);
};

setMainWindow();
