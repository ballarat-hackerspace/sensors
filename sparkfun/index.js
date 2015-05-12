var https = require('https'),
    EventSource = require('eventsource'),
    bunyan = require('bunyan');

process.env.npm_package_name || usage("This must be run this via npm");

var temp, humidity, dewpoint;
var lastUpdate = 0;
var log = bunyan.createLogger({ name: process.env.npm_package_name });

/* -------------------------------------------------------------- */

var spark_api = process.env.npm_package_config_spark_api ||
  usage("No Spark API defined");
var sparkfun_priv = process.env.npm_package_config_sparkfun_priv ||
  usage("No sparkfun private key defined");
var sparkfun_pub = process.env.npm_package_config_sparkfun_pub ||
  usage("No sparkfun public key defined");

/* -------------------------------------------------------------- */

function usage(msg) {
  console.log("Error: " + msg);
  process.exit(1);
}

/* -------------------------------------------------------------- */

var eventSourceHeaders = { headers:
      {'Authorization': 'Bearer ' + spark_api } };
var source = new EventSource('https://api.spark.io/v1/events',
      eventSourceHeaders);

source.addEventListener('ballarathackerspace.org.au/temp', function(e) {
  temp = JSON.parse(e.data);
  log.info("temperature=" + temp.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

source.addEventListener('ballarathackerspace.org.au/humid', function(e) {
  humidity = JSON.parse(e.data);
  log.info("humidity=" + humidity.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

source.addEventListener('ballarathackerspace.org.au/dewpoint', function(e) {
  dewpoint = JSON.parse(e.data);
  log.info("dewpoint=" + dewpoint.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

source.addEventListener('open', function(e) {
  log.info("eventSource connection opened");
}, false);

source.addEventListener('error', function(e) {
  if (e.readyState == EventSource.CLOSED) {
    log.warn("eventSource connection closed");
  }
  log.error(e);
  process.exit(1);
}, false);

log.info("Waiting for events");

setInterval(function() {
  var dataAge = (Date.now() / 1000 | 0) - lastUpdate;
  if (dataAge > 120) {
    log.warn("data too old, not sending to sparkfun");
    return;
  }
  
  log.info("sending data to sparkfun");

  var options = {
    hostname: 'data.sparkfun.com',
    port: 443,
    path: '/input/' + sparkfun_pub + '?private_key=' + sparkfun_priv +
          '&dewpoint=' + dewpoint.data + '&humidity=' + humidity.data +
          '&temperature=' + temp.data,
    method: 'GET'
  };

  var req = https.request(options, function(res) {
    if (res.statusCode == 200) log.info("data uploaded");
    else log.error("data upload failed: ", res.statusCode);
  });

  req.end();

  req.on('error', function(e) {
    log.error(e);
  });
}, 60000);
