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
