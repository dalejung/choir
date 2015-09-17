"use strict";

var repl = require('./choir_repl.js')
var net = require('net')
var http = require('http')
var fs = require('fs')
var path = require('path')

var repr = require('./repr.js').repr
var run_magic = require('./magic/run_magic.js');
var clipboard_magic = require('./magic/clipboard.js');
var io_magic = require('./magic/io_magic.js');


// Keep track of repl kernels

function repl_start(input, output) {
  var r = repl.start({
    prompt: ">>> ",
    input: input,
    output: output,
    useGlobal: false,
    terminal: true,
    writer : repr,
    ignoreUndefined: true,
  });

  r.install_magic(run_magic);
  r.install_magic(clipboard_magic);
  r.install_magic(io_magic);


  r.context.r = r;
  r.context.run = function(file) { return run_magic.run(file, r.context) }
  // Allow a choir pre hook. This allows us to do things
  // like modify d3.csv to import locally and setup
  // global vars expected to exist in browser
  try {
    run_magic.run('./choir_premod.js', r.context)
  }
  catch (err) {
    r.context.console.log(err);
  }
  return r;
}

class ReplServer {
    constructor() {
        this.repl_kernels = {};
    }

    _socket_handler(socket) {
        r = repl_start(socket, socket);
        r.on('exit', () => {
            socket.end();
            this.http_server.close();
        })

        r.name = socket.remoteAddress+':'+socket.remotePort;
        this.repl_kernels[r.name] = r
        return r;
    }

    start_http(port) {
        this.http_server = require('./http_server.js')(this.repl_kernels);
        this.http_server.listen(port);
    }

    start_repl(port) {
        this.repl_server = net.createServer(this.socket_handler);
        this.repl_server.listen(port);
    }

    local_repl(input, output) {
        let r = repl_start(input, output);
        r.on('exit', () => this.http_server.close());
        this.repl_kernels['local'] = r;
    }
}

module.exports.Server = function(http) {
    return new ReplServer();
}
module.exports.repl_start = repl_start;
