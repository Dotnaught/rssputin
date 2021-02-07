"use strict";

let table = document.querySelector("table");

window.api.receive("updateBar", (args) => {
	let bar = document.getElementById("bar");
	let progress = (args[0] / args[1]) * 100;
	//console.log(args[0], args[1], progress);
	bar.style.width = progress + "%";
});

let timeWindow;

window.api.receive("receiveTimeWindow", (receivedTime) => {
	timeWindow = receivedTime;
});

window.api.receive("fromMain", (arr) => {
	//console.log("Received arr from main process...", arr);
	//for (const [key, value] of Object.entries(arr)) {
	//	console.log(key, value);
	//}
	if (!arr) arr = 0;
	if (arr.length > 0) {
		let data = Object.keys(arr[0]);
		generateTableHead(table);
		generateTable(table, arr);
		//console.log(`Received ${Object.entries(data)} from main process`);
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
});

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
	//console.log(input.value);
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
				opt.text = `Last ${val} hours`;
				opt.value = val;
				if (val === timeWindow) {
					opt.selected = true;
				}
				dropdown.appendChild(opt);
			}
			dropdown.addEventListener("change", (e) => {
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
			let cleanedText = extractContent(element[key]);
			let text = document.createTextNode(cleanedText);
			if (key === "title") {
				const a = document.createElement("a");
				a.setAttribute("href", element.link); //'#'
				a.setAttribute("class", element["sourceLink"]);
				if (element["title"].length > 159) {
					a.setAttribute("title", element["title"]);
				}
				//a.style.color = "#00AA00";
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
