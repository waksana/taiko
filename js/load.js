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
