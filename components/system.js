/*------------------------------------------------\
|                                                 |
| 	A library for intersecting file system calls  |
|                                                 |
\------------------------------------------------*/


var path = require('path');
var fs = require('fs');

var write = {};
var read = {};

function Read(file, callback = function(err, data){}){
	file = path.resolve(file);

	if (write[file]){
		//There is a write currently in process, so just use their buffered data for the read
		callback(write[file].d);
		return;
	}

	if (read[file]){
		//There is already a read in progress, so add your self to that instead of starting another
		read[file].push(callback);
		return;
	}else{
		read[file] = [callback];
	}

	fs.readFile(file, function(err, data){
		if (read[file]){
			while (read[file] && read[file].length > 0){
				//Splice of each read as they are ran, so that if that callback triggers a write it cannot activate it's self again
				read[file].splice(0, 1)[0](err, data);
			}
			read[file] = null;
		}
	});
}

function Write(file, data, callback = function(err){}){
	file = path.resolve(file);

	prev = null;

	if (read[file]){
		// Activtate any waiting reads with your data since you are about to write it anyway
		while (read[file] && read[file].length > 0){
			//Splice of each read as they are ran, so that if that callback triggers a write it cannot activate it's self again
			read[file].splice(0, 1)[0](null, data);
		}
		read[file] = null;
	}

	if (write[file]){
		// Store the callback you are about to over write
		// Because if prev runs another call, that may be over written by you
		prev = write[file].c;
	}

	write[file] = {
		c: callback,
		d: data
	};

	fs.writeFile(file, data, function(err){
		if (write[file]){
			callback = write[file].c;
			write[file] = null;
			callback();
		}else{
			write[file] = null;
		}
	});

	if (typeof(prev) === "function"){
		//Activate the callback you inturupted
		prev(null);
	}
}

function Delete(file, callback = function(err){}){
	file = path.resolve(file);
	var prev;

	if (read[file]){
		// Activtate any waiting reads with your data since you are about to remove it anyway

		var err = {
			Error: 'ENOENT: no such file or director, open \''+file+'\'',
			errno: -4058,
			code: 'ENOENT',
			syscall: "open",
			path: file
		};

		while (read[file] && read[file].length > 0){
			//Splice of each read as they are ran, so that if that callback triggers a write it cannot activate it's self again
			read[file].splice(0, 1)[0](err, null);
		}
		read[file] = null;
	}

	if (write[file]){
		prev = write[file].c;
		write[file] = null;
	}

	fs.unlink(file, callback);

	if (typeof(prev) === "function"){
		prev(null);
	}
};

module.exports = {
	read: Read,
	write: Write,
	delete: Delete,
	mkdir: fs.mkdirSync,
	stat: fs.stat,
	exists: fs.existsSync,
	readDir: fs.readdirSync
};