const Kafka = require('no-kafka');

// Get broker URLs and replace
// 'kafka+ssl://blah.com:9092' URL format with 'kafka://blah.com:9092'
const brokerUrls = process.env.KAFKA_URL.replace(/\+ssl/g,'');

const consumer = new Kafka.SimpleConsumer({
  idleTimeout: 100,
  clientId: 'simple-consumer',
  connectionString: brokerUrls,
  ssl: {
    certFile: './client.crt',
    keyFile: './client.key'
  }
});

// data handler function can return a Promise
const dataHandler = function (messageSet, topic, partition) {
  messageSet.forEach(function (m) {
    console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
  });
};

return consumer.init().then(function () {
  // Subscribe partitons 0 and 1 in a topic:
  return consumer.subscribe('test', [0], dataHandler);
});
