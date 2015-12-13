module.exports = function(context) {
  function genMap(count, max) {
    var res = [];
    for(var i = 0; i <= count; i++) {
      res.push(max * Math.sin(Math.PI * i / count));
    }
    return res;
  }
  var mapArr = genMap(20, 70);
  var mapStrArr = genMap(20, 70);

  function drawStr(img, centerX, bottomY, stage) {
    var height = mapStrArr[stage];
    var width = 40;
    var x = centerX - width / 2;
    var y = bottomY - height;

    return context.drawImage(img, x, y, width, height);
  }

  function appear(img, stage) {
    var centerX = 84;
    var centerY = 160;

    circle(img, centerX, centerY, mapArr[stage]);
  }

  function circle(img, centerX, centerY, radius) {
    var x = centerX - radius;
    var y = centerY - radius;
    var diameter = radius * 2;
    return context.drawImage(img, x, y, diameter, diameter);
  }

  function keyArc(centerX, centerY, color) {
    context.beginPath();
    context.arc(centerX, centerY, 50, 0, 2 * Math.PI, false);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "black";
    context.stroke();
  }

  var tasks = [];
  for(var i = 0; i < 10; i++) {
    tasks.push('assets/score-' + i + '.png');
  }
  tasks = tasks.concat([
    'assets/red.png',
    'assets/blue.png',
    'assets/good.png',
    'assets/pass.png'
  ]).map(function(src) {
    var img = new Image();
    var done = new Promise(function(res, rej) {
      img.addEventListener('load', function() {
        res(img);
      });
    });
    img.src = src;
    return done;
  });

  return Promise.all(tasks).then(function(imgs) {
    var colors = ['#5FC1C0', '#E9311A', '#E9311A', '#5FC1C0'];
    return {
      good: appear.bind(null, imgs[12]),
      pass: appear.bind(null, imgs[13]),
      face: function(centerX, centerY, donka, radius) {
        var img;
        if(donka == 'don') {
          img = imgs[10];
        }
        else {
          img = imgs[11];
        }
        circle(img, centerX, centerY, radius);
      },
      combo: function(numb) {
        var centerX = 400;
        var bottomY = 400;
        var strArr = numb.count.toString().split('');
        centerX -= (strArr.length * 20 - 20);
        strArr.forEach(function(str) {
          drawStr(imgs[str], centerX, bottomY, numb.stage);
          centerX += 40;
        });
      },
      key: function(press) {
        context.clearRect(0, 400, 800, 600);
        var centerY = 500;
        var centerX = 25;
        ['lk', 'ld', 'rd', 'rk'].forEach(function(active, i) {
          var color = press[active]?colors[i]:'white';
          centerX += 150;
          keyArc(centerX, centerY, color);
        });
      },
      clear:function() {
        context.clearRect(0, 0, 800, 400);
      }
    };
  })
};
