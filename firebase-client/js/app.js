var app = angular.module("sampleApp", ["firebase"]);

app.controller("SampleCtrl", function($scope, $firebaseArray) {
  var ref = new Firebase("https://flickering-inferno-6745.firebaseio.com");

  // download the data into a local object
  $scope.data = $firebaseArray(ref);
  $scope.humidity = "-";
  $scope.dewpoint = "-";
  $scope.temperature = "-";
  $scope.epoch = "-";

  $scope.data.$watch(function(event) {
    var o = $scope.data.$getRecord(event.key);

    console.log(o);

    var n = Date(o.epoch);
    $scope.epoch = n;

    $scope.temperature = o.temperature + "C";
    $scope.humidity = o.humidity + "%";
    $scope.dewpoint = o.dewpoint;
  });

  $scope.data.$loaded()
    .then(function(x) {
      // grab most recent record
      var o = x[x.length-1];

      var n = Date(o.epoch);
      $scope.epoch = n;
      $scope.temperature = o.temperature + "C";
      $scope.humidity = o.humidity + "%";
      $scope.dewpoint = o.dewpoint;
    });

});
