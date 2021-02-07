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
	//key, val, oldval, id
	//args { key: 'visible', val: 0, oldval: NaN, id: '1' }
	setFeedItem(args) {
		this.feeds = this.get("feeds") || [];
		console.log("the feeds", this.feeds);
		let i = this.feeds.findIndex((x) => x.id === parseInt(args.id));
		console.log(i, args.key, args.oldval);
		if (this.feeds[i][args.key] === args.oldval) {
			this.feeds[i][args.key] = args.val;
			console.log("updated:", args.key, args.oldval, args.val);
		}
		return this.saveFeeds();
	}

	addFeeds(creationObj) {
		// merge the existing feeds with the new feed
		//console.log(this.feeds.length);
		//console.log(feed);

		if (
			this.feeds.filter((item) => item.feed === creationObj.feed).length === 0
		) {
			this.feeds = [...this.feeds, creationObj];
			return this.saveFeeds();
		} else {
			//console.log("Feed already exists");
		}
	}

	deleteFeed(id) {
		// filter out the target feed
		console.log("delete", id);
		console.log(this.feeds);

		this.feeds = this.feeds.filter(
			(item) => parseInt(item.id) !== parseInt(id)
		);
		console.log(this.feeds);
		return this.saveFeeds();
	}
}

module.exports = DataStore;
