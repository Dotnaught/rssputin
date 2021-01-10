"use strict";
const Store = require("electron-store");

class DataStore extends Store {
	constructor(settings) {
		super(settings);

		// initialize with feed or empty array
		this.feeds = this.get("feeds") || [];
	}

	saveFeeds() {
		// save feed to JSON file
		this.set("feeds", this.feeds);

		// returning 'this' allows method chaining
		return this;
	}

	getFeeds() {
		// set object's todos to feeds in JSON file
		this.feeds = this.get("feeds") || [];

		return this.feeds;
	}

	addFeeds(feed) {
		// merge the existing feeds with the new feed
		console.log(this.feeds);
		console.log(feed);
		if (this.feeds.filter((item) => item.feed === feed).length === 0) {
			feed = feed.toLowerCase();
			let obj = { feed: feed, visible: "true" };
			this.feeds = [...this.feeds, obj];
			return this.saveFeeds();
		} else {
			console.log("Feed already exists");
		}
	}

	deleteFeeds(feed) {
		// filter out the target feed
		this.feeds = this.feeds.filter((item) => item.feed !== feed);

		return this.saveFeeds();
	}
}

module.exports = DataStore;
