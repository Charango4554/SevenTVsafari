// ==UserScript==
// @name         7TV Loader
// @namespace    7TV
// @description  Injects the 7TV runtime bundle on supported websites.
// @match        https://*.twitch.tv/*
// @match        https://*.youtube.com/*
// @grant        none
// @version      0.1.0
// ==/UserScript==

(function injectSevenTV() {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "https://cdn.example.com/seventv.js";

  const head = document.head || document.documentElement;
  if (!head) {
    return;
  }

  head.appendChild(script);
})();
