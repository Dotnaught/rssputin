"use strict";

const { BrowserWindow } = require("electron");

const Parser = require("rss-parser");
let parser = new Parser({
	customFields: {
		feed: [["dc:date", "isoDate"]],
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
				const meta = {
					res: rssResult,
					meta: entry,
				};
				return meta;
			} catch (e) {
				console.error(e);
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
/*

const getAllFeeds = async (urlList, win) => {
	const promises = urlList.map(async (entry) => {
		if (
			entry.feed !== "" &&
			entry.feed !== "Enter valid feed" &&
			entry.visible
		) {
			try {
				const rssResult = await parser.parseURL(entry.feed);
				return rssResult;
			} catch (e) {
				console.error(e);
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

*/

function processFeeds(feeds, feedData) {
	if (feeds[0] === undefined) feeds.shift();

	let arr = [];
	/*
	let offsets = {
		"https://www.reddit.com/r/technology/new": 3,
		"https://www.techmeme.com/feed.xml": 0,
		"https://news.ycombinator.com/newest": 0,
	};
	
	0: "https://www.theregister.com/headlines.atom"
	1: "https://news.ycombinator.com/rss"
	2: "https://export.arxiv.org/rss/cs/new"
	3: "https://www.reddit.com/r/technology/new.rss"
	4: "https://blog.google/rss/"
	5: "https://www.techmeme.com/feed.xml"
	6: "https://news.google.com/news/rss/headlines/section/topic/TECHNOLOGY"
	7: "https://lwn.net/headlines/rss"
	8: "https://hnrss.org/newest"
	*/

	/*
	 {
    res: {
      items: [Array],
      title: 'Hacker News',
      description: 'Links for the intellectually curious, ranked by readers.',
      link: 'https://news.ycombinator.com/'
    },
    meta: {
      feed: 'https://news.ycombinator.com/rss',
      visible: true,
      filterList: '',
      id: 3,
      mode: '',
      pageHash: '',
      linkHash: '',
      timeLastChecked: 1610904642221,
      domain: 'https://news.ycombinator.com'
    }
  }

	*/
	const getHostname = (url) => {
		// use URL constructor and return hostname
		if (url != undefined) {
			return new URL(url).hostname;
		} else {
			return url;
		}
	};
	//TODO rewrite this since there's no DOM here
	const extractContent = (text) => {
		//span = document.createElement("span");
		//var span = document.createElement("span");
		//span.innerHTML = text;
		return text; //span.textContent || span.innerText;
	};

	feeds.forEach((feed, index) => {
		/*
		The Register keys: items,link,feedUrl,title,lastBuildDate
		Hacker News keys: items,title,description,link
		cs updates on arXiv.org keys: items,publisher,title,description,link
		newest submissions : technology keys: items,link,feedUrl,title,lastBuildDate
		The Keyword keys: items,feedUrl,image,title,description,link,language,lastBuildDate
		Techmeme keys: items,title,description,pubDate,link,language,lastBuildDate
		Technology - Latest - Google News keys: items,title,description,webMaster,generator,link,language,copyright,lastBuildDate
		LWN.net keys: items,title,description,link
		Hacker News: Newest keys: items,feedUrl,title,description,generator,link,lastBuildDate,docs
		*/
		//console.log("***" + feed.title + " " + Object.keys(feed));
		if (feed === undefined) {
			console.log(feeds.length);
			console.log(feed);
			console.log("quit at " + index);
			return;
		}

		feed.res.items.forEach((i) => {
			//console.dir(i, { depth: null });
			//console.log(feed.isoDate);
			//create single array
			//filter by time
			//dispay
			/*
			let filterList = feedData.forEach(function (entry) {
				if (entry.feed === i.link) {
					return entry.filterList;
				}
			});

			console.log("filterList", filterList);
			*/
			let altURLs = undefined;
			let altLink = undefined;
			let aggregatorLink = undefined;
			//&& feed.title !== "Hacker News"
			if (i.content) {
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
				// /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
				//console.log(feed.title);
				switch (feed.res.title) {
					//Reddit
					case "Hacker News":
						linkIndex = 0; //not used
						aggIndex = 0;
						break;
					case "newest submissions : technology":
						linkIndex = 3;
						aggIndex = 0;
						break;
					case "LWN.net":
						linkIndex = 2;
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
				//special case for aggregator with link in RSS.link object
				altLink =
					feed.res.title !== "Hacker News" ? altURLs[linkIndex] : i.link;
				aggregatorLink = altURLs[aggIndex];
				//process.stdout.write('test');
				//console.log("altLinks ", altURLs);
			}
			//create the feed object to be displayed
			let obj = {};
			//
			//let now = moment(); //formatISO(new Date());
			//console.log(now);
			let now = new Date().getTime(); //milliseconds

			//console.log(now);
			let pubTime; // typeof i.isoDate !== undefined ? i.isoDate : feed.isoDate;
			if (i.isoDate !== undefined) {
				pubTime = Date.parse(i.isoDate); //milliseconds
				//console.log("Using i.isoDate"); //2020-11-21T17:25:28.000Z
			} else if (feed.res.isoDate !== undefined) {
				pubTime = Date.parse(feed.res.isoDate); //milliseconds
				//console.log("Using feed.isoDate");
			} else {
				pubTime = now; //milliseconds
			}
			//obj.publishedTime = new Date(pubTime); //Date object
			obj.published = pubTime; //obj.publishedTime.getTime(); //milliseconds

			if (i.author !== undefined && i.author.name !== undefined) {
				obj.author = i.author.name[0];
			} else if (i.author !== undefined) {
				obj.author = i.author;
			} else if (i.creator !== undefined) {
				//for arXiv
				obj.author = extractContent(i.creator);
			} else {
				obj.author = "";
			}

			if (obj.author.includes("/u/")) {
				obj.author = obj.author.split("/u/").pop();
			}

			obj.hoursAgo = formatDistance(new Date(obj.published), new Date(now), {
				addSuffix: true,
			}); //moment(publishedTime).fromNow(); // for display, issue last updated
			/* if (obj.hoursAgo > now) {
				obj.hoursAgo = now;
			} */

			obj.title = i.title.split(". (arXiv")[0].substring(0, 200);
			if (obj.title.length === 200) {
				obj.title += "...";
			}
			obj.link = altLink ? altLink : i.link;
			let sourceURL = feed.res.link; //feed.title !== "Hacker News" ? feed.link : feed.comments;
			obj.sourceLink = getHostname(sourceURL);
			obj.aggregatorLink = aggregatorLink;
			obj.feedTitle = feed.res.title;

			//let arrIndex = fetchedDB.find( ({ rssLink }) => rssLink === 'LINK' );

			//visibility handled in getAllFeeds
			//obj.visible = feed.meta.visible;

			/*
			console.log("author", obj.author);
			console.log("title", obj.title);
			console.log("link", obj.link);
			console.log("source", obj.sourceLink);
			console.log("feed title", feed.title);
			console.log("aggregator link", obj.aggregatorLink);
			*/
			let result = differenceInHours(Date.now(), obj.published);
			//console.log("diff " + result);

			let feedDisplayTimeWindow = 72; //hours
			if (result < feedDisplayTimeWindow) {
				arr.push(obj);
			}
		});
	});

	arr.sort(function (a, b) {
		return b.published - a.published;
	});
	//add blank feed at head of list

	return arr;
	//let table = document.querySelector("table");
	//let data = Object.keys(arr[0]);
	//generateTableHead(table, data);
	//generateTable(table, arr);
	//deactivateSpinner();
}

module.exports = { getAllFeeds, processFeeds };
