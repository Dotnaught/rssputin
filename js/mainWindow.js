let table = document.getElementById('feedTable');
let dropdown = document.getElementById('dropdown');
let ditems = document.getElementById('ditems');

// This event listener handles the progress bar updates.
window.api.receive('updateBar', (args) => {
  let bar = document.getElementById('bar');
  let progress = (args[0] / args[1]) * 100;
  bar.style.width = progress + '%';
  let titleText = document.getElementById('titleText');
  titleText.textContent = args[0] + '/' + args[1];
  if (progress === 100) {
    titleText.textContent = 'RSSputin';
  }
});

// This event listener receives incremental feed items.
// It calls addFeedItemsToUI to process and display them.

window.api.receive('incrementalFeed', (feedItems) => {
  console.log('Received incremental feed items:', feedItems);
  // Append feedItems to the displayed list/table
  addFeedItemsToUI(feedItems);
});

// Store all feed items globally for sorting/updating
let allFeedItems = [];

// Call this to render the table head (4 columns) - This function is already provided and seems correct
function generateTableHead(table) {
  const thead = table.createTHead();
  const row = thead.insertRow();
  // Example columns: Time, Title, Author, Source (mapping to feedTitle in data)
  let columns = ['hoursAgo', 'Title', 'Author', 'Source'];
  //widths for columns
  let w = {
    hoursAgo: defaultsObj?.hoursAgo || '10%', // Use optional chaining in case defaultsObj isn't loaded yet
    Title: defaultsObj?.Title || '50%',
    Author: defaultsObj?.Author || '20%',
    Source: defaultsObj?.Source || '20%',
  };
  let times = [3, 6, 12, 24, 48, 72];
  //for (let key of data) {
  for (let key of columns) {
    if (key === 'hoursAgo') {
      let th = document.createElement('th');
      let dropdown = document.createElement('select');
      dropdown.setAttribute('id', 'timeDropdown');
      for (let val of times) {
        let opt = document.createElement('option');
        opt.id = 'timeSelect';
        opt.text = `Last ${val} hours`;
        opt.value = val;
        // Check defaultsObj.timeWindow only if defaultsObj exists
        if (defaultsObj && val === defaultsObj.timeWindow) {
          opt.selected = true;
          console.log(`Setting default time window to ${val} hours`);
        } else {
          opt.selected = false; // Ensure other options are not selected
          console.log(
            `DefaultsObj does not exist ${
              defaultsObj === null
            } or the selected value ${val} is different from ${defaultsObj?.timeWindow}`
          );
        }
        dropdown.appendChild(opt);
      }
      dropdown.addEventListener('change', () => {
        let timeVal = parseInt(document.getElementById('timeDropdown').value);
        window.api.send('setTimeWindow', timeVal);
      });
      //let text = document.createTextNode(key);
      th.setAttribute('id', 'hoursAgo');
      th.style.width = w[key];
      th.appendChild(dropdown);

      row.appendChild(th);
    } else {
      let th = document.createElement('th');
      th.setAttribute('id', key);
      th.style.width = w[key];
      let text = document.createTextNode(key);
      th.appendChild(text);
      row.appendChild(th);
    }
  }
}

// Call this to clear and rebuild the table body with current `allFeedItems`
function renderTable() {
  const table = document.getElementById('feedTable');
  if (!table) {
    console.error('Table element with id "feedTable" not found.');
    return;
  }

  // Remove old tbody if it exists
  let oldTbody = table.tBodies[0];
  if (oldTbody) {
    table.removeChild(oldTbody);
  }

  // Create a new tbody element
  const tbody = document.createElement('tbody');
  table.appendChild(tbody); // Append the new tbody before adding rows

  // Sort items by published date in descending order (most recent first)
  // Assuming 'published' is a timestamp or comparable value
  allFeedItems.sort((a, b) => {
    // The original code used b.published - a.published.
    // Ensure 'published' is a number (timestamp) or Date object for this to work correctly.
    // If it's a string, it might need parsing first. Assuming it's a timestamp number.
    return b.published - a.published;
  });

  // Add rows for each feed item
  allFeedItems.forEach((item) => {
    const row = tbody.insertRow();
    // Insert cells in the order matching the header: Time, Title, Author, Source
    // Check for null/undefined values before accessing properties
    row.insertCell().textContent = item.hoursAgo || '';

    const titleCell = row.insertCell();
    // Ensure item.link and item.title exist before creating the link
    if (item.link && item.title) {
      const linkElement = document.createElement('a');
      linkElement.href = item.link;
      linkElement.textContent = item.title;
      linkElement.target = '_blank'; // Open link in new window/tab (typical for Electron external links)
      // Use urlHash as the element ID if available and unique
      if (item.urlHash) {
        linkElement.id = item.urlHash;
      }
      // Add title attribute for long titles
      if (item.title.length > 159) {
        linkElement.setAttribute('title', item.title);
      }
      // Apply color if item.color is provided
      if (item.color) {
        linkElement.style.color = item.color;
      }
      titleCell.appendChild(linkElement);
    } else {
      // Fallback if link or title is missing
      titleCell.textContent = item.title || '';
    }

    row.insertCell().textContent = item.author || '';
    row.insertCell().textContent = item.feedTitle || ''; // Use feedTitle for the 'Source' column
  });

  // Clear the "No Data" message if there are items
  if (allFeedItems.length > 0) {
    clearNoDataMessage();
  } else {
    // Optionally show a "No Data" message if the list becomes empty after filtering or initially
    // This might need refinement depending on when generateNoDataMessage is intended to be shown (e.g., initial load with no data vs. filter hiding everything).
    // For now, only clear if items are added.
  }

  // Make the grid resizable after rendering the table body
  // Ensure the table head exists before calling resizableGrid
  if (table.tHead) {
    resizableGrid(table);
  }

  // Re-apply the current search filter after adding/updating rows
  searchFunction();
}

// Add new feed items to the global list and update the table
function addFeedItemsToUI(feedItems) {
  if (!Array.isArray(feedItems)) {
    console.error('incrementalFeed event did not send an array:', feedItems);
    return;
  }

  // Assume feedItems is an array of new feed objects
  // Add new items to the existing global list
  allFeedItems = allFeedItems.concat(feedItems);

  // Deduplicate items based on a unique identifier (e.g., 'urlHash' or 'link')
  // Using a Map is an efficient way to handle deduplication, keeping the latest item for each key.
  // Assuming 'urlHash' is the most reliable unique identifier for an item.
  const uniqueItemsMap = new Map();
  for (const item of allFeedItems) {
    // Use urlHash if available, otherwise fall back to link (though link might change)
    // Ensure the key exists and is not empty
    const key = item.urlHash || item.link;
    if (key) {
      uniqueItemsMap.set(key, item);
    } else {
      console.warn('Feed item missing unique identifier (urlHash or link):', item);
    }
  }
  // Convert the map values back to an array
  allFeedItems = Array.from(uniqueItemsMap.values());

  // Render the table with the updated, deduplicated list
  renderTable();
  // The searchFunction is now called at the end of renderTable
}

// Listen for incrementalFeed from main process - This is already defined above, no need to duplicate
// window.api.receive('incrementalFeed', (feedItems) => {
//   addFeedItemsToUI(feedItems);
// });

// On first load, create table head and perform initial setup
document.addEventListener('DOMContentLoaded', () => {
  //const table = document.getElementById('feedTable');
});

let defaultsObj;

// This event listener receives default settings, including column widths and filter preferences.
window.api.receive('receiveDefaults', (defaults) => {
  defaultsObj = defaults;

  if (table) {
    // Generate the table head once on load
    // generateTableHead requires defaultsObj which might not be loaded yet.
    // It might be better to call generateTableHead *after* receiveDefaults.
    // However, the original code calls it here. Let's keep it but be mindful of defaultsObj existence.
    // A better approach would be to render the head in receiveDefaults after getting the widths.
    // For now, keeping original placement but adding check in generateTableHead.
    generateTableHead(table);

    // The table body will be rendered by addFeedItemsToUI when the first incrementalFeed data arrives.
    // The commented-out renderTable() call here is correct; we don't render an empty body initially.
    // renderTable();
  }

  let query = document.getElementById('query');
  if (query) {
    query.addEventListener('focus', displayCancelShow);
    query.addEventListener('keyup', searchFunction); // Ensure search function runs on keyup
  }

  let clear = document.getElementById('clear');
  if (clear) {
    clear.addEventListener('click', displayCancelHide);
    // clear.style.visibility = "hidden"; // Initial state might be set by CSS
  }

  if (dropdown) {
    dropdown.addEventListener('change', filterDocket);
  }
  if (ditems) {
    ditems.addEventListener('change', changeDocketFilter);
  }

  // Initial renderTable might be needed if data is loaded *before* the first incrementalFeed,
  // but based on the structure, data seems to arrive *via* incrementalFeed.
  // Keeping the renderTable call commented out on load is consistent with incremental loading.

  // Update dropdown and ditems based on defaults
  if (dropdown && defaultsObj?.feedMode) {
    // Check if dropdown exists and feedMode is available
    dropdown.value = defaultsObj.feedMode;
  }

  if (ditems && defaultsObj?.feedMode) {
    // Check if ditems exists and feedMode is available
    ditems.style.visibility = defaultsObj.feedMode !== 'docket' ? 'hidden' : '';
    //convert ditems.value to array
    if (ditems.style.visibility !== 'hidden' && defaultsObj?.docketFilter) {
      // Check if docketFilter is available
      let arr = defaultsObj.docketFilter.toLowerCase().split(' ').filter(Boolean); // Filter out empty strings
      // console.log('array', arr); // Comment out console.logs in final code
      Array.from(ditems.options).forEach((option) => {
        // Check if the option value matches any word in the array
        // console.log('option', option.value, option.selected); // Comment out console.logs
        option.selected = arr.includes(option.value.toLowerCase());
      });
    }
  }

  // If defaultsObj is loaded and the table head was generated (it is on DOMContentLoaded),
  // we could re-apply column widths or re-generate the head here if necessary,
  // but generateTableHead already tries to use defaultsObj if available.
  // A more robust approach might be to generate the head *here* after defaults are loaded.
  // For this request, we'll stick to modifying the feed display logic.
});

// This event listener updates the color of links that have been clicked/visited.
window.api.receive('updateLinks', (urlHash) => {
  // Assuming urlHash is passed
  // Use the urlHash to find the corresponding link element in the table
  const lnk = document.getElementById(urlHash);

  // source links do not have Ids, but the requirement is likely for article links
  if (lnk) {
    try {
      lnk.style.color = '#cccccc'; // Or the desired visited link color
      // Remove any existing title attribute or update it if needed
      // lnk.removeAttribute('title'); // Example: remove title after visiting
    } catch (e) {
      console.error('Error updating link color:', e);
    }
  } else {
    // console.warn(`Link element not found for urlHash: ${urlHash}`); // Optional: Log if a link isn't found
  }
});

// Commented out old data loading mechanism - consistent with incremental requirement
/*
window.api.receive('fromMain', (arr) => {
  if (!arr) arr = 0; // This condition seems odd, check if arr is truthy instead?
  if (arr && arr.length > 0) { // Check if arr is an array and has length
    // The current approach uses incrementalFeed and renderTable.
    // This block is likely for a different data loading method. Keeping commented.
    // generateTableHead(table); // Already called on DOMContentLoaded
    // generateTable(table, arr); // Replaced by addFeedItemsToUI/renderTable
    // resizableGrid(table); // Called after renderTable
  } else {
    // generateNoDataMessage(); // Handled implicitly if allFeedItems is empty
    // generateTableHead(table); // Already called on DOMContentLoaded
  }
});
*/

// Helper function to extract text content from potential HTML strings (like titles)
const extractContent = (text) => {
  // Ensure text is a string before parsing
  if (typeof text !== 'string') return text;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.documentElement.textContent;
  } catch (e) {
    console.error('Error parsing HTML string:', text, e);
    return text; // Return original text on error
  }
};

// Handles change in the docket filter multi-select
function changeDocketFilter(event) {
  if (!ditems) return;
  let arr = Array.from(ditems.selectedOptions).map((option) => option.value);
  // Ensure defaultsObj exists before modifying it
  if (defaultsObj) {
    defaultsObj.docketFilter = arr.join(' ');
    // console.log(defaultsObj.docketFilter); // Comment out console.log
    window.api.send('setDocketFilter', defaultsObj.docketFilter);
  } else {
    console.warn('defaultsObj not loaded when trying to change docket filter.');
  }

  // After changing filter, re-render the table or filter the existing one
  // The current searchFunction handles filtering the visible rows.
  // If changing the docket filter requires re-fetching data from main,
  // the main process should send new incrementalFeed events.
  // If it just filters the current allFeedItems, addFeedItemsToUI/renderTable would be needed.
  // Based on the original searchFunction, it only hides rows, so a re-render isn't strictly necessary
  // for just filtering the displayed items. However, if the filter affects *which* items are kept
  // in `allFeedItems`, a re-render/re-filter is needed. Assuming filtering is done via `searchFunction`
  // on the visible rows after data arrives.
}

// Handles change in the feed mode dropdown
function filterDocket(event) {
  if (!dropdown) return;
  // Ensure defaultsObj exists before modifying it
  if (defaultsObj) {
    dropdown.options[dropdown.selectedIndex].selected = true; // Ensure selected state is updated
    defaultsObj.feedMode = event.target.value;
    // console.log(defaultsObj.feedMode); // Comment out console.log
    window.api.send('setFeedMode', defaultsObj.feedMode);

    // Toggle visibility of docket items dropdown
    if (ditems) {
      ditems.style.visibility = defaultsObj.feedMode !== 'docket' ? 'hidden' : '';
    }
  } else {
    console.warn('defaultsObj not loaded when trying to change feed mode.');
  }

  // Changing feed mode might require re-fetching or filtering data.
  // Relying on the main process to send new incrementalFeed events or
  // re-run renderTable based on the new feedMode filter.
  // The current searchFunction filters displayed rows, not the underlying data based on feed mode.
}

// Functions related to the search input UI (cancel button visibility)
function displayCancelShow() {
  // This function was empty in the original code, or the implementation was commented out.
  // Add actual logic if needed, e.g., show a clear button next to the search box.
  // let clear = document.getElementById("clear");
  // if (clear) clear.style.visibility = "visible"; // Example
}

function displayCancelHide() {
  // This function clears the search input and re-runs the search to show all rows.
  // let clear = document.getElementById("clear");
  // if (clear) clear.style.visibility = "hidden"; // Example

  let query = document.getElementById('query');
  if (query) {
    query.value = ''; // Clear the input field
  }
  searchFunction(); // Re-run search to display all rows
}

// Filters table rows based on the text in the 'Title' column.
function searchFunction() {
  // Ensure table and query input exist
  const table = document.getElementById('feedTable');
  const input = document.getElementById('query');
  if (!table || !input) return;

  const filter = input.value.toUpperCase();
  const tbody = table.tBodies[0]; // Get the current tbody
  if (!tbody) return; // No table body to search

  const tr = tbody.getElementsByTagName('tr'); // Get rows from the tbody

  // Iterate through rows (starting from 0 as these are tbody rows, not including thead)
  for (let i = 0; i < tr.length; i++) {
    // Get the cell containing the title (based on renderTable column order: 0=hoursAgo, 1=Title)
    const td = tr[i].getElementsByTagName('td')[1];
    if (td) {
      // Check the text content of the title cell
      // Use textContent as the title cell contains an <a> element
      const cellText = td.textContent || td.innerText; // Use textContent
      if (cellText.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = ''; // Show row
      } else {
        tr[i].style.display = 'none'; // Hide row
      }
    }
  }
}

// Displays a message when no data is available.
function generateNoDataMessage() {
  let subhead = document.getElementById('subhead');
  if (subhead) {
    subhead.innerText = 'No results returned.\nExpand query criteria or add more feeds.';
  } else {
    console.warn('Subhead element not found for no data message.');
  }
  // window.api.send('openFeedWindow', 'data'); // Original line, purpose unclear here?
}

// Clears the "No Data" message.
function clearNoDataMessage() {
  let subhead = document.getElementById('subhead');
  if (subhead && subhead.innerText.length > 0) {
    subhead.innerText = '';
  }
}

// Sends column width data to the main process for saving.
function storeWidthData(widthData) {
  window.api.send('storeWidthData', widthData);
}

// Commented out old generateTable function - replaced by renderTable
/*
function generateTable(table, data) {
  // This function is no longer used for incremental updates via 'incrementalFeed'.
  // The logic has been incorporated into `renderTable` and `addFeedItemsToUI`.
}
*/

// Resizable table code - provided and used after rendering the table body.
function resizableGrid(table) {
  // Ensure table and its head exist
  if (!table || !table.tHead) return;

  var row = table.tHead.getElementsByTagName('tr')[0], // Get the header row
    cols = row ? row.children : undefined;
  if (!cols) return;

  table.style.overflow = 'hidden'; // Prevent overflow issues during resize

  // Get table height for resizer div height (can be improved for dynamic height)
  // Note: This might need adjustment if table height changes significantly after initial render.
  // A fixed large height or recalculation might be needed.
  var tableHeight = table.offsetHeight > 0 ? table.offsetHeight : table.clientHeight;
  // Fallback height if table isn't visible initially
  if (tableHeight === 0) {
    // Estimate height based on number of rows, or use a default
    const tbody = table.tBodies[0];
    if (tbody) {
      tableHeight = (tbody.rows.length + 1) * 20; // Estimate 20px per row + header
    } else {
      tableHeight = 500; // Default fallback
    }
  }

  for (var i = 0; i < cols.length; i++) {
    // Check if a resizer div already exists for this column
    // This prevents adding multiple resizers if resizableGrid is called multiple times
    if (!cols[i].querySelector('.table-resizer')) {
      var div = createDiv(tableHeight);
      div.classList.add('table-resizer'); // Add a class to identify resizers
      cols[i].style.position = 'relative'; // Ensure position is relative for absolute div positioning
      cols[i].appendChild(div);
      setListeners(div, i); // Pass index if needed, currently unused in setListeners
    }
  }

  // Set listeners for the resizer div
  function setListeners(div) {
    var pageX, curCol, nxtCol, curColWidth, nxtColWidth;

    div.addEventListener('mousedown', function (e) {
      curCol = e.target.parentElement; // The parent is the <th>
      nxtCol = curCol.nextElementSibling; // The next <th>
      pageX = e.pageX;

      var padding = paddingDiff(curCol);

      curColWidth = curCol.offsetWidth - padding;
      if (nxtCol) nxtColWidth = nxtCol.offsetWidth - padding;

      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none'; // Disable interaction with other elements
    });

    div.addEventListener('mouseover', function (e) {
      e.target.style.borderRight = '2px solid #0000ff'; // Highlight resizer on hover
    });

    div.addEventListener('mouseout', function (e) {
      // Only remove border if not currently dragging
      if (!curCol) {
        e.target.style.borderRight = '';
      }
    });

    // Use document for mousemove and mouseup events to handle dragging outside the div
    document.addEventListener('mousemove', function (e) {
      if (curCol) {
        // Only perform resizing if dragging is active
        var diffX = e.pageX - pageX;

        // Calculate new widths, ensure they don't go below a minimum (e.g., 10px)
        const minWidth = 10; // Minimum column width in pixels
        let newCurColWidth = curColWidth + diffX;
        let newNxtColWidth = nxtCol ? nxtColWidth - diffX : null;

        // Apply widths if they are valid
        if (newCurColWidth > minWidth && (!nxtCol || newNxtColWidth > minWidth)) {
          curCol.style.width = newCurColWidth + 'px';
          if (nxtCol) {
            nxtCol.style.width = newNxtColWidth + 'px';
          }
        }
      }
    });

    document.addEventListener('mouseup', function (e) {
      // Only process if a drag was active
      if (curCol) {
        // Store the new widths
        let cols = ['hoursAgo', 'Title', 'Author', 'Source']; // IDs used in generateTableHead
        let tgt = curCol.id || 'None'; // Get ID of the current column being resized

        // Check if the resized column is one we track widths for and if it has a next column
        if (cols.includes(tgt) && nxtCol && nxtCol.id && cols.includes(nxtCol.id)) {
          let obj = {
            id: curCol.id,
            w: curCol.style.width,
            nxid: nxtCol.id,
            nxw: nxtCol.style.width,
          };
          storeWidthData(obj);
        } else {
          // Handle resizing the last column (no nxtCol) - might just expand/contract the table width
          // Or do nothing if only pairwise resizing is intended.
          // The original code only stores data if both curCol.id and nxtCol.id exist.
          // So we'll keep that logic.
        }

        // Reset dragging state
        curCol = undefined;
        nxtCol = undefined;
        pageX = undefined;
        nxtColWidth = undefined;
        curColWidth = undefined;

        // Restore text selection and pointer events
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';

        // Restore resizer border
        div.style.borderRight = '';
      }
    });

    // Handle touch events for mobile compatibility (optional, but good practice)
    // Add touchstart, touchmove, touchend listeners similar to mouse listeners
    // Need to calculate pageX from touch.clientX/screenX
  }

  // Creates the resizer div element
  function createDiv(height) {
    var div = document.createElement('div');
    div.style.top = 0;
    div.style.right = 0; // Position at the right edge of the parent <th>
    div.style.width = '5px'; // Width of the draggable area
    div.style.position = 'absolute';
    div.style.cursor = 'col-resize'; // Cursor style
    div.style.userSelect = 'none'; // Prevent selection while dragging
    div.style.height = height + 'px'; // Set height to match the table
    return div;
  }

  // Calculates padding difference for box-sizing
  function paddingDiff(col) {
    if (getStyleVal(col, 'box-sizing') == 'border-box') {
      return 0; // Padding is included in width
    }

    var padLeft = getStyleVal(col, 'padding-left');
    var padRight = getStyleVal(col, 'padding-right');
    return parseInt(padLeft) + parseInt(padRight); // Padding needs to be subtracted
  }

  // Gets computed style value
  function getStyleVal(elm, css) {
    return window.getComputedStyle(elm, null).getPropertyValue(css);
  }
}
