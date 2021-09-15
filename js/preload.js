"use strict";
const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
	send: (channel, data) => {
		// send to main process
		let validChannels = [
			"requestFeeds",
			"setTimeWindow",
			"setDocket",
			"setFeedItem",
			"addFeeds",
			"deleteFeed",
			"openFeedWindow",
			"restartApp",
			"storeWidthData",
		];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		//receive from main process
		let validChannels = [
			"fromMain",
			"updateBar",
			"sendFeeds",
			"receiveDefaults",
			"updateLinks",
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
});
//invoke
