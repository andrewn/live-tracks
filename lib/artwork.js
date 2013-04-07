/* globals require, process, console */

var mqtt    = require('mqttjs'),
    restler = require('restler'),
    querystring = require("querystring"),
    Q       = require('q');

var port  = 1883,
    host  = 'test.mosquitto.org',
    topic = 'bbc/livetracks/#/';

function extractTrack(text) {
  var matcher = /(.*) by (.*)/i, 
      track   = null,
      matches = text.match(matcher);

  if (matches && matches.length == 3) {
    track = { title: matches[1], artist: matches[2] };
    track.id = track.title + '-' + track.artist;
  }

  return track;
}

function isTrackAndArtistTopic(topic) {
  return /bbc\/livetracks\/[\w]+$/.test(topic);
}

var DISCOGS_BASE_URL = 'http://api.discogs.com/';

function resolveTrackAndArtistToArtwork(info) {
  var track = extractTrack(info),
      results = searchForTrack(track),
      images;
  
    images = results.then(function (result) {
      if (result.resource_url) {
        return findArtworkFromResource(result.resource_url);
      }
    });

    return images; // A promise
}

function findArtworkFromResource(url) {
  var deferred = Q.defer(),
      request;

  request = restler.get(url);
  request.on('success', function (data /*, response */) {
    if (data && data.images) {
      deferred.resolve(data.images);
    } else {
      deferred.reject();
    }
  });

  return deferred.promise;
}

function searchForTrack(track) {
  var deferred = Q.defer(),
      options = {
        'q': track.artist + ' - ' + track.title
      },
      query,
      url,
      request;

  query = querystring.stringify(options);

  url = DISCOGS_BASE_URL + 'database/search?' + query;
  request = restler.get(url);
  request.on('success', function (data /*, response*/) {
    // console.log('data', data);
    if (data && data.results && data.results.length > 0) {
      var result = data.results[0];
      if (result) {
        deferred.resolve(result);
      } else {
        deferred.reject();
      }
    }
  });

  return deferred.promise;
}

// Returns a function that will publish an array of images 
// to the 'artwork' topic derived from the topic name given
function publishImagesForStation(client, topic) {
  var artworkTopic = topic + '/artwork';
  return function (images) {
    images.forEach(function (image /*, index*/) {
      if (image.uri) {
        client.publish({topic: artworkTopic, payload: image.uri});
      }
    });
  };
}

mqtt.createClient(port, host, function(err, client) {
  if (err) {
    console.log("Unable to connect to broker");
    process.exit(1);
  }
  client.connect({keepalive: 3000});

  client.on('connack', function(packet) {
    if (packet.returnCode === 0) {
        client.subscribe({topic: topic});
    } else {
      console.log('connack error %d', packet.returnCode);
      process.exit(-1);
    }
  });

  client.on('publish', function(packet) {
    if (isTrackAndArtistTopic(packet.topic)) {
      console.log('Accepted ', packet.topic);
      var info = packet.payload;
      var images = resolveTrackAndArtistToArtwork(info);
      images.then(publishImagesForStation(client, packet.topic))
            .fail(function (err) { console.error('images failed', err); });
    }    
  });

  client.on('close', function() {
    console.log('closing...');
    process.exit(0);
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });
});