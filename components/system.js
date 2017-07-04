/*------------------------------\
|   You fool, fs is blocking    |
|   Check ./archive/system.js   |
\------------------------------*/

var fs = require('fs');

module.exports = {
	read: fs.readFile,
	write: fs.writeFile,
	delete: fs.unlink,
	mkdir: fs.mkdirSync,
	stat: fs.stat,
	exists: fs.existsSync
};