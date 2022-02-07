'use strict';

let table = document.querySelector('table');
let dropdown = document.getElementById('dropdown');

window.api.receive('updateBar', (args) => {
  let bar = document.getElementById('bar');
  let progress = (args[0] / args[1]) * 100;
  bar.style.width = progress + '%';
  let titleText = document.getElementById('titleText');
  titleText.textContent = args[0] + '/' + args[1];
  if (progress === 100) {
    titleText.textContent = 'RSSPutin';
  }
});

let defaultsObj;

window.api.receive('receiveDefaults', (defaults) => {
  defaultsObj = defaults;
  dropdown.value = defaultsObj.feedMode;
  //dropdown.options[dropdown.selectedIndex].selected = true;
  //if (defaultsObj.feedMode) {
  // dropdown.options[dropdown.selectedIndex].selected = true;
  //} else {
  //checkbox.removeAttribute('checked');
  // }
});

window.api.receive('updateLinks', (links) => {
  let lnk = document.getElementById(links);

  //source links do not have Ids
  if (lnk) {
    try {
      lnk.setAttribute('style', 'color: red');
    } catch (e) {
      console.log(e);
    }
  }
});

window.api.receive('fromMain', (arr) => {
  if (!arr) arr = 0;
  if (arr.length > 0) {
    generateTableHead(table);
    generateTable(table, arr);
    resizableGrid(table);
  } else {
    generateNoDataMessage();
    generateTableHead(table);
  }
});

const extractContent = (text) => {
  return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent;
};

window.addEventListener('DOMContentLoaded', () => {
  let query = document.getElementById('query');
  query.addEventListener('focus', displayCancelShow);
  query.addEventListener('keyup', searchFunction);

  //let clear = document.querySelector("#clear");
  let clear = document.getElementById('clear');
  clear.addEventListener('click', displayCancelHide);
  //clear.style.visibility = "hidden";
  //clear.setAttribute("style", "opacity: 0.5");
  //clear.style.opacity = 0.5;

  dropdown.addEventListener('change', filterDocket);
});

function filterDocket(event) {
  //defaultsObj.feedMode = event.target.checked;
  dropdown.options[dropdown.selectedIndex].selected = true;
  defaultsObj.feedMode = event.target.value;
  console.log(defaultsObj.feedMode);
  window.api.send('setFeedMode', defaultsObj.feedMode);
  /*
  if (event.target.checked) {
    checkbox.removeAttribute('checked');
    window.api.send('setFeedMode', checkbox.checked);
    console.log(checkbox.checked);
  } else {
    checkbox.setAttribute('checked', 'checked');
    window.api.send('setFeedMode', checkbox.checked);
    console.log(checkbox.checked);
  }
  */
}

function displayCancelShow() {
  //let clear = document.getElementById("clear");
  //cancelButton.style.visibility = "visible";
  //clear.setAttribute("style", "opacity: 0.5");
  //clear.style.opacity = 1;
}

function displayCancelHide() {
  //let clear = document.getElementById("clear");
  //cancelButton.style.visibility = "hidden";
  //clear.setAttribute("style", "opacity: 0.5");
  //clear.style.opacity = 0.5;

  document.getElementById('query').value = '';
  searchFunction();
}

function searchFunction() {
  let input, filter, tr, td, i;
  input = document.getElementById('query');
  filter = input.value.toUpperCase();
  tr = table.getElementsByTagName('tr');
  for (i = 1; i < tr.length; i++) {
    td = tr[i].getElementsByTagName('td')[1];
    if (td) {
      if (td.textContent.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = '';
      } else {
        tr[i].style.display = 'none';
      }
    }
  }
}

function generateNoDataMessage() {
  let subhead = document.getElementById('subhead');
  subhead.innerText = 'No results returned.\nExpand query criteria or add more feeds.';
  //window.api.send('openFeedWindow', 'data');
}

function clearNoDataMessage() {
  let subhead = document.getElementById('subhead');
  if (subhead.innerText.length > 0) {
    subhead.innerText = '';
  }
}

function storeWidthData(widthData) {
  window.api.send('storeWidthData', widthData);
}

//published, author, hoursAgo, title, link, sourceLink, feedTitle
function generateTableHead(table) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  let columns = ['hoursAgo', 'Title', 'Author', 'Source'];
  //widths for columns
  let w = {
    hoursAgo: defaultsObj.hoursAgo,
    Title: defaultsObj.Title,
    Author: defaultsObj.Author,
    Source: defaultsObj.Source,
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
        if (val === defaultsObj.timeWindow) {
          opt.selected = true;
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

function generateTable(table, data) {
  clearNoDataMessage();
  let columns = ['hoursAgo', 'title', 'author', 'sourceLink'];

  for (let element of data) {
    let row = table.insertRow();

    for (let key of columns) {
      let cell = row.insertCell();
      if (key === 'title') {
        let cleanedText = extractContent(element[key]);
        let text = document.createTextNode(cleanedText);
        const a = document.createElement('a');

        a.setAttribute('href', element.link); //'#'
        //a.setAttribute('id', element.link);
        a.setAttribute('id', element.urlHash);
        if (element.title.length > 159) {
          a.setAttribute('title', element.title);
        }
        a.style.color = element.color;
        a.appendChild(text);
        cell.appendChild(a);
      } else if (key === 'sourceLink') {
        let cleanedText = extractContent(element.sourceDisplayText);
        if (cleanedText.startsWith('www.')) {
          cleanedText = cleanedText.slice(4);
        }
        let text = document.createTextNode(cleanedText);
        const a = document.createElement('a');
        let link = element.aggregatorLink ? element.aggregatorLink : element.sourceLink;
        a.setAttribute('href', link);

        a.setAttribute('id', row.rowIndex);
        a.style.color = element.color;
        a.appendChild(text);
        cell.appendChild(a);
      } else {
        let cleanedText = extractContent(element[key]);
        let text = document.createTextNode(cleanedText);
        cell.appendChild(text);
      }
    }
  }
}

//resizable table code
function resizableGrid(table) {
  var row = table.getElementsByTagName('tr')[0],
    cols = row ? row.children : undefined;
  if (!cols) return;

  table.style.overflow = 'hidden';

  var tableHeight = table.offsetHeight;

  for (var i = 0; i < cols.length; i++) {
    var div = createDiv(tableHeight);
    cols[i].appendChild(div);
    cols[i].style.position = 'relative';
    setListeners(div, i);
  }

  function setListeners(div) {
    var pageX, curCol, nxtCol, curColWidth, nxtColWidth;

    div.addEventListener('mousedown', function (e) {
      curCol = e.target.parentElement;
      nxtCol = curCol.nextElementSibling;
      pageX = e.pageX;

      var padding = paddingDiff(curCol);

      curColWidth = curCol.offsetWidth - padding;
      if (nxtCol) nxtColWidth = nxtCol.offsetWidth - padding;
    });

    div.addEventListener('mouseover', function (e) {
      e.target.style.borderRight = '2px solid #0000ff';
    });

    div.addEventListener('mouseout', function (e) {
      e.target.style.borderRight = '';
    });

    document.addEventListener('mousemove', function (e) {
      if (curCol) {
        var diffX = e.pageX - pageX;

        if (nxtCol) nxtCol.style.width = nxtColWidth - diffX + 'px';

        curCol.style.width = curColWidth + diffX + 'px';
      }
    });

    document.addEventListener('mouseup', function (e) {
      let cols = ['hoursAgo', 'Title', 'Author', 'Source'];
      let tgt = e.target.parentElement?.id || 'None';
      if (!cols.includes(tgt)) {
        return;
      }
      curCol = e.target.parentElement;
      //console.log(e.target.parentElement.id);
      //console.log(e.target.parentElement.tagName);
      nxtCol = curCol.nextElementSibling;
      // console.log("parent");
      // console.log(e.target.parentElement);
      // console.log("nextElementSibling");
      // console.log(e.target.parentElement.nextElementSibling);
      // console.log(curCol.style.width, nxtCol.style.width);
      // console.log(curCol.id, nxtCol.id);
      //e.stopImmediatePropagation();

      let obj = {
        id: curCol.id,
        w: curCol.style.width,
        nxid: nxtCol.id,
        nxw: nxtCol.style.width,
      };
      if (curCol.id && nxtCol.id) {
        storeWidthData(obj);
      }
      curCol = undefined;
      nxtCol = undefined;
      pageX = undefined;
      nxtColWidth = undefined;
      curColWidth = undefined;
    });
  }

  function createDiv(height) {
    var div = document.createElement('div');
    div.style.top = 0;
    div.style.right = 0;
    div.style.width = '5px';
    div.style.position = 'absolute';
    div.style.cursor = 'col-resize';
    div.style.userSelect = 'none';
    div.style.height = height + 'px';
    return div;
  }

  function paddingDiff(col) {
    if (getStyleVal(col, 'box-sizing') == 'border-box') {
      return 0;
    }

    var padLeft = getStyleVal(col, 'padding-left');
    var padRight = getStyleVal(col, 'padding-right');
    return parseInt(padLeft) + parseInt(padRight);
  }

  function getStyleVal(elm, css) {
    return window.getComputedStyle(elm, null).getPropertyValue(css);
  }
}
