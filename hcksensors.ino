// This #include statement was automatically added by the Spark IDE.
#include "idDHT22/idDHT22.h"

// declaration for DHT11 handler
int idDHT22pin = D0;	// Digital pin for comunications
void dht22_wrapper();	// must be declared before the lib initialization

// DHT instantiate
idDHT22 DHT22(idDHT22pin, dht22_wrapper);

void setup() {
	pinMode(D7, OUTPUT);
}

void dht22_wrapper() {
	DHT22.isrCallback();
}

void loop()
{
	digitalWrite(D7, HIGH);

	DHT22.acquire();
	while (DHT22.acquiring())
		;
	int result = DHT22.getStatus();
	switch (result)
	{
		case IDDHTLIB_OK:
			break;
		case IDDHTLIB_ERROR_CHECKSUM:
			Spark.publish("error", "Checksum error");
			break;
		case IDDHTLIB_ERROR_ISR_TIMEOUT:
			Spark.publish("error", "ISR Time out error");
			break;
		case IDDHTLIB_ERROR_RESPONSE_TIMEOUT:
			Spark.publish("error", "Response time out error");
			break;
		case IDDHTLIB_ERROR_DATA_TIMEOUT:
			Spark.publish("error", "Data time out error");
			break;
		case IDDHTLIB_ERROR_ACQUIRING:
			Spark.publish("error", "Acquiring");
			break;
		case IDDHTLIB_ERROR_DELTA:
			Spark.publish("error", "Delta time to small");
			break;
		case IDDHTLIB_ERROR_NOTSTARTED:
			Spark.publish("error", "Not started");
			break;
		default:
			Spark.publish("error", "Unknown error");
			break;
	}

	char h[40];
	sprintf(h, "%2.2f", DHT22.getHumidity());
	Spark.publish("ballarathackerspace.org.au/humid", h);

	char t[40];
	sprintf(t, "%2.2f", DHT22.getCelsius());
	Spark.publish("ballarathackerspace.org.au/temp", t);

	char d[40];
	sprintf(d, "%2.2f", DHT22.getDewPoint());
	Spark.publish("ballarathackerspace.org.au/dewpoint", d);

	digitalWrite(D7, LOW);

	delay(30000);
}
