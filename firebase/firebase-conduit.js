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

var fb = new Firebase(firebase_url);
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
  fb.child('sensors').child(temp.coreid).child('temperature').set(data);
  fb.child('historic').child(temp.coreid).child('temperature').push(data);
  log.info("temp", temp.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/humid', function(e) {
  var humidity = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseFloat(humidity.data), when: when };
  fb.child('sensors').child(humidity.coreid).child('humidity').set(data);
  fb.child('historic').child(humidity.coreid).child('humidity').push(data);
  log.info("humid", humidity.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/dewpoint', function(e) {
  var dewpoint = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseFloat(dewpoint.data), when: when };
  fb.child('sensors').child(dewpoint.coreid).child('dewpoint').set(data);
  fb.child('historic').child(dewpoint.coreid).child('dewpoint').push(data);
  log.info("dewpoint", dewpoint.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/motion', function(e) {
  var motion = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  if (motion.hasOwnProperty("data")) {
    var data = { value: parseInt(motion.data), when: when };
  } else {
    var data = { when: when };
  }
  fb.child('sensors').child(motion.coreid).child('motion').set(data);
  log.info("motion", motion.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/light', function(e) {
  var light = JSON.parse(e.data);
  var when = Date.now() / 1000 | 0;
  var data = { value: parseInt(light.data), when: when };
  fb.child('sensors').child(light.coreid).child('light').set(data);
  log.info("light", light.coreid, data);
}, false);

es.addEventListener('ballarathackerspace.org.au/wifi', function(e) {
  var wifi = JSON.parse(e.data);
  var raw = wifi.data.split(":");
  var when = Date.now() / 1000 | 0;
  if (parseInt(raw[1]) < 0) {
    var data = { ssid: raw[0], rssi: parseInt(raw[1]), when: when };
    fb.child('sensors').child(wifi.coreid).child('wifi').set(data);
    log.info("wifi", wifi.coreid, data);
  }
  else {
    log.warn("bad wifi data", wifi.data);
  }
}, false);

es.addEventListener('ballarathackerspace.org.au/status', function(e) {
  var status = JSON.parse(e.data);
  log.warn("status", status.coreid, status.data);
}, false);

es.addEventListener('open', function(e) {
  log.info("eventsource connection opened");
}, false);

es.addEventListener('error', function(e) {
  if (e.readyState == EventSource.CLOSED) {
    log.error("eventsource connection closed");
  }
  console.error(e);
  process.exit(0);
}, false);

log.info("Waiting for events");
