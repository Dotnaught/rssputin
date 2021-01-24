"use strict";
const path = require("path");
const {
	app,
	BrowserWindow,
	Menu,
	ipcMain,
	screen,
	shell,
	globalShortcut,
} = require("electron");
const fs = require("fs");
/// const {autoUpdater} = require('electron-updater');
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const config = require("./config");
const DataStore = require("./datastore");
const Store = require("electron-store");
const store = new Store();
let timeWindow = store.get("timeWindow") || 72;
store.set("timeWindow", timeWindow);

const {
	is,
	appMenu,
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo,
} = require("electron-util");

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

//.json file name at ~/Library/Application\ Support/rssputin/rssputinDB.json
const feedData = new DataStore({ name: "rssputinDB" });
let initObj = {
	feed: "Enter valid feed",
	visible: true,
	domain: "",
	filterList: "",
	mode: "",
	pageHash: "",
	linkHash: "",
	timeLastChecked: Date.now(),
	id: 0,
};

feedData.addFeeds(initObj);

//item.key = crypto.createHash("sha1").update(item.revisedLink).digest("hex");
//const crypto = require("crypto");

//console.log(feedData.getFeeds());
//console.log(app.getPath("userData"));

// Prevent window from being garbage collected
let mainWindow;
let feedWindow;
let menu;

const createMainWindow = async () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	globalShortcut.register("CommandOrControl+R", function () {
		console.log("CommandOrControl+R is pressed");
		if (mainWindow) mainWindow.close();
		if (feedWindow) feedWindow.close();
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
		const menuItem = menu.getMenuItemById("mainWindow");
		menuItem.enabled = false;
	});

	win.on("reload", () => {
		console.log("win reload");
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		console.log("closed");
		mainWindow = undefined;
		const menuItem = menu.getMenuItemById("mainWindow");
		menuItem.enabled = true;
	});

	await win.loadFile(path.join(__dirname, "./html/mainWindow.html"));

	return win;
};

const createFeedWindow = async () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;
	feedWindow = new BrowserWindow({
		title: "Edit Feeds",
		show: true,
		width: width,
		height: height / 2,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			worldSafeExecuteJavaScript: true, //sanitize JavaScript
			preload: path.join(__dirname, "preload.js"), // use a preload script
		},
	});

	feedWindow.on("ready-to-show", () => {
		let feeds = feedData.getFeeds();
		feedWindow.webContents.send("sendFeeds", feeds);
		feedWindow.show();
	});

	feedWindow.on("reload", () => {
		feedWindow.reload();
	});

	feedWindow.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		feedWindow = undefined;
	});

	await feedWindow.loadFile(path.join(__dirname, "./html/feedWindow.html"));

	return feedWindow;
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
		if (mainWindow.isMinimized()) mainWindow.restore();
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
/*
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
*/
ipcMain.on("requestFeeds", (event, args) => {
	let feeds = feedData.getFeeds();
	console.log("sending", feeds);
	feedWindow.webContents.send("sendFeeds", feeds);
});

ipcMain.on("setTimeWindow", (event, args) => {
	store.set("timeWindow", args);
	console.log("set timeWindow");
});

ipcMain.on("setFeedItem", (event, args) => {
	console.log("setFeedItem:");
	console.log(args);
	feedData.setFeedItem(args);
});

ipcMain.on("addFeeds", (event, args) => {
	console.log("addFeeds:");
	console.log(args);
	feedData.addFeeds(args);
});

ipcMain.on("deleteFeed", (event, args) => {
	console.log("deleteFeed:");
	console.log(args);
	feedData.deleteFeed(args);
});

///incorporate menu.js
const showPreferences = () => {
	// Show the app's preferences here
};

const helpSubmenu = [
	openUrlMenuItem({
		label: "Website",
		url: "https://github.com/sindresorhus/electron-boilerplate",
	}),
	openUrlMenuItem({
		label: "Source Code",
		url: "https://github.com/sindresorhus/electron-boilerplate",
	}),
	{
		label: "Report an Issue…",
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`;

			openNewGitHubIssue({
				user: "sindresorhus",
				repo: "electron-boilerplate",
				body,
			});
		},
	},
];

if (!is.macos) {
	helpSubmenu.push(
		{
			type: "separator",
		},
		aboutMenuItem({
			icon: path.join(__dirname, "static", "icon.png"),
			text: "Created by Lot 49 Labs",
		})
	);
}

const debugSubmenu = [
	{
		label: "Show Settings",
		click() {
			config.openInEditor();
		},
	},
	{
		label: "Show App Data",
		click() {
			shell.openItem(app.getPath("userData"));
		},
	},
	{
		type: "separator",
	},
	{
		label: "Delete Settings",
		click() {
			config.clear();
			app.relaunch();
			app.quit();
		},
	},
	{
		label: "Delete App Data",
		click() {
			shell.moveItemToTrash(app.getPath("userData"));
			app.relaunch();
			app.quit();
		},
	},
];

const macosTemplate = [
	appMenu([
		{
			label: "Preferences…",
			accelerator: "Command+,",
			click() {
				showPreferences();
			},
		},
	]),
	{
		role: "fileMenu",
		submenu: [
			{
				label: "Show Feeds",
				accelerator: "CmdOrCtrl+F",
				async click() {
					console.log("Show Feeds");

					if (mainWindow) {
						createFeedWindow();
					} else {
						console.log("No mainWindow");
					}
				},
			},
			{
				label: "Open Main Window",
				accelerator: "CmdOrCtrl+D",
				enabled: false,
				id: "mainWindow",
				async click() {
					setMainWindow();
				},
			},
			{
				type: "separator",
			},
			{
				role: "close",
			},
		],
	},
	{
		role: "editMenu",
	},
	{
		role: "viewMenu",
	},
	{
		role: "windowMenu",
	},
	{
		role: "help",
		submenu: helpSubmenu,
	},
];

// Linux and Windows
const otherTemplate = [
	{
		role: "fileMenu",
		submenu: [
			{
				label: "Custom",
			},
			{
				type: "separator",
			},
			{
				label: "Settings",
				accelerator: "Control+,",
				click() {
					showPreferences();
				},
			},
			{
				type: "separator",
			},
			{
				role: "quit",
			},
		],
	},
	{
		role: "editMenu",
	},
	{
		role: "viewMenu",
	},
	{
		role: "help",
		submenu: helpSubmenu,
	},
];

const template = process.platform === "darwin" ? macosTemplate : otherTemplate;

if (is.development) {
	template.push({
		label: "Debug",
		submenu: debugSubmenu,
	});
}
///menu.js

const setMainWindow = async () => {
	await app.whenReady().then(async () => {
		//function to open links in browser
		const handleRedirect = (e, url) => {
			if (url !== e.sender.getURL()) {
				e.preventDefault();
				shell.openExternal(url);
			}
		};

		//setup the menu
		menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
		const menuItem = menu.getMenuItemById("mainWindow");
		menuItem.enabled = false;
		//create the mainWindow
		mainWindow = await createMainWindow();
		//intercept navigation event so the URL opens in the browser
		mainWindow.webContents.on("will-navigate", handleRedirect);
		let timeWindow = store.get("timeWindow");
		mainWindow.webContents.send("receiveTimeWindow", timeWindow);
		//fetch and process RSS feeds
		rsslib
			.getAllFeeds(feedData.getFeeds(), mainWindow)
			.then((feeds) => rsslib.processFeeds(feeds, timeWindow))
			.then((result) => mainWindow.webContents.send("fromMain", result))
			.catch((error) => console.error(error.message));
	});
};

setMainWindow();
