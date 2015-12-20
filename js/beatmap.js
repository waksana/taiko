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
