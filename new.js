require('./install.js');

var template = require('./components/template.js');
var drive = require('./components/drive.js');
var index = require('./components/indexer.js');
var item = require('./components/drive.js');
item.parse(drive);
