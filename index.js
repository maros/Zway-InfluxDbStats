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
        var callback = _.bind(self.updateDevice,self,deviceId);
        self.callbacks[deviceId] = deviceObject.on('change:metrics:level',callback);
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
    //escape comma and space
    //id,room=serverA,tag=value level=XXX
}


InfluxDbStats.prototype.sendStats = function () {
    // http request
};
