require('./install.js');

var template = require('./components/template.js');
var drive = require('./components/drive.js');
var index = require('./components/indexer.js');
var item = require('./components/item.js');

item.parse(drive, index, template);


module.exports = {
	index: index,
	template: template,
	drive: drive,
	item: item
};