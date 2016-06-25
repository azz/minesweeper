
importScripts('node_modules/sw-toolbox/sw-toolbox.js');

toolbox.router.default = toolbox.fastest;

toolbox.precache([
    '/index.html', 
    '/build/minesweeper.js', 
    
    '/img/android-chrome-192x192.png',
    '/img/android-chrome-144x144.png',
    '/img/android-chrome-96x96.png',
    '/img/android-chrome-72x72.png',
    '/img/android-chrome-48x48.png',
    '/img/android-chrome-36x36.png',
]);
