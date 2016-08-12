## kafka-tweet-consumer

A simple app that streams to the console tweets containing a specified set of keywords.

Keywords are specified in the kafka-tweets app.  They are read from a Kafka topic named 'test' from the 0th (zeroth) partition in that topic.


#### Setup
```shell
npm install
```
Additionally these environment variables need to be defined:
`KAFKA_URL`: A comma separated list of SSL URLs to the Kafka brokers making up the cluster.
`KAFKA_CLIENT_CERT`: The required client certificate (in PEM format) to authenticate clients against the broker.
`KAFKA_CLIENT_CERT_KEY`: The required client certificate key (in PEM format) to authenticate clients against the broker.

#### Run
```shell
npm start
```
