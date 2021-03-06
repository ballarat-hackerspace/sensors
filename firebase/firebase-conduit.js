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
var keep_alive_timeout = 60*1000;
var keep_alive_timer = null;
var es = null;

function es_activity() {
  if (keep_alive_timer) clearTimeout(keep_alive_timer);
  keep_alive_timer = setTimeout(es_connect, keep_alive_timeout);
}

function es_connect() {
  if (es) {
    es.close();
    log.info("eventsource: re-connect");
  }
  else {
    log.info("eventsource: connect");
  }

  es = new EventSource('https://api.spark.io/v1/events', es_headers);

  es.addEventListener('ballarathackerspace.org.au/dht', function(e) {
    es_activity();
    var when = Date.now() / 1000 | 0;
    var incoming = JSON.parse(e.data);
    var dht_raw = JSON.parse(incoming.data);
    log.info("dht=", dht_raw.dht);
    var dht = dht_raw.dht.split(" ");

    var data = { value: parseFloat(dht[0]), when: when };
    fb.child('sensors').child(incoming.coreid).child('dewpoint').set(data);
    fb.child('historic').child(incoming.coreid).child('dewpoint').push(data);
    log.info("dew", data);

    var data = { value: parseFloat(dht[1]), when: when };
    fb.child('sensors').child(incoming.coreid).child('humidity').set(data);
    fb.child('historic').child(incoming.coreid).child('humidity').push(data);
    log.info("humid", data);

    var data = { value: parseFloat(dht[2]), when: when };
    fb.child('sensors').child(incoming.coreid).child('temperature').set(data);
    fb.child('historic').child(incoming.coreid).child('temperature').push(data);
    log.info("temp", data);
  }, false);

  es.addEventListener('ballarathackerspace.org.au/light', function(e) {
    es_activity();
    var light = JSON.parse(e.data);
    var when = Date.now() / 1000 | 0;
    var data = { value: parseInt(light.data), when: when };
    fb.child('sensors').child(light.coreid).child('light').set(data);
    log.info("light", light.coreid, data);
  }, false);

  es.addEventListener('ballarathackerspace.org.au/wifi', function(e) {
    es_activity();
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
    es_activity();
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
    log.error(e);
  }, false);
}

es_connect();

log.info("Waiting for events");
