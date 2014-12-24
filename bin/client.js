#!/usr/bin/env node

var SOCKET_PORT = 1337;

var Client = require('choir').Client;

Client(SOCKET_PORT);
