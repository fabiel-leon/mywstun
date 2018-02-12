//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto, 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################

bindSockets = function(wsconn, tcpconn) {
  
  wsconn.__paused = false;
  
  wsconn.on('message', function(message) {

    //DEBUG console.log('[SYSTEM] - ' + (new Date()) + ' --> WS MESSAGE:'); console.log(JSON.stringify(message));
    
    if (message.type === 'utf8') {
      return console.log('Error, Not supposed to received message ');
    } 
    else if (message.type === 'binary') {
      if (false === tcpconn.write(message.binaryData)) {
        wsconn.socket.pause();
        wsconn.__paused = true;
        //DEBUG console.log('WS message pause true');
        return "";
      } 
      else {
        if (true === wsconn.__paused) {
          wsconn.socket.resume();
          //DEBUG console.log('WS message pause false');
          return wsconn.__paused = false;
        }
      }
    }
  });
  
  wsconn.on("overflow", function() {
    //DEBUG console.log('TCP pause');
    return tcpconn.pause();
  });
  
  wsconn.socket.on("drain", function() {
    //DEBUG console.log('WS message pause false');
    return tcpconn.resume();
  });
  
  wsconn.on("error", function(err) {
    return console.log('[SYSTEM] - ' + (new Date()) + ' --> WS Error: ' + err);
  });
  
  wsconn.on('close', function(reasonCode, description) {
    console.log("[SYSTEM] - " + (new Date()) + ' --> WS Peer ' + wsconn.remoteAddress + ' disconnected - Reason: '+description);
    return tcpconn.destroy();
  });
  
  
  tcpconn.on("drain", function() {
    wsconn.socket.resume();
    //DEBUG console.log('WS resume');
    return wsconn.__paused = false;
  });
  
  tcpconn.on("data", function(buffer) {
    //DEBUG
    //console.log('[SYSTEM] - ' + (new Date()) + ' --> TCP data received:\n\n\n' + buffer + "\n\n"); //console.log(JSON.stringify(buffer));
    return wsconn.sendBytes(buffer);
  });
  
  tcpconn.on("error", function(err) {
    console.log('[SYSTEM] - ' + (new Date()) + ' --> TCP Error ' + err);
    return tcpconn.destroy();
  });
  
  tcpconn.on("close", function() {
    //DEBUG
    console.log('[SYSTEM] - ' + (new Date()) + ' --> TCP connection close.');
    //return tcpconn.destroy();
    return wsconn.close();
  });

};

module.exports = bindSockets;