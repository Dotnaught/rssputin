//https://github.com/minimaxir/aitextgen/issues?q=is%3Aissue+is%3Aopen+sort%3Acomments-desc

"use strict";
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
	// see "Authentication" section below
	auth: undefined,

	// setting a user agent is required: https://developer.github.com/v3/#user-agent-required
	// v1.2.3 will be current @octokit/rest version
	userAgent: "octokit/rest.js v1.2.3",

	// add list of previews you’d like to enable globally,
	// see https://developer.github.com/v3/previews/.
	// Example: ['jean-grey-preview', 'symmetra-preview']
	previews: [],

	// set custom URL for on-premise GitHub Enterprise installations
	baseUrl: "https://api.github.com",

	// pass custom methods for debug, info, warn and error
	log: {
		debug: () => {},
		info: () => {},
		warn: console.warn,
		error: console.error,
	},

	request: {
		// Node.js only: advanced request options can be passed as http(s) agent,
		// such as custom SSL certificate or proxy settings.
		// See https://nodejs.org/api/http.html#http_class_http_agent
		agent: false,

		// request timeout in ms. 0 means no timeout
		timeout: 0,
	},
});

const { subMilliseconds } = require("date-fns");

let now = new Date().getTime();
console.log(now);
//console.log(process.env.GITHUB_PERSONAL_ACCESS_TOKEN);
let backthen = subMilliseconds(new Date(), 86400000);
console.log(backthen);

//octokit.issues.listCommentsForRepo({

const checkGitHub = async () => {
	octokit.issues
		.listForRepo({
			owner: "octokit",
			repo: "rest.js",
			since: backthen,
		})
		.then(({ data }) => {
			// handle data
			console.log(data);
		})
		.catch((e) => console.log(e));
	//end
};

module.exports = { checkGitHub };
