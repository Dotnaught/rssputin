let feedData;

window.api.receive("sendFeeds", (arr) => {
	let table = document.querySelector("table");
	let data = Object.keys(arr[0]);
	feedData = arr;
	generateTableHead(table, data);
	generateTable(table, arr);
});

//0,feed,1,visible,2,domain,3,filterList,4,mode,5,pageHash,6,linkHash,7,timeLastChecked, 8, id
let fields = ["feed", "filterList", "visible", "id"];
let editCache = "";

let cacheData = (e) => {
	editCache = e.target.textContent;
};

let editTable = (e) => {
	if (e.keyCode === 13) {
		e.preventDefault();
		e.target.blur();
	}
};

let saveTable = (e) => {
	let id = e.target.getAttribute("data-id");
	let key = e.target.getAttribute("data-key");
	let val, oldval;

	if (editCache != e.target.textContent && key === "visible") {
		val = e.target.textContent == "true"; //get boolean from string
		oldval = !val;
		e.target.textContent = val.toString();
		editCache = "";
		saveItem(key, val, oldval, id);
	} else if (editCache != e.target.textContent && key === "feed") {
		if (validURL(e.target.textContent)) {
			val = e.target.textContent;
			oldval = editCache;
			editCache = "";
			saveItem(key, val, oldval, id);
		} else {
			e.target.textContent = "Invalid URL. Try again.";
		}
	} else if (editCache != e.target.textContent && key === "filterList") {
		let pattern = /^[\w\s]+$/; //Alphanumberic and spaces
		let result = pattern.test(e.target.textContent);

		if (result || e.target.textContent === "") {
			val = e.target.textContent.toLowerCase();
			oldval = editCache;
			editCache = "";
			saveItem(key, val, oldval, id);
		} else {
			e.target.textContent = "";
		}
	}
};

let flipVal = (e) => {
	let id = e.target.getAttribute("data-id");
	let key = e.target.getAttribute("data-key");
	let val, newval;
	val = e.target.textContent == "true"; //get boolean from string
	newval = !val;
	e.target.textContent = newval.toString();
	saveItem(key, newval, val, id);
};

function validURL(string) {
	let url;

	try {
		url = new URL(string);
	} catch (e) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:";
}

function generateTableHead(table, data) {
	let thead = table.createTHead();
	let row = thead.insertRow();
	for (let key of data) {
		if (fields.indexOf(key) !== -1) {
			let th = document.createElement("th");
			let text = document.createTextNode(key);
			th.appendChild(text);
			row.appendChild(th);
		}
	}
	//create dummy header cell
	let th = document.createElement("th");
	let text = document.createTextNode("Action");
	th.appendChild(text);
	row.appendChild(th);
}

function generateTable(table, data) {
	for (let element of data) {
		let row = table.insertRow();

		for (let key in element) {
			if (fields.indexOf(key) !== -1) {
				let cell = row.insertCell();
				let text = document.createTextNode(element[key]);

				cell.appendChild(text);
				cell.setAttribute("data-key", key);
				cell.setAttribute("data-id", element["id"]);
				if (key === "feed" && parseInt(element["id"]) === 0) {
					cell.setAttribute("style", "opacity:0.5; background-color:#00dd33");
					cell.setAttribute("onfocus", "this.textContent=''");
				}
				if (
					(key === "feed" && parseInt(element["id"]) === 0) ||
					key === "filterList"
				) {
					cell.setAttribute("contenteditable", true);
					cell.addEventListener("focus", cacheData, false);
					cell.addEventListener("blur", saveTable, false);
					cell.addEventListener("keydown", editTable, false);
				}
				if (key === "visible") {
					cell.addEventListener("click", flipVal, false);
				}
			}
		}
		//add button at end
		let cell = row.insertCell();
		//connect button to cell id
		let id = cell.parentNode.lastChild.previousSibling.innerHTML;
		let color = [];
		color.push(
			"w-40 h-10 px-5 text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-full focus:shadow-outline hover:bg-indigo-800"
		);
		color.push(
			"w-40 h-10 px-5 text-indigo-100 transition-colors duration-150 bg-red-500 rounded-full focus:shadow-outline hover:bg-red-600"
		);
		cell.setAttribute("style", "text-align:center");
		let newElem = document.createElement("input");
		cell.appendChild(newElem);
		newElem.setAttribute("type", "button");
		let zeroOrOne = parseInt(id) === 0 ? 0 : 1;
		newElem.setAttribute("class", color[zeroOrOne]);

		newElem.setAttribute("data-reference", id);
		if (parseInt(id) > 0) {
			newElem.setAttribute("value", "Delete Entry");
			newElem.addEventListener("click", deleteRow, false);
		} else {
			newElem.setAttribute("value", "Add Entry");
			newElem.addEventListener("click", addRow, false);
		}
	}
}

function saveItem(key, val, oldval, id) {
	let updateObj = {
		key: key,
		val: val,
		oldval: oldval,
		id: id,
	};

	if (parseInt(id) !== 0) {
		try {
			window.api.send("setFeedItem", updateObj);
		} catch (error) {
			console.error("Generic error: " + error);
		}
	}
}

function deleteItem(id) {
	try {
	} catch (error) {
		console.error("Generic error: " + error);
	}
}

const getOrigin = (url) => {
	// use URL constructor and return hostname
	if (url != undefined) {
		try {
			return new URL(url).origin;
		} catch (error) {
			return "https://example.com";
		}
	} else {
		return url;
	}
};

let addRow = (e) => {
	//let id = e.target.getAttribute("data-reference");

	let row = e.target.parentNode.parentNode.children;
	let feed, filter, visible;
	for (let i = 0; i < row.length - 1; i++) {
		if (row[i]["attributes"]["data-key"].value === "feed") {
			feed = row[i]["textContent"];
		}
		if (row[i]["attributes"]["data-key"].value === "filterList") {
			filter = row[i]["textContent"];
		}
		if (row[i]["attributes"]["data-key"].value === "visible") {
			visible = row[i]["textContent"] == "true";
		}
	}

	let newid = feedData.length;
	let ids = [];
	feedData.forEach((element) => ids.push(element.id));

	for (let i = 0; i <= feedData.length; i++) {
		if (!ids.includes(i)) {
			newid = i;
		}
	}

	let creationObj = {
		feed: feed,
		visible: true,
		filterList: filter,
		id: newid,
		mode: "",
		pageHash: "",
		linkHash: "",
		timeLastChecked: Date.now(),
		domain: getOrigin(feed),
	};

	if (validURL(feed)) {
		try {
			window.api.send("addFeeds", creationObj);
			location.reload();
		} catch (error) {
			console.error("Generic error: " + error);
		}
	}
};

let deleteRow = (e) => {
	// event.target will be the input element.
	let id = e.target.getAttribute("data-reference");
	let td = e.target.parentNode;
	let tr = td.parentNode;
	// remove row
	tr.parentNode.removeChild(tr);
	//update database
	try {
		window.api.send("deleteFeed", id);
		location.reload();
	} catch (error) {
		console.error("Generic error: " + error);
	}
};
