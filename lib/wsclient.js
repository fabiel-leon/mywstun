var mws = require('websocket').client;
var http = require('http');
var https = require('https');
var crypto = require("crypto");
var sslConfig = require('ssl-config')('modern');
var url = require('url');
var protocolSeparators = [
    '(', ')', '<', '>', '@',
    ',', ';', ':', '\\', '\"',
    '/', '[', ']', '?', '=',
    '{', '}', ' ', String.fromCharCode(9)
];

var tunnelagent = require('tunnel-agent');
var prox = tunnelagent.httpsOverHttp({
    'proxy': {
        hostname: "192.168.100.57", //proxy 
        port: 8080, //port
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/64.0.3282.167 Chrome/64.0.3282.167 Safari/537.36"
        },
    },
    //este es el que sirve
    ciphers: sslConfig.ciphers ,
    honorCipherOrder: true,
    secureOptions: sslConfig.minimumTLSVersion
});

var extend = function extend(dest, source) {
    for (var prop in source) {
        dest[prop] = source[prop];
    }
};

var eventEmitterListenerCount = require('events').EventEmitter.listenerCount || function(emitter, type) {
        return emitter.listeners(type).length;
    };

mws.prototype.connect = function(requestUrl, protocols, origin, headers, extraRequestOptions) {
    var self = this;
    if (typeof(protocols) === 'string') {
        if (protocols.length > 0) {
            protocols = [protocols];
        } else {
            protocols = [];
        }
    }
    if (!(protocols instanceof Array)) {
        protocols = [];
    }
    this.protocols = protocols;
    this.origin = origin;

    if (typeof(requestUrl) === 'string') {
        this.url = url.parse(requestUrl);
    } else {
        this.url = requestUrl; // in case an already parsed url is passed in.
    }
    if (!this.url.protocol) {
        throw new Error('You must specify a full WebSocket URL, including protocol.');
    }
    if (!this.url.host) {
        throw new Error('You must specify a full WebSocket URL, including hostname. Relative URLs are not supported.');
    }

    this.secure = (this.url.protocol === 'wss:');

    // validate protocol characters:
    this.protocols.forEach(function(protocol) {
        for (var i = 0; i < protocol.length; i++) {
            var charCode = protocol.charCodeAt(i);
            var character = protocol.charAt(i);
            if (charCode < 0x0021 || charCode > 0x007E || protocolSeparators.indexOf(character) !== -1) {
                throw new Error('Protocol list contains invalid character "' + String.fromCharCode(charCode) + '"');
            }
        }
    });

    var defaultPorts = {
        'ws:': '80',
        'wss:': '443'
    };

    if (!this.url.port) {
        this.url.port = defaultPorts[this.url.protocol];
    }

    var nonce = new Buffer(16);
    for (var i = 0; i < 16; i++) {
        nonce[i] = Math.round(Math.random() * 0xFF);
    }
    this.base64nonce = nonce.toString('base64');

    var hostHeaderValue = this.url.hostname;
    if ((this.url.protocol === 'ws:' && this.url.port !== '80') ||
        (this.url.protocol === 'wss:' && this.url.port !== '443')) {
        hostHeaderValue += (':' + this.url.port);
    }

    var reqHeaders = headers || {};
    extend(reqHeaders, {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Version': this.config.webSocketVersion.toString(10),
        'Sec-WebSocket-Key': this.base64nonce,
        'Host': reqHeaders.Host || hostHeaderValue
    });

    if (this.protocols.length > 0) {
        reqHeaders['Sec-WebSocket-Protocol'] = this.protocols.join(', ');
    }
    if (this.origin) {
        if (this.config.webSocketVersion === 13) {
            reqHeaders['Origin'] = this.origin;
        } else if (this.config.webSocketVersion === 8) {
            reqHeaders['Sec-WebSocket-Origin'] = this.origin;
        }
    }

    // TODO: Implement extensions

    var pathAndQuery;
    // Ensure it begins with '/'.
    if (this.url.pathname) {
        pathAndQuery = this.url.path;
    } else if (this.url.path) {
        pathAndQuery = '/' + this.url.path;
    } else {
        pathAndQuery = '/';
    }

    function handleRequestError(error) {
        self._req = null;
        self.emit('connectFailed', error);
    }

    //cstom optio las q modifico para meorar el prox & la segridad
    var requestOptions = {
        // agent: prox,
        // ciphers: "ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES256-GCM-SHA384:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK",
        // honorCipherOrder: true,
        // secureOptions: sslConfig.minimumTLSVersion
        // secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1 | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3,
        // "ciphers": "EECDH+ECDSA+AESGCM EECDH+aRSA+AESGCM EECDH+ECDSA+SHA384 EECDH+ECDSA+SHA256 !aNULL !eNULL !LOW !3DES !MD5 !EXP !PSK !SRP !DSS !RC4",
        // "honorCipherOrder": true
    // EECDH+AESGCM EDH+AESGCM AES256+EECDH  AES256+EDH
    };


    if (extraRequestOptions) {
        extend(requestOptions, extraRequestOptions);
    }
    // These options are always overridden by the library.  The user is not
    // allowed to specify these directly.
    extend(requestOptions, {
        hostname: this.url.hostname,
        port: this.url.port,
        method: 'GET',
        path: pathAndQuery,
        headers: reqHeaders,
    });

// console.log('',requestOptions);

    if (this.secure) {
        for (var key in self.config.tlsOptions) {
            if (self.config.tlsOptions.hasOwnProperty(key)) {
                requestOptions[key] = self.config.tlsOptions[key];
            }
        }
    }

    var req = this._req = (this.secure ? https : http).request(requestOptions);

    req.on('upgrade', function handleRequestUpgrade(response, socket, head) {
        self._req = null;
        req.removeListener('error', handleRequestError);
        self.socket = socket;
        self.response = response;
        self.firstDataChunk = head;
        self.validateHandshake();
    });
    req.on('error', handleRequestError);

    req.on("socket", function(socket) {
        socket.emit("agentRemove");
    });

    req.on('response', function(response) {
        self._req = null;
        if (eventEmitterListenerCount(self, 'httpResponse') > 0) {
            self.emit('httpResponse', response, self);
            if (response.socket) {
                response.socket.end();
            }
        } else {
            var headerDumpParts = [];
            for (var headerName in response.headers) {
                headerDumpParts.push(headerName + ': ' + response.headers[headerName]);
            }
            self.failHandshake(
                'Server responded with a non-101 status: ' +
                response.statusCode + ' ' + response.statusMessage +
                '\nResponse Headers Follow:\n' +
                headerDumpParts.join('\n') + '\n'
            );
        }
    });
    req.end();
};



module.exports = mws;
