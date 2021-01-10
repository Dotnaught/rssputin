"use strict";
const path = require("path");
const {
	app,
	BrowserWindow,
	Menu,
	ipcMain,
	screen,
	dialog,
	shell,
	globalShortcut,
} = require("electron");
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
feedData.addFeeds("https://news.ycombinator.com/rss");

console.log(feedData.getFeeds());
console.log(app.getPath("userData"));

// Prevent window from being garbage collected
let mainWindow;

const createMainWindow = async () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	globalShortcut.register("CommandOrControl+R", function () {
		console.log("CommandOrControl+R is pressed");
		setMainWindow();
	});

	const win = new BrowserWindow({
		title: app.name,
		show: false,
		width,
		height,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			worldSafeExecuteJavaScript: true, //sanitize JavaScript
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	win.on("ready-to-show", () => {
		win.show();
	});

	win.on("reload", () => {
		console.log("win reload");
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		console.log("closed");
		mainWindow = undefined;
	});

	await win.loadFile(path.join(__dirname, "index.html"));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on("reload", () => {
	console.log("Reload");
});

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

ipcMain.on("updateBar", (event, args) => {
	if (mainWindow) {
	}
});

ipcMain.on("reload:mainWindow", function () {
	console.log("reload");
	mainWindow.webContents.reloadIgnoringCache();
});

const setMainWindow = async () => {
	await app.whenReady().then(async () => {
		const handleRedirect = (e, url) => {
			if (url !== e.sender.getURL()) {
				e.preventDefault();
				shell.openExternal(url);
			}
		};

		//setup the menu
		Menu.setApplicationMenu(menu);
		//create the mainWindow
		mainWindow = await createMainWindow();
		//intercept navigation event so the URL opens in the browser
		mainWindow.webContents.on("will-navigate", handleRedirect);

		//fetch and process RSS feeds
		rsslib
			.getAllFeeds(feedData.getFeeds())
			.then((feeds) => rsslib.processFeeds(feeds))
			.then((result) => mainWindow.webContents.send("fromMain", result))
			.catch((error) => console.error(error.message));
	});
	/*
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
		*/
	//let d = [{ feed: "item" }, { feed2: "items2" }]; //JSON.stringify(data, null, "...");
	//mainWindow.webContents.send("fromMain", d);
};

setMainWindow();
