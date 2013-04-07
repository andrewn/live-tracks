/* globals require, process, console */

var http = require('http'),
    faye = require('faye'),
    fs   = require('fs'),
    mqtt = require('mqttjs');

var port  = 1883,
    host  = 'test.mosquitto.org',
    topic = 'bbc/livetracks/#/';

var bayeux     = new faye.NodeAdapter({mount: '/faye', timeout: 45}),
    fayeClient = new faye.Client('http://localhost:8000/faye');


// Handle non-Bayeux requests
var server = http.createServer(function(request, response) {
  var index = fs.readFileSync('./public/index.html');
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(index);
  response.end();
});

bayeux.attach(server);
server.listen(8000);

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

  function isArtworkTopic(topic) {
    var matcher = /bbc\/livetracks\/(.*)\/artwork/;
    return matcher.test(topic);
  }

  function serviceFromTopic(topic) {

    console.log('serviceFromTopic(%s)', topic);

    var matcher = /bbc\/livetracks\/(.*)\/artwork/,
        matches = topic.match(matcher),
        service = null;
    
    console.log('matches', matches);

    if (matches && matches.length > 1) {
      service = matches[1];
    }

    return service;
  }

  client.on('publish', function(packet) {
    if (!isArtworkTopic(packet.topic)) { return; }

    var channel = '/artwork',
        message = {
          service: serviceFromTopic(packet.topic),
          url    : packet.payload
        };
    console.log('WEB: ', channel, message);
    fayeClient.publish(channel, message);
  });

  client.on('close', function() {
    process.exit(0);
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });
});