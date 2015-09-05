#!/usr/bin/env node

var SOCKET_PORT = 1337;
var HTTP_PORT = 8889;

var repl_start = require('choir').repl_start
repl_start(process.stdin, process.stdout)
