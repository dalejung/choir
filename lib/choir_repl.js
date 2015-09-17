var repl = require('repl');
var vm = require('vm')
var inherits = require('util').inherits;
var runInContext = require('util').runInContext;
var Q = require('q');
var Fiber = require('fibers');
var babel = require('babel-core');
require('babel-core/register');

function should_skip(line, ignore) {
  for (test of ignore) {
      if (line.indexOf(test) != -1) {
          return true;
      }
  }
}

function strip_ignore_lines(lines) {
    var lines = lines.slice();
    var ignore = [
        "import 'babel-core/polyfill';"
    ];
    var ignore_index = [];

    for(var i=0; i < lines.length; i++) {
      var line = lines[i];
      if (should_skip(line, ignore)) {
          ignore_index.push(i);
      }
    }

    for (idx of ignore_index.slice().reverse()) {
        lines.splice(idx, 1);
    }
    return lines;
}

function ChoirREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined) {
  repl.REPLServer.call(this, prompt, source, eval_, useGlobal, ignoreUndefined);

  this.transform = function(code, options) {
      var lines = code.split('\n');
      code = strip_ignore_lines(lines).join('\n');

      options = options || {}
      options['stage'] = 0;
      options['loose'] = "all";
      options['optional'] = ["runtime"];
      result = babel.transform(code, options)
      return result.code
  }
  this.magics = [];
  this.eval = fiber_eval;
  this.choir_eval = choir_eval;
  this.inner_eval = inner_eval;
}

inherits(ChoirREPLServer, repl.REPLServer);
exports.ChoirREPLServer = ChoirREPLServer;

ChoirREPLServer.prototype.install_magic = function(magic) {
  magic.repl_server = this;
  this.magics.push(magic);
}

ChoirREPLServer.prototype.run = function(code) {
    /*
     * Run code as if it was placed in REPL input
     */
    // add new line to mimic repl. 
    code = code+'\n';
    // skip choir_eval since we don't need callback handling
    return this.inner_eval(code, this.context);
}

function inner_eval(code, context, file) {
  // remove ending new line
  var bare_code = code.substr(0, code.length-1);
  // attempt to get a result from each magic
  var result;
  for (var i = 0; i < this.magics.length; i++) {
    var magic = this.magics[i];
    var result = magic.eval(bare_code, context);
    if (typeof(result) !== 'undefined') {
      return result;
    }
  }

  if (context === global) {
    throw "We do not support global repl";
  }

  if (code == '\n') {
      return;
  }

  // TODO transpiling needs to be better thought out
  code = this.transform(code);

  result = runInContext(code, context, file);

  // this happens when there are no expressions in execed code.
  // note, this means that any valid "use strict" will not work.
  if (result == "use strict") {
      return;
  }

  return result;
}

var fiber_eval = function(code, context, file, cb) {
  var self = this;
  Fiber(function() {
    self.choir_eval(code, context, file, cb);
  }).run();
}

var choir_eval = function(code, context, file, cb) {
  var err, result;
  try {
    result = inner_eval.call(this, code, context, file);
  } catch (e) {
    err = e;
  }

  if (err && !err._isSyntaxError && process.domain) {
      process.domain.emit('error', err);
      process.domain.exit();
  }

    if (Q.isPromise(result) && result.pause_repl) {
        this.rli.pause();
        result.then(function(data) {
        result.pause_repl = false; // only pause repl once
        cb(err, data);
      }).catch(function(error) { 
        cb(error, data)
      });
    }
    else
    {
      cb(err, result);
    }

  // save me obi-wan
  var self = this;
  setTimeout(function() {self.rli.resume()}, 5000);
}

exports.start = function(prompt, source, eval_, useGlobal, ignoreUndefined) {
  var repl = new ChoirREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined);
  if (!exports.repl) exports.repl = repl;
  return repl;
};
