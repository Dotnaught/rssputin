let feedData;

window.api.receive("sendFeeds", (arr) => {
	let table = document.querySelector("table");
	let data = Object.keys(arr[0]);
	feedData = arr;
	generateTableHead(table, data);
	generateTable(table, arr);
});

//0,feed,1,visible,2,domain,3,filterList,4,mode,5,pageHash,6,linkHash,7,timeLastChecked, 8, id, action
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

let flipBool = (e) => {
	let id = e.target.getAttribute("data-id");
	let key = e.target.getAttribute("data-key");
	let val, newval;
	val = e.target.textContent === "true"; //get boolean from string
	newval = !val;
	e.target.textContent = newval.toString();
	saveItem(key, newval, val, id);
};

let flipString = (e) => {
	let id = e.target.getAttribute("data-id");
	let key = e.target.getAttribute("data-key");
	let val, newval;
	val = e.target.textContent;
	newval = val === "publication" ? "aggregator" : "publication";
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
	//destructure header fields from database schema
	let selectedFields = (({ feed, visible, filterList, mode, id, action }) => ({
		feed,
		visible,
		filterList,
		mode,
		id,
		action,
	}))(data);

	for (let key in selectedFields) {
		let th = document.createElement("th");
		let text = document.createTextNode(key);
		th.appendChild(text);
		row.appendChild(th);
	}
}

function generateTable(table, arr) {
	for (let element of arr) {
		let row = table.insertRow();
		let selectedKeys = (({ feed, visible, filterList, mode, id, action }) => ({
			feed,
			visible,
			filterList,
			mode,
			id,
			action,
		}))(element);
		for (let key in selectedKeys) {
			let cell = row.insertCell();
			let text = document.createTextNode(selectedKeys[key]);
			console.log(
				`creating ${text.textContent} for element ${selectedKeys[key]} with key ${key}`
			);
			cell.appendChild(text);
			cell.setAttribute("data-key", key);
			cell.setAttribute("data-id", selectedKeys["id"]);
			if (key === "feed" && parseInt(selectedKeys["id"]) === 0) {
				cell.setAttribute("style", "opacity:0.5; background-color:#00dd33");
				cell.setAttribute("onfocus", "this.textContent=''");
			}
			if (
				(key === "feed" && parseInt(selectedKeys["id"]) === 0) ||
				key === "filterList"
			) {
				cell.setAttribute("contenteditable", true);
				cell.addEventListener("focus", cacheData, false);
				cell.addEventListener("blur", saveTable, false);
				cell.addEventListener("keydown", editTable, false);
			}
			if (key === "visible") {
				cell.addEventListener("click", flipBool, false);
			}
			if (key === "mode") {
				cell.addEventListener("click", flipString, false);
			}
			if (key === "action") {
				//remove textNode to accommodate button
				cell.removeChild(text);
				let id = selectedKeys["id"];
				let color = [];
				color.push(
					"w-40 h-10 px-5 text-indigo-100 transition-colors duration-150 bg-indigo-700 rounded-full focus:shadow-outline hover:bg-indigo-800"
				);
				color.push(
					"w-40 h-10 px-5 text-indigo-100 transition-colors duration-150 bg-red-500 rounded-full focus:shadow-outline hover:bg-red-600"
				);
				cell.setAttribute("style", "text-align:center");
				let newElem = document.createElement("input");

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
				cell.appendChild(newElem);
			}
			//}
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
	let feed, filter, visible, mode;
	for (let i = 0; i < row.length - 1; i++) {
		if (row[i]["attributes"]["data-key"].value === "feed") {
			feed = row[i]["textContent"];
		}
		if (row[i]["attributes"]["data-key"].value === "filterList") {
			filter = row[i]["textContent"];
		}
		if (row[i]["attributes"]["data-key"].value === "visible") {
			// eslint-disable-next-line no-unused-vars
			visible = row[i]["textContent"] == "true";
		}
		if (row[i]["attributes"]["data-key"].value === "mode") {
			// eslint-disable-next-line no-unused-vars
			mode =
				row[i]["textContent"] == "publication" ? "publication" : "aggregator";
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
		mode: mode,
		pageHash: "",
		linkHash: "",
		timeLastChecked: Date.now(),
		domain: getOrigin(feed),
		action: true,
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
