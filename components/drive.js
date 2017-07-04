var system = require('./system.js');
var fs = require('fs');

//drive: {capacity, used, path, id[base64]}
var drives = {};
var updated = false;



/**
 * Get drives of which meet the requirements
 * @param {array} exclusion
 * @param {number} number
 * @param {number} size
 * @return {array} list of all drive ids
 */
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

/**
 * Allocate drive space
 * @param {string} drive id
 * @param {number} size in bytes
 * @return {void}
 */
function Allocate(drive, size){
  drives[drive].used += size;

	updated = true;
}

/**
 * UnAllocate drive space
 * @param {string} drive id
 * @param {number} size in bytes
 * @return {void}
 */
function Unallocate(drive, size){
	drives[drive].used -= size;
	if (drives[drive].used < 0){
		drives[drive].used = 0;
	}

	updated = true;
}





/**
 * Load drive config
 * @param {function} callback
 */
function Load(callback){
  system.read('./data/drive.json', function(err, data){
    if (data){
      data = data;
    }
    callback(data);
  });
}

/**
 * Save drive config
 * @param {function} callback
 */
function Save(callback){
  system.write('./data/drive.json', JSON.stringify(drives), function(){
    callback();
  });
}





function Loop(){
	drives = JSON.parse(fs.readFileSync('./data/drive.json') || '{}');

	setTimeout(function(){
		if (updated){
			Save();
		}
	}, 1000);
}
Loop();






module.exports = {
  pick: Pick,
  allocate: Allocate,
  load: Load,
  save: Save
};