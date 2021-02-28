"use strict";

const notification = document.getElementById("notification");
//const message = document.getElementById("message");
//const restartButton = document.getElementById("restart-button");

let table = document.querySelector("table");

window.api.receive("updateBar", (args) => {
	let bar = document.getElementById("bar");
	let progress = (args[0] / args[1]) * 100;
	bar.style.width = progress + "%";
});

let timeWindow;

window.api.receive("receiveTimeWindow", (receivedTime) => {
	timeWindow = receivedTime;
});

window.api.receive("fromMain", (arr) => {
	if (!arr) arr = 0;
	if (arr.length > 0) {
		//let data = Object.keys(arr[0]);
		generateTableHead(table);
		generateTable(table, arr);
	} else {
		generateNoDataMessage();
		generateTableHead(table);
	}
});

const extractContent = (text) => {
	return new DOMParser().parseFromString(text, "text/html").documentElement
		.textContent;
};

window.addEventListener("DOMContentLoaded", () => {
	let query = document.getElementById("query");
	query.addEventListener("focus", displayCancelShow);
	query.addEventListener("keyup", searchFunction);
	//query.addEventListener("blur", displayCancelHide);
	//query.addEventListener("click", displayCancelHide);

	let clear = document.querySelector("#clear");
	clear.addEventListener("click", displayCancelHide);
	clear.style.visibility = "hidden";

	let close = document.querySelector("#close-button");
	close.addEventListener("click", closeNotification);
	let restart = document.querySelector("#restart-button");
	restart.addEventListener("click", restartApp);
});

function closeNotification() {
	notification.classList.add("hidden");
}

function restartApp() {
	window.api.send("restartApp", []);
}
/*
window.api.receive("update_available", () => {
	//window.api.removeAllListeners("update_available");
	message.innerText = "A new update is available. Downloading now...";
	notification.classList.remove("hidden");
});

window.api.receive("update_downloaded", () => {
	//window.api.removeAllListeners("update_downloaded");
	message.innerText =
		"Update Downloaded. It will be installed on restart. Restart now?";
	restartButton.classList.remove("hidden");
	notification.classList.remove("hidden");
});
*/
function displayCancelShow() {
	let cancelButton = document.getElementById("clear");
	cancelButton.style.visibility = "visible";
}

function displayCancelHide() {
	let cancelButton = document.getElementById("clear");
	cancelButton.style.visibility = "hidden";
	document.getElementById("query").value = "";
	searchFunction();
}

function searchFunction() {
	let input, filter, tr, td, i;
	input = document.getElementById("query");
	filter = input.value.toUpperCase();
	//table = document.getElementById("myTable");
	tr = table.getElementsByTagName("tr");
	for (i = 1; i < tr.length; i++) {
		td = tr[i].getElementsByTagName("td")[1];
		if (td) {
			if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
				tr[i].style.display = "";
			} else {
				tr[i].style.display = "none";
			}
		}
	}
}

function generateNoDataMessage() {
	let subhead = document.getElementById("subhead");
	subhead.innerText = "No RSS feeds found in database";
	window.api.send("openFeedWindow", "data");
}

function clearNoDataMessage() {
	let subhead = document.getElementById("subhead");
	if (subhead.innerText.length > 0) {
		subhead.innerText = "";
	}
}

//published, author, hoursAgo, title, link, sourceLink, feedTitle
function generateTableHead(table) {
	let thead = table.createTHead();
	let row = thead.insertRow();
	let columns = ["hoursAgo", "Title", "Author", "Source"];
	let times = [3, 6, 12, 24, 48, 72];
	//for (let key of data) {
	for (let key of columns) {
		if (key === "hoursAgo") {
			let th = document.createElement("th");
			let dropdown = document.createElement("select");
			dropdown.setAttribute("id", "timeDropdown");
			for (let val of times) {
				let opt = document.createElement("option");
				opt.id = "timeSelect";
				opt.text = `Last ${val} hours`;
				opt.value = val;
				if (val === timeWindow) {
					opt.selected = true;
				}
				dropdown.appendChild(opt);
			}
			dropdown.addEventListener("change", () => {
				let timeVal = parseInt(document.getElementById("timeDropdown").value);
				window.api.send("setTimeWindow", timeVal);
			});
			//let text = document.createTextNode(key);
			th.setAttribute("id", "hoursAgo");

			th.appendChild(dropdown);

			row.appendChild(th);
		} else {
			let th = document.createElement("th");
			let text = document.createTextNode(key);
			th.appendChild(text);
			row.appendChild(th);
		}
	}
}

function generateTable(table, data) {
	clearNoDataMessage();
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
			if (key === "title") {
				let cleanedText = extractContent(element[key]);
				let text = document.createTextNode(cleanedText);
				const a = document.createElement("a");

				a.setAttribute("href", element.link); //'#'
				//a.setAttribute("class", element.sourceLink); //TODO
				if (element.title.length > 159) {
					a.setAttribute("title", element.title);
				}
				//a.style.color = "#00AA00";
				a.appendChild(text);
				cell.appendChild(a);
			} else if (key === "sourceLink") {
				let cleanedText = extractContent(element.sourceDisplayText);
				if (cleanedText.startsWith("www.")) {
					cleanedText = cleanedText.slice(4);
				}
				let text = document.createTextNode(cleanedText);
				const a = document.createElement("a");
				let link = element.aggregatorLink
					? element.aggregatorLink
					: element.sourceLink;
				a.setAttribute("href", link);
				//a.setAttribute("class", element.sourceLink);

				a.appendChild(text);
				cell.appendChild(a);
			} else {
				let cleanedText = extractContent(element[key]);
				let text = document.createTextNode(cleanedText);
				cell.appendChild(text);
			}
		}
		//}
	}
}
