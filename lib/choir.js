exports.magic_tools = require('./magic/magic_tools');
exports.sync = require('./sync')

exports.Client = require('./choir_client.js');
exports.Server = require('./choir_server.js').Server;
exports.repl_start = require('./choir_server.js').repl_start;
