var radix = require('custom-radix.js');
var system = require('system.js');

//drive: {capacity, used, path, id[base64]}
var drives = {};
var updated = false;

function Pick(exclusion, number, size){
  var options = [];
  for (let key of drives){
    if (exclusion.indexOf(key) == -1 && drives[key].used + size < drives[key].capacity){
      var free = drives[key].capacity - drives[key].used;
      options.push([key, free]);
    }
  }

  options = options.sort(function(a, b){
    return a-b;
  });
  options = options.splice(0, number);

  for (let i=0; i<options.length; i++){
    options[i] = drives[options[i][0]];
  }

  return options;
}

function Allocate(drive, size){
  drives[drive].capacity = Math.max(drives[drive].capacity+size, 0);
  updated = true;

  return drives[drive].capacity;
}

function Load(callback){
  system.read('./data/drive.json', function(err, data){
    if (data){
      data = data;
    }
    callback(data);
  });
}
function Save(callback){
  system.write('./data/drive.json', JSON.stringify(drives), function(){
    callback();
  });
}

drives = JSON.parse(fs.readFileSync('./data/drive.json') || '{}');
Save();


setInterval(function () {
  if (updated){
    updated = false;
    Save();
  }
}, 1000);

module.exports = {
  pick: Pick,
  allocate: Allocate,
  load: Load,
  save: save
};
