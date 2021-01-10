"use strict";
const { contextBridge, ipcRenderer, shell } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
	console.log("loaded");
	/*
	const links = document.querySelectorAll("a[href]");

	Array.prototype.forEach.call(links, function (link) {
		const url = link.getAttribute("href");
		if (url.indexOf("http") === 0) {
			link.addEventListener("click", function (e) {
				e.preventDefault();
				shell.openExternal(url);
			});
		}
	});
	*/
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
	send: (channel, data) => {
		// whitelist channels
		let validChannels = ["toMain", "updateBar"];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		let validChannels = ["fromMain", "updateBar"];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
});
/*
window.addEventListener("DOMContentLoaded", () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector);
		if (element) element.innerText = text;
	};

	for (const type of ["chrome", "node", "electron"]) {
		replaceText(`${type}-version`, process.versions[type]);
	}
});

    <h1>Hello World!</h1>
    We are using Node.js <span id="node-version"></span>, Chromium
    <span id="chrome-version"></span>, and Electron
    <span id="electron-version"></span>.
*/
