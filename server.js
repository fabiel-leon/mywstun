var wst = require("./lib/wrapper");

var server_opts = {
    ssl: false,
    key: '',
    cert: ''
};

server = new wst.server(server_opts);
server.start(process.env.app_port || 8080);