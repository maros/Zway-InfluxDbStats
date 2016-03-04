# Zway-InfluxDbStats

Store sensor data in InfluxDB instances. Sensor and device data is transfered
periodically, as well as every time a change occurs.

Since this module uses the new line protocol, it requires at least InfluxDb
version 0.9.0.

Data is stored under 'device.$DeviceID$', with only one measurement key 
called 'level' The following tags are also added:

* probe: Probe title (eg. 'temperature')
* room: Room name
* scale: Scale title (eg. '°C')
* type: Basic device type (eg. 'multilevelSensor')
* title: Device name

# Configuration

## database

Database name

## username, password

Database credentials

## server, port

Database server including the protocol (http:// or https://) and the port.

## devices

List of devices to be monitored

## interval

Sets an interval for periodic stats updates. If left empty the values will only be transfered on change (not recommended)

# Virtual Devices

No virtual device is created

# Events

No events are emitted

# Installation

Install the BaseModule from https://github.com/maros/Zway-BaseModule first.
You will also need access to a working InfluxDB instance. See 
https://influxdata.com/get-started/download-and-install-influxdb/ for
installation instructions.

The prefered way of installing this module is via the "Zwave.me App Store"
available in 2.2.0 and higher. For stable module releases no access token is 
required. If you want to test the latest pre-releases use 'k1_beta' as 
app store access token.

For developers and users of older Zway versions installation via git is 
recommended.

```shell
cd /opt/z-way-server/automation/userModules
git clone https://github.com/maros/Zway-InfluxDbStats.git InfluxDbStats --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/userModules/InfluxDbStats
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
