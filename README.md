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

You will need access to a working InfluxDB instance.

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-InfluxDbStats.git InfluxDbStats --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/DeviceMove
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

Alternatively this module can be installed via the Z-Wave.me app store. Just
go to Management > App Store Access and add 'k1_beta' access token.

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
