# RSSputin

RSSputin is an Electron-based RSS/Atom headline aggregator for journalists. It's designed for finding recently published news and source documents; it's not intended for reading articles – clicking on a link will open the article in the default browser.

The project is a rewrite of my [vulture-feeds](https://github.com/Dotnaught/vulture-feeds) project that attempts to use more modern JavaScript and some of Electron's security recommendations like handling inter-process communication via a preload.js file. Networking and database functions have been moved out of the render process and into the main process.

The app has been setup to ingest some sources that require customization, because RSS and ATOM implementations aren't uniform. At some point, it may include more of these. Feel free to customize the code to meet your needs.

Version 1.0 implements RSS/Atom feed aggregation but doesn't include webpage change detection like its predecessor.

<img src="https://github.com/Dotnaught/rssputin/blob/main/assets/rssputin_screenshot.png" width="800" />

### Prerequisites

To build RSSputin, Node.js is required. It's been tested with v12.18.3.

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

The app should present a blank page on startup. Add new feeds via the File -> Show Feeds menu. Make sure they're valid feeds.

## Deployment

To build RSSputin as a desktop app, run the script for the appropriate platform and, if all goes well, the app will be available in the release-builds folder. 

## Built With

* [Electron](https://electronjs.org/) - Cross-platform app framework
* [Tailwind](https://tailwindcss.com/) - HTML/CSS design 

## Notes

* RSSputin depends upon [hnrss](https://edavis.github.io/hnrss/) to extend the Hacker News RSS feed. If that feed should become unavailable, the hnrss code (https://github.com/edavis/hnrss) will need to be deployed somewhere and the feed URL will need to be fixed in the app.

## Authors

* **Thomas Claburn** - *Version 1.0.0* - [Dotnaught](https://github.com/Dotnaught)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details
