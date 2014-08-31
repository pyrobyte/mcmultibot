var bot 		= require('./bot.js'),
	fs 			= require('fs'),
	readline 	= require('readline');
	
var accs = [];

fs.readFile('accs.txt', function(error, data) {
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
    
    console.log('Going to try ' + accs.length + ' accs.');
    start();
});


var start = function() { bot.addBots(accs, "2b2t.org", {back: function() {
	
	console.log('Ready!');
	var eyeHeight = 1.62;

	/* Immediately reply to keep-alive requests */
	bot.on('keep_alive', function(p) {
		this.bot.client.write('keep_alive', p);
	});
	
	bot.on(0x12, function(p) {
		if(this.bot.visiblePlayers.hasOwnProperty(p.entityId))
			console.log(p);
	});
	
	bot.task("intel", function() {
	
		var bot = this;
		bot.visiblePlayers = {};
		
		this.client.on('named_entity_spawn', function(packet) {
			bot.visiblePlayers[packet.entityId] = {x: packet.x / 32, y: packet.y / 32, z: packet.z / 32};
			
		});
		
		this.client.on('rel_entity_move', function(packet) {
			if(bot.visiblePlayers.hasOwnProperty(packet.entityId)) {
				bot.visiblePlayers[packet.entityId].x += packet.dX / 32;
				bot.visiblePlayers[packet.entityId].y += packet.dY / 32;
				bot.visiblePlayers[packet.entityId].z += packet.dZ / 32;
				
				console.log(bot.visiblePlayers[packet.entityId]);
			}
		});
	
		this.client.on('entity_teleport', function(packet) {
			if(bot.visiblePlayers.hasOwnProperty(packet.entityId)) {
				bot.visiblePlayers[packet.entityId].x = packet.x / 32;
				bot.visiblePlayers[packet.entityId].y = packet.y / 32;
				bot.visiblePlayers[packet.entityId].z = packet.z / 32;
				
				console.log(bot.visiblePlayers[packet.entityId]);
			}
		});
	});
	
	bot.task("gaze", function() {
	
		var bot = this;

		bot.lookAt = function(x, y, z) {
			 var l = x - bot.pos.x;
			 var w = z - bot.pos.z;
			 var c = Math.sqrt( l*l + w*w )
			 var alpha1 = -Math.asin(l/c)/Math.PI*180
			 var alpha2 =  Math.acos(w/c)/Math.PI*180
			 var yaw = 0;
			 if(alpha2 > 90)
			   yaw = 180 - alpha1
			 else
			   yaw = alpha1
			   
			var pitch = Math.atan2(y - bot.pos.y + eyeHeight, c);
			pitch = -(pitch / Math.PI * 180);
			
			bot.pos.pitch = pitch;
			bot.pos.yaw = yaw;
			bot.lastPos.yaw = yaw;
		};
			
			
		/*var run = setInterval(function() {

			for(var k in bot.visiblePlayers) {
				var point = bot.visiblePlayers[k];
				lookAt(point.x, point.y, point.z);
				break;
			}
			
		}, 50);*/
		

	});
	
	bot.task("settings", function() {
		this.client.write(0x15, {
			locale: 'en_US',
			viewDistance: 3,
			colorsEnabled: true,
			difficulty: 1,
			showCape: true,
			chat: 0
		});
	});
	
	bot.task('kill', function() {
	
		var bot = this;
		
		var run = setInterval(function() {
			if(!bot.status.connected) {
				clearInterval(run);
				return;
				
			}
			bot.client.write('chat', {message: '/kill'});
			
		}, 450000);
	
	});
	
	bot.task("respawn", function() {
		var bot = this;
		var run = setInterval(function() {
			if(!bot.status.connected)
				clearInterval(run);
				
			bot.client.write('client_command', {payload: 0});
		}, 3000);
	});
	
	bot.task("physics", function() {
		
		
		/* Immediately send the position packet back to the server */	
		this.client.on('position', function(p) {
			this.write('position_look', p);
			console.log('Got pos back');
			// todo don't merge
			merge(bot.pos, p);	
			bot.pos.stance = p.y - eyeHeight;
		});
		
		this.pos = {
			x: 0.0,
			y: 0.0,
			z: 0.0,
			stance: 0.0,
			yaw: 0.0,
			pitch: 0.1,
			onGround: false
		};
	
		this.lastPos = {
			x: 0.0,
			y: 0.0,
			z: 0.0,
			stance: 0.0,
			yaw: 0.0,
			pitch: 0.1,
			onGround: false
		};
		this.ticksSinceMovePacket = 0;
		var bot = this;
	
		var run = setInterval(function() {
			if(!bot.status.connected)
				clearInterval(run);
				
			bot.pos.onGround = true;
			bot.pos.stance = Math.floor(bot.pos.stance);
			bot.pos.y = bot.pos.stance + eyeHeight;
			
			var var3 = bot.pos.x - bot.lastPos.x;
			var var5 = bot.pos.y - bot.lastPos.y;
			var var7 = bot.pos.z - bot.lastPos.z;
			var var9 = bot.pos.yaw - bot.lastPos.yaw;
			var var11 = bot.pos.pitch - bot.lastPos.pitch;
			var var13 = var3 * var3 + var5 * var5 + var7 * var7 > 0.0009 || bot.ticksSinceMovePacket >= 20;
			var var14 = var9 != 0.0 || var11 != 0.0;
			
			if (var13 && var14)
			{
				bot.client.write('position_look', {
					x: bot.pos.x, 
					stance: bot.pos.stance,
					y: bot.pos.y,
					z: bot.pos.z,
					yaw: bot.pos.yaw,
					pitch: bot.pos.pitch,
					onGround: bot.pos.onGround
				});
			}
			else if (var13)
			{
				bot.client.write('position', {
					x: bot.pos.x, 
					stance: bot.pos.stance,
					y: bot.pos.y,
					z: bot.pos.z,
					onGround: bot.pos.onGround
				});
			}
			else if (var14)
			{
				bot.client.write('look', {
					yaw: bot.pos.yaw,
					pitch: bot.pos.pitch,
					onGround: bot.pos.onGround
				});	
			}
			else
			{
				bot.client.write('flying', {
					onGround: bot.pos.onGround
				});
				
			}

			++bot.ticksSinceMovePacket;
			bot.lastPos.onGround = bot.pos.onGround;

			if (var13)
			{
				bot.lastPos.x = bot.pos.x;
				bot.lastPos.y = bot.pos.y;
				bot.lastPos.z = bot.pos.z;
				bot.lastPos.stance = bot.pos.stance;
				bot.ticksSinceMovePacket = 0;
			}

			if (var14)
			{
				bot.lastPos.yaw = bot.pos.yaw;
				bot.lastPos.pitch = bot.pos.pitch;
			}
			
		}, 50);
	});

	bot.task("dig", function() {
		var bot = this;
		
		var dig = function() {
			var block = {x: Math.floor(bot.pos.x), y: Math.floor(bot.pos.y - eyeHeight) - 1, z: Math.floor(bot.pos.z)};
			console.log(block);
			bot.lookAt(block.x, block.y, block.z);

			var run = setInterval(function() {
				if(!bot.status.connected)
					clearInterval(run);
					
				bot.client.write('arm_animation', {
					entityId: bot.entityId,
					animation: 1,
				});
			}, 350);
		
			bot.client.write('block_dig', {
			  status: 0, // start digging
			  x: block.x,
			  y: block.y,
			  z: block.z,
			  face: 1, // hard coded to always dig from the top
			});

			setTimeout(function() {
				bot.client.write('block_dig', {
					status: 2, // cancel digging
					x: block.x,
					y: block.y,
					z: block.z,
					face: 1, // hard coded to always dig from the top
				});

				setTimeout(function() {
					bot.pos.stance = block.y;
					bot.pos.y = block.y + eyeHeight;
					
					if(bot.status.connected)
						dig();
				}, 100);
				
			}, 10000);
			
			
		};
		
		var run = setTimeout(function() {
			dig();
			console.log('Digging');
		}, 10000);
		
	});
}});
};

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(text) {
	bot.task('pos', function() {
		console.log(this.pos);
	});
});

var merge = function(a, b) {
	for(var attr in b) {
		a[attr] = b[attr];
	}
}

process.on('SIGINT', function() {
	console.log("\nStopping\n");
	process.exit();
});

process.on('uncaughtException', function(e) {
	console.log(e);
});

var euclideanMod = function(numerator, denominator) {
  var result = numerator % denominator;
  return result < 0 ? result + denominator : result;
}
  , PI = Math.PI
  , PI_2 = Math.PI * 2
  , TO_RAD = PI / 180
  , TO_DEG = 1 / TO_RAD
  , FROM_NOTCH_BYTE = 360 / 256
  , FROM_NOTCH_VEL = 5 / 32000

var toNotchianYaw = function(yaw) {
  return toDegrees(PI - yaw);
}

var toNotchianPitch = function(pitch) {
  return toDegrees(-pitch);
}

var fromNotchianYawByte = function(yaw) {
  return fromNotchianYaw(yaw * FROM_NOTCH_BYTE);
}

var fromNotchianPitchByte = function(pitch) {
  return fromNotchianPitch(pitch * FROM_NOTCH_BYTE);
}

var fromNotchVelocity = function(vel) {
  return vel.scaled(FROM_NOTCH_VEL);
};

function toRadians(degrees) {
  return TO_RAD * degrees;
}

function toDegrees(radians) {
  return TO_DEG * radians;
}

function fromNotchianYaw(yaw) {
  return euclideanMod(PI - toRadians(yaw), PI_2);
}

function fromNotchianPitch(pitch) {
  return euclideanMod(toRadians(-pitch) + PI, PI_2) - PI;
}
