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

  module.exports = bindSockets = function (wsconn, tcpconn) {
    wsconn.__paused = false;

    wsconn.on('message', (message) => {
      if (message.type === 'utf8') {
        return console.log('Error, Not supposed to received message ');
      } if (message.type === 'binary') {
        if (tcpconn.write(message.binaryData) === false) {
          wsconn.socket.pause();
          wsconn.__paused = true;
          return '';
        }
        if (wsconn.__paused === true) {
          wsconn.socket.resume();
          return wsconn.__paused = false;
        }
      }
    });

    wsconn.on('overflow', () => tcpconn.pause());

    wsconn.socket.on('drain', () => tcpconn.resume());

    wsconn.on('error', (err) => console.log(new Date() + ' ws Error ' + err));

    wsconn.on('close', (reasonCode, description) => {
      console.log(new Date() + '[SYSTEM] -  --> WS Peer ' + wsconn.remoteAddress + ' disconnected - Reason: ' + description);
      return tcpconn.destroy();
    });


    tcpconn.on('drain', () => {
      wsconn.socket.resume();
      return wsconn.__paused = false;
    });

    tcpconn.on('data', (buffer) =>
      // console.log('[SYSTEM] - ' + (new Date()) + ' --> TCP data received:\n\n\n' + buffer + "\n\n"); //console.log(JSON.stringify(buffer));
      wsconn.sendBytes(buffer));

    tcpconn.on('error', (err) => console.log(new Date() + ' tcp Error ' + err));


    return tcpconn.on('close', () => {
      console.log(new Date() + '[SYSTEM] - --> TCP connection close.');
      return wsconn.close();
    });
  };
}).call(this);
