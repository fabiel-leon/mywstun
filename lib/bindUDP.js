// ###############################################################################
// ##
// # Copyright (C) 2014-2015 Andrea Rocco Lotronto, 2017 Nicola Peditto
// ##
// # Licensed under the Apache License, Version 2.0 (the "License");
// # you may not use this file except in compliance with the License.
// # You may obtain a copy of the License at
// ##
// # http://www.apache.org/licenses/LICENSE-2.0
// ##
// # Unless required by applicable law or agreed to in writing, software
// # distributed under the License is distributed on an "AS IS" BASIS,
// # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// # See the License for the specific language governing permissions and
// # limitations under the License.
// ##
// ###############################################################################

(function () {
  let bindSockets;

  module.exports = bindSockets = function (wsconn, udpconn, port, address) {
    console.log('BINDING UDP');
    wsconn.__paused = false;
    let crinfo = false;
    wsconn.on('message', (message) => {
      if (message.type === 'utf8') {
        return console.log('Error, Not supposed to received message ');
      } if (message.type === 'binary') {
        udpconn.send(message.binaryData, port || crinfo.port, address || crinfo.address, (err) => {
          if (err) {
            wsconn.socket.pause();
            wsconn.__paused = true;
            return '';
          }
          if (wsconn.__paused === true) {
            wsconn.socket.resume();
            return wsconn.__paused = false;
          }
        });
      }
    });

    // wsconn.on('overflow', () => udpconn.pause());

    // wsconn.socket.on('drain', () => udpconn.resume());

    wsconn.on('error', (err) => console.log(new Date() + ' ws Error ' + err));

    wsconn.on('close', (reasonCode, description) => {
      console.log(new Date() + '[SYSTEM] -  --> WS Peer ' + wsconn.remoteAddress + ' disconnected - Reason: ' + description);
      return true;
    });

    // udpconn.on('drain', () => {
    //   wsconn.socket.resume();
    //   return wsconn.__paused = false;
    // });

    udpconn.on('message', (buffer, rinfo) => {
      console.log('RECEIVED UDP MESSAGE');
      crinfo = rinfo;
      // console.log('[SYSTEM] - ' + (new Date()) + ' --> TCP data received:\n\n\n' + buffer + "\n\n"); //console.log(JSON.stringify(buffer));
      wsconn.sendBytes(buffer);
    });

    udpconn.on('error', (err) => console.log(new Date() + ' UDP Error ' + err));


    return udpconn.on('close', () => {
      console.log(new Date() + '[SYSTEM] - --> UDP connection close.');
      return wsconn.close();
    });
  };
}).call(this);
