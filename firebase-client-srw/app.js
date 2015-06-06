// default coreid
var coreid = '55ff72066678505541131367';

var t, h, w;
var fb = new Firebase('https://bhack-sensors.firebaseio.com/sensors/');

function setCoreId(core) {
  $('#' + coreid).attr("class", "btn btn-block btn-default");
  fb.child(coreid).off();  // remove all callbacks
  coreid = core;
  $('#' + coreid).attr("class", "btn btn-block btn-primary");
  fb.child(coreid).on("value", setSensorData);

  $('#temperature').html("&middot;&middot;&middot;").attr("class", "failure");
  $('#humidity').html("&middot;&middot;&middot;").attr("class", "failure");
  $('#light').fadeOut();
  $('#motion').fadeOut();

  $('html, body').animate({
    scrollTop: $("#temperature").offset().top
  }, 500);
}

function setSensorData(data) {
  console.log("setSensorData", data.key());

  if (!data.exists()) {
    $('#status').attr("class", "label label-danger");
    $('#status').html("never seen sensor");
  } else {
    $('#status').attr("class", "label label-default");
    $('#status').html("reading sensor ...");

    t = data.val()['temperature']['value']
    w = data.val()['temperature']['when']
    h = data.val()['humidity']['value']

    $('#temperature').html(t + "&deg;C");
    $('#humidity').html(h + "%");

    if (data.val().hasOwnProperty("light")) {
      var v = data.val()['light']['value'];
      if (v > 1500) {
        $('#light').html("lights on").attr("class", "label label-success").fadeIn()
          .attr("title", v);
      } else {
        $('#light').html("lights off").attr("class", "label label-default").fadeIn()
          .attr("title", v);
      }
    }

    if (data.val().hasOwnProperty("motion")) {
      var m = Math.floor(Date.now() / 1000) - data.val()['motion']['when'];
      var lastMotion = new Date(data.val()['motion']['when'] * 1000);
      if (m < 900) {
        $('#motion').html("motion detected").attr("class", "label label-danger")
          .attr("title", "last motion at " + lastMotion).fadeIn();
      } else {
        $('#motion').html("no motion detected").attr("class", "label label-success")
          .attr("title", "last motion at " + lastMotion).fadeIn();
      }
    }

    var secondsAgo = Math.floor(Date.now() / 1000) - w;
    var lastUpdate = new Date(w * 1000);
    if (secondsAgo < 300) {
      $('#status').html("sensor online (ssid:" + data.val()['wifi']['ssid'] + " signal:" + data.val()['wifi']['rssi'] + "dB)")
        .attr("class", "label label-success")
	.attr("title", "last update at " + lastUpdate);
      $('#temperature').attr("class", "success");
      $('#humidity').attr("class", "success");
    } else {
      $('#status').html("sensor offline (last ssid:" + data.val()['wifi']['ssid'] + " last signal:" + data.val()['wifi']['rssi'] + "dB)")
        .attr("class", "label label-danger")
	.attr("title", "offline since " + lastUpdate);
      $('#temperature').attr("class", "failure");
      $('#humidity').attr("class", "failure");
      $('#motion').fadeOut();
      $('#light').fadeOut();
    }
  }
}

$('#temperature').fitText(0.5);
$('#humidity').fitText(0.9);

fb.child(coreid).on("value", setSensorData);

if (location.hash) {
  setCoreId(location.hash.substring(1));
}
