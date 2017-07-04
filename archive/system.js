/*----------------------------------------------------------------------------------------------------------------------------------------------------
	A blocking file system module
	This would of been important because it used to be when you read a file, that if only part of the file had been written that is all you would get.
	This is not the case anymore
-----------------------------------------------------------------------------------------------------------------------------------------------------*/




var pathLib = require('path');
var fs = require('fs');

//{path}: [callbacks]
var reads = {};

//{path}: {data, callbacks}
var writes = {};


var deleting = {};


/**
 * Get file (async)
 * @param {string} path
 * @param {function} callback
 * @return {void}
 */
function Read(path, callback){
  path = pathLib.resolve(path);

	if (deleting[path]){
		callback({
				errno: -4058,
				code: 'ENOENT',
				syscall: 'open',
				path: path
			},
			undefined
		);

		return;
	}

  //If a write is in progress stop readings and instead return the writing data
  if (writes[path]){
		if (reads[path]){
			for (let callbacks of reads[path]){
				callback(null, writes[path].d);
			}
			writes[path] = null;
		}

		callback(null, writes[path].d);

    return;
  }

  //If a read is already in progress, then wait until it is done and receive it's data instead
  if (reads[path]){
    reads[path].push(callback);
    return;
  }

  reads[path] = [callback];

  fs.readFile(path, function(err, data){
		//Remove the function early, incase the callback triggers a write/delete, and thus runs this function again to block the write action
		var callbacks = reads[path].splice(0, reads[path].length); //Make duplicate, not reference
		reads[path] = null;

		for (let i=0; i<callbacks.length; i++){
			callbacks[i](err, data);
		}
  });
}


/**
 * Write to file (async)
 * @param {string} path
 * @param {buffer} data
 * @param {function} callback
 * @return {void}
 */
function Write(path, data, callback){
  path = pathLib.resolve(path);

  //Stop any reads, and send then the data about to be written
  if (reads[path]){
    for (let callback of reads[path]){
      callback(data);
    }
    reads[path] = null;
  }

  writes[path] = {d: data};

  fs.writeFile(path, data, function(err){
		callback();
    writes[path] = null;
  });
}



/**
 * Delete file (async)
 * @param {string} path
 * @param {function} callback
 * @return {void}
 */
function Delete(path, callback){
  path = pathLib.resolve(path);
	deleting[path] = true;

  //Cancel any reads on the file and return a missing file report
  if (reads[path]){
    var error = {
      errno: -4058,
      code: 'ENOENT',
      syscall: 'open',
      path: path
    };
    for (let callback of reads[path]){
      callback(error, undefined);
    }
    reads[path] = undefined;
		deleting[path] = false;
  }

  //End any writes
  if (writes[path]){
		var callback = writes[path].c;
    writes[path] = null;
		callback(null);
  }

  return fs.unlinkSync(path);
}


module.exports = {
  read: Read,
  write: Write,
  delete: Delete,
  mkdir: fs.mkdirSync,
  stat: fs.stat,
	exists: fs.existsSync,
	_: {
		read: reads,
		write: writes,
		delete: deleting
	}
};
