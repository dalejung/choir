#!/usr/bin/env node

var SOCKET_PORT = 1337;
var HTTP_PORT = 8889;

var server = require('choir').Server(true);
server.listen(SOCKET_PORT);
server.http_server.listen(HTTP_PORT);

// attach client
var Client = require('choir').Client;

Client(SOCKET_PORT);
