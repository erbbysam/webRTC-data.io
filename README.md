# webRTC-data.io
This is a branch of the client/server code on https://github.com/webRTC/webRTC.io to support data-only connections. 
Note that a fair amount of audio/video functionality was removed as it is no longer necessary in this data only case. Also, webRTC.io worked by waiting for the media streams to come online(user agreement) before connecting. This code connects immediately.

This has only been tested in Chrome Canary, Chrome & Firefox nightly.

Please note that this only supports unreliable connections at this time (in Chrome), so it is your responsibility to build in reliability within your application if it is required.
Firefox nightly supports reliable connections.

Note that there is a minor addition to what is done in webRTC.io. You must check rtc.connection_ok_to_send[id] to check the current status of the webRTC connection.

### Demo
Will be posted eventually. For the meantime, checkout https://github.com/erbbysam/webRTCCopy/

### Usage
Similar to webrtc.io, only including a username
```javascript
rtc.connect("ws:yourserveraddress:8000", room, username);
```

### Server
Using node.js, create a server simply using:
```javascript
var app = require('express')();
var server = require('http').createServer(app);
var webRTC = require('webrtc.io').listen(server);

server.listen(8000);
```

For an example of this fully setup see https://github.com/erbbysam/webRTCCopy/tree/master/server


### License
Copyright (C) 2013 [Samuel Erb] (http://erbbysam.com)

Same License list below. As this code is a modification of the project https://github.com/webRTC/webRTC.io it is required to maintain the following license:

Copyright (C) 2012 [Ben Brittain](https://github.com/cavedweller), [Dennis Mårtensson](https://github.com/dennismartensson), [David Peter](https://github.com/sarenji)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.