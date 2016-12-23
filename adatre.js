var fs = require('fs');
var ob = require('object-manipulation');
var crypto = require('crypto');

var defualtUser = {
  username: "username",
  password: {
    salt: "salt",
    hash: "hash"
  }
};

require("./install.js");

function GetExtention(path){
  path = path.split('.');
  return path[path.length-1];
}





class Database{
  constructor(){
    this.drives = {};
    this.templateFolder = './database/templates';
    this.index = {};
    this.cache = {
      activeWriting: {},
      activeReading: {},
      open: {}
    };
    this.cleanLayout = true;

    //Read config
    if (fs.existsSync('./database/config.json')){
      this.config = this.readFileSync('./database/config.json');
      if (this.config.drives){
        this.drives = this.config.drives;
      }
      if (this.config.cleanLayout){
        this.cleanLayout = this.config.cleanLayout;
      }
    }else{
      this.config = null;
    }

    //Get template list
    for (let folder of fs.readdirSync("./database/templates/")){
      //If JSON
      if (folder.length-folder.indexOf('.json') == 5){
        this.index[folder.substr(0, folder.indexOf('.json'))] = {};
      }
    }

    //Add main / backup drive
    this.drives.MAIN = {
      location: './database/storage',
      size: -1
    };

    this.indexDrives();
  }
}
//Root functions
Database.prototype.indexDrives = function(){
  //Refresh drive ussage
  for (let key in this.drives){
    this.getDriveSize(key);
    this.drives[key].id = key;
  }
};
Database.prototype.getDriveSize = function(id){
  if (!this.drives[id] || typeof(this.drives[id]) != "object"){
    return null;
  }

  var size = 0;

  //Create reference
  var db = this;

  for (let folder of fs.readdirSync(this.drives[id].location)){
    if (folder.indexOf('.') == -1){
      //Make sure that index is setup for this type
      if (!ob.isObject(db.index[folder])){
        db.index[folder] = {};
      }

      for (let file of fs.readdirSync(this.drives[id].location+'/'+folder)){

        if (file.indexOf('.json') != file.length-5){
          //If the filename does not end in JSON do not inclue it
          continue;
        }

        var stats = fs.statSync(this.drives[id].location+'/'+folder+'/'+file).size;
        if (typeof(stats) == "number"){
          size += stats;
        }

        var name = file.split('.');
        name.splice(name.length-1, 1);
        name = name.join('.');

        //Add database item to index
        this.index[folder][name] = {size: stats, drive: id, location: this.drives[id].location+'/'+folder+'/'+file};
      }
    }
  }

  this.drives[id].used = size;

  return size;
};
Database.prototype.pickDrive = function(size){
  var selection = [];

  for (let key in this.drives){
    selection.push(new Object(this.drives[key]));
    selection[selection.length-1].id = key;
  }

  selection = selection.sort(function(a, b){
    var freeSpaceA = a.size - (a.used || 0);
    var freeSpaceB = b.size - (b.used || 0);

    //If the file will not fit in drive, and aposing drive is not restricted
    //opt for non-restricted drive
    if (freeSpaceB - size < 0 && freeSpaceB > 0 && a.size == -1){
      return -1;
    }
    if (freeSpaceA - size < 0 && freeSpaceA > 0 && b.size == -1){
      return 1;
    }

    //Opt for drive with larger free space
    if (freeSpaceA > freeSpaceB){
      return -1;
    }else if (freeSpaceA < freeSpaceB){
      return 1;
    }else{
      return 0;
    }

  });

  if (selection[0].id == "MAIN" && selection.length > 1){
    console.error("Database: Ran out of drive space, using main as back up");
  }

  return this.drives[selection[0].id];
};
Database.prototype.writeFile = function(location, data, callback){
  if (GetExtention(location) == "json"){
    try {
      if (this.cleanLayout){
        data = JSON.stringify(data, null, "\t");
      }else{
        data = JSON.stringify(data);
      }
    } catch (e) {
      console.error("Database: Invalid JSON ("+location+")\n", e);
    }
  }
  fs.writeFile(location, data, callback);
};
Database.prototype.writeFileSync = function(location, data){
  if (GetExtention(location) == "json"){
    try {
      if (this.cleanLayout){
        data = JSON.stringify(data, null, "\t");
      }else{
        data = JSON.stringify(data);
      }
    } catch (e) {
      console.error("Database: Invalid JSON ("+location+")\n", e);
    }
  }
  return fs.writeFileSync(location, data);
};
Database.prototype.readFile = function(location, callback){

  fs.readFile(location, function(err, data){
    data = data.toString();
    if (!err && GetExtention(location) == "json"){
      if (typeof(data)){
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("Database: Invalid JSON ("+location+")\n", e);
        }finally{

        }
      }
    }

    callback(err, data);
    return;
  });
};
Database.prototype.readFileSync = function(location){
  var isJSON = GetExtention(location) == "json";

  var data = fs.readFileSync(location).toString();
  if (isJSON){
    if (typeof(data) == "string"){
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Database: Invalid JSON ("+location+")\n", e);
      }
    }
  }

  return data;
};

//asynchronous functions
Database.prototype.new = function(type, id, callback){
  var db = this;

  //If type is not indexed index it
  if (typeof(db.index[type]) != "object"){
    db.index[type] = {};
    db.index[type][id] = [];
  }
  if (typeof(db.index[type][id]) != "object"){
    db.index[type][id] = [];
  }

  if (db.exists(type, id)){
    console.error("Database: "+type+"("+id+") already exists, cannot create new");
    if (typeof(callback) == "function"){
      callback(false, 'already exists');
    }
    return false;
  }


  //Pick drive
  var drive = this.pickDrive();
  db.index[type][id] = {location: drive.location+'/'+type+'/'+id+'.json', size: 2, drive: drive.id};


  //Does the drive have the type setup
  //If not set it up
  if (fs.readdirSync(drive.location).indexOf(type) == -1){
    fs.mkdirSync(drive.location+"/"+type);
  }


  db.writeFile(db.index[type][id].location, '{}', function(err){
    if (err){
      if (typeof(callback) == "function"){
        callback(false, err);
      }
      return;
    }

    if (typeof(callback) == "function"){
      callback(true);
      return;
    }
  });
};
Database.prototype.exists = function(type, id, callback){
  if (typeof(this.index[type]) != "object" || typeof(this.index[type][id]) != "object" || typeof(this.index[type][id].location) != "string"){
    if (typeof(callback) == "function"){
      callback(false);
    }
    return false;
  }else{
    if (typeof(callback) == "function"){
      callback(true);
    }
    return true;
  }
};
Database.prototype.get = function(type, id, callback){
  //If callback is not valid then cancel function
  if (typeof(callback) != "function"){
    return;
  }

  //If item is not in index then cancel
  if (typeof(this.index[type]) != "object" || typeof(this.index[type][id]) != "object" || typeof(this.index[type][id].location) != "string"){
    callback(null);
    return;
  }

  //Create reference
  var db = this;

  //Create cache
  if (typeof(this.cache.activeReading[type]) != "object"){
    this.cache.activeReading[type] = {};
    this.cache.activeReading[type][id] = [];
  }else if (typeof(this.cache.activeReading[type][id] != "object")){
    this.cache.activeReading[type][id] = [];
  }
  this.cache.activeReading[type][id].push(callback);

  //If the file is not currently being ready then read it,
  //else wait for the file to finish reading from a previouse call
  if (this.cache.activeReading[type][id].length == 1){
    var template; //db.templateFolder+'/'+type+'.json'
    var fileData; //drive+'/'+type+'/'+id+'.json'
    var partFailure = false;

    var AttemptFinish = function(status){
      if (partFailure || (typeof(template) == "object" && typeof(fileData) == "object")){
        //Make whole data from template and fileData
        var output;
        if (typeof(fileData) != "object"){
          output = null;
        }else{
          output = ob.merge(template || {}, fileData || {});
        }

        for (let callback of db.cache.activeReading[type][id]){
          if (typeof(callback) == "function"){
            callback(output);
          }
        }
        db.cache.activeReading[type][id] = [];
      }


      //Update if part failed
      if (status === null){
        partFailure = true;
      }
    };

    fs.exists(db.templateFolder+'/'+type+'.json', function(exists){
      if (exists){
        db.readFile(db.templateFolder+'/'+type+'.json', function(err, data){
          if (err){
            AttemptFinish(null);
            return;
          }else{
            try{
              template = data;
            }catch(e){
              AttemptFinish(null);
              return;
            }finally{
              AttemptFinish(0);
              return;
            }
          }
        });
      }else{
        AttemptFinish(null);
        return;
      }
    });

    fs.exists(db.index[type][id].location, function(exists){
      if (exists){
        db.readFile(db.index[type][id].location, function(err, data){
          if (err){
            AttemptFinish(null);
            return;
          }else{
            try{
              fileData = data;
            }catch(e){
              AttemptFinish(null);
              return;
            }finally{
              AttemptFinish(1);
              return;
            }
          }
        });
      }else{
        AttemptFinish(null);
        return;
      }
    });
  }
};
Database.prototype.getTemplate = function(type, callback){
  if (typeof(callback) != 'function'){
    return;
  }

  //Reference database
  var db = this;

  fs.exists(db.templateFolder+'/'+type+'.json', function(exists){
    if (exists){
      db.readFile(db.templateFolder+'/'+type+'.json', function(err, data){
        if (err){
          callback(null);
          return;
        }else{
          var output;
          try{
            output = data;
          }catch(e){
            callback(null);
            return;
          }finally{
            callback(output);
            return;
          }
        }
      });
    }else{
      callback(null);
      return;
    }
  });
};
Database.prototype.save = function(type, id, data, callback){
  var db = this;
  var callbacks = [];

  //If item is not in index then cancel
  if (typeof(this.index[type]) != "object"|| typeof(this.index[type][id]) != "object" || typeof(this.index[type][id].location) != "string"){
    console.error("Database cannot create new items though save\nItems must be created with \"db.new\" first");
    callback(false, null);
    return;
  }

  //If file has became too big migrate file then retry
  if ( (this.drives[this.index[type][id].drive].used+(data-this.index[type][id].size)) > this.drives[this.index[type][id].drive].size) {
    var newDrive = db.pickDrive();
    if (newDrive.id != this.index[type][id].drive.id){
      //Migrate file then save new data
      db.migrate(type, id, newDrive, function(){
        db.save(type, id, data, callback);
      });

      return;
    }
  }

  function end(success, data){
    //If there are still queued items save data
    if (db.cache.activeWriting.length > 0){
      //Generate mergeed task to save all awaiting saves for this item
      var output = {};
      for (let item of db.cache.activeWriting[type][id]){
        if (typeof(item) != "object"){
          continue;
        }

        output = ob.passNew(output, item.data);
        if (typeof(item.callback) == "function"){
          callbacks.push(item.callback);
        }
      }
      db.cache.activeWriting[type][id] = [];

      db.save(type, id, output);
    }

    for (let callback of callbacks){
      if (typeof(callback) == "function"){
        callback(success, data);
      }
    }
  }

  //Create cache
  if (typeof(this.cache.activeWriting[type]) != "object"){
    this.cache.activeWriting[type] = {};
    this.cache.activeWriting[type][id] = [];
  }else if (typeof(this.cache.activeWriting[type][id] != "object")){
    this.cache.activeWriting[type][id] = [];
  }

  //Add current task to process list
  var index = ob.firstUndefined(this.cache.activeWriting[type][id]);
  this.cache.activeWriting[type][id][index] = {data: data, callback: callback};

  //If already active then queue task
  if (this.cache.activeWriting[type][id].length > 1){
    return;
  }

  db.getTemplate(type, function(template){

    //If item does not exist then generate base data
    if (!template || typeof(template) != "object"){
      template = {};
    }

    //Make sure that index is setup for this type
    if (!ob.isObject(db.index[type])){
      db.index[type] = {};
    }

    db.get(type, id, function(data){
      //If item does not exist then generate base data
      if (!data || typeof(data) != "object"){
        data = {};
      }



      //Generate mergeed task to save all awaiting saves for this item
      var output = {};
      for (let item of db.cache.activeWriting[type][id]){
        if (typeof(item) != "object"){
          continue;
        }

        output = ob.passNew(output, item.data);
        if (typeof(item.callback) == "function"){
          callbacks.push(item.callback);
        }
      }
      db.cache.activeWriting[type][id] = [];

      //Remove template data
      output = ob.passNew(template, output);


      db.writeFile(db.index[type][id].location, output, function(err){
        if (err){
          if (typeof(callback) == "function"){
            end(false, null);
          }
          return;
        }

        if (typeof(callback) == "function"){
          end(true, output);
          return;
        }
      });
    });
  });
};
Database.prototype.set = function(type, id, newData, callback){
  var db = this;

  if (typeof(db.cache.activeWriting[type]) != "object"){
    db.cache.activeWriting[type] = {};
    db.cache.activeWriting[type][id] = [];
  }
  if (typeof(db.cache.activeWriting[type][id]) != "object"){
    db.cache.activeWriting[type][id] = [];
  }

  function HasData(data){
    db.save(type, id, ob.merge(data, newData), function(success, data){
      if (typeof(callback) == "function"){
        callback(success, data);
      }
    });
  }

  //If there is new data being saved
  if (db.cache.activeWriting[type][id].length > 0){
    //Pass last saving item
    HasData(db.cache.activeWriting[type][id][db.cache.activeWriting[type][id].length-1]);
    return;
  }

  db.get(type, id, function(data){
    //If there is new data being saved
    if (db.cache.activeWriting[type][id].length > 0){
      //If the data would be overwritten then cancel
      if (db.cache.activeWriting[type][id].length > 1){
        if (typeof(callback) == "function"){
          callback(true);
        }
        return;
      }else{
        HasData(db.cache.activeWriting[type][id][0]);
      }
    }

    //If there is no current data,
    //return fail due to that set will not create new data items
    if (data === null){
      if (typeof(callback) == "function"){
        callback(null);
      }
      return;
    }

    HasData(data);
  });
};
Database.prototype.open = function(type, id, callback){
  var db = this;

  //Create cache
  if (typeof(db.cache.open[type]) != "object"){
    db.cache.open[type] = {};
    db.cache.open[type][id] = [];
  }else if (typeof(this.cache.open[type][id] != "object")){
    db.cache.open[type][id] = [];
  }
  db.cache.open[type][id].push(callback);

  var data = null;

  var loop = function(){
    if (typeof(db.cache.open[type][id][0]) == "function"){
      db.cache.open[type][id][0](data);
    }
    db.cache.open[type][id].splice(0, 1); //Remove the callback that just ended

    if (db.cache.open[type][id].length > 0){
      loop();
    }else{
      //If there are no more awaitng tasks save data
      db.save(type, id, data);
    }
  };


  if (db.cache.open[type][id].length == 1){
    db.get(type, id, function(response){
      data = response;
      loop();
    });
  }else{
    //This means that the item is already being opened and this task should wait
  }
};
Database.prototype.migrate = function(type, id, to, callback){
  var db = this;

  if (!db.exists(type, id)){
    console.error("Database: Cannot migrate non-existing data ("+type+"-"+id+")");
    if (typeof(callback) == "function"){
      callback(false);
    }
    return;
  }

  var from = db.drives[db.index[type][id].drive];
  if (typeof(to) == "string"){
    to = db.drives[to];
  }

  if (from.id == to.id){
    if (typeof(callback) == "function"){
      callback(true);
    }
    return;
  }

  //Get data
  db.get(type, id, function(data){
    //Re-index
    db.index[type][id].location = to.location+'/'+type+'/'+id+'.json';
    db.index[type][id].drive = to.id;

    from.used -= db.index[type][id].size;
    to.used += db.index[type][id].size;

    //Does the drive have the type setup
    //If not set it up
    if (fs.readdirSync(to.location).indexOf(type) == -1){
      fs.mkdirSync(to.location+"/"+type);
    }

    //Save in new location
    db.save(type, id, data, function(success){
      if (success){
        fs.unlink(oldLoc); //Delete old file
        callback(true);
      }else{
        //Reset back
        db.index[type][id].location = from.location+'/'+type+'/'+id+'.json';
        db.index[type][id].drive = from.id;
        if (typeof(callback) == "function"){
          callback(false);
        }
      }
    });
  });
};

//synchronous functions
Database.prototype.newSync = function(type, id){
  //If type is not indexed index it
  if (typeof(this.index[type]) != "object"){
    this.index[type] = {};
    this.index[type][id] = [];
  }
  if (typeof(this.index[type][id]) != "object"){
    this.index[type][id] = [];
  }

  //Check to see if item already exists
  if (this.exists(type, id)){
    console.error("Database: "+type+"("+id+") already exists, cannot create new");
    return false;
  }

  //Pick drive
  var drive = this.pickDrive();
  this.index[type][id] = {location: drive.location+'/'+type+'/'+id+'.json', size: 2, drive: drive.id};


  //Does the drive have the type setup
  //If not set it up
  if (fs.readdirSync(drive.location).indexOf(type) == -1){
    fs.mkdirSync(drive.location+"/"+type);
  }


  db.writeFileSync(this.index[type][id].location, '{}');
  return true;
};
Database.prototype.getSync = function(type, id){
  if (!this.exists(type, id)){
    return null;
  }

  //If type is not indexed index it
  if (typeof(this.cache.activeReading[type]) != "object"){
    this.cache.activeReading[type] = {};
    this.cache.activeReading[type][id] = [];
  }
  if (typeof(this.index[type][id]) != "object"){
    this.cache.activeReading[type][id] = [];
  }

  var data = this.readFileSync(this.index[type][id].location) || {};
  var template = this.getTemplateSync(type);

  var output = ob.merge(template, data);

  //Run any waiting tasks on this read
  for (let callback of this.cache.activeReading[type][id]){
    if (typeof(callback) == "function"){
      callback(output);
    }
  }
  this.cache.activeReading[type][id] = [];

  return output;
};
Database.prototype.getTemplateSync = function(type){

  //Reference database
  var db = this;

  if (fs.existsSync(db.templateFolder+'/'+type+'.json')){
    return db.readFileSync(db.templateFolder+'/'+type+'.json');
  }else{
    return null;
  }
};
Database.prototype.saveSync = function(type, id, data){
  //If item is not in index then cancel
  if (typeof(this.index[type]) != "object"|| typeof(this.index[type][id]) != "object" || typeof(this.index[type][id].location) != "string"){
    console.error("Database cannot create new items though save\nItems must be created with \"db.new\" first");
    return false;
  }

  //If type is not indexed index it
  if (typeof(this.cache.activeWriting[type]) != "object"){
    this.cache.activeWriting[type] = {};
    this.cache.activeWriting[type][id] = [];
  }
  if (typeof(this.index[type][id]) != "object"){
    this.cache.activeWriting[type][id] = [];
  }

  var template = this.getTemplateSync(type) || {};

  //Generate mergeed task to save all awaiting saves for this item
  var output = {};
  var callbacks = [];
  this.cache.activeWriting[type][id].push({data: data});
  for (let item of this.cache.activeWriting[type][id]){
    if (typeof(item) != "object"){
      continue;
    }

    output = ob.passNew(output, item.data);
    if (typeof(item.callback) == "function"){
      callbacks.push(item.callback);
    }
  }
  this.cache.activeWriting[type][id] = [];

  //Remove template data
  output = ob.passNew(template, output);

  //Write file
  this.writeFileSync(this.index[type][id].location, output);

  //Run any waiting callbacks
  for (let callback of callbacks){
    callback();
  }

  return true;
};
Database.prototype.setSync = function(type, id, data){
  return this.saveSync(type, id, ob.merge(this.getSync(type, id), data));
};
Database.prototype.migrateSync = function(type, id, to){
  if (!this.exists(type, id)){
    console.error("Database: Cannot migrate non-existing data ("+type+"-"+id+")");
    return false;
  }

  var from = this.drives[this.index[type][id].drive];
  if (typeof(to) == "string"){
    to = this.drives[to];
  }

  if (from.id == to.id){
    return true;
  }

  //Get data
  var oldLoc = this.index[type][id].location;
  var data = this.getSync(type, id);

  //Re-index
  this.index[type][id].location = to.location+'/'+type+'/'+id+'.json';
  this.index[type][id].drive = to.id;

  from.used -= this.index[type][id].size;
  to.used += this.index[type][id].size;

  //Does the drive have the type setup
  //If not set it up
  if (fs.readdirSync(to.location).indexOf(type) == -1){
    fs.mkdirSync(to.location+"/"+type);
  }

  var success = this.saveSync(type, id, data);
  if (success){
    fs.unlink(oldLoc); //Delete old file
    return true;
  }else{
    return false;
  }
};

//Profiles
Database.prototype.profile = {
  loginSync: function(username, password){

    //Check to see if username and password are valid and exist
    if (!username || !password){
      return false;
    }
    if (!this.exist("profile", username)) {
      return false;
    }

    var userData = this.getSync('profile', username);

    if (typeof(userData.password) == "object"){
      if (typeof(userData.password.salt) != "string" || typeof(userData.password.hash) != "string"){
        return false;
      }
    }else{
      return false;
    }

    var hash = crypto.pbkdf2Sync(password, userData.password.salt, 10000, 512, 'sha512');

    //Check if both Encrypted passwords are the same
    if (userData.password.hash.toString() === hash.toString()) {
      return true;
    }else{
      return false;
    }
  },
  newSync: function(username, password){
    if (this.exists('profile', username)){
      return null;
    }

    var salt = crypto.randomBytes(128).toString('base64');
    var hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');

    this.newSync('profile', username);
    this.setSync('profile', username, {username: username, password: {salt: salt, hash: hash.toString()}});

    return true;
  },
  login: function(username, password, callback){

    //if there is no callback then there is no point to this function
    if (typeof(callback) != "function"){
      return;
    }

    //Check to see if username and password are valid and exist
    if (!username || !password){
      callback(false);
      return;
    }
    if (!this.exist("profile", username)) {
      callback(false);
      return;
    }


    var userData = this.get('profile', username, function(data){
      //Check that data is valid
      if (typeof(data) == "object"){
        if (typeof(userData.password) == "object"){
          if (typeof(userData.password.salt) != "string" || typeof(userData.password.hash) != "string"){
            callback(false);
            return;
          }
        }else{
          callback(false);
          return;
        }
      }else{
        callback(false);
        return;
      }

      crypto.pbkdf(password, userData.password.salt, 10000, 512, 'sha512', function(err, hash){
        //Check if both Encrypted passwords are the same
        if (userData.password.hash.toString() === hash.toString()) {
          callback(true);
          return;
        }else{
          callback(false);
          return;
        }
      });
    });
  },
  new: function(username, password, callback){
    var db = this;

    if (this.exists('profile', username)){
      if (typeof(callback) == "function"){callback(null);}
      return;
    }

    var salt = crypto.randomBytes(128).toString('base64');
    crypto.pbkdf2(password, salt, 10000, 512, 'sha512', function(err, hash){
      if (err){
        if (typeof(callback) == "function"){callback(null, err);}
      }

      db.new('profile', username, function(success, err){
        if (!success){
          if (typeof(callback) == "function"){callback(null);}
          return;
        }

        db.set('profile', username, {username: username, password: {salt: salt, hash: hash.toString()}}, function(success, data){
          if (typeof(callback) == "function"){callback(success, data);}
        });
      });
    });
  }
};




/*--------------------------------------------------------------
    Live Data Reference
--------------------------------------------------------------*/

Database.prototype.createDataRef = function(type, id){
  if (this.exists(type, id)){
    return new DataReference(this, type, id);
  }else{
    console.error('Database: Cannot create reference of non-existent database item');
    return null;
  }
};

class DataReference{
  constructor(owner, type, id){
    this.database = owner;
    this.autosave = true;
    this.absolute = true;
    this.cache = this.database.getSync(type, id);

    this.type = type;
    this.id = id;
  }

  get data(){
    if (this.absolute){
      this.cache = this.database.getSync(type, id);
    }
    return this.cache;
  }

  set data(data){
    this.cache = ob.merge(this.cache, data);

    console.log('save', this.autosave);

    if (this.autosave){
      this.save();
    }
  }
}
DataReference.prototype.save = function(){
  this.database.saveSync(this.type, this.id, this.cache);
};




module.exports = new Database();
