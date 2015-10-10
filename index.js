/*** InfluxDbStats Z-Way HA module *******************************************

Version: 1.0.0
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: maros@k-1.com <maros@k-1.com>
Description:
    Collects sensor stats in an InfluxDB

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InfluxDbStats (id, controller) {
    // Call superconstructor first (AutomationModule)
    InfluxDbStats.super_.call(this, id, controller);
}

inherits(InfluxDbStats, AutomationModule);

_module = InfluxDbStats;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.init = function (config) {
    InfluxDbStats.super_.prototype.init.call(this, config);
    
    var self = this;
    self.callbacks = {};
    
    _.each(self.config.devices,function(deviceId){
        // Build, register and call check callback
        var device  = self.controller.devices.get(deviceId);
        var callback = _.bind(self.updateDevice,self,deviceId);
        self.callbacks[deviceId] = device.on('change:metrics:level',callback);
    });
    
    this.timer = setInterval(_.bind(self.updateAll,self), 60*60*1000);
    //self.updateCalculation();
};

InfluxDbStats.prototype.stop = function () {
    var self = this;

    _.each(self.callbacks,function(deviceId,callbackFunction){
        // Build, register and call check callback
        var device  = self.controller.devices.get(deviceId);
        device.off('change:metrics:level',callbackFunction);
    });
    self.callbacks = {};
    
    clearTimeout(self.timer);

    InfluxDbStats.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.updateDevice = function (deviceId) {
    var self = this;
    // TODO;Ensure that not called too often
    var lines = [
        self.collectDevice(deviceId)
    ];
    self.sendStats(lines);
};

InfluxDbStats.prototype.escapeValue = function (value) {
    var self = this;
    if (typeof(value) === 'undefined') {
        return 'none';
    }
    return value.replace(/[, ]/, '\\$1');
};


InfluxDbStats.prototype.collectDevice = function (deviceId) {
    var self = this;
    var device  = self.controller.devices.get(deviceId);
    
    var level = device.get('metrics:level');
    var scale = device.get('metrics:scaleTitle');
    var room = device.get('metrics:room');
    
    return self.escapeValue(deviceId) +
        ',room=' + self.escapeValue(room) +
        ',scale=' + self.escapeValue(scale) +
        ' level=' + self.escapeValue(level);
};

InfluxDbStats.prototype.updateAll = function () {
    var self = this;
    
    var lines = [];
    _.each(self.config.devices,function(deviceId){
        lines.push(self.collectDevice(deviceId));
    });
    
    self.sendStats(lines);
};


InfluxDbStats.prototype.sendStats = function (lines) {
    console.logJS(sendStats);
};
