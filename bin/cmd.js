#!/usr/bin/env node

var SOCKET_PORT = 1337;
var HTTP_PORT = 8889;

var server = require('choir').Server();
server.local_repl();
server.start_http(HTTP_PORT);
