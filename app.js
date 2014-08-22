var mc = require('minecraft-protocol'),
	fs = require('fs'),
	readline = require('readline'),
	http = require('http');

var io = require('socket.io')(9001);
io.on('connection', function(socket) {
	console.log('web viewer');
});

fs.readFile('./index.html', function (err, html) {
    if (err) {
        throw err; 
    }       
    http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        response.write(html);  
        response.end();  
    }).listen(9999);
    

});	
	


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

	var last = 0;
	
	if(typeof id == "undefined") {
		clients.push(
			mc.createClient({
				host: host,
				port: port,
				username: username,
				password: password,
			})
		);
		
		last = clients.length - 1;

	} else {
		clients[id] = 
			mc.createClient({
				host: host,
				port: port,
				username: username,
				password: password,
			});
			
		last = id;
	}

	

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
		this.connected = false;
		
		setTimeout(function() {
			console.log('Reconnecting ' + clients[id].username);
			connectAccount(clients[id].usr, clients[id].pwd, id);
		}, 5000);
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
		io.emit('position', {pos: packet, username: this.username});
	});
	
	setTimeout(function() {
		clients[id].respawn = setInterval(function() {
			clients[id].write('client_command', {payload: 0});
		}, 3000);
	}, 1000);
	
	clients[id].on('named_entity_spawn', function(packet) {
		var username = packet.playerName;
		
		var containsUser = false;
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].username == username) {
				containsUser = true;
				break;
			}
		}
		
		if(!containsUser) {
			var msgs = ['No chance', 'Not even close', 'I see you', 'No way', 'Not a chance', 'Too slow', 'Nice try'];
			var msgId = Math.round(Math.random() * (msgs.length - 1));
			
			this.write('chat', {message: msgs[msgId] + ', ' + username + '.'});
			
			setTimeout(function() {
				clients[id].write('chat', {message: '/kill'});
			}, 1000);
		}
	});
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
					}, i * 1000);	
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
	} else if(text.indexOf('pos ') == 0) {
		var id = parseInt(text.substring(4));
		console.log(clients[id].pos);
	}
});

process.on('uncaughtException', function(error) {
	console.log('There was an error: ' + error.stack);
});
