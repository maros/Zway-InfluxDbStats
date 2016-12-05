/*** InfluxDbStats Z-Way HA module *******************************************

Version: 1.00
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Collects sensor stats in an InfluxDB

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InfluxDbStats (id, controller) {
    // Call superconstructor first (AutomationModule)
    InfluxDbStats.super_.call(this, id, controller);

    this.interval       = undefined;
    this.url            = undefined;
    this.langfile       = undefined;
    this.commandClass   = 0x80;
}

inherits(InfluxDbStats, BaseModule);

_module = InfluxDbStats;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.init = function (config) {
    InfluxDbStats.super_.prototype.init.call(this, config);
    var self = this;

    self.url = self.config.server
        + ':'
        + self.config.port
        + '/write'
        + '?db='
        + encodeURIComponent(self.config.database);

    if (typeof(self.config.username) !== 'undefined') {
        self.url = self.url + '&u=' + encodeURIComponent(self.config.username);
    }
    if (typeof(self.config.password) !== 'undefined') {
        self.url = self.url + '&p=' + encodeURIComponent(self.config.password);
    }

    if (typeof(self.config.interval) !== 'undefined') {
        var interval = parseInt(self.config.interval,10) * 60 * 1000;
        self.interval = setInterval(_.bind(self.updateAll,self), interval);
    }

    self.handleUpdate = _.bind(self.updateDevice,self);
    // get only real changes
    self.controller.devices.on("modify:metrics:level",self.handleUpdate);
};

InfluxDbStats.prototype.stop = function () {
    var self = this;

    // Remove interval
    if (typeof(self.interval) !== 'undefined') {
        clearInterval(self.interval);
    }

    // Remove listener
    self.controller.devices.off("modify:metrics:level",self.handleUpdate);
    self.handleUpdate = undefined;

    InfluxDbStats.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.updateDevice = function (vDev) {
    var self = this;

    if (typeof(vDev) === 'undefined') {
        self.error('Invalid event');
        return;
    }

    if (_.intersection(vDev.get('tags'), self.config.tags).length > 0
        && _.intersection(vDev.get('tags'), self.config.excludeTags).length === 0) {
        setTimeout(function() {
            self.log('Update device '+vDev.id);
            var lines = [
                self.collectVirtualDevice(vDev)
            ];
            self.sendStats(lines);
        },1);
    }
};

InfluxDbStats.prototype.escapeValue = function (value) {
    var self = this;

    switch(typeof(value)) {
        case 'number':
            return value;
        case 'string':
            if (value === '') return 'none';
            return value.replace(/(,|\s+)/g, '\\$1');
    }
    return 'null';
};


InfluxDbStats.prototype.collectVirtualDevice = function (deviceObject) {
    var self    = this;

    var level           = deviceObject.get('metrics:level');
    var scale           = deviceObject.get('metrics:scaleTitle');
    var probe           = deviceObject.get('probeType') || deviceObject.get('probeTitle');
    var title           = deviceObject.get('metrics:title');
    var location        = parseInt(deviceObject.get('location'),10);
    var type            = deviceObject.get('deviceType');
    var room            = _.find(
        self.controller.locations,
        function(item){ return (item.id === location); }
    );

    if (type === 'sensorBinary' || type === 'switchBinary') {
        if (level === 'on') level = 1;
        else if (level === 'off') level = 0;
        else self.error('Cannot parse probe level');
    }

    if (typeof(room) === 'object') {
        room = room.title;
    }

    return 'device.' + self.escapeValue(deviceObject.id) +
        ',probe=' + self.escapeValue(probe) +
        ',room=' + self.escapeValue(room) +
        ',scale=' + self.escapeValue(scale) +
        ',title=' + self.escapeValue(title) +
        ',type=' + type +
        ' level=' + self.escapeValue(level);
};

InfluxDbStats.prototype.collectZwaveDevice = function (deviceIndex,device) {
    var self    = this;
    if (typeof(device) === 'undefined') {
        return;
    }

    var deviceData  = device.data;
    var batteryData = device.instances[0].commandClasses[self.commandClass.toString()];

    return 'zwave.' + self.escapeValue(deviceIndex) +
        ',title=' + self.getValue(deviceData.givenName,'no-title') + // Tags
        ',type=' + self.getValue(deviceData.basicType,'unknown') +
        ' failed=' + self.getValue(deviceData.countFailed) + // Values
        ',failure=' + self.getValue(deviceData.failureCount) +
        ',success=' + self.getValue(deviceData.countSuccess) +
        ',queue=' + self.getValue(deviceData.queueLength) +
        (typeof(batteryData) !== 'undefined' ? ',battery=' + self.escapeValue(batteryData.data.last.value) : '');
};

InfluxDbStats.prototype.getValue = function (object,fallback) {
    var self = this;
    if (typeof(object) !== 'undefined'
        && typeof(object.value) !== 'undefined') {
        return self.escapeValue(object.value);
    }
    if (typeof(fallback) === 'undefined') {
        return 0;
    } else {
        return self.escapeValue(fallback);
    }
};

InfluxDbStats.prototype.updateAll = function () {
    var self = this;

    self.log('Update all');
    var lines = [];

    self.controller.devices.each(function(vDev) {
        var tags = vDev.get('tags');
        if (_.intersection(tags, self.config.tags).length > 0
            && _.intersection(tags, self.config.excludeTags).length === 0) {
            lines.push(self.collectVirtualDevice(vDev));
        }
    });

    if (global.ZWave) {
        for (var zwayName in global.ZWave) {
            var zway = global.ZWave && global.ZWave[zwayName].zway;
            if (zway) {
                for(var deviceIndex in zway.devices) {
                    if (deviceIndex !== 1) {
                        self.log('Update '+zwayName+'.'+deviceIndex);
                        lines.push(self.collectZwaveDevice(deviceIndex,zway.devices[deviceIndex]));
                    }
                }
            }
        }
    }

    self.sendStats(lines);
};

InfluxDbStats.prototype.sendStats = function (lines) {
    var self = this;

    if (lines.length === 0) {
        self.error("Empty stats. Ignoring");
        return;
    }

    var request = {
        url:        self.url,
        method:     'POST',
        async:      true,
        data:       lines.join("\n"),
        error:      function(response) {
            self.error("Could not post stats: " + response.statusText + "\nPOST " + self.url + "\nBody: " + lines.join("\n") + "\nResponse: " + response.data);
            self.controller.addNotification(
                "error",
                self.langFile.error,
                "module",
                "InfluxDbStats"
            );
        }
    };
    /*
    if (typeof(self.config.username) !== 'undefined'
        && typeof(self.config.password) !== 'undefined') {
        request.auth = {
            login:      self.config.username,
            password:   self.config.password
        };
    }
    */

    http.request(request);
};
