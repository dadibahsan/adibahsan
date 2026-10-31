/* video.js — the facade player. SPEC.md §11 and §12.
 *
 * Until someone presses play, a project page holds a poster and a button and
 * nothing else: no YouTube code, not one request to Google. This file does
 * three things and nothing else ever goes in it:
 *   1. listen for a click or keypress on a .v block;
 *   2. warm up the connection on first hover or focus;
 *   3. swap the poster for the real player on activation.
 *
 * With JavaScript off none of this runs and the <noscript> link still works.
 */

(function () {
  'use strict';

  var PLAYER = 'https://www.youtube-nocookie.com/embed/';

  // rel=0 keeps end-screen suggestions to the same channel instead of the open
  // internet; iv_load_policy=3 turns annotations off. SPEC.md §11.3.
  var PARAMS = '?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white&iv_load_policy=3';

  var ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';

  var warmed = false;

  /* Open the connection to YouTube early, but only once a visitor shows
     intent by hovering or tabbing onto the block — never on page load.
     Saves roughly 100-200ms at no cost to anyone who never clicks.
     SPEC.md §11.4. */
  function warmUp() {
    if (warmed) return;
    warmed = true;

    ['https://www.youtube-nocookie.com', 'https://i.ytimg.com'].forEach(function (host) {
      var link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = host;
      document.head.appendChild(link);
    });
  }

  /* Replace the poster and button with the real player, and move keyboard
     focus into it so a visitor who pressed Enter is not stranded. */
  function activate(block) {
    if (block.dataset.playing) return;      // already swapped
    var id = block.getAttribute('data-yt');
    if (!id) return;
    block.dataset.playing = '1';

    var frame = document.createElement('iframe');
    frame.src = PLAYER + encodeURIComponent(id) + PARAMS;
    frame.title = block.getAttribute('data-title') || 'Video';
    frame.allow = ALLOW;
    frame.loading = 'lazy';
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('frameborder', '0');

    block.textContent = '';                 // remove poster, button, noscript
    block.appendChild(frame);
    frame.focus();
  }

  document.querySelectorAll('.v[data-yt]').forEach(function (block) {
    block.addEventListener('mouseenter', warmUp);
    block.addEventListener('focusin', warmUp);

    // A click anywhere on the block starts it — the poster counts, not just
    // the button. A real <button> already turns Enter and Space into clicks;
    // the keydown handler is here for anything that does not.
    block.addEventListener('click', function () { activate(block); });

    block.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        activate(block);
      }
    });
  });
})();
