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
