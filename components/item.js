var system = require('./system.js');
var template = null;
var drive = null;
var index = null;


module.exports = {
	parse: function(drive, index, template){
		template = template;
		drive = drive;
		index = index;
	}
}
