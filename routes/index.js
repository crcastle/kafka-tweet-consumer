exports.index = function(req, res) {
  res.render('index', { title: 'Kafka Evented App Demo', message: 'Streaming Tweets' });
};

exports.waterfall = function(req, res) {
  res.render('waterfall', { title: 'Streaming Tweets', message: 'Streaming Tweets' });
};

exports.bubbles = function(req, res) {
  res.render('bubbles', { title: 'Kafka Evented App Demo' });
};
