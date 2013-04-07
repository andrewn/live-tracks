
## Track matching

`lib/track.js` subscribes to MQTT `bbc/livetext` topics and tries to match items that look like songs. At the moment this is a naive, case-insenstive regexp `/Now Playing: (.*) by (.*)/`. Found songs are republished on the `bbc/livetracks` topic, under the same service id and also under `track` and `artist`.

So, a the following bit of livetext: 

    bbc/livetext/1xtra    Now Playing: P's & Q's by Kano

Will result in 3 items being published:

    bbc/livetracks/1xtra        P's & Q's by Kano
    bbc/livetracks/1xtra/track  P's & Q's
    bbc/livetracks/1xtra/artist Kano

The livetext topic may publish the same 'now playing' text many times, but only 1 livetrack message for the track will be published.

## Artwork resolution

`lib/artwork.js` subscribes to MQTT `bbc/livetracks` topics and tries to find artwork for the songs. At the moment this is via the (Discogs)[http://www.discogs.com/] API.

Any artwork URLs found will be published under the `bbc/livetracks/SERVICE/artwork` topic e.g.

    bbc/livetracks/1xtra 21 Seconds by So Solid Crew

Will result in the following items being published:

    bbc/livetracks/1xtra/artwork http://api.discogs.com/image/R-115228-1327259213.jpeg
    bbc/livetracks/1xtra/artwork http://api.discogs.com/image/R-115228-1327259220.jpeg
    bbc/livetracks/1xtra/artwork http://api.discogs.com/image/R-115228-1327259226.jpeg

# Installing

The code is written in javascript and runs in nodejs. For ease of running under Heroku a Procfile is included. So, for best results you want to have npm and bundler installed.

    $ bundle install
    $ npm install
    $ foreman start

To just run either the `tracks` or `artworks` process only, set the ONLY environment variable when you call foreman:

    $ ONLY=artworks foreman start
 
