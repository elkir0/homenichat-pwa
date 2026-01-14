/**
 * Polyfills pour compatibilité iOS Safari
 * DOIT être chargé en premier avant tout autre code
 */

// Polyfill pour fetch API
import 'whatwg-fetch';

// Core polyfills ES6+
import 'core-js/es/promise';
import 'core-js/es/symbol';
import 'core-js/es/object';
import 'core-js/es/array';
import 'core-js/es/string';
import 'core-js/es/map';
import 'core-js/es/set';
import 'core-js/es/weak-map';
import 'core-js/es/weak-set';

// Regenerator pour async/await
import 'regenerator-runtime/runtime';

// Polyfill pour requestAnimationFrame (nécessaire pour React)
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 1000 / 60);
  };
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}

// Polyfill pour Notification API (safe check)
if (typeof window !== 'undefined' && !window.Notification) {
  window.Notification = {
    permission: 'denied',
    requestPermission: () => Promise.resolve('denied')
  };
}

// Fix pour iOS Safari console
if (!window.console) {
  window.console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {}
  };
}

// Ensure global est défini (pour certaines dépendances)
if (typeof global === 'undefined') {
  window.global = window;
}