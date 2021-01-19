"use strict";

console.log("Render process loaded");

let table = document.querySelector("table");

window.api.receive("updateBar", (args) => {
	let bar = document.getElementById("bar");
	let progress = (args[0] / args[1]) * 100;
	//console.log(args[0], args[1], progress);
	bar.style.width = progress + "%";
});

window.api.receive("fromMain", (arr) => {
	//console.log("Received arr from main process...", arr);
	//for (const [key, value] of Object.entries(arr)) {
	//	console.log(key, value);
	//}
	if (arr.length > 0) {
		let data = Object.keys(arr[0]);
		generateTableHead(table);
		generateTable(table, arr);
		//console.log(`Received ${Object.entries(data)} from main process`);
	} else {
		generateTableHead(table);
	}
});
window.api.send("toMain", "some data");

const extractContent = (text) => {
	return new DOMParser().parseFromString(text, "text/html").documentElement
		.textContent;
};

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
			let cleanedText = extractContent(element[key]);
			let text = document.createTextNode(cleanedText);
			if (key === "title") {
				const a = document.createElement("a");
				a.setAttribute("href", element.link); //'#'
				a.setAttribute("class", element["sourceLink"]);
				if (element["title"].length > 159) {
					a.setAttribute("title", element["title"]);
				}
				/*
				a.onmousedown = function () {
					openLink(element.link, a);
				};
				*/
				a.appendChild(text);
				cell.appendChild(a);
			} else if (key === "sourceLink") {
				const a = document.createElement("a");
				a.setAttribute("href", element.aggregatorLink);
				a.setAttribute("class", element["sourceLink"]);

				a.appendChild(text);
				cell.appendChild(a);
			} else {
				cell.appendChild(text);
			}
		}
		//}
	}
}