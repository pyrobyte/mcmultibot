mcmultibot
==========

made to mess around on a server, intend to add plugin support.

It will probably be useless once Mineflayer is updated.

Username:password sets are loaded from a file and signed in to the server in 5-second intervals. 

usage
======

`node app.js accounts.txt mc.server.net`

When accounts.txt is of the format

```
username:password
username2:password2
etcetera:etc&c
```

A few commands that can be used while the program is running:

* `exec I am a bot` make all the bots say "I am a bot"
* `reconnect` reconnects any disconnected bots, as they can be kicked
* `online` tells you how many bots are online and how many are offline
* `disconnect` disconnects the bots in 5-second intervals, though Ctrl+C does the job
* `pos 1` where 1 is the bots ID, shown on login, gives you position of the bot

web view
======

The bots' locations can be seen graphed on a canvas at http://yourserverip:9999.

When the digger is implemented, this will be a 3D view.

installing node.js
======

As per request:

1. `sudo apt-get install nodejs npm`

(on debian systems)

once cloned, run `npm install` in the same directory as package.json
