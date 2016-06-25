
importScripts('node_modules/sw-toolbox/sw-toolbox.js');

toolbox.precache([
    '/',
    '/build/minesweeper.js', 
    '/node_modules/lodash/lodash.js',
    '/node_modules/knockout/build/output/knockout-latest.js',
    '/img/sprite-small.png',
    '/img/sprite.png',

    '/img/android-chrome-192x192.png',
    '/img/android-chrome-144x144.png',
    '/img/android-chrome-96x96.png',
    '/img/android-chrome-72x72.png',
    '/img/android-chrome-48x48.png',
    '/img/android-chrome-36x36.png',
]);

toolbox.router.default = toolbox.fastest;

// Analytics
var ORIGIN = /https?:\/\/((www|ssl)\.)?google-analytics\.com/;
toolbox.router.get('/collect', toolbox.networkOnly, { origin: ORIGIN });
toolbox.router.get('/analytics.js', toolbox.networkFirst, { origin: ORIGIN });
