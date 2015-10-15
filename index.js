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
    });
    
    this.timer = setInterval(_.bind(self.updateAll,self), (1*60*1000));
    setTimeout(_.bind(self.initCallback,self),30 * 1000);
    //self.updateCalculation();
};

InfluxDbStats.prototype.initCallback = function() {
    var self = this;
    
    _.each(self.config.devices,function(deviceId){
        // Build, register and call check callback
        var device  = self.controller.devices.get(deviceId);
        if (typeof(device) !== 'undefined') {
            var callback = _.bind(self.updateDevice,self,deviceId);
            self.callbacks[deviceId] = callback;
            device.on('change:metrics:level',callback);
        }
    });
};

InfluxDbStats.prototype.stop = function () {
    var self = this;
    
    // Remove callbacks
    _.each(self.callbacks,function(deviceId,callbackFunction){
        self.controller.devices.off(deviceId, 'change:metrics:level', callbackFunction);
    });
    self.callbacks = {};
    
    // Remove timer
    clearInterval(self.timer);
    
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
    
    switch(typeof(value)) {
        case 'number':
            return value;
            break;
        case 'string':
            return value.replace(/(,|\s)/g, '\$1');
            break;
    }
    return 'null';
};


InfluxDbStats.prototype.collectDevice = function (deviceId) {
    var self    = this;
    var device  = self.controller.devices.get(deviceId);
    
    var level       = device.get('metrics:level');
    var scale       = device.get('metrics:scaleTitle');
    var probe       = device.get('metrics:probeTitle');
    var title       = device.get('metrics:title');
    var location    = parseInt(device.get('location'));
    var type        = device.get('deviceType');
    var room        = _.find(
        self.controller.locations, 
        function(item){ return (item.id === location) }
    );
    if (typeof(room) === 'object') {
        room = room.title;
    }
    
    return 'device.' + self.escapeValue(deviceId) +
        ' probe=' + self.escapeValue(probe) +
        ',room=' + self.escapeValue(room) +
        ',scale=' + self.escapeValue(scale) +
        ',title=' + self.escapeValue(title) +
        ',type=' + type +
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
    var self = this;
    
    if (lines.length === 0) {
        return;
    }
    
    var url = self.config.server
        + ':8086/write'
        + '?u='
        + encodeURIComponent(self.config.username)
        + '&p='
        + encodeURIComponent(self.config.password)
        + '&db='
        + encodeURIComponent(self.config.database);
    
    
    var data = lines.join("\n");
    console.log('XXXXXXXX');
    console.log(url);
    console.logJS(data);
    console.log('XXXXXXXX');
    
    http.request({
        url:    url,
        async:  true,
        method: 'POST',
        data:   data,
        error:  function(response) {
            console.error('Could not post stats');
            console.logJS(response);
        }
    });
};
