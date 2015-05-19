var https = require('https'),
    EventSource = require('eventsource'),
    Firebase = require("firebase"),
    bunyan = require('bunyan');

//process.env.npm_package_name || usage("This must be run this via npm");

var temp, humidity, dewpoint;
var lastUpdate = 0;
//var log = bunyan.createLogger({ name: process.env.npm_package_name });

/* -------------------------------------------------------------- */

var spark_api = "7c61e53f2f060147e4325d5f5440d15f4013be9f";

var fb = new Firebase("https://flickering-inferno-6745.firebaseio.com/");

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
  temp = JSON.parse(e.data);
  console.log("temperature=" + temp.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

es.addEventListener('ballarathackerspace.org.au/humid', function(e) {
  humidity = JSON.parse(e.data);
  console.log("humidity=" + humidity.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

es.addEventListener('ballarathackerspace.org.au/dewpoint', function(e) {
  dewpoint = JSON.parse(e.data);
  console.log("dewpoint=" + dewpoint.data);
  lastUpdate = Date.now() / 1000 | 0;
}, false);

es.addEventListener('open', function(e) {
  console.log("eventsource connection opened");
}, false);

es.addEventListener('error', function(e) {
  if (e.readyState == Eventes.CLOSED) {
    console.warn("eventsource connection closed");
  }

  console.error(e);
}, false);

console.log("Waiting for events");

setInterval(function() {
  var now = Date.now() / 1000;
  var dataAge = (now | 0) - lastUpdate;

  if (dataAge > 120) {
    console.warn("data too old, not sending to firebase");
    return;
  }

  console.log("sending data to firebase");

  var opts = {
    'epoch': now,
    'dewpoint': dewpoint.data,
    'humidity': humidity.data,
    'temperature': temp.data
  };

  console.log(opts);
  fb.push(opts);
}, 60000);
