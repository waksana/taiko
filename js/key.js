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
