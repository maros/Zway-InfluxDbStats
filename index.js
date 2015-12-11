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

inherits(InfluxDbStats, AutomationModule);

_module = InfluxDbStats;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.init = function (config) {
    InfluxDbStats.super_.prototype.init.call(this, config);
    var self = this;
    
    self.langFile   = self.controller.loadModuleLang("InfluxDbStats");
    
    self.url = self.config.server
        + ':8086/write'
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
        console.log('[InfluxDb]'+self.url+' - '+interval);
        self.interval = setInterval(_.bind(self.updateAll,self), interval);
    }
    
    self.handleUpdate = _.bind(self.updateDevice,self);
    self.controller.devices.on("change:metrics:level",self.handleUpdate);
    
    setTimeout(_.bind(self.initCallback,self),30 * 1000);
};

InfluxDbStats.prototype.stop = function () {
    var self = this;
    
    // Remove interval
    if (typeof(self.interval) !== 'undefined') {
        clearInterval(self.interval);
    }
    
    // Remove listener
    self.controller.devices.off("change:metrics:level",self.handleUpdate);
    self.handleUpdate = undefined;
    
    InfluxDbStats.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.updateDevice = function (vDev) {
    var self = this;
    
    if (_.intersection(vDev.get('tags'), self.config.tags).length > 0) {
        // TODO;Ensure that not called too often
        var lines = [
            self.collectDevice(vDev.id)
        ];
        self.sendStats(lines);
    }
};

InfluxDbStats.prototype.escapeValue = function (value) {
    var self = this;
    
    switch(typeof(value)) {
        case 'number':
            return value;
        case 'string':
            return value.replace(/(,|\s+)/g, '\\$1');
    }
    return 'null';
};


InfluxDbStats.prototype.collectVirtualDevice = function (deviceId) {
    var self    = this;
    var deviceObject  = self.controller.devices.get(deviceId);
    
    var level       = deviceObject.get('metrics:level');
    var scale       = deviceObject.get('metrics:scaleTitle');
    var probe       = deviceObject.get('metrics:probeTitle') || deviceObject.get('probeType');
    var title       = deviceObject.get('metrics:title');
    var location    = parseInt(deviceObject.get('location'),10);
    var type        = deviceObject.get('deviceType');
    var room        = _.find(
        self.controller.locations, 
        function(item){ return (item.id === location); }
    );
    if (typeof(room) === 'object') {
        room = room.title;
    }
    
    return 'device.' + self.escapeValue(deviceId) +
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
        ',title=' + self.escapeValue(deviceData.givenName.value) +
        ',type=' + self.escapeValue(deviceData.basicType.value) +
        ' failed=' + self.escapeValue(deviceData.countFailed.value) +
        ',failure=' + self.escapeValue(deviceData.failureCount.value) +
        ',success=' + self.escapeValue(deviceData.countSuccess.value) +
        ',queue=' + self.escapeValue(deviceData.queueLength.value) +
        (typeof(batteryData) !== 'undefined' ? ',battery=' + self.escapeValue(batteryData.data.last.value) : '');
};

InfluxDbStats.prototype.updateAll = function () {
    var self = this;
    
    console.log('[InfluxDB] Update all');
    var lines = [];
    
    self.controller.devices.each(function(vDev) {
        var tags = vDev.get('tags');
        if (_.intersection(tags, self.config.tags).length > 0) {
            lines.push(self.collectVirtualDevice(deviceId));
        }
    });
    
    if (global.ZWave) {
        for (var zwayName in global.ZWave) {
            var zway = global.ZWave && global.ZWave[zwayName].zway;
            if (zway) {
                for(var deviceIndex in zway.devices) {
                    if (deviceIndex !== 1) {
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
        return;
    }
    var data = lines.join("\n");
    
    http.request({
        url:    self.url,
        async:  true,
        method: 'POST',
        data:   data,
        error:  function(response) {
            console.error('[InfluxDb] Could not post stats');
            console.logJS(response);
            
            self.controller.addNotification(
                "error", 
                self.langFile.error,
                "module", 
                "InfluxDbStats"
            );
        }
    });
};
