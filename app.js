var mc = require('minecraft-protocol'),
	fs = require('fs'),
	readline = require('readline');
	
var accs = [];
var clients = [];
var host = process.argv[3];
var port = 25565;
var onlinePlayers = [];
var targetBots = 0;
var loginSleep = 5000;
var reconnectSleep = 60000;

var target = process.argv[4];

fs.readFile(process.argv[2], function(error, data) {
    var tmp = data.toString().split('\n');
    for(var i = 0; i < tmp.length; i++) {
    
    	if(tmp[i].length < 3)
    		continue;
    		
    	var parts = tmp[i].split(':', 2);
    	
    	var accExists = false;
    	for(var j = 0; j < accs.length; j++) {
    		if(accs[j].username == parts[0]) {
    			accExists = true;
    			break;
    		}
    	}
    	
    	if(accExists)
    		continue;
    		
    	accs.push({username: parts[0], password: parts[1]});
    }
    targetBots = accs.length;
    console.log('Read ' + accs.length + ' accounts from ' + process.argv[2]);
    startClient();
});

var startClient = function(reconnect) {

	if(typeof reconnect == "undefined" || reconnect == null)
		var reconnect = false;
		
	if(host.indexOf(':') != -1) {
		var parts = host.split(':');
		host = parts[0];
		port = parts[1];
	}

	if(!reconnect) {
		console.log('Connecting them to ' + host + ':' + port);	
	
		accs.forEach(function(acc, index) {
				console.log('Trying to connect ' + acc.username + ' using ' + acc.password);
		
			setTimeout(function() {
				connectAccount(acc.username, acc.password);
			}, index * loginSleep);
		
		});
	} else {
		console.log('Trying to reconnect the disconnected bots');
		
		var recon = function(i) {
			if(i < clients.length) {
				if(clients[i].connected == false) {
					console.log(i);
					setTimeout(function() {
						console.log('Trying ' + accs[i].username);
						connectAccount(accs[i].username, accs[i].password, i);
						recon(i + 1);
					}, i * loginSleep);	
				} else {
					recon(i + 1);
				}
			}
		};

		recon(0);
	}
}

var connectAccount = function(username, password, id) {


	if(typeof id == "undefined") {
		clients.push(
			mc.createClient({
				host: host,
				port: port,
				username: username,
				password: password,
			})
		);
	} else {
		clients[id] = 
			mc.createClient({
				host: host,
				port: port,
				username: username,
				password: password,
			});
	}

	
	var last = clients.length - 1;

	clients[last].id = last;
	clients[last].pwd = password;
	clients[last].usr = username;
	
	clients[last].on('error', function(error) {
		console.log(this.username + ': ' + error);
		this.connected = false;
	});
	
	clients[last].on('login', function(packet) {
		setupEvents(this.id);
		this.connected = true;
		this.entityId = packet.entityId;
	});

}


var setupEvents = function(id) {
	console.log(clients[id].username + ' ('+ id + ') has connected to ' + host + ':' + port);

	clients[id].onDisconnect = function() {
		this.end('disconnect.quitting');
		clearInterval(this.update);
		clearInterval(this.respawn);
		clearInterval(this.swingInterval);
		clearInterval(this.position);
		this.connected = false;
	}
	
	// Send our settings
	clients[id].write('settings', {
		locale: 'en_GB',
		viewDistance: 2,
		chatFlags: 0,
		chatColors: true,
		difficulty: 1,
		showCape: true
	});
	
	clients[id].update = setInterval(function() {
		clients[id].write('flying', {onGround: true});
	}, 1000);
	
	setTimeout(function() {
		clients[id].write('chat', {message: '/kill'});
	}, 3000);
	
	setTimeout(function() {
		clients[id].write('client_command', {payload: 0});
	}, 3000);

	
	clients[id].on('keep_alive', function(packet) {
		this.write('keep_alive', packet);
	});

	// Update health
	clients[id].on(0x06, function(packet) {
		
	});
	
	clients[id].on('disconnect', function(packet) {
		console.log(this.username + ' was disconnected.');
		this.onDisconnect();
	});
	
	clients[id].on(0x40, function(packet) {
		console.log(this.username + ' was kicked for: ' + packet.reason);
		this.onDisconnect();
	});
	
	
	clients[id].on(0x38, function(packet) {
		var username = packet.playerName;
		var online = packet.online;
		
		if(online && onlinePlayers.indexOf(username) == -1) {
			onlinePlayers.push(username);
			
		} else if(!online && onlinePlayers.indexOf(username) != -1) {
			onlinePlayers.splice(onlinePlayers.indexOf(username), 1);
			
		}
	});
	
	clients[id].on('position', function(packet) {
	
		this.pos = packet;
		
	});
	
	clients[id].chat = setInterval(function() {
	
		//clients[id].write('chat', {message: '/kill'});
				
	}, 3000);
	
	/*
	if(id == 1) {
		clients[id].on('chat', function(packet) {
			var obj = JSON.parse(packet.message);
			var ps = obj.extra;
			var p = "";
			
			for(var i = 0; i < ps.length; i++) {
				if(ps[i].hasOwnProperty('text')) {
					p += ps[i].text;
				} else {
					p += ps[i];
				}
			}
			
			var parts = p.split('> ', 2);
			
			console.log(parts[0]);
			console.log(parts[1]);
			
			var p = parts[1];
			if(typeof p == "undefined")
				return;
				
			var bots = clients.length;
			
			
			
			var usernames = [];
			for(var i = 0; i < clients.length; i++) {
				usernames.push(clients[i].username);
			}
						
			if(p == "> OCCUPY 2B2T <" || usernames.indexOf(parts[0].substring(1)) != -1)
				return;
				
			var sent = false;
			
			p = p.toAustralian();
			console.log(p.toAustralian());
			while(!sent) {
				var bot = parseInt(Math.round(Math.random() * bots));
				if(clients[bot].connected) {
					clients[bot].write('chat', {message: '/bukkit:tell ' + parts[0].substring(1) + ' ' + (p.length > 65 ? p.substring(65) : p) });
					sent = true;
				}
			}
		});
	}
	*/
	
	setTimeout(function() {
		clients[id].respawn = setInterval(function() {
			clients[id].write('client_command', {payload: 0});
		}, 3000);
	}, 1000);
	
}

var startDigging = function(id) {
	
	clients[id].position = setInterval(function() {
		clients[id].write('look', {
			yaw: 1,
			pitch: 90,
			onGround: false
		});
	}, 350);
	
	clients[id].write('block_dig', {
		status: 0,
		x: Math.floor(clients[id].pos.x),
		y: Math.floor(clients[id].pos.y),
		z: Math.floor(clients[id].pos.x),
		face: 1
	});
	
	clients[id].swingInterval = setInterval(function() {
		clients[id].write('arm_animation', {
			entityId: clients[id].entityId,
			animation: 1
		});
	}, 350);

}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(text) {
	if (text == 'online') {
		var connected = 0;
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].connected)
				connected++;
		}
		
		var disconnected = clients.length - connected;
		
		console.log('[...] ' + connected + ' connected, ' + disconnected + ' disconnected');
	} else if(text == 'reconnect') {
		startClient(true);
	} else if(text == 'disconnect') {
		console.log('Starting disconnect...');
		
		var discon = function(i) {
			if(i < clients.length) {
				if(clients[i].connected) {
					console.log(i);
					setTimeout(function() {
						console.log('Trying to d/c ' + accs[i].username);
						clients[i].onDisconnect();
						discon(i + 1);
					}, i * loginSleep);	
				} else {
					discon(i + 1);
				}
			}
		};

		discon(0);
		
	} else if(text.indexOf('exec ') == 0) {
		var command = text.substring(5);
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].connected)
				clients[i].write('chat', {message: command});
		}
	} else if(text == 'dig ') {
		var id = parseInt(text.substring(4));
		startDigging(id);
	} else if(text.indexOf('pos ') == 0) {
		var id = parseInt(text.substring(4));
		console.log(clients[id].pos);
	}
});

process.on('uncaughtException', function(error) {
	console.log('There was an error: ' + error.stack);
});

String.prototype.toAustralian = function() {
	var words = this.split(' ');
	
	for(var i = 0; i < words.length; i++) {
		words[i] = words[i].replace(/ay/g, 'ayee');
		words[i] = words[i].replace(/a[aeiou]/g, 'or');
		words[i] = words[i].replace(/a/g, 'aye');
	
		words[i] = words[i].replace(/ie/g, 'ear');
		words[i] = words[i].replace(/i/g, 'eye');
	
		words[i] = words[i].replace(/oo/g, 'ew');
		words[i] = words[i].replace(/o/g, 'aw');
	
		words[i] = words[i].replace(/u/g, 'uh');
	
		words[i] = words[i].replace(/er$/g, 'ah');
	
		words[i] = words[i].replace(/ing$/g, 'in');
	}
	
	if(Math.random() < 0.5)
		words.push("m8");
		
	return words.join(' ');
};
