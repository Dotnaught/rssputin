import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  invoke: async (channel, data) => {
    let validChannels = ['test'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke('test', data);
    }
  },
  sendSync: (channel, data) => {
    let validChannels = ['validate'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.sendSync(channel, data);
    }
  },
  send: (channel, data) => {
    // send to main process
    let validChannels = [
      'requestFeeds',
      'setTimeWindow',
      'setFeedMode',
      'setDocketFilter',
      'setFeedItem',
      'addFeeds',
      'deleteFeed',
      'openFeedWindow',
      'restartApp',
      'storeWidthData',
    ];
    if (validChannels.includes(channel)) {
      console.log('sending', channel, data);
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    //receive from main process
    let validChannels = [
      'fromMain',
      'updateBar',
      'sendFeeds',
      'receiveDefaults',
      'updateLinks',
      'incrementalFeed',
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      //ipcRenderer.on(channel, (event, ...args) => func(...args));
      const newCallback = (_, data) => func(data);
      ipcRenderer.on(channel, newCallback);
    }
  },
});
//invoke
