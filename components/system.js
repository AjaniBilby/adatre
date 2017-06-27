var path = require('path');

function Read(path, callback){
  path = path.resolve(path);
}
function Write(path, callback){
  path = path.resolve(path);
}
function Delete(path, callback){
  path = path.resolve(path);
}


module.exports = {
  read: Read,
  write: Write,
  delete: Delete
};
