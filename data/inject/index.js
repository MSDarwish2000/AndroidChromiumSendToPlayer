'use strict';

const select = document.querySelector('select');

chrome.runtime.sendMessage({
  cmd: 'get-links'
}, response => {
  document.getElementById('number').textContent = response.length;


  let active = 0;
  response = [response[0], ...response.slice(1).sort(([aURL, aO], [bURL, bO]) => {
    if (bO && bO.type === 'm3u8') {
      return 1;
    }
    if (aO && aO.type === 'm3u8') {
      return -1;
    }
  })];

  response.forEach(([url, o], index) => {
    const option = document.createElement('option');

    let ext = o && o.type ? o.type : url.split(/[#?]/)[0].split('.').pop().trim();
    if (ext.indexOf('/') !== -1) {
      ext = '';
    }
    ext = ext.substr(0, 6);

    // select media
    if (active === 0) {
      if (ext === 'm3u8' || (o && o.size && Number(o.size) > 1024)) {
        active = index;
      }
    }

    option.title = option.value = url;
    option.textContent = index ? (('0' + index).substr(-2) + '. ' + (ext ? `[${ext}] ` : '') + url) : 'Page URL: ' + url;
    select.appendChild(option);
  });
  select.value = response[active][0];
});
window.addEventListener('load', () => window.setTimeout(() => {
  select.focus();
  window.focus();
}, 0));
// keep focus
window.addEventListener('blur', () => window.setTimeout(() => {
  select.focus();
  window.focus();
}, 0));

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd="close-me"]').click();
  }
});

document.addEventListener('click', e => {
  const cmd = e.target.dataset.cmd;
  if (cmd === 'close-me') {
    chrome.runtime.sendMessage({
      cmd: 'close-me'
    });
  }
  else if (cmd === 'send-to-vlc') {
    const selected = [...select.options].find(e => e.selected);
    if (selected) {
      chrome.runtime.sendMessage({
        cmd: 'send-to-vlc',
        url: selected.value
      }, () => chrome.runtime.sendMessage({
        cmd: 'close-me'
      }));
    }
    else {
      alert('Please select a media link from the list');
    }
  }
  else if (cmd === 'send-to-mx') {
    const selected = [...select.options].find(e => e.selected);
    if (selected) {
      chrome.runtime.sendMessage({
        cmd: 'send-to-mx',
        url: selected.value
      }, () => chrome.runtime.sendMessage({
        cmd: 'close-me'
      }));
    }
    else {
      alert('Please select a media link from the list');
    }
  }
  else if (cmd === 'copy') {
    const selected = [...select.options].find(e => e.selected)
    if (selected) {
      chrome.runtime.sendMessage({
        cmd: 'copy',
        content: selected.value
      });
    }
    else {
      alert('Please select a media link from the list');
    }
  }
});