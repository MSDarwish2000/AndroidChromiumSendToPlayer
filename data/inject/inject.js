'use strict';

[...document.querySelectorAll('.send-to-player')].forEach(f => f.remove());

window.iframe = document.createElement('iframe');
window.iframe.classList.add('send-to-player');
window.iframe.setAttribute('style', `
  border: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 500px;
  height: 200px;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  background-color: #fff;
  z-index: 10000000000;
`);

document.body.appendChild(window.iframe);
window.iframe.src = chrome.runtime.getURL('/data/inject/index.html');
