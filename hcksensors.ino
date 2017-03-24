// This #include statement was automatically added by the Particle IDE.
#include <PietteTech_DHT.h>

#define VERSION                 "srw/0.0.7"
#define PUBLISH_PREFIX          "ballarathackerspace.org.au"

// -----------------------------------------------------------------------------------------------

// Feature support (comment out features you don't want)

#define __DHT__
// #define __PIR__
// #define __LDR__
#define __WIFI__
#define __RAINBOW__

// DHT
#define DHTTYPE                 DHT22   // Sensor type DHT11/21/22/AM2301/AM2302
#define DHTPIN                  D3      // Digital pin for communications
#define DHT_SAMPLE_INTERVAL     60      // Sample this many seconds apart
int DHT_PublishTime             = 0;
void dht_wrapper();
bool DHT_started;
PietteTech_DHT DHT(DHTPIN, DHTTYPE, dht_wrapper);

// Wifi
#define WIFI_SAMPLE_INTERVAL    60      // seconds
int WIFI_PublishTime            = 0;

// PIR
#define PIR_POWER               D1
#define PIR_DETECT              D0
#define PIR_ACTIVITY            D4
#define PIR_PUBLISH_INTERVAL    10      // seconds
int PIR_PublishTime             = 0;
volatile int PIR_motion_detect  = 0;
volatile bool PIR_activity      = false;

// LDR
#define LDR_PIN                 A0
#define LDR_SAMPLE_INTERVAL     60      // seconds
int LDR_PublishTime             = 0;

// activity display
#define ACTIVITY_LED            D7
#define ACTIVITY_IDLE           1       // seconds
int IDLE_PublishTime            = 0;
volatile bool _actled           = false;

// rainbow
#define RAINBOW_INTERVAL        10000   // microseconds
#define RAINBOW_BRIGHTNESS      64
#define RAINBOW_SATURATION      1
float hue                       = 0;
unsigned long RAINBOW_interval  = 0;
int r, g, b;

// watchdog
#define WATCHDOG_INTERVAL       300     // seconds
int WATCHDOG_PublishTime        = 0;
int boot_time;

// -----------------------------------------------------------------------------------------------

void setup() {
    // give core time to sync time and settle cloud connection
    delay(10000);

    char t[40];
    sprintf(t, "boot %s/%s%s%s%s%s", VERSION, 
#if defined(__DHT__)
        "D",
#else
        "_",
#endif
#if defined(__PIR__)
        "P",
#else
        "_",
#endif
#if defined(__LDR__)
        "L",
#else
        "_",
#endif
#if defined(__WIFI__)
        "W",
#else
        "_",
#endif
#if defined(__RAINBOW__)
        "R"
#else
        "_"
#endif
    );
    Particle.publish(PUBLISH_PREFIX"/status", t);

    pinMode(ACTIVITY_LED, OUTPUT);

#if defined(__PIR__)
    _pirInit();
    // PIR needs time to settle
    PIR_PublishTime = Time.now();
    pinMode(PIR_ACTIVITY, OUTPUT);
#endif

#if defined(__WIFI__)
    // WIFI needs time to settle
    WIFI_PublishTime = Time.now();
#endif

    boot_time = Time.now();
    Particle.function("action", doAction);

#if defined(__RAINBOW__)
    RGB.control(true);
#endif
}

void loop() {
#if defined(__DHT__)
    _dhtSampler();
#endif
#if defined(__WIFI__)
    _WIFISampler();
#endif
#if defined(__LDR__)
    _LDRSampler();
#endif
#if defined(__PIR__)
    _PIRPublish();
#endif
#if defined(__RAINBOW__)
    _Rainbow();
#endif
    _idle();
    _watchdog();
}

// -----------------------------------------------------------------------------------------------

void _activity() {
    _actled = !_actled;
    digitalWrite(ACTIVITY_LED, _actled);
}

void _PIR_activity() {
    PIR_activity = !PIR_activity;
    digitalWrite(PIR_ACTIVITY, PIR_activity);
}

void _idle() {
    if ((Time.now() - IDLE_PublishTime) > ACTIVITY_IDLE) {
        _activity();
        IDLE_PublishTime = Time.now();
    }
}

void _watchdog() {
    if ((Time.now() - WATCHDOG_PublishTime) > WATCHDOG_INTERVAL) {
        char t[40];
        sprintf(t, "watchdog %s/%s%s%s%s%s %d", VERSION,
#if defined(__DHT__)
         "D",
#else
        "_",
#endif
#if defined(__PIR__)
        "P",
#else
        "_",
#endif
#if defined(__LDR__)
        "L",
#else
        "_",
#endif
#if defined(__WIFI__)
        "W",
#else
        "_",
#endif
#if defined(__RAINBOW__)
        "R",
#else
        "_",
#endif
        Time.now() - boot_time);
        Particle.publish(PUBLISH_PREFIX"/status", t);
        WATCHDOG_PublishTime = Time.now();
    }
}

void _Rainbow() {
    if ((micros() - RAINBOW_interval) > RAINBOW_INTERVAL) {
        HSVtoRGB(hue, RAINBOW_SATURATION, RAINBOW_BRIGHTNESS);
        RGB.color(r, g, b);
        if (++hue > 360) hue = 0;
        RAINBOW_interval = micros();
    }
}

void _LDRSampler() {
    if ((Time.now() - LDR_PublishTime) > LDR_SAMPLE_INTERVAL) {
        char t[40];
        sprintf(t, "%d", (int)analogRead(LDR_PIN));
        Particle.publish(PUBLISH_PREFIX"/light", t);
        LDR_PublishTime = Time.now();
    }
}

void _pirInit() {
    pinMode(PIR_POWER, OUTPUT);
    pinMode(PIR_DETECT, INPUT_PULLUP);
    digitalWrite(PIR_POWER, HIGH);
    PIR_motion_detect = 0;
    delay(3000);
    attachInterrupt(PIR_DETECT, _pirDetect, FALLING);
}

void _pirDetect() {
    PIR_motion_detect++;
    _PIR_activity();
}

void _PIRPublish() {
    if ((Time.now() - PIR_PublishTime) > PIR_PUBLISH_INTERVAL) {
        if (PIR_motion_detect > 0) {
            char t[40];
            sprintf(t, "%d", PIR_motion_detect);
            Particle.publish(PUBLISH_PREFIX"/motion", t);
            PIR_PublishTime = Time.now();
            _activity();
        }
        PIR_motion_detect = 0;
    }
}

void _WIFISampler() {
    if ((Time.now() - WIFI_PublishTime) > WIFI_SAMPLE_INTERVAL) {
        char t[40];
        sprintf(t, "%s:%d", WiFi.SSID(), WiFi.RSSI());
        Particle.publish(PUBLISH_PREFIX"/wifi", t);
        WIFI_PublishTime = Time.now();
    }
}

void _dhtSampler() {
    if ((Time.now() - DHT_PublishTime) > DHT_SAMPLE_INTERVAL) {
        if (!DHT_started) {
            DHT.acquire();
            DHT_started = true;
            Particle.publish(PUBLISH_PREFIX"/status", "dht started");
            _activity();
        }
        if (!DHT.acquiring()) {
            int result = DHT.getStatus();

            if (result == DHTLIB_OK) {
                char t[40];
                sprintf(t, "{ \"dht\": \"%2.2f %2.2f %2.2f\" }",
                    DHT.getDewPoint(), DHT.getHumidity(), DHT.getCelsius());
                Particle.publish(PUBLISH_PREFIX"/dht", t);
            }
            else {
                char t[40];
                sprintf(t, "error DHT.getStatus=%d", result);
                Particle.publish(PUBLISH_PREFIX"/status", t);
            }

            DHT_started = false;
            DHT_PublishTime = Time.now();
            _activity();
        }
    }
}

void dht_wrapper() {
    DHT.isrCallback();
}

void HSVtoRGB(float h, float s, float v)
{
	int i;
	float f, p, q, t;
	if(s == 0) {
		r = g = b = v;
		return;
	}
	h /= 60;			// sector 0 to 5
	i = int(h);
	f = h - i;			// factorial part of h
	p = v * (1 - s);
	q = v * (1 - s * f);
	t = v * (1 - s * (1 - f));
	switch(i) {
		case 0:
			r = v; g = t; b = p;
			break;
		case 1:
			r = q; g = v; b = p;
			break;
		case 2:
			r = p; g = v; b = t;
			break;
		case 3:
			r = p; g = q; b = v;
			break;
		case 4:
			r = t; g = p; b = v;
			break;
		default:		// case 5:
			r = v; g = p; b = q;
			break;
	}
}

int doAction(String args) {
    args.trim();
    args.toUpperCase();

    if (args.equals("RESET")) {
        System.reset();
        return 0;
    }
#ifdef __PIR__
    else if (args.equals("PIR-RESET")) {
        digitalWrite(PIR_POWER, LOW);
        delay(100);
        digitalWrite(PIR_POWER, HIGH);
        return 0;
    }
    else if (args.equals("PIR-DISABLE")) {
        detachInterrupt(PIR_DETECT);
        return 0;
    }
    else if (args.equals("PIR-ENABLE")) {
        attachInterrupt(PIR_DETECT, _pirDetect, FALLING);
        return 0;
    }
#endif
    else {
        return -1;
    }
}
