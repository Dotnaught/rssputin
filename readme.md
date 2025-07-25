# RSSputin

RSSputin is an Electron-based RSS/Atom headline aggregator for journalists. It's designed for finding recently published news and source documents; it's not intended for reading articles – clicking on a link will open the article in the default browser.

The project is a rewrite of my [vulture-feeds](https://github.com/Dotnaught/vulture-feeds) project that attempts to use more modern JavaScript and some of Electron's security recommendations like handling inter-process communication via a preload.js file. Networking and database functions have been moved out of the render process and into the main process.

The app has been setup to ingest some sources that require customization, because RSS and ATOM implementations aren't uniform. At some point, it may include more of these. Feel free to customize the code to meet your needs.

Version 1.0 implements RSS/Atom feed aggregation but doesn't include webpage change detection like its predecessor.

Version 1.0.5 adds support for handling RSS feeds from US courts. When entering a court RSS URL in the Feeds window, use the "docket" label in the Mode field and that feed will show up separately from "publication" and "aggregator" feeds. Court feeds tend to have a lot of items so you'll likely want to apply some filter terms in the Feed window's Filter input, to limit what gets displayed so it's more readable. Filtering looks for words in both the Title and Author columns, and for "docket" feeds, the Author column is populated with a legal filing descriptor (e.g. "complaint" or "order"). Entering "complaint" as a filter term is a good way to avoid seeing every single filing in a given court feed.

Version 1.0.7 includes various changes. There's now a dropdown menu for choosing what gets displayed, based on tags assigned when entering a feed in the Feed Window. Choices include: "publication", "aggregator", "docket", and "atemporal". "publication" includes both "publication" and "aggregator" feeds (because the "aggregator" tag is more about which links get pulled from the RSS feed). "docket" is intended for court feeds. "atemporal" is for ArXiv and other sources that publish multiple items at the same time, so they can't be sorted by recency. There's also a logging service that's partly implemented, for diagnosing auto-update errors and the like. And feeds that have been misidentified as arriving at a future date have been moved to the end of the display window.

Recent updates add feed network error messages at the top of display list and notifications that feeds have no valid items at the bottom. Handling of aggregator links has also been improved.

With version 1.2, RSS feed rendering is now asynchronous, which reduces the load time and provides a better user experience.

<img src="https://github.com/Dotnaught/rssputin/blob/main/assets/rssputin_screenshot.png" width="800" />

### Prerequisites

To build RSSputin, Node.js is required.

```
Node.js
```

### Installing

To get started:

```
git clone https://github.com/Dotnaught/rssputin.git
cd rssputin
npm install
npm start
```

Or head over to the [releases](https://github.com/Dotnaught/rssputin/releases) page.

The app should present a blank page on startup. Add new feeds via the File -> Show Feeds menu. Make sure they're valid feeds.

## Deployment

To build RSSputin as a desktop app, run the script for the appropriate platform and, if all goes well, the app will be available in the release-builds folder. 

## Built With

* [Electron](https://electronjs.org/) - Cross-platform app framework
* [Tailwind](https://tailwindcss.com/) - HTML/CSS design 

## Notes

* RSSputin depends upon [hnrss](https://edavis.github.io/hnrss/) to extend the Hacker News RSS feed. If that feed should become unavailable, the hnrss code (https://github.com/edavis/hnrss) will need to be deployed somewhere and the feed URL will need to be fixed in the app.

## Authors

* **Thomas Claburn** - *Version 1.2.0* - [Dotnaught](https://github.com/Dotnaught)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details
