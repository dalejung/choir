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

var repl_server = function(http) {
  var repl_kernels = {}

  _server = function(socket) {
      r = repl_start(socket, socket);
      r.name = socket.remoteAddress+':'+socket.remotePort;
      repl_kernels[r.name] = r
      r.on('exit', function () {
         socket.end();
      })
  }

  var repl_server = net.createServer(_server);
  repl_server.repl_kernels = repl_kernels;

  http = 'undefined' === typeof(http) ? true : http;
  if (http) {
    var http_server = require('./http_server.js')(repl_kernels);
    repl_server.http_server = http_server;
  }
  return repl_server;
}

module.exports.Server = function(http) {
  return repl_server(http);
}
module.exports.repl_start = repl_start;
