var wsUrl = 'ws' + window.location.href.match(/^http(s?:\/\/.*)\/.*$/)[1];
var ws = new WebSocket(wsUrl);

ws.onopen = function () { console.log("WebSocket connection opened..."); };
ws.onclose = function () { console.log("WebSocket connection is closed..."); };

// Get data from websocket message
var tweetStream = Bacon.fromEventTarget(ws, "message").map(function(message) {
  var tweet = JSON.parse(message.data);
  return tweet;
});
tweetStream.onValue(function(data) {
  var newTweet = document.createElement('p');
  newTweet.appendChild(document.createTextNode(data.text));

  $(newTweet).prependTo('#tweets').hide().slideDown();

  var tweetCount = $('#tweets').children().length;
  if (tweetCount > 15) {
    $('#tweets').children('p:last').remove();
  }
})
// tweetStream.onValue(function(data) { console.debug(data); }); // DEBUG

var SAMPLE_INTERVAL = 1000;

var tweetsPerSecond = tweetStream.scan(0, function(d) {
  return ++d;
});

var sampledTweetRate = tweetsPerSecond.sample(SAMPLE_INTERVAL);
var totalUpdatesBeforeLastSample = 0;
sampledTweetRate.onValue(function(count) {
  var updateRate = (count - totalUpdatesBeforeLastSample) /
                   (SAMPLE_INTERVAL / 1000);
  totalUpdatesBeforeLastSample = count;
  $('#rate').text(Math.round(updateRate));
});

// Create property (object) to count tweets by keyword
var tweetCountSample = tweetStream.scan({ total: 0 }, function(accumulator, newData) {
  var keyword = newData.keywords[0]; //TODO: figure out how to handle multiple keywords

  if (!_.has(accumulator, keyword)) {
    accumulator[keyword] = 1;
  } else {
    accumulator[keyword]++;
  }

  accumulator.total++;
  return accumulator;
});
var tweetCountStream = tweetCountSample.sample(SAMPLE_INTERVAL);

// Create property (object) to count unique authors by keyword
var tweetAuthorSample = tweetStream.scan({}, function(accumulator, newData) {
  var author   = newData.user.screenName;
  var keyword  = newData.keywords[0]; //TODO: figure out how to handle multiple keywords

  if (!_.has(accumulator, keyword)) {
    accumulator[keyword] = [author];
  } else {
    if (!_.includes(accumulator[keyword], author)) {
      accumulator[keyword].push(author);
    }
  }
  return accumulator;
});
var tweetAuthorStream = tweetAuthorSample.sample(SAMPLE_INTERVAL);

// Create property (object) for avg tweet length by keyword
var tweetLengthSample = tweetStream.scan({ total: {count: 0, totalCharacters: 0}}, function(accumulator, newData) {
  var keyword     = newData.keywords[0]; //TODO: figure out how to handle multiple keywords
  var tweetLength = newData.characterCount;

  if (!_.has(accumulator, keyword)) {
    accumulator[keyword] = { count: 1, totalCharacters: tweetLength };
  } else {
    accumulator[keyword].count++;
    accumulator[keyword].totalCharacters += tweetLength;
  }

  accumulator.total.count++;
  accumulator.total.totalCharacters += tweetLength;
  return accumulator;
});
var tweetLengthStream = tweetLengthSample.sample(SAMPLE_INTERVAL);

var rawChartStream = Bacon.zipAsArray([tweetCountStream, tweetAuthorStream, tweetLengthStream]);

/*
 *
 * Ending data structure passed to d3 should look like, for e.g., this:
 * [
 *   { "keyword": "ruby", "portionOfTweets": 0.3, "uniqueTweeterCount": 2, "averageTweetLength": 90 },
 *   { "keyword": "java", "portionOfTweets": 0.5, "uniqueTweeterCount": 10, "averageTweetLength": 107 },
 *   { "keyword": "php", "portionOfTweets": 0.2, "uniqueTweeterCount": 1, "averageTweetLength": 107 }
 * ]
 *
 * It is the *full* dataset for the chart. i.e. when passed to the chart, any keyword objects missing
 * from it will be removed from the chart.  But also, any new keyword objects will be added to the chart.
 */
var chartData = [];
rawChartStream.onValue(function(d) {
  var tweetCount  = d[0],
      tweetAuthor = d[1],
      tweetLength = d[2];

  var allKeywords = _.union(
                      _.keys(tweetCount),
                      _.keys(tweetAuthor),
                      _.keys(tweetLength)
                    );

  for (var i = 0; i < allKeywords.length; i++) {
    var keyword = allKeywords[i];
    if (keyword == 'total' || keyword == 'undefined') continue;

    // if chartData already has object for keyword, use that object
    var el = _.find(chartData, ['keyword', keyword]);

    // if chartData doesn't have object for keyword, add an object for it
    if (!el) {
      el = { keyword: keyword };
      chartData.push(el);
    }

    // assign updated data to el
    if (_.has(tweetCount,  keyword)) el.portionOfTweets    = tweetCount[keyword] / tweetCount.total;
    if (_.has(tweetAuthor, keyword)) el.uniqueTweeterCount = tweetAuthor[keyword].length;
    if (_.has(tweetLength, keyword)) el.averageTweetLength = tweetLength[keyword].totalCharacters / tweetLength[keyword].count;
  }
  updateChart(chartData);
});

// Setup d3
// x: unique count of tweet authors
// y: average tweet length in characters
// r: number of tweets (or % of tweets received)
var width = 720,
    height = 450,
    margins = {
        top: 20,
        bottom: 50,
        left: 70,
        right: 20
    };

var vis = d3.select('svg')
            .attr('width', width)
            .attr('height', height);

var x = d3.scale
    // .linear()
    .log()
    .base(10)
    // .domain([0, 50])
    .domain([Math.pow(10, 0), Math.pow(10, 3)])
    .range([margins.left, width - margins.right]);

var y = d3.scale.linear()
    .domain([0,200])
    .range([height - margins.bottom, margins.top]);

var r = d3.scale.linear()
    .domain([0,1])
    .range([0,150])

var xAxis  = d3.svg.axis()
    .scale(x)
    .ticks(3, ",.1s")
    .orient('bottom');

var yAxis  = d3.svg.axis()
    .scale(y)
    .orient('left');

vis.append("g")
   .attr('class', 'xaxis axis')
   .attr("transform", "translate(0," + (height - margins.bottom) + ")")
   .call(xAxis)
  .append('text')
   .attr("text-anchor", "middle")
   .attr("transform", "translate("+ (width/2) +","+(40)+")")
   .text('Unique Tweet Authors');

vis.append("g")
   .attr('class', 'yaxis axis')
   .attr("transform", "translate(" + margins.left + ",0)")
   .call(yAxis)
  .append('text')
   .attr("text-anchor", "middle")
   .attr("transform", "translate("+ (-40) +","+(height/2)+")rotate(-90)")
   .text('Average # Characters in Tweet');

vis.append('text')
   .attr('transform', 'translate('+ (width/2) +','+ (height/10) +')')
   .text('Radius = % of tweets received since page load');

function colors(n) {
  var colorList = ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd'];
  return colorList[n % colorList.length];
}

var updateChart = function(newData) {

  // select
  var circles = vis.selectAll("circle")
                   .data(newData, function(d) { return d.keyword; });

  // update existing circles
  circles.transition().duration(500)
        .attr('name', function(d) { return d.keyword; })
        .attr('cx',   function(d) { return x(d.uniqueTweeterCount); })
        .attr('cy',   function(d) { return y(d.averageTweetLength); })
        .attr('r',    function(d) { return r(d.portionOfTweets); })
        .attr('fill', function(d, i) { return colors(i); })
        .style('opacity', 0.9);


  // insert new circles
  circles.enter().insert('circle')
        .attr('name', function(d) { return d.keyword; })
        .attr('cx',   function(d) { return x(d.uniqueTweeterCount); })
        .attr('cy',   function(d) { return y(d.averageTweetLength); })
        .attr('r',    function(d) { return r(d.portionOfTweets); })
        .attr('fill', function(d, i) { return colors(i); })
        .style('opacity', 0.9);

circles.append('text')
        .text('stuff');

  // remove circles no longer in data
  circles.exit()
         .remove();
};
