"use strict";

console.log("Render process loaded");
let table = document.querySelector("table");

window.api.receive("fromMain", (arr) => {
	console.log("Received from main process:");
	for (const [key, value] of Object.entries(arr)) {
		console.log(key, value);
	}

	let data = Object.keys(arr[0]);
	generateTableHead(table, data);
	generateTable(table, arr);
	//console.log(`Received ${Object.entries(data)} from main process`);
});
window.api.send("toMain", "some data");

function openLink(link, el) {
	shell.openExternal(link);
	el.style.color = clickedColor;
}

//published, author, hoursAgo, title, link, sourceLink, feedTitle
function generateTableHead(table) {
	let thead = table.createTHead();
	let row = thead.insertRow();
	let columns = ["hoursAgo", "title", "author", "sourceLink"];
	//for (let key of data) {
	for (let key of columns) {
		let th = document.createElement("th");
		let text = document.createTextNode(key);
		th.appendChild(text);
		row.appendChild(th);
	}
}

function generateTable(table, data) {
	let columns = ["hoursAgo", "title", "author", "sourceLink"];

	for (let element of data) {
		//let timeCheck = /hours|hour|minutes|minute/.test(element["hoursAgo"]);
		//filter everything by regex
		//if (timeCheck) {
		//if (!element["hoursAgo"].includes("days")) {
		let row = table.insertRow();
		//for (let key in element) {
		for (let key of columns) {
			let cell = row.insertCell();
			let text = document.createTextNode(element[key]);
			if (key === "title") {
				const a = document.createElement("a");
				a.setAttribute("href", "#");
				a.setAttribute("class", element["sourceLink"]);
				if (element["title"].length > 159) {
					a.setAttribute("title", element["title"]);
				}

				a.onmousedown = function () {
					openLink(element.link, a);
				};
				a.appendChild(text);
				cell.appendChild(a);
			} else if (key === "sourceLink") {
				const a = document.createElement("a");
				a.setAttribute("href", "#");
				a.setAttribute("class", element["sourceLink"]);

				a.onmousedown = function () {
					openLink(element.aggregatorLink, a);
				};

				a.appendChild(text);
				cell.appendChild(a);
			} else {
				cell.appendChild(text);
			}
		}
		//}
	}
}
