/*** InfluxDbStats Z-Way HA module *******************************************

Version: 1.0.0
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: maros@k-1.com <maros@k-1.com>
Description:
    Sends sensor stats to InfluxDB
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
    
    this.controller.devices.on(this.config.sensor, 'change:metrics:level', function() {
    	self.checkTemp();
    });
};

InfluxDbStats.prototype.stop = function () {
    var self = this;

    this.controller.devices.off(this.config.sensor, 'change:metrics:level', function() {
    	self.checkTemp();
    });

    InfluxDbStats.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InfluxDbStats.prototype.sendStats = function () {
}
