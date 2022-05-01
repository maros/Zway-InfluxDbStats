/*** InfluxDb2Stats Z-Way HA module *******************************************

Version: 1.07
(c) Maroš Kollár, 2015-2017
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Collects sensor stats in an InfluxDB

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InfluxDb2Stats (id, controller) {
    // Call superconstructor first (AutomationModule)
    InfluxDb2Stats.super_.call(this, id, controller);

    this.interval       = undefined;
    this.url            = undefined;
    this.token          = '';
    this.langfile       = undefined;
    this.commandClass   = 0x80;
}

inherits(InfluxDb2Stats, BaseModule);

_module = InfluxDb2Stats;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfluxDb2Stats.prototype.init = function (config) {
    InfluxDb2Stats.super_.prototype.init.call(this, config);
    var self = this;

    self.url = self.config.server + ':' + self.config.port + 
        '/api/v2/write' + 
        '?org=' + encodeURIComponent(self.config.organisation) +
        '&bucket=' + encodeURIComponent(self.config.bucket) +
        '&precision=ns';

    self.token = self.config.token;

    if (typeof(self.config.interval) !== 'undefined') {
        var interval = parseInt(self.config.interval,10) * 60 * 1000;
        self.interval = setInterval(_.bind(self.updateAll,self), interval);
    }

    self.handleUpdate = _.bind(self.updateDevice,self);
    // get only real changes
    self.controller.devices.on("modify:metrics:level",self.handleUpdate);
};

InfluxDb2Stats.prototype.stop = function () {
    var self = this;

    // Remove interval
    if (typeof(self.interval) !== 'undefined') {
        clearInterval(self.interval);
    }

    // Remove listener
    self.controller.devices.off("modify:metrics:level",self.handleUpdate);
    self.handleUpdate = undefined;

    InfluxDb2Stats.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InfluxDb2Stats.prototype.updateDevice = function (vDev) {
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

InfluxDb2Stats.prototype.escapeValue = function (value) {
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


InfluxDb2Stats.prototype.collectVirtualDevice = function (deviceObject) {
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
    } else if (typeof(level) === 'string') {
        level = parseFloat(level);
    }

    if (typeof(level) === 'undefined' || isNaN(level)) {
        return;
    }

    if (typeof(room) === 'object') {
        room = room.title;
    }
    room = room.replace(/(\s|[^A-Za-z0-9])/g, "_");
    room = room.replace(/_+/g,"_");

    return 'device.' + self.escapeValue(deviceObject.id) +
        ',probe=' + self.escapeValue(probe) +
        ',room=' + self.escapeValue(room) +
        ',scale=' + self.escapeValue(scale) +
        ',title=' + self.escapeValue(title) +
        ',type=' + type +
        ' level=' + self.escapeValue(level);
};

InfluxDb2Stats.prototype.collectZwaveDevice = function (deviceIndex,device) {
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

InfluxDb2Stats.prototype.getValue = function (object,fallback) {
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

InfluxDb2Stats.prototype.updateAll = function () {
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

InfluxDb2Stats.prototype.sendStats = function (lines) {
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
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Token ' +  self.config.token,
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Type':'application/json',
        },
        error:      function(response) {
            self.error("Could not post stats: " + response.statusText + "\nPOST " + self.url + "\nBody: " + lines.join("\n") + "\nResponse: " + response.data);
            console.logJS(response.data);
            self.controller.addNotification(
                "error",
                self.langFile.error,
                "module",
                "InfluxDb2Stats"
            );
        }
    };

    http.request(request);
};
