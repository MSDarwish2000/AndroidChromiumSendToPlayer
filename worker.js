/* global Native */

// self.importScripts('native.js');

const notify = (e, tabId) => {
  chrome.action.setTitle({
    tabId,
    title: e.message || e
  });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: 'red'
  });
  chrome.action.setBadgeText({
    tabId,
    text: 'E'
  });
};

// clean up
chrome.tabs.onRemoved.addListener(tabId => {
  chrome.storage.session.remove(tabId + '');
});

function update(tabId) {
  chrome.storage.session.get({
    [tabId]: {}
  }, prefs => {
    const length = Object.keys(prefs[tabId]).length;
    const title = length + ' media link' + (length === 1 ? '' : 's');
    chrome.action.setTitle({
      tabId,
      title
    });
    chrome.action.setIcon({
      tabId,
      path: {
        '16': 'data/icons/' + (length === 1 ? 'single' : 'multiple') + '/16.png',
        '32': 'data/icons/' + (length === 1 ? 'single' : 'multiple') + '/32.png'
      }
    });
  });
}

chrome.webRequest.onHeadersReceived.addListener(async d => {
  if (d.type === 'main_frame') {
    await new Promise(resolve => chrome.storage.session.set({
      [d.tabId]: {}
    }, resolve));
  }
  // do not detect YouTube
  if (d.url && d.url.indexOf('.googlevideo.com/') !== -1) {
    return;
  }
  let type = d.responseHeaders.filter(h => h.name === 'Content-Type' || h.name === 'content-type')
    .filter(h => h.value.startsWith('video') || h.value.startsWith('audio'))
    .map(h => h.value.split('/')[1].split(';')[0]).shift();
  if (d.url.toLowerCase().indexOf('.m3u8') !== -1) {
    type = 'm3u8';
  }

  if (type) {
    chrome.storage.session.get({
      [d.tabId]: {}
    }, prefs => {
      prefs[d.tabId][d.url] = {
        type,
        size: d.responseHeaders.filter(h => h.name === 'Content-Length' || h.name === 'content-length').map(o => o.value).shift()
      };
      chrome.storage.session.set(prefs, () => update(d.tabId));
    });
  }
}, {
  urls: ['*://*/*'],
  types: ['main_frame', 'other', 'xmlhttprequest', 'media']
}, ['responseHeaders']);

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.url || info.favIconUrl) {
    if (tab.url.startsWith('https://www.youtube.com/watch?v=')) {
      return update(id);
    }
  }
});

const copy = async (tabId, content) => {
  const win = await chrome.windows.getCurrent();
  chrome.storage.local.get({
    width: 400,
    height: 300,
    left: win.left + Math.round((win.width - 400) / 2),
    top: win.top + Math.round((win.height - 300) / 2)
  }, prefs => {
    chrome.windows.create({
      url: '/data/copy/index.html?content=' + encodeURIComponent(content),
      width: prefs.width,
      height: prefs.height,
      left: prefs.left,
      top: prefs.top,
      type: 'popup'
    });
  });
};

/*
 * Actions
 */

chrome.action.onClicked.addListener(tab => {
  // Always display the dialog except for internal page
  if (tab.url) {
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/inject/inject.js']
    });
  }
  else {
    notify('Cannot send an internal page', tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'get-links') {
    chrome.storage.session.get({
      [sender.tab.id]: {}
    }, prefs => {
      response([[sender.tab.url], ...Object.entries(prefs[sender.tab.id])]);
    });
    return true;
  }
  else if (request.cmd === 'copy') {
    copy(sender.tab.id, request.content);
  }
  else if (request.cmd === 'close-me') {
    chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id
      },
      func: () => {
        try {
          window.iframe.remove();
          window.iframe = '';
        }
        catch (e) {}
      }
    });
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
