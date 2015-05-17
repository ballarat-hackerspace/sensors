# sparkfun conduit

A simple script to watch the Spark.io event stream for events emitted by
our sensor spark core and send the data into the Sparkfun system.

This script must be configured and run through npm and requires the
following configs to be set by the running user:

```shell
  $ npm config set sensors:spark_api AAAA
  $ npm config set sensors:sparkfun_priv BBBB
  $ npm config set sensors:sparkfun_pub CCCC
```

Replacing AAAA, BBBB and CCCC with the appropriate values.

It also requires ```forever``` installed globally:

```shell
  $ sudo npm install -g forever
```

Prior to first run ensure all required dependencies are installed:

```shell
  $ npm install
```

The script can now be controlled via:

```shell
  $ npm [start|stop|restart]
```

To view the logs:

```shell
  $ npm run logs
```
