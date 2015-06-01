var https = require('https'),
    EventSource = require('eventsource'),
    Firebase = require("firebase"),
    bunyan = require('bunyan');

process.env.npm_package_name || usage("This must be run this via npm");

var temp, humidity, dewpoint;
var lastUpdate = 0;
var log = bunyan.createLogger({ name: process.env.npm_package_name });

/* -------------------------------------------------------------- */

var spark_api = process.env.npm_package_config_spark_api ||
  usage("No Spark API key defined");
var firebase_api = process.env.npm_package_config_firebase_api ||
  usage("No Firebase API key defined");
var firebase_url = process.env.npm_package_config_firebase_url ||
  usage("No Firebase URL defined");

var fb = new Firebase(firebase_url + "sensors/");
fb.authWithCustomToken(firebase_api, function(error, data) {
  if (error) {
    log.error("Firebase login failed");
    process.exit(1);
  }
});

/* -------------------------------------------------------------- */

function usage(msg) {
  console.log("Error: " + msg);
  process.exit(1);
}

/* -------------------------------------------------------------- */

var es_headers = {
  headers: {
    'Authorization': 'Bearer ' + spark_api
  }
};

var es = new EventSource('https://api.spark.io/v1/events', es_headers);

es.addEventListener('ballarathackerspace.org.au/temp', function(e) {
  var temp = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseFloat(temp.data), when: when };
  fb.child(temp.coreid).child('temperature').set(data);
  log.info("temp", temp.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/humid', function(e) {
  var humidity = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseFloat(humidity.data), when: when };
  fb.child(humidity.coreid).child('humidity').set(data);
  log.info("humid", humidity.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/dewpoint', function(e) {
  var dewpoint = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseFloat(dewpoint.data), when: when };
  fb.child(dewpoint.coreid).child('dewpoint').set(data);
  log.info("dewpoint", dewpoint.coreid, data);
}, false);

es.addEventListener('open', function(e) {
  log.info("eventsource connection opened");
}, false);

es.addEventListener('error', function(e) {
  if (e.readyState == Eventes.CLOSED) {
    log.error("eventsource connection closed");
  }
  console.error(e);
}, false);

log.info("Waiting for events");
