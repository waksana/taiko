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
