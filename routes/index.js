exports.index = function(req, res) {
  res.render('index', { title: 'Streaming Tweets', message: 'Streaming Tweets' });
};
