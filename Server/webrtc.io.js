/***************
	SERVER
	
Copyright (C) 2013 Samuel Erb

Same License list below. As this code is a modification of the project https://github.com/webRTC/webRTC.io it is required to maintain the following license:

Copyright (C) 2012 Ben Brittain, Dennis M?rtensson, David Peter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

****************/
var WebSocketServer = require('ws').Server

var iolog = function() {};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === "-debug") {
    iolog = function(msg) {
      console.log(msg)
    }
    console.log('Debug mode on!');
  }
}


// Used for callback publish and subscribe
if (typeof rtc === "undefined") {
  var rtc = {};
}
//Array to store connections
rtc.sockets = [];

rtc.rooms = {};
rtc.users = {};
rtc.encryption = {};
rtc.browser = {};
rtc.browserVer = {};

// Holds callbacks for certain events.
rtc._events = {};

rtc.on = function(eventName, callback) {
  rtc._events[eventName] = rtc._events[eventName] || [];
  rtc._events[eventName].push(callback);
};

rtc.fire = function(eventName, _) {
  var events = rtc._events[eventName];
  var args = Array.prototype.slice.call(arguments, 1);

  if (!events) {
    return;
  }

  for (var i = 0, len = events.length; i < len; i++) {
    events[i].apply(null, args);
  }
};

module.exports.listen = function(server) {
  var manager;
  if (typeof server === 'number') { 
    manager = new WebSocketServer({
        port: server
      });
  } else {
    manager = new WebSocketServer({
      server: server
    });
  }

  manager.rtc = rtc;
  attachEvents(manager);
  return manager;
};

function attachEvents(manager) {

  manager.on('connection', function(socket) {
    iolog('connect');

    socket.id = id();
    iolog('new socket got id: ' + socket.id);

    rtc.sockets.push(socket);

    socket.on('message', function(msg) {
      var json = JSON.parse(msg);
      rtc.fire(json.eventName, json.data, socket);
    });

    socket.on('close', function() {
      iolog('close');

      // find socket to remove
      var i = rtc.sockets.indexOf(socket);
      // remove socket
      rtc.sockets.splice(i, 1);

      // remove from rooms and send remove_peer_connected to all sockets in room
      for (var key in rtc.rooms) {

        var room = rtc.rooms[key];
        var exist = room.indexOf(socket.id);

        if (exist !== -1) {
          //remove from room
          room.splice(room.indexOf(socket.id), 1);
          
          //send disconnect to peers
          for (var j = 0; j < room.length; j++) {
            //console.log(room[j]);
            var soc = rtc.getSocket(room[j]);
            soc.send(JSON.stringify({
              "eventName": "remove_peer_connected",
              "data": {
                "socketId": socket.id
              }
            }), function(error) {
              if (error) {
                console.log(error);
              }
            });
          }
          
          // also remove from username list
          var userList = rtc.users[key];
          delete userList[socket.id];
		  
		  // if no users in the room, delete room information
		  if ( room.length == 0) {
			delete rtc.encryption[key];
			delete rtc.browser[key];
			delete rtc.browserVer[key];
			delete rtc.rooms[key];
			delete rtc.users[key];
			//console.log("Room "+key+" is now empty, deleting");
		  }
          break;
        }
      }
      // call the disconnect callback
      rtc.fire('disconnect', rtc);

    });

    // call the connect callback
    rtc.fire('connect', rtc);

  });

  // manages the built-in room functionality
  rtc.on('join_room', function(data, socket) {
    iolog('join_room');
    
    if (data.room == 0){
        return;
    }

	/* this will either create a new room or fetch an existing one... TODO: cleanup */
    var connectionsId = [];
    var usersId = [];
    var roomList = rtc.rooms[data.room] || [];
    var userList = rtc.users[data.room] || {};
	
    roomList.push(socket.id);
    rtc.rooms[data.room] = roomList;
    
	/* update the username list with this new user's socket */
    userList[socket.id] = data.username;
	rtc.users[data.room] = userList;
	
	/* if we don't have a value set yet for encryption, browser & browser version set it */
	if (!rtc.browser[data.room]) {
		rtc.encryption[data.room] = data.encryption;
		rtc.browser[data.room] = data.browser;
		rtc.browserVer[data.room] = data.browserVer;
	}
	
	
    

    for (var i = 0; i < roomList.length; i++) {
      var id = roomList[i];

      if (id == socket.id) {
        continue;
      } else {

        connectionsId.push(id);
        var soc = rtc.getSocket(id);

        // inform the peers that they have a new peer
        if (soc) {
          soc.send(JSON.stringify({
            "eventName": "new_peer_connected",
            "data":{
              "socketId": socket.id,
              "username": data.username
            }
          }), function(error) {
            if (error) {
              console.log(error);
            }
          });
        }
      }
    }
    
    // send new peer a list of all prior peers
    socket.send(JSON.stringify({
      "eventName": "get_peers",
      "data": {
        "connections": connectionsId,
        "usernames": userList,
		"encryption": rtc.encryption[data.room],
		"browser": rtc.browser[data.room],
		"browserVer": rtc.browserVer[data.room],
        "you": socket.id
      }
    }), function(error) {
      if (error) {
        console.log(error);
      }
    });
  });

  // query a room's information (used in preconnection setup)
  rtc.on('room_info', function(data, socket) {
    iolog('room_info');
    var encryption = "";
    var browser = "";
    var browserver = "";
	
    /* check if this information actually exists */
    if (rtc.browser[data.room]) {
        encryption = rtc.encryption[data.room];
        browser    = rtc.browser[data.room];
        browserver = rtc.browserVer[data.room];
    }
    if (socket) {
      socket.send(JSON.stringify({
        "eventName": "receive_room_info",
        "data": {
          "encryption": encryption,
	  "browser":    browser,
	  "browserVer": browserver
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
    }
  });

  //Receive ICE candidates and send to the correct socket
  rtc.on('send_ice_candidate', function(data, socket) {
    iolog('send_ice_candidate');
    var soc = rtc.getSocket(data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_ice_candidate",
        "data": {
          "label": data.label,
          "candidate": data.candidate,
          "socketId": socket.id
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });

      // call the 'recieve ICE candidate' callback
      rtc.fire('receive ice candidate', rtc);
    }
  });

  //Receive offer and send to correct socket
  rtc.on('send_offer', function(data, socket) {
    iolog('send_offer');
    var soc = rtc.getSocket(data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_offer",
        "data": {
          "sdp": data.sdp,
          "socketId": socket.id
      }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
    }
    // call the 'send offer' callback
    rtc.fire('send offer', rtc);
  });

  //Receive answer and send to correct socket
  rtc.on('send_answer', function(data, socket) {
    iolog('send_answer');
    var soc = rtc.getSocket( data.socketId);

    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_answer",
        "data" : {
          "sdp": data.sdp,
          "socketId": socket.id
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
      rtc.fire('send answer', rtc);
    }
  });
}

// generate a 4 digit hex code randomly


function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis


function id() {
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

rtc.getSocket = function(id) {
  var connections = rtc.sockets;
  if (!connections) {
    // TODO: Or error, or customize
    return;
  }

  for (var i = 0; i < connections.length; i++) {
    var socket = connections[i];
    if (id === socket.id) {
      return socket;
    }
  }
}
