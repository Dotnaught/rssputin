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
			"setFeedItem",
			"addFeeds",
			"deleteFeed",
			"openFeedWindow",
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
			"receiveTimeWindow",
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
});
//invoke
