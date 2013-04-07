/* globals require, process, console */

var mqtt = require('mqttjs');

var port  = 1883,
    host  = 'test.mosquitto.org',
    topic = 'bbc/livetext/#',
    lastTracks = {};

function extractTrack(text) {
  var matcher = /Now Playing: (.*) by (.*)/i, 
      track   = null,
      matches = text.match(matcher);

  if (matches && matches.length == 3) {
    track = { title: matches[1], artist: matches[2] };
    track.id = track.title + '-' + track.artist;
  }

  return track;
}

function publishTrack(client, liveTextTopic, track) {
  var topic = liveTextTopic.replace('livetext', 'livetracks');
  
  client.publish({topic: topic           , payload: track.title + ' by ' + track.artist});
  client.publish({topic: topic + '/track', payload: track.title});
  client.publish({topic: topic + '/artist', payload: track.artist});
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
    //console.log('%s\t%s', packet.topic, packet.payload);
    var station = packet.topic,
        track   = extractTrack(packet.payload);
    if (track) {
      var lastTrack = lastTracks[station];
      if (lastTrack && lastTrack.id == track.id) {
        // same track still playing do nothing
        console.log('Same track playing on %s', station);
      } else {
        // new track
        lastTracks[station] = track;
        console.log('New track on %s: %s by %s', station, track.title, track.artist);
        publishTrack(client, station, track);
      }
    }
  });

  client.on('close', function() {
    process.exit(0);
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });
});