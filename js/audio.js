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
