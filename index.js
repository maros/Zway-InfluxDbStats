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
    
    setTimeout(_.bind(self.updateAll,self),30 * 1000);
    //self.updateCalculation();
};

InfluxDbStats.prototype.stop = function () {
    var self = this;
    
    // Remove interval
    if (typeof(self.interval) !== 'undefined') {
        clearInterval(self.interval);
    }
    
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
        case 'string':
            return value.replace(/(,|\s+)/g, '\\$1');
    }
    return 'null';
};


InfluxDbStats.prototype.collectDevice = function (deviceId) {
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

InfluxDbStats.prototype.updateAll = function () {
    var self = this;
    
    console.log('[InfluxDB] Update all');
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
