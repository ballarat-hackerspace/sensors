# sensors

A simple script to watch the Spark.io event stream for events emitted by
our sensor spark core and send the data into the Sparkfun system.

This script must be configured and run through npm and requires the
following configs to be set by the running user:

  $ npm config set sensors:spark_api AAAA
  $ npm config set sensors:sparkfun_priv BBBB
  $ npm config set sensors:sparkfun_pub CCCC

Replacing AAAA, BBBB and CCCC with the appropriate values. The script is
then controlled via:

Prior to first run ensure all dependencies are installed:

  $ npm install

The script can now be controlled via:

  $ npm [start|stop|restart]

To view the logs:

  $ npm run logs