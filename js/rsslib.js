/* eslint-disable no-control-regex */
"use strict";

const Parser = require("rss-parser");
let parser = new Parser({
	customFields: {
		feed: [["dc:date", "isoDate"]],
		item: ["pubDate"],
	},
	timeout: 10000,
});

const { formatDistance, differenceInHours } = require("date-fns");

const getAllFeeds = async (urlList, win) => {
	const promises = urlList.map(async (entry) => {
		if (
			entry.feed !== "" &&
			entry.feed !== "Enter valid feed" &&
			entry.visible
		) {
			try {
				const rssResult = await parser.parseURL(entry.feed);

				const combinedResults = {
					res: rssResult,
					meta: entry,
				};
				//console.log(rssResult);
				return combinedResults;
			} catch (e) {
				console.error(e);
				console.log(`Error at ${entry.feed}`);
			}
		}
	});

	//track promise completion
	function progressPromise(promises, tickCallback) {
		let len = promises.length;
		let progress = 0;

		function tick(promise) {
			promise.then(function () {
				progress++;
				//could filter here
				tickCallback(progress, len);
			});
			return promise;
		}

		return Promise.all(promises.map(tick));
	}
	//update progress bar
	function update(completed, total) {
		win.webContents.send("updateBar", [completed, total]);
	}

	return progressPromise(promises, update).then((results) => results);
};

function stringToArray(str) {
	return str.trim().split(" ");
}

function checkFilter(filteredWords, str) {
	str = str.toLowerCase();
	if (filteredWords[0] === "") {
		return true;
	} else if (filteredWords.some((word) => str.includes(word))) {
		return true;
	} else {
		return false;
	}
}

/* https://gist.github.com/john-doherty/b9195065884cdbfd2017a4756e6409cc
 * Removes invalid XML characters from a string
 * @param {string} str - a string containing potentially invalid XML characters (non-UTF8 characters, STX, EOX etc)
 * @param {boolean} removeDiscouragedChars - should it remove discouraged but valid XML characters
 * @return {string} a sanitized string stripped of invalid XML characters
 */
function removeXMLInvalidChars(str, removeDiscouragedChars) {
	// remove everything forbidden by XML 1.0 specifications, plus the unicode replacement character U+FFFD
	var regex =
		/((?:[\0-\x08\x0B\f\x0E-\x1F\uFFFD\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]))/g;

	// ensure we have a string
	str = String(str || "").replace(regex, "");

	if (removeDiscouragedChars) {
		// remove everything discouraged by XML 1.0 specifications
		regex = new RegExp(
			"([\\x7F-\\x84]|[\\x86-\\x9F]|[\\uFDD0-\\uFDEF]|(?:\\uD83F[\\uDFFE\\uDFFF])|(?:\\uD87F[\\uDF" +
				"FE\\uDFFF])|(?:\\uD8BF[\\uDFFE\\uDFFF])|(?:\\uD8FF[\\uDFFE\\uDFFF])|(?:\\uD93F[\\uDFFE\\uD" +
				"FFF])|(?:\\uD97F[\\uDFFE\\uDFFF])|(?:\\uD9BF[\\uDFFE\\uDFFF])|(?:\\uD9FF[\\uDFFE\\uDFFF])" +
				"|(?:\\uDA3F[\\uDFFE\\uDFFF])|(?:\\uDA7F[\\uDFFE\\uDFFF])|(?:\\uDABF[\\uDFFE\\uDFFF])|(?:\\" +
				"uDAFF[\\uDFFE\\uDFFF])|(?:\\uDB3F[\\uDFFE\\uDFFF])|(?:\\uDB7F[\\uDFFE\\uDFFF])|(?:\\uDBBF" +
				"[\\uDFFE\\uDFFF])|(?:\\uDBFF[\\uDFFE\\uDFFF])(?:[\\0-\\t\\x0B\\f\\x0E-\\u2027\\u202A-\\uD7FF\\" +
				"uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|" +
				"(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]))",
			"g"
		);
		let ln = str.length;

		str = str.replace(regex, "");
		let nln = str.length;

		if (ln != nln) {
			console.log("removed characters");
		}
	}

	return str;
}

function processFeeds(feeds, timeWindow, docketOnly) {
	if (feeds[0] === undefined) feeds.shift();

	let arr = [];

	const getHostname = (url) => {
		// use URL constructor and return hostname,  eg www.example.com
		if (url != undefined) {
			return new URL(url).hostname;
		} else {
			return url;
		}
	};

	const getOrigin = (url) => {
		// use URL constructor and return origin, eg https://www.example.com
		if (url != undefined) {
			return new URL(url).origin;
		} else {
			return url;
		}
	};

	feeds.forEach((feed) => {
		if (feed === undefined) {
			return;
		} else if (docketOnly && feed.meta.mode !== "docket") {
			return;
		} else if (!docketOnly && feed.meta.mode === "docket") {
			return;
		}

		//filter for articles with words in list
		let filterList = feed.meta.filterList;

		feed.res.items.forEach((i) => {
			let altURLs = undefined;
			let altLink = undefined;
			let aggregatorLink = undefined;
			if (i.content && feed.meta.mode === "aggregator") {
				let linkIndex;
				let aggIndex;
				altURLs = [
					...new Set(
						i.content.match(
							// eslint-disable-next-line no-useless-escape
							/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
						)
					),
				];

				switch (feed.res.title) {
					case "Hacker News":
						linkIndex = 0; //not used
						aggIndex = 0;
						break;
					case "newest submissions : technology":
						linkIndex = 3;
						aggIndex = 0;
						break;
					case "Techmeme":
						linkIndex = 0;
						aggIndex = 2;
						break;
					case "Technology - Latest - Google News":
						linkIndex = 0;
						aggIndex = altURLs.length - 1;
						break;
					default:
						linkIndex = 0;
						aggIndex = 1;
				}
				altLink = feed.meta.mode === "aggregator" ? altURLs[linkIndex] : i.link;
				aggregatorLink = altURLs[aggIndex];
			}

			//create the feed object to be displayed
			let obj = {};

			let now = new Date().getTime(); //milliseconds

			let pubTime; // typeof i.isoDate !== undefined ? i.isoDate : feed.isoDate;

			if (i.isoDate !== undefined) {
				pubTime = Date.parse(i.isoDate); //milliseconds
			} else if (feed.res.isoDate !== undefined) {
				pubTime = Date.parse(feed.res.isoDate); //milliseconds
			} else {
				pubTime = now; //milliseconds
			}
			obj.published = pubTime;

			obj.pubtype = feed.meta.mode;

			if (i.author !== undefined && i.author.name !== undefined) {
				obj.author = i.author.name[0];
			} else if (i.author !== undefined) {
				obj.author = i.author;
			} else if (i.creator !== undefined) {
				//for arXiv
				obj.author = i.creator;
			} else if (feed.meta.mode === "docket") {
				//add type of court filing to unused author column
				obj.author = i.content.substring(1, i.content.indexOf("]"));
			} else {
				obj.author = "";
			}

			if (obj.author.includes("/u/")) {
				obj.author = obj.author.split("/u/").pop();
			}
			if (obj.author.startsWith("By ")) {
				obj.author = obj.author.split("By ").pop();
			}

			obj.hoursAgo = formatDistance(new Date(obj.published), new Date(now), {
				addSuffix: true,
			});
			if (typeof i.title == "string") {
				obj.title = i.title.split(". (arXiv")[0].substring(0, 200);
			} else {
				obj.title = "Couldn't parse title";
			}
			if (obj.title.length === 200) {
				obj.title += "...";
			}

			obj.link = altLink && feed.meta.mode === "aggregator" ? altLink : i.link;
			let sourceURL = feed.res.link;
			obj.sourceDisplayText = getHostname(sourceURL);
			obj.sourceLink = getOrigin(sourceURL);
			obj.aggregatorLink = aggregatorLink;
			obj.feedTitle = feed.res.title;
			//testing
			removeXMLInvalidChars(obj.title, true);
			obj.color = feed.meta.color;
			let result = differenceInHours(Date.now(), obj.published);

			let filteredWords = stringToArray(filterList);
			let check =
				checkFilter(filteredWords, obj.title) ||
				checkFilter(filteredWords, obj.author);

			let feedDisplayTimeWindow = timeWindow || 72; //hours
			if (result < feedDisplayTimeWindow && check) {
				arr.push(obj);
			} //otherwise, don't show
		});
	});

	arr.sort(function (a, b) {
		return b.published - a.published;
	});
	return arr;
}

module.exports = { getAllFeeds, processFeeds };
