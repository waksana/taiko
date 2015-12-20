(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],4:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":2,"./encode":3}],5:[function(require,module,exports){
var load = require('./load');

exports.load = function() {

  var context = new AudioContext();

  function audioData(arraybuffer) {
    return new Promise(function(res, rej) {
      context.decodeAudioData(arraybuffer, res, rej);
    });
  }

  return Promise.all([
    load('assets/don.wav').then(audioData),
    load('assets/ka.wav').then(audioData)
  ]).then(function(buffers) {

    exports.play = function(donka) {
      var source = context.createBufferSource();
      if(donka == 'don') source.buffer = buffers[0];
      else source.buffer = buffers[1];
      source.connect(context.destination);
      source.start();
    };

  });
};

},{"./load":10}],6:[function(require,module,exports){
var load = require('./load');
var qs = require('querystring');

var beatmap = module.exports = {};

var music, bmap, record, index;

beatmap.load = function() {
  var query = window.location.search.substr(1);
  var name = qs.parse(query).beatmap;
  if(!name)
    return Promise.reject(new Error('no beatmap'));
  var filePath = 'beatmaps/' + name;
  return Promise.all([load(filePath + '.mp3'), load(filePath + '.json')])
  .then(function(res) {
    music = res[0];
    bmap = res[1];
    record = [];
    index = 0;
  });
};

beatmap.result = function(i) {
  if(i == null || i == undefined) i = index;

  if(music.paused || bmap.length <= i) return 'before';

  var currentTime = music.currentTime * 1000;
  var rang = currentTime - bmap[i][0]
  var abs = Math.abs(rang);

  if(abs < 25) return 'good';
  if(abs < 75) return 'pass';

  if(rang < -108) return 'before';
  if(rang > 75) return 'after';

  return 'miss';
};

beatmap.search = function() {
  var pre = index;
  while(beatmap.result(index) == 'after') index++;
  return pre != index;
};

beatmap.hit = function(donka) {
  var code = donka == 'don'? 0 : 8;
  var res = beatmap.result(index);
  record[index] = (res == 'good' || res == 'pass' || res == 'miss');

  if(!record[index]) return res;

  var ans = bmap[index++][1];
  if(code == ans) {
    return res;
  }
  else {
    return 'miss';
  }

};

beatmap.play = function() {
  if(music.paused) music.play();
  else music.pause();
};

beatmap.reset = function() {
  music.pause();
  music.currentTime = 0;
  record = [];
  index = 0;
};

beatmap.speed = function() {
  if(music.playbackRate == 1) {
    music.playbackRate = 0.75;
  }
  else {
    music.playbackRate = 1;
  }
};

beatmap.state = function() {
  return {
    beatmap: bmap,
    record: record,
    index: index,
    time: music.currentTime * 1000
  };
};

},{"./load":10,"querystring":4}],7:[function(require,module,exports){
var load = require('./load');

var images, context;

var combo = {
  count: 0,
  state: 7,
  from: 7,
  to: 10,
  centerX: 400,
  bottomY: 400,
  width: 40,
  height: 60
};

var fire = {
  arr: [],
  centerX: 84,
  centerY: 160,
  radius: 70,
  from: 7,
  to: 14
};

var drum = {
  y: 500,
  x: 25,
  div: 150,
  radius: 50,
  rect: {
    fromX: 0, fromY: 400,
    toX: 800, toY: 600
  },
  colors: {
    lk: '#5FC1C0',
    ld: '#E9311A',
    rd: '#E9311A',
    rk: '#5FC1C0'
  }
};

var track = {
  duration: 1800,
  fromX: 0,
  toX: 800,
  y: 160,
  dest: 84,
  radius: 32
};

function genAnmap(max) {
  return Array.apply(null, {length: 21}).map(function(e, i) {
    return max * Math.sin(Math.PI * i / 20);
  });
}

exports.load = function() {

  loadTrack();

  combo.anmap = genAnmap(combo.height);
  fire.anmap = genAnmap(fire.radius);

  var canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');

  var tasks = [];
  for(var i = 0; i < 10; i++) {
    tasks.push('assets/score-' + i + '.png');
  }
  tasks = tasks.concat([
                       'assets/red.png',
                       'assets/blue.png',
                       'assets/good.png',
                       'assets/pass.png'
  ]).map(load);

  return Promise.all(tasks).then(function(img) { images = img; });
};

exports.clear = function() {
  context.clearRect(0, 0, 800, 400);
};

exports.score = function(score) {
  var c = score.toString();
  context.fillStyle = 'black';
  context.font="50px Arial";
  //context.font="50px Georgia";
  var width = context.measureText(c).width;
  context.fillText(c, 790 - width, 50);
};

exports.loop = function() {

  if(combo.show && combo.state <= combo.to) {
    var x = combo.fromX;
    combo.str.forEach(function(s) {
      var height = combo.anmap[combo.stage];
      var y = combo.bottomY - height;
      context.drawImage(images[s], x, y, combo.width, height);
      x += combo.width;
    });
    combo.stage++;
    if(combo.stage > combo.to) combo.stage = combo.to;
  }

  fire.arr = fire.arr.filter(function(state) {
    return state.stage <= fire.to;
  }).map(function(state) {
    var radius = fire.anmap[state.stage];
    var x = fire.centerX - radius;
    var y = fire.centerY - radius;
    var diameter = radius * 2;
    context.drawImage(state.img, x, y, diameter, diameter);
    state.stage++;
    return state;
  });
};

exports.combo = function(count) {
  combo.show = (count && count >= 10);
  if(!combo.show) return;
  combo.str = count.toString().split('');
  combo.fromX = combo.centerX - combo.str.length * combo.width / 2;
  combo.stage = combo.from;
};

exports.fire = function(res) {
  var state = {stage: fire.from};
  if(res == 'good') state.img = images[12];
  else state.img = images[13];
  fire.arr.push(state);
};

exports.drum = function(state) {
  var rect = drum.rect;
  context.clearRect(rect.fromX, rect.fromY, rect.toX, rect.toY);
  var centerX = drum.x;
  var pi2 = 2 * Math.PI;
  Object.keys(drum.colors).forEach(function(key) {
    centerX += drum.div;
    context.beginPath();
    context.arc(centerX, drum.y, drum.radius, 0, pi2, false);
    context.closePath();
    context.fillStyle = state[key]?drum.colors[key]:'white';
    context.fill();
    context.strokeStyle = "black";
    context.stroke();
  });
};

function loadTrack() {
  track.fx = track.fromX - track.radius;
  track.tx = track.toX + track.radius;
  track.dy = track.y - track.radius;

  track.diameter = track.radius * 2;

  track.v = (track.tx - track.fx) / track.duration;

  track.timeFrom = (track.fx - track.dest) / track.v;
  track.timeTo = track.timeFrom + track.duration;

}

exports.track = function(state) {

  var img, beat;
  var fromT = track.timeFrom + state.time;
  var toT = track.timeTo + state.time;

  var i = state.index;
  while(i < state.beatmap.length && state.beatmap[i][0] <= toT) i++;
  while(--i > -1 && state.beatmap[i][0] >= fromT) {
    if(!state.record[i]) {
      beat = state.beatmap[i];
      img = beat[1] == 0?images[10]:images[11];
      var x = (beat[0] - fromT) * track.v + track.fx - track.radius;
      context.drawImage(img, x, track.dy, track.diameter, track.diameter);
    }
  }
};

exports.score = function(score) {
  var c = score.toString();
  context.fillStyle = 'black';
  context.font="50px Arial";
  //context.font="50px Georgia";
  var width = context.measureText(c).width;
  context.fillText(c, 790 - width, 50);
};

},{"./load":10}],8:[function(require,module,exports){
var Event = require('events');

var graph = require('./graph');
var audio = require('./audio');
var beatmap = require('./beatmap');
var key = require('./key');

var state = {
  score: 0,
  combo: 0,
  auto: false
};

var taiko = new Event();

window.addEventListener('load', function() {

  var loads = [graph.load(), audio.load(), beatmap.load()];

  Promise.all(loads).then(function() {

    graph.drum({});

    key.on('hit', function(donka, drum_state) {
      var dk = donka.endsWith('d')?'don':'ka';
      graph.drum(drum_state);
      taiko.emit('hit', dk);
    });

    key.on('hitup', function(donka, drum_state) {
      graph.drum(drum_state);
    });
    key.on('play', beatmap.play);
    key.on('reset', function() {
      state.score = 0;
      state.combo = 0;
      graph.combo(0);
      beatmap.reset();
    });
    key.on('speed', beatmap.speed);
    key.on('auto', function() {
      state.auto = !state.auto;
    });

    taiko.on('hit', function(dk) {
      audio.play(dk);
      var res = beatmap.hit(dk);
      if(res == 'good' || res == 'pass')
        taiko.emit('ok', res);
      taiko.emit(res);

    });

    taiko.on('ok', function(res) {
      graph.combo(++state.combo);
      graph.fire(res);
    });
    taiko.on('good', function() {
      state.score += 3;
    });
    taiko.on('pass', function() {
      state.score += 1;
    });
    taiko.on('miss', function() {
      state.combo = 0;
      graph.combo(0);
    });

    key.load();
    setInterval(loop, 16);
  }).catch(function(e) {
    alert(e.message);
    console.log(e);
  });

});

function loop() {
  var missed = beatmap.search();
  if(missed) taiko.emit('miss');

  graph.clear();
  graph.loop();
  graph.track(beatmap.state());
  graph.score(state.score);

  if(state.auto && beatmap.result() == 'good') {
    var bstate = beatmap.state();
    var beat;
    if(bstate.beatmap[bstate.index][1] == 0) beat = 'don';
    else beat = 'ka';

    taiko.emit('hit', beat);
  }
};

},{"./audio":5,"./beatmap":6,"./graph":7,"./key":9,"events":1}],9:[function(require,module,exports){
var Event = require('events');

var state = {
  ld: false,
  rd: false,
  lk: false,
  rk: false
};

var maps = {
  command: {
    80: 'play',
    82: 'reset',
    83: 'speed',
    65: 'auto'
  },
  hit: {
    74: 'rd',
    70: 'ld',
    68: 'lk',
    75: 'rk'
  }
};
var key = module.exports = new Event();

key.load = function() {

  window.addEventListener('keydown', function(event) {
    var act = maps.hit[event.keyCode];
    if(act && !state[act]) {
      state[act] = true;
      key.emit('hit', act, state);
    }
  });

  window.addEventListener('keyup', function(event) {
    var cmd = maps.command[event.keyCode];
    if(cmd) return key.emit(cmd);

    var act = maps.hit[event.keyCode];
    if(act) {
      state[act] = false;
      key.emit('hitup', act, state);
    }
  });
};

},{"events":1}],10:[function(require,module,exports){
function xhr(link, type) {
  return new Promise(function(res, rej) {
    var request = new XMLHttpRequest();
    request.open('GET', link, true);
    request.responseType = type;
    request.addEventListener('load', function(e) {
      if(request.status != 200)
        return rej(new Error('fetching ' + link + ' failed'));
      res(request.response);
    });
    request.send();
  });
}

function ele(link, element, event) {
  var done = new Promise(function(res, rej) {
    element.onerror = function(e) {
      rej(new Error('fetching ' + link + ' failed'));
    };
    element.addEventListener(event, function() {
      res(element);
    });
  });
  element.src = link;
  return done;
}

module.exports = function(link) {
  var suffix = (link.match(/\.(\w+)$/) || [])[1];
  switch(suffix) {
    case 'png': return ele(link, new Image(), 'load');
    case 'mp3': return ele(link, new Audio(), 'canplaythrough');
    case 'json': return xhr(link, 'json');
    default: return xhr(link, 'arraybuffer');
  }
};

},{}]},{},[8]);
