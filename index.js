/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
"use strict";
const path = require("path");
const {
	app,
	BrowserWindow,
	Menu,
	dialog,
	ipcMain,
	screen,
	shell,
	globalShortcut,
	Notification,
} = require("electron");

const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const config = require("./js/config");
const DataStore = require("./js/datastore");
const Store = require("electron-store");
const store = new Store();
const timeWindow = store.get("timeWindow") || 72;
store.set("timeWindow", timeWindow);

const {
	is,
	appMenu,
	aboutMenuItem,
	openUrlMenuItem,
	openNewGitHubIssue,
	debugInfo,
} = require("electron-util");

const userData = app.getPath("userData") + "/rssputinDB.json";
//const rssdb = require(userData);
const rsslib = require("./js/rsslib");
const jsonSchema = require("./js/schema");

unhandled();
debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("com.lot49.rssputin");

//const { config } = JSON.parse(fs.readFileSync('../config.json', 'utf8'))

const schema = jsonSchema.schema;
//const testData = jsonSchema.testData;
/*
const resp = fs.readFileSync(userData, "utf8", (err, data) => {
	if (err) throw err;
	return data;
});
const rssdb = JSON.parse(resp);
*/
const Ajv = require("ajv");
const ajv = new Ajv();
const validate = ajv.compile(schema);
//const valid = validate(rssdb);
//if (!valid) console.log(validate.errors);

// .json file name at ~/Library/Application\ Support/rssputin/rssputinDB.json
const feedData = new DataStore({ name: "rssputinDB" });

const initObject = {
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

feedData.addFeeds(initObject);

// Prevent window from being garbage collected
let mainWindow;
let feedWindow;
let menu;

const createMainWindow = async () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	globalShortcut.register("CommandOrControl+R", () => {
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
			preload: path.join(__dirname, "./js/preload.js"), // Use a preload script
		},
	});

	win.once("ready-to-show", () => {
		autoUpdater.checkForUpdatesAndNotify();
	});

	win.on("ready-to-show", () => {
		win.show();
		const menuItem = menu.getMenuItemById("mainWindow");
		menuItem.enabled = false;
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
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
		width,
		height: height / 2,
		webPreferences: {
			nodeIntegration: false, // Is default value after Electron v5
			contextIsolation: true, // Protect against prototype pollution
			enableRemoteModule: false, // Turn off remote
			worldSafeExecuteJavaScript: true, // Sanitize JavaScript
			preload: path.join(__dirname, "./js/preload.js"), // Use a preload script
		},
	});

	feedWindow.on("ready-to-show", () => {
		let feeds = feedData.getFeeds();
		if (feeds === []) {
			feeds = [initObject];
		}

		feedWindow.webContents.send("sendFeeds", feeds);
		feedWindow.show();
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

ipcMain.on("requestFeeds", (event, args) => {
	const feeds = feedData.getFeeds();
	feedWindow.webContents.send("sendFeeds", feeds);
});

ipcMain.on("setTimeWindow", (event, args) => {
	store.set("timeWindow", args);
	if (mainWindow) {
		mainWindow.close();
	}

	if (feedWindow) {
		feedWindow.close();
	}

	setMainWindow();
});

ipcMain.on("setFeedItem", (event, args) => {
	feedData.setFeedItem(args);
});

ipcMain.on("addFeeds", (event, args) => {
	feedData.addFeeds(args);
});

ipcMain.on("deleteFeed", (event, args) => {
	feedData.deleteFeed(args);
});

ipcMain.on("openFeedWindow", (event, args) => {
	createFeedWindow();
});

ipcMain.on("restartApp", (event, args) => {
	autoUpdater.quitAndInstall();
});

autoUpdater.on("update-available", () => {
	mainWindow.webContents.send("update_available", []);
});

autoUpdater.on("update-downloaded", () => {
	mainWindow.webContents.send("update_downloaded", []);
});

/// incorporate menu.js
const showPreferences = () => {
	// Show the app's preferences here
};

function showNotification(title, body) {
	const notification = {
		title: title,
		body: body,
		silent: true,
		timeoutType: "default",
	};
	new Notification(notification).show();
}

function exportDB() {
	console.log("Starting export...");

	dialog
		.showSaveDialog(mainWindow, {
			properties: ["openFile", "openDirectory"],
			filters: [{ name: "JSON", extensions: ["json"] }],
			buttonLabel: "Export Feeds",
			defaultPath: userData,
		})
		.then((result) => {
			//console.log(result.canceled);
			//console.log(result.filePath);
			//console.log(userData);
			if (result.filePath === undefined || result.canceled) {
				console.log("No file path defined or cancelled");
				return;
			}

			fs.copyFile(userData, result.filePath, (err) => {
				if (err) {
					//console.log("An error ocurred creating the file " + err.message);
					showNotification("Something went wrong...", err.message);
				}
				//console.log("The file has been succesfully saved");
				showNotification("Success!", "Database exported.");
			});
		})
		.catch((err) => {
			console.log(err);
		});
}

function importDB() {
	console.log("Starting import...");

	dialog
		.showOpenDialog(mainWindow, {
			properties: ["openFile", "openDirectory"],
			filters: [{ name: "JSON", extensions: ["json"] }],
			defaultPath: app.getPath("downloads") + "/rssputinDB.json",
		})
		.then((result) => {
			//console.log(result.canceled);
			//console.log(result.filePath);
			//console.log(result.filePaths);
			if (
				result.filePaths === undefined ||
				!fs.existsSync(result.filePaths[0] || result.canceled)
			) {
				console.log("No file found");
				return;
			} else {
				//write file
				let importFile = result.filePaths[0];
				let resp = fs.readFileSync(importFile, "utf8", (err, data) => {
					if (err) throw err;
					return data;
				});
				let fileContents = JSON.parse(resp);
				let check = validate(fileContents);
				if (!check) {
					console.log(validate.errors);
				} else {
					console.log("write file");
					fs.copyFile(importFile, userData, (err) => {
						if (err) {
							showNotification("Something went wrong...", err.message);
						}
						showNotification("Success!", "Database imported.");
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
		});
}

const helpSubmenu = [
	openUrlMenuItem({
		label: "Website",
		url: "https://github.com/Dotnaught/rssputin",
	}),
	openUrlMenuItem({
		label: "Source Code",
		url: "https://github.com/Dotnaught/rssputin",
	}),
	{
		label: "Report an Issue…",
		click() {
			const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`;

			openNewGitHubIssue({
				user: "dotnaught",
				repo: "rssputin",
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
					if (mainWindow) {
						createFeedWindow();
					}
				},
			},
			{
				type: "separator",
			},
			{
				label: "Import Database",
				accelerator: "CmdOrCtrl+=",
				async click() {
					if (mainWindow) {
						importDB();
					}
				},
			},
			{
				label: "Export Database",
				accelerator: "CmdOrCtrl+B",
				async click() {
					if (mainWindow) {
						exportDB();
					}
				},
			},
			{
				type: "separator",
			},
			{
				type: "separator",
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
/// menu.js

const setMainWindow = async () => {
	await app.whenReady().then(async () => {
		// Function to open links in browser
		const handleRedirect = (event, url) => {
			if (url !== event.sender.getURL()) {
				shell.openExternal(url);
				event.preventDefault();
			}
		};

		// Setup the menu
		menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
		const menuItem = menu.getMenuItemById("mainWindow");
		menuItem.enabled = false;
		// Create the mainWindow
		mainWindow = await createMainWindow();
		// Intercept navigation event so the URL opens in the browser
		mainWindow.webContents.on("will-navigate", handleRedirect);
		const timeWindow = store.get("timeWindow");
		mainWindow.webContents.send("receiveTimeWindow", timeWindow);
		// Fetch and process RSS feeds
		rsslib
			.getAllFeeds(feedData.getFeeds(), mainWindow)
			.then((feeds) => rsslib.processFeeds(feeds, timeWindow))
			.then((result) => mainWindow.webContents.send("fromMain", result))
			.catch((error) => console.error(error.message));
	});
};

setMainWindow();
