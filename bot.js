var mc = require('minecraft-protocol');

var bots = [];

var Bot = function(username, password, address, callback) {

	var bot = this;
	this.id = bots.length;
	
	this.creds = {};
	
	this.tasks = [];
	
	this.creds.host = address;
	this.creds.port = 25565;
	
	if(address.indexOf(':') != -1) {
		this.creds.host = address.split(':', 2)[0];
		this.creds.port = address.split(':', 2)[1];
	}
	
	this.creds.username = username;
	this.creds.password = password;
	
	this.status = {};
	
	this.status.connected = false;
	
	this.client = mc.createClient({
		host: this.creds.host,
		port: this.creds.port,
		username: this.creds.username,
		password: this.creds.password,
	});	
	
	this.client.id = this.id;
	this.client.callback = callback;
	this.client.bot = this;
	
	this.entityId = 0;
	
	this.client.on('kick_disconnect', function(p) {
		console.log(this.bot.creds.username + ' was kicked for ' + p.reason);
	});
	
	this.client.on('error', function(err) {
		console.log(this.bot.creds.username + ' got ' + err);
		
		if(this.callback != undefined)
			callback.back(this);
	});
	
	this.client.on('disconnect', function() {
		if(this.bot.status.connected)
			this.end('disconnect.quitting');
	});
	
	this.client.on('login', function() {
	
		console.log(this.bot.creds.username + ' ('+ this.username + ') has logged in.');
		bots.push(bot);
		
		if(this.callback != undefined)
			callback.back(this);
			
		bots[this.id].status.connected = true;
	});
	
	this.client.on(0x01, function(packet) {
		this.bot.entityId = packet.entityId;
	});
};

// [{username: "", password: ""}, ..]
module.exports.addBots = function(list, address, callback) {
	var i = 0;
	
	var logIn = setInterval(function() {
	
		if(i < list.length)
			(new Bot(list[i].username, list[i].password, address, i == (list.length - 1) ? callback : undefined));
		else
			clearInterval(logIn);
			
		++i;
		
	}, 5000);
}

module.exports.write = function(packetId, packet) {
	for(var i = 0; i < bots.length; i++) {
		if(bots[i].status.connected)
			bots[i].client.write(packetId, packet);
	}
}

module.exports.on = function(eventId, callback) {
	for(var i = 0; i < bots.length; i++) {
		callback.bot = bots[i];
		bots[i].client.on(eventId, callback);
	}	
}

module.exports.task = function(name, task) {
	for(var i = 0; i < bots.length; i++) {
		bots[i].tasks.push(name);
		bots[i][name] = task;
		bots[i][name]();
	}	
	
	return bots[0].tasks.length - 1;
}

module.exports.bots = bots;
