var state = {
  running: false,
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
    83: 'speed'
  },
  res: [],
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
    state.index++;
    state.combo.count++;
    state.combo.stage = 7;
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

      if(res == 'good' || res == 'pass') {
        if(currectCode == code)
          taiko.emit('count', res);
        else
          taiko.emit('miss');
      }
      else if(res == 'miss') {
        taiko.emit('miss');
      }
    }
  });

  taiko.on('cmd', function(cmd) {
    if(cmd == 'reset') {
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
    while(beatmapAPI.state(state.index) == 'after')
      taiko.emit('miss');
    var i = state.index;
    while(i < data.length && data[i][0] - currentTime < config.duration) i++;
    while(--i >= state.index) {
      var time = data[i][0] - currentTime;
      var src = config.src + config.radius;
      var centerX = (src - config.dest) * time / config.duration + config.dest;
      var face = data[i][1] == 0? 'don': 'ka';
      canvasAPI.face(centerX, config.y, face, config.radius);
    }
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
