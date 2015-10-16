# Zway-InfluxDbStats

Store sensor data in InfluxDB instances. Sensor and device data is transfered
periodically, as well as every time a change occurs.

# Configuration

## database

Database name

## database

Database name

## username, password

Credentials

## server

Database server including the protocol (http:// or https://) but not the port.

## devices

List of devices to be monitored

## interval

Sets an interval for periodic stats updates. If left empty the values will only be transfered on change (not recommended)

# Virtual Devices

No virtual device is created

# Events

No events are emitted

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
