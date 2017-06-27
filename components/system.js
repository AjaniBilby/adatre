var path = require('path');
var fs = require('fs');

//{path}: [callbacks]
var reads = {};

//{path}: {data, callbacks}
var writes = {};

function Read(path, callback){
  path = path.resolve(path);

  //If a write is in progress stop readings and instead return the writing data
  if (writes[path]){
    for (let callbacks of reads[path]){
      callback(null, writes[path].d);
    }
    writes[path] = null;

    return;
  }

  //If a read is already in progress, then wait until it is done and receive it's data instead
  if (reads[path]){
    reads[path].push(callback);
    return;
  }

  reads[path] = [callback];

  fs.readFile(path, function(){
    for (let callback of reads[path]){
      callback.apply({}, arguments);
    }
    reads[path] = null;
  });
}
function Write(path, data, callback){
  path = path.resolve(path);

  //Stop any reads, and send then the data about to be written
  if (reads[path]){
    for (let callback of reads[path]){
      callback(data);
    }
    reads[path] = null;
  }

  //If a write is in progress, then cancel it to overwrite it
  if (writes[path]){
    writes.c(null);
  }

  writes[path] = {d: data, c: callback};

  fs.writeFile(path, data, function(err){
    writes[path].c(err);
    writes[path] = null;
  });
}
function Delete(path, callback){
  path = path.resolve(path);

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
  }

  //End any writes
  if (writes[path]){
    writes[path].c(null);
    writes[path] = null;
  }

  return fs.unlinkSync(path);
}


module.exports = {
  read: Read,
  write: Write,
  delete: Delete,
  mkdir: fs.mkdir,
  stat: fs.stat
};
