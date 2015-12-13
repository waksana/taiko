
module.exports = function xhr(link, type) {
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
};
