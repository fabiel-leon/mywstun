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
  let WebSocketClient;
  let bindSockets;
  let net;
  let wst_client;
  let bindUDP;

  WebSocketClient = require('./wsclient');
  net = require('net');
  bindSockets = require('./bindSockets');
  bindUDP = require('./bindUDP');
  udpSrv = require('./udpserver');
  module.exports = wst_client = (function () {
    function wst_client() {
      console.log(`[SYSTEM] - ` + new Date() + `  - WS Tunnel Client starting...`);
    }

    wst_client.prototype.start = function (
      localPort,
      wsHostUrl,
      remoteAddr,
      prox,
      udp,
    ) {
      console.log(`[SYSTEM] - ` + new Date() + ` --> client started.`);

      const proto = wsHostUrl.split(':')[0];
      if (proto == 'wss')
      //         require("../lib/https_override");

      {
        if (udp) {
          console.log('MODO UDP');
          this.udpServer = udpSrv(localPort);
        } else {
          console.log('MODO TCP');
          this.tcpServer = net.createServer();
          this.tcpServer.listen(localPort);
        }
      }

      console.log(
        `[SYSTEM] - ` + new Date() + ` --> WS tunnel established. Waiting for incoming connections...`,
      );

      const handle = function (conn) {
        let url;
        let wsClient;
        console.log(`[SYSTEM] - ` + new Date() + ` - New connection...`);

        wsClient = new WebSocketClient();

        wsClient.on('connectFailed', (error) => {
          console.log(new Date() + `[SYSTEM] -  --> WS connect error: ` + error.toString());
          return udp ? true : conn.destroy();
        });

        wsClient.on('connect', (wsConn) => {
          console.log(`[SYSTEM] - ` + new Date() + ` --> WS connected.`);
          return udp ? bindUDP(wsConn, conn) : bindSockets(wsConn, conn);
        });

        if (remoteAddr) {
          url = wsHostUrl + '/?dst=' + remoteAddr + (udp ? '&udp=udp' : '');
        } else {
          url = wsHostUrl + (udp ? '/?udp=udp' : '');
        }

        console.log({ url });

        let extraRequestOptions;
        if (prox) {
          const urlparser = require('url');
          const sslConfig = require('ssl-config')('modern');
          const tunnelagent = require('tunnel-agent');
          const parse = urlparser.parse(prox);
          const parsedurl = urlparser.parse(url);
          console.log(parsedurl);
          const proxx = tunnelagent.httpsOverHttp({
            proxy: {
              hostname: parse.hostname, // proxy
              port: parse.port, // port
              headers: {
                host: parsedurl.host,
                'User-Agent':
                  'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/64.0.3282.167 Chrome/64.0.3282.167 Safari/537.36',
                'proxy-connection': 'keep-alive',
              },
            },
            // este es el que sirve
            ciphers: sslConfig.ciphers,
            honorCipherOrder: true,
            secureOptions: sslConfig.minimumTLSVersion,
          });
          extraRequestOptions = { agent: proxx };
        }

        return wsClient.connect(
          url,
          'tunnel-protocol',
          void 0,
          void 0,
          extraRequestOptions,
        );
      };

      return udp ? handle(this.udpServer) : this.tcpServer.on(
        'connection',
        (function (_this) {
          return handle;
        }(this)),
      );
    };

    return wst_client;
  }());
}.call(this));
