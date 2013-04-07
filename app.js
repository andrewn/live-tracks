/* globals require, process */

/*
  Runs:
  - MQTT livetext -> tracks processor
  - MQTT track artwork resolve
*/

if (process.argv.length === 3) {
  require('./lib/' + process.argv[2] + '.js');
} else {
  require('./lib/tracks.js');
  require('./lib/artwork.js');
}