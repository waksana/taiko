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
