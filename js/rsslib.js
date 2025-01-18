/* eslint-disable no-control-regex */
import crypto from 'node:crypto';

import Parser from 'rss-parser';
let parser = new Parser({
  /* required for SEC feeds
  headers: {
    'User-Agent': 'Company admin@example.com',
  },
  */
  customFields: {
    feed: [['dc:date', 'isoDate']],
    item: [['dc:creator', 'creator']],
  },
  //timeout: 50000,
});

import { formatDistance, differenceInHours } from 'date-fns';
import { statusCodes } from './statusCodes.js';

const getAllFeeds = async (urlList, defaultsObj, win) => {
  //console.assert(urlList.length > 0, 'urlList is empty');
  //console.assert(feedMode !== undefined, 'feedmode is underfined');
  //console.assert(win !== undefined, 'win is underfined');
  let errors = [];
  const promises = urlList.map(async (entry) => {
    if (
      entry.feed !== undefined &&
      entry.feed !== '' &&
      entry.feed !== 'Enter valid feed' &&
      entry.visible &&
      entry.mode === defaultsObj.feedMode
    ) {
      try {
        // if (entry.feed == 'https://ekaprdweb01.eurekalert.org/rss/technology_engineering.xml') {
        //   parser.options.requestOptions = {
        //     rejectUnauthorized: false,
        //   };
        // } else {
        //   parser.options.requestOptions = {};
        // }
        parser.options.requestOptions = {};
        //console.log(`Fetching ${entry.feed}`);
        const rssResult = await parser.parseURL(entry.feed);

        const combinedResults = {
          res: rssResult,
          meta: entry,
          errors: errors,
        };
        //console.assert(combinedResults.res !== undefined, 'res is underfined');
        //console.assert(combinedResults.meta !== undefined, 'meta is underfined');
        //console.log(combinedResults);
        return combinedResults;
      } catch (e) {
        console.log(`Error at ${entry.feed}`);
        console.error(`${e.name}: ${e.message}`);
        //if message is in statusCodes, append the status code
        if (statusCodes[e.message] !== undefined) {
          e.message = e.message + ': ' + statusCodes[e.message];
        }
        //push error to array
        errors.push({
          title: e.message,
          hoursAgo: new Date().getTime(),
          author: 'Error',
          sourceLink: entry.feed,
        });
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
    win.webContents.send('updateBar', [completed, total]);
  }

  return progressPromise(promises, update).then((results) => results);
};

function stringToArray(str) {
  return str.trim().split(' ');
}

function checkFilter(filteredWords, str) {
  str = str.toLowerCase();
  if (filteredWords[0] === '') {
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
  str = String(str || '').replace(regex, '');

  if (removeDiscouragedChars) {
    // remove everything discouraged by XML 1.0 specifications
    regex = new RegExp(
      '([\\x7F-\\x84]|[\\x86-\\x9F]|[\\uFDD0-\\uFDEF]|(?:\\uD83F[\\uDFFE\\uDFFF])|(?:\\uD87F[\\uDF' +
        'FE\\uDFFF])|(?:\\uD8BF[\\uDFFE\\uDFFF])|(?:\\uD8FF[\\uDFFE\\uDFFF])|(?:\\uD93F[\\uDFFE\\uD' +
        'FFF])|(?:\\uD97F[\\uDFFE\\uDFFF])|(?:\\uD9BF[\\uDFFE\\uDFFF])|(?:\\uD9FF[\\uDFFE\\uDFFF])' +
        '|(?:\\uDA3F[\\uDFFE\\uDFFF])|(?:\\uDA7F[\\uDFFE\\uDFFF])|(?:\\uDABF[\\uDFFE\\uDFFF])|(?:\\' +
        'uDAFF[\\uDFFE\\uDFFF])|(?:\\uDB3F[\\uDFFE\\uDFFF])|(?:\\uDB7F[\\uDFFE\\uDFFF])|(?:\\uDBBF' +
        '[\\uDFFE\\uDFFF])|(?:\\uDBFF[\\uDFFE\\uDFFF])(?:[\\0-\\t\\x0B\\f\\x0E-\\u2027\\u202A-\\uD7FF\\' +
        'uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|' +
        '(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]))',
      'g'
    );
    let ln = str.length;

    str = str.replace(regex, '');
    let nln = str.length;

    if (ln != nln) {
      console.log(`removed ${ln - nln} characters`);
    }
  }

  return str;
}

function processFeeds(feeds, timeWindow, defaultsObj) {
  //if (feeds[0] === undefined) feeds.shift();
  //remove undefined feeds
  feeds = feeds.filter((feed) => feed !== undefined);

  let arr = [];
  let setOfDisplayedFeeds = new Set();
  let setOfPostWindowFeeds = new Set();

  const getHostname = (url) => {
    // use URL constructor and return hostname,  eg www.example.com
    if (url != undefined) {
      return new URL(url).hostname.toLowerCase();
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
  const findRedditLink = (strings, exclusionList) => {
    // Convert exclusion list to lowercase for case-insensitive comparison
    const lowercaseExclusions = exclusionList.map((item) => item.toLowerCase());

    // Function to check if a string contains any excluded substrings
    const isExcluded = (str) => {
      const lowercaseStr = str.toLowerCase();
      return lowercaseExclusions.some((excluded) => lowercaseStr.includes(excluded));
    };

    // Find the first non-excluded string
    return (
      strings.find((str) => !isExcluded(str)) || strings.find((url) => url.includes('comments'))
    );
  };

  feeds.forEach((feed, index, array) => {
    if (feed === undefined || defaultsObj.feedMode !== feed.meta.mode) {
      return;
    } //skip undefined feeds
    //console.log(feed.errors);
    //filter for articles with words in list
    let filterList = feed.meta.filterList;

    //console.log(`Processing ${feed.res.title}`);
    //console.log(Object.keys(feed.res));
    //console.log('Items:');
    feed.res.items.forEach((i) => {
      //print item to console
      let altURLs = undefined;
      let altLink = undefined;
      let aggregatorLink = undefined;

      if (i.content && feed.meta.mode === 'aggregator') {
        let linkIndex;
        let aggIndex;
        let redIndex;
        altURLs = [
          ...new Set(
            i.content.match(
              // eslint-disable-next-line no-useless-escape
              /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
            )
          ),
        ];
        altURLs = altURLs.filter((url) => url.startsWith('http'));
        //console.log('altURLs', altURLs);
        //create a more general test for reddit custom feeds
        //https://support.reddithelp.com/hc/en-us/articles/360043043412-What-is-a-custom-feed-and-how-do-I-make-one
        if (
          feed.res.title === 'enterprise_tech subreddits curated by /u/diodesign' ||
          feed.res.title === 'newest submissions : technology'
        ) {
          const exclusionList = ['reddit.com', 'redd.it'];
          let redURL = findRedditLink(altURLs, exclusionList);
          console.log('redURL', redURL);
          redIndex = altURLs.findIndex((url) => url === redURL) || 0; //instead find comments
          //console.log('redIndex', redIndex);
        }
        switch (feed.res.title) {
          case 'Hacker News':
            linkIndex = 0; //not used
            aggIndex = 0;
            break;
          case 'newest submissions : technology':
            linkIndex = redIndex;
            aggIndex = altURLs.length - 1;
            console.log(altURLs);
            break;
          case 'Techmeme':
            linkIndex = 0;
            aggIndex = 2;
            break;
          case 'Technology - Latest - Google News':
            linkIndex = 0;
            aggIndex = altURLs.length - 1;
            break;
          case 'enterprise_tech subreddits curated by /u/diodesign':
            linkIndex = redIndex; //or 0 for internal Reddit references
            aggIndex = altURLs.length - 1;
            console.log(altURLs);
            break;
          default:
            linkIndex = 0;
            aggIndex = 1;
        }
        altLink =
          feed.meta.mode === 'aggregator' && feed.res.title !== 'Lobsters'
            ? altURLs[linkIndex]
            : i.link; //use i.link for Lobsters
        console.assert(altLink !== undefined, 'altLink is underfined', altURLs[linkIndex], i.link);
        aggregatorLink = feed.res.title !== 'Lobsters' ? altURLs[aggIndex] : i.comments;
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
      //console.log('checking author', i.author, i.creator);
      if (i.author !== undefined && i.author.name !== undefined) {
        obj.author = i.author.name[0];
      } else if (i.author !== undefined) {
        obj.author = i.author;
      } else if (i.creator !== undefined && feed.meta.mode === 'atemporal') {
        //for arXiv .replaceAll('"', '')
        // i.creator['a'][0]['_']
        obj.author = JSON.stringify(i.creator)
          .replace(/^["']|["']$/g, '')
          .replace(/\\+/g, '')
          .replace(/\\'/g, '');
      } else if (feed.meta.mode === 'docket') {
        //add type of court filing to unused author column
        if (i.categories !== undefined) {
          //supreme court
          obj.author = i.categories[0];
        } else if (feed.res.title === 'United States Courts for the Ninth Circuit - Opinions') {
          //9th circuit
          obj.author = '9th Circuit';
        } else {
          //other cases
          //console.log(Object.keys(feed.res));
          obj.author = i.content.substring(1, i.content.indexOf(']'));
          //console.log('obj.author', obj.author);
        }
      } else {
        obj.author = '';
      }

      if (typeof obj.author == 'string' && obj.author.includes('/u/')) {
        obj.author = obj.author.split('/u/').pop();
      }
      if (typeof obj.author == 'string' && obj.author.startsWith('By ')) {
        obj.author = obj.author.split('By ').pop();
      }

      obj.hoursAgo = formatDistance(new Date(obj.published), new Date(now), {
        addSuffix: true,
      });

      if (typeof i.title == 'string') {
        obj.title = i.title.split('. (arXiv')[0].substring(0, 200);
      } else {
        obj.title = "Couldn't parse title";
      }
      if (obj.title.length === 200) {
        obj.title += '...';
      }
      //the RSS Item link

      obj.link = altLink && feed.meta.mode === 'aggregator' ? altLink : i.link;
      if (obj.link === undefined) {
        let report = JSON.stringify(i);
        throw new Error(`obj.link is underfined ${report}`);
      }
      obj.urlHash = crypto.createHash('sha1').update(obj.link).digest('hex');

      //the RSS feed link
      let sourceURL = feed.res.link;
      obj.sourceDisplayText = getHostname(sourceURL);
      obj.sourceLink = getOrigin(sourceURL);
      obj.aggregatorLink = aggregatorLink;
      obj.feedTitle = feed.res.title;
      //console.assert(obj.feedTitle !== undefined, 'obj.feedTitle is underfined');
      //testing
      removeXMLInvalidChars(obj.title, true);
      obj.color = feed.meta.color;

      let feedDisplayTimeWindow = timeWindow || 72; //hours

      let result = differenceInHours(Date.now(), obj.published);
      //move items erronously labelled for future publication to end of queue
      if (result < 0) {
        obj.published = Date.now() - 3600000 * feedDisplayTimeWindow; //1 hour in ms * hoursAgo;
      }

      let filteredWords = stringToArray(filterList);
      let filteredAuthor =
        feed.meta.mode === 'docket' ? stringToArray(defaultsObj.docketFilter) : stringToArray('');
      console.log('docketFilter', defaultsObj.docketFilter);
      if (defaultsObj.docketFilter.includes('any')) {
        filteredAuthor = stringToArray('');
      }
      console.log(filteredWords, obj.author);
      let check = checkFilter(filteredWords, obj.title) && checkFilter(filteredAuthor, obj.author);
      //checkFilter should return true if passed empty array
      console.log(filteredWords, obj.author);
      if (result < feedDisplayTimeWindow && check) {
        arr.push(obj);
        setOfDisplayedFeeds.add(obj.feedTitle);
      } else {
        //populate array of items that were filtered out
        setOfPostWindowFeeds.add(obj.feedTitle);
      }
    }); //end of feed.res.items.forEach
    //add errors to feed
    //console.log('index', index, 'array length', array.length - 1);
    if (Object.is(array.length - 1, index)) {
      //console.log('Adding errors to feed');
      if (feed.errors.length > 0) {
        for (let i = 0; i < feed.errors.length; i++) {
          let obj = {};
          obj.title = feed.errors[i].title;
          obj.link = feed.errors[i].sourceLink;
          obj.urlHash = crypto.createHash('sha1').update(obj.link).digest('hex');
          obj.sourceDisplayText = getHostname(obj.link);
          obj.sourceLink = getOrigin(obj.link);
          obj.feedTitle = feed.res.title;
          obj.color = '#ff0000';
          obj.published = feed.errors[i].hoursAgo;
          obj.pubtype = feed.meta.mode;
          obj.author = feed.errors[i].author;
          obj.hoursAgo = 'Now';
          arr.push(obj);
        }
      }
      //add array of titles outside time window

      let diff = new Set([...setOfPostWindowFeeds].filter((x) => !setOfDisplayedFeeds.has(x)));
      let difflist = [...diff]; //convert to array
      if (difflist.length > 0) {
        let feedDisplayTimeWindow = timeWindow || 72;

        for (let i = 0; i < difflist.length; i++) {
          let obj = {};
          obj.title = `No new items from ${difflist[i]} in the last ${feedDisplayTimeWindow} hours`;
          obj.link = '';
          obj.urlHash = crypto.createHash('sha1').update(difflist[i]).digest('hex');
          obj.sourceDisplayText = difflist[i];
          obj.sourceLink = '';
          obj.feedTitle = difflist[i];
          obj.color = '#cccccc';
          obj.published = Date.now() - 3600000 * feedDisplayTimeWindow;
          obj.pubtype = feed.meta.mode;
          obj.author = '';
          obj.hoursAgo = '-';
          arr.push(obj);
        }
      }
    }
  });

  arr.sort(function (a, b) {
    return b.published - a.published;
  });
  //console.log('Finished processing feeds');
  return arr;
}

export default { getAllFeeds, processFeeds };
