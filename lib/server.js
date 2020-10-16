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
  let WebSocketServer;
  let bindSockets;
  let bindUDP;
  let http;
  let net;
  let url;
  let wst_server;
  let dgram;
  WebSocketServer = require('websocket').server;

  http = require('http');
  url = require('url');
  net = require('net');
  dgram = require('dgram');
  bindSockets = require('./bindSockets');
  bindUDP = require('./bindUDP');


  https_flag = null;

  module.exports = wst_server = (function () {
    function wst_server(options) {
      const app = require('../app');

      if (options != undefined) {
        console.log('[SYSTEM] - ' + new Date() + ' - WS Tunnel Server starting with these paramters:\n' + JSON.stringify(options, null, '\t'));
        this.dstHost = options.dstHost;
        this.dstPort = options.dstPort;

        https_flag = options.ssl;
      } else { console.log('[SYSTEM] -  ' + new Date() + ' - WS Tunnel Server starting...'); }

      if (https_flag == 'true') {
        // HTTPS
        console.log('[SYSTEM] -  ' + new Date() + ' - WS over HTTPS');
        const https = require('https');
        const fs = require('fs');

        // require("../lib/https_override");

        try {
          // certificates loading from file
          this.s4t_key = fs.readFileSync(options.key, 'utf8');
          this.s4t_cert = fs.readFileSync(options.cert, 'utf8');
        } catch (err) {
          // handle the error safely
          console.log('[SYSTEM] -  ' + new Date() + ' --> ERROR:' + err);
          process.exit(1);
        }

        const credentials = {
          key: this.s4t_key,
          cert: this.s4t_cert,
        };

        this.httpServer = https.createServer(credentials, app);

        this.wsServer = new WebSocketServer({
          httpServer: this.httpServer,
          autoAcceptConnections: false,
        });
      } else {
        // HTTP
        console.log('[SYSTEM] -  ' + new Date() + ' - WS over HTTP');

        this.httpServer = http.createServer(app);

        this.wsServer = new WebSocketServer({
          httpServer: this.httpServer,
          autoAcceptConnections: false,
        });
      }
    }

    wst_server.prototype.start = function (port) {
      if (https_flag == 'true') {
        console.log('[SYSTEM] -  ' + new Date() + ' - WS Tunnel Server starting on: wss://localhost:' + port + ' - CERT: \n' + this.s4t_cert);
      } else {
        console.log('[SYSTEM] -  ' + new Date() + ' - WS Tunnel Server starting on: ws://localhost:' + port);
      }

      console.log('process.env.GID', process.env.GID, process.env.UID);
      this.httpServer.listen(port, () => {
        console.log('process.env.GID', process.env.GID, process.env.UID);
        if (process.env.GID && process.env.UID) {
          process.setgid(parseInt(process.env.GID, 10));
          process.setuid(parseInt(process.env.UID, 10));
          console.log('Drop root');
        }
        return console.log('[SYSTEM] - ' + new Date() + '  - Server is listening on port ' + port + '...');
      });

      return this.wsServer.on('request', (function (_this) {
        return function (request) {
          let host;
          let remoteAddr;
          let tcpconn;
          let uri;
          let _ref;
          let _ref1;
          let udp;

          if (!_this.originIsAllowed(request.origin)) {
            return _this._reject(request, 'Illegal origin ' + origin + ' ');
          }

          uri = url.parse(request.httpRequest.url, true);
          _ref = [_this.dstHost, _this.dstPort], host = _ref[0], port = _ref[1];

          if (host && port) {
            remoteAddr = '' + host + ':' + port + '';
          } else {
            if (!uri.query.dst) {
              return _this._reject(request, 'not allowed');
            }

            udp = uri.query.udp;
            remoteAddr = uri.query.dst;
            _ref1 = remoteAddr.split(':'), host = _ref1[0], port = _ref1[1];
          }

          if (udp) {
            wsconn = request.accept('tunnel-protocol', request.origin);
            const client = dgram.createSocket('udp4');
            // client.connect(port, host, (err) => {
            //   let wsconn;
            //   console.log('[SYSTEM] - ' + new Date() + ' - Establishing tunnel to' + remoteAddr);
            //   wsconn = request.accept('tunnel-protocol', request.origin);
            //   return bindUDP(wsconn, client);
            // });
            // client.send(message, host, port, (err) => {
            //   client.close();
            // });
            bindUDP(wsconn, client, port, host);
            return client.on('error', () => _this._reject(request, 'not allowed connect error to' + remoteAddr + ': ' + err));
          }
          tcpconn = net.connect({
            port,
            host,
          }, () => {
            let wsconn;
            console.log('[SYSTEM] - ' + new Date() + ' - Establishing tunnel to' + remoteAddr);
            wsconn = request.accept('tunnel-protocol', request.origin);
            return bindSockets(wsconn, tcpconn);
          });

          return tcpconn.on('error', (err) => _this._reject(request, 'not allowed connect error to' + remoteAddr + ': ' + err));
        };
      }(this)));
    };

    wst_server.prototype.originIsAllowed = function (origin) {
      return true;
    };

    wst_server.prototype._reject = function (request, msg) {
      request.reject();
      return console.log('[SYSTEM] - ' + new Date() + ' - Connection from' + request.remoteAddress + ' rejected: ' + msg);
    };

    return wst_server;
  }());
}).call(this);
