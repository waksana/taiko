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

module.exports = function() {
  var context = new AudioContext();

  function audioData(arraybuffer) {
    return new Promise(function(res, rej) {
      context.decodeAudioData(arraybuffer, res, rej);
    });
  }

  function play(audioBuffer) {
    return function() {
      var source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.start();
    };
  };

  return Promise.all([
    load('assets/don.wav').then(audioData),
    load('assets/ka.wav').then(audioData)
  ]).then(function(buffers) {
    return {
      don: play(buffers[0]),
      ka: play(buffers[1])
    }
  });
};

},{"./load":10}],6:[function(require,module,exports){
var load = require('./load');
var qs = require('querystring');

module.exports = function() {
  var query = window.location.search.substr(1);
  var name = qs.parse(query).beatmap;
  if(!name)
    return Promise.reject(new Error('no beatmap'));

  var filePath = 'beatmaps/' + name;
  return Promise.all([load(filePath + '.mp3'), load(filePath + '.json')])
  .then(function(res) {
    var music = res[0];
    var data = res[1];
    return {
      state: function(index) {
        if(data.length <= index) return 'end';
        var currentTime = music.currentTime * 1000;
        var rang = currentTime - data[index][0]
        var abs = Math.abs(rang);
        if(abs < 25) return 'good';
        if(abs < 75) return 'pass';
        if(rang < -108) return 'before';
        if(rang > 75) return 'after'
        return 'miss';
      },
      data: data,
      music: music,
      toggle: function() {
        if(music.paused) music.play();
        else music.pause();
      },
      reset: function() {
        music.pause();
        music.currentTime = 0;
      },
      speed: function() {
        if(music.playbackRate == 1) {
          music.playbackRate = 0.75;
        }
        else {
          music.playbackRate = 1;
        }
      }
    };
  });
};

},{"./load":10,"querystring":4}],7:[function(require,module,exports){
var load = require('./load');

module.exports = function(context) {
  function genMap(count, max) {
    var res = [];
    for(var i = 0; i <= count; i++) {
      res.push(max * Math.sin(Math.PI * i / count));
    }
    return res;
  }
  var mapArr = genMap(20, 70);
  var mapStrArr = genMap(20, 70);

  function drawStr(img, centerX, bottomY, stage) {
    var height = mapStrArr[stage];
    var width = 40;
    var x = centerX - width / 2;
    var y = bottomY - height;

    return context.drawImage(img, x, y, width, height);
  }

  function appear(img, stage) {
    var centerX = 84;
    var centerY = 160;

    circle(img, centerX, centerY, mapArr[stage]);
  }

  function circle(img, centerX, centerY, radius) {
    var x = centerX - radius;
    var y = centerY - radius;
    var diameter = radius * 2;
    return context.drawImage(img, x, y, diameter, diameter);
  }

  function keyArc(centerX, centerY, color) {
    context.beginPath();
    context.arc(centerX, centerY, 50, 0, 2 * Math.PI, false);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "black";
    context.stroke();
  }

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

  return Promise.all(tasks).then(function(imgs) {
    var colors = ['#5FC1C0', '#E9311A', '#E9311A', '#5FC1C0'];
    return {
      score: function(count) {
        var c = count.toString();
        context.fillStyle = 'black';
        context.font="50px Arial";
        //context.font="50px Georgia";
        var width = context.measureText(c).width;
        context.fillText(c, 790 - width, 50);
      },
      good: appear.bind(null, imgs[12]),
      pass: appear.bind(null, imgs[13]),
      face: function(centerX, centerY, donka, radius) {
        var img;
        if(donka == 'don') {
          img = imgs[10];
        }
        else {
          img = imgs[11];
        }
        circle(img, centerX, centerY, radius);
      },
      combo: function(numb) {
        var centerX = 400;
        var bottomY = 400;
        var strArr = numb.count.toString().split('');
        centerX -= (strArr.length * 20 - 20);
        strArr.forEach(function(str) {
          drawStr(imgs[str], centerX, bottomY, numb.stage);
          centerX += 40;
        });
      },
      key: function(press) {
        context.clearRect(0, 400, 800, 600);
        var centerY = 500;
        var centerX = 25;
        ['lk', 'ld', 'rd', 'rk'].forEach(function(active, i) {
          var color = press[active]?colors[i]:'white';
          centerX += 150;
          keyArc(centerX, centerY, color);
        });
      },
      clear:function() {
        context.clearRect(0, 0, 800, 400);
      }
    };
  })
};

},{"./load":10}],8:[function(require,module,exports){
module.exports={
  "y": 160,
  "dest": 84,
  "src": 800,
  "radius": 32,
  "duration": 1500
}

},{}],9:[function(require,module,exports){
var state = {
  running: false,
  score: 0,
  auto: false,
  index: 0,
  keyPress: {
    ld: false,
    rd: false,
    lk: false,
    rk: false
  },
  codeMap: {
    74: 'rd',
    70: 'ld',
    68: 'lk',
    75: 'rk'
  },
  cmdMap: {
    80: 'toggle',
    82: 'reset',
    83: 'speed',
    65: 'auto'
  },
  res: [],
  record: [],
  combo: {
    count: 0,
    stage: 7
  }
};

var EventEmitter = require('events');
var canvas = require('./canvas');
var audio = require('./audio');
var beatmap = require('./beatmap');

var config = require('./config');

var taiko = new EventEmitter();

taiko.on('load', function(canvasAPI, audioAPI, beatmapAPI) {
  taiko.on('count', function(judge) {
    state.record[state.index] = true;
    state.index++;
    state.combo.count++;
    state.combo.stage = 7;
    if(judge == 'good') state.score += 3;
    else state.score += 1;
    state.res.push({
      type: judge,
      stage: 7
    });
  });
  taiko.on('miss', function() {
    state.index++;
    state.combo.count = 0;
  });

  taiko.on('hit', function(act) {
    var code;
    if(act.endsWith('d')) {
      code = 0;
      audioAPI.don();
    }
    else {
      code = 8;
      audioAPI.ka();
    }
    if(!beatmapAPI.music.paused && state.index < beatmapAPI.data.length) {
      var res = beatmapAPI.state(state.index);
      var currectCode = beatmapAPI.data[state.index][1];

      state.record[state.index] = true;
      if(res == 'good' || res == 'pass') {
        if(currectCode == code)
          taiko.emit('count', res);
        else
          taiko.emit('miss');
      }
      else if(res == 'miss') {
        taiko.emit('miss');
      }
      else {
        state.record[state.index] = false;
      }
    }
  });

  taiko.on('cmd', function(cmd) {
    if(cmd == 'auto') {
      return state.auto = !state.auto;
    }
    if(cmd == 'reset') {
      state.record = [];
      state.score = 0;
      state.index = 0;
      state.combo.count = 0;
    }
    beatmapAPI[cmd]();
  });

  window.addEventListener('keydown', function(event) {
    var cmd = state.cmdMap[event.keyCode];
    if(cmd) taiko.emit('cmd', cmd);
    var act = state.codeMap[event.keyCode];
    if(act && !state.keyPress[act]) {
      state.keyPress[act] = true;
      canvasAPI.key(state.keyPress);
      taiko.emit('hit', act);
    }
  });

  window.addEventListener('keyup', function(event) {
    var act = state.codeMap[event.keyCode];
    if(act) {
      state.keyPress[act] = false;
      canvasAPI.key(state.keyPress);
    }
  });

  if(state.running) return;
  state.running = true;

  canvasAPI.key(state.keyPress);
  setInterval(function() {
    canvasAPI.clear();
    canvasAPI.score(state.score);
    if(state.combo.count > 0) {
      canvasAPI.combo(state.combo);
      if(state.combo.stage < 10)
        state.combo.stage++;
    }
    state.res.filter(function(state) {
      return state.stage < 15;
    }).forEach(function(state) {
      canvasAPI[state.type](state.stage);
      state.stage = state.stage + 1;
    });

    var data = beatmapAPI.data;
    var currentTime = beatmapAPI.music.currentTime * 1000;
    //'before', 'miss', 'pass', 'good', 'pass', 'after'
    //
    if(state.auto && beatmapAPI.state(state.index) == 'good') {
      var beat;
      if(beatmapAPI.data[state.index][1] == 0) beat = 'd';
      else beat = 'k';
      taiko.emit('hit', beat);
    }

    while(beatmapAPI.state(state.index) == 'after')
      taiko.emit('miss');
    var i = state.index;
    while(i < data.length && data[i][0] - currentTime < config.duration) i++;

    var src = config.src + config.radius;
    var tpp = config.duration / (src - config.dest);

    while(--i >= state.index) {
      var time = data[i][0] - currentTime;
      var src = config.src + config.radius;
      var centerX = time / tpp + config.dest;
      var face = data[i][1] == 0? 'don': 'ka';
      canvasAPI.face(centerX, config.y, face, config.radius);
    }

    var newDest = 0 - config.radius;
    var newSrc = config.dest;
    var newDuration = tpp * (newSrc - newDest);

    while(i >= 0 && currentTime - data[i][0] < newDuration) {
      if(!state.record[i]) {
        var time = currentTime - data[i][0];
        var centerX = newSrc - (time / tpp);
        var face = data[i][1] == 0? 'don': 'ka';
        canvasAPI.face(centerX, config.y, face, config.radius);
      }
      --i;
    };

  }, 16);
});

window.addEventListener('load', function() {
  var can = document.getElementById('canvas');
  var context = can.getContext('2d');
  Promise.all([canvas(context), audio(), beatmap()]).then(function(apis) {
    taiko.emit('load', apis[0], apis[1], apis[2]);
  }).catch(function(e) {
    alert(e.message);
    console.log(e);
  });
});

},{"./audio":5,"./beatmap":6,"./canvas":7,"./config":8,"events":1}],10:[function(require,module,exports){
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

},{}]},{},[9]);
