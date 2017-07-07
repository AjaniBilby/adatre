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
function Pick(exclusion = [], number = 1, size = 0){
  var options = [];
  for (let key in drives){
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
function Load(){
	drives = JSON.parse(fs.readFileSync('./data/drive.json') || '{}');

	for (let key in drives){
		if (!drives[key].id){
			drives[key].id = key;
		}
		if (!drives[key].used){
			drives[key].used = 0;
		}
		if (!drives[key].capacity){
			drives[key].capacity = 0;
		}
	}
}

/**
 * Save drive config
 * @param {function} callback
 */
function Save(callback = function(){}){
  system.write('./data/drive.json', JSON.stringify(drives, null, "\t"), function(){
    callback();
  });
}





function Loop(){
	setTimeout(function(){
		if (updated){
			Save();
		}
	}, 1000);
}
Loop();
Load();






module.exports = {
	list: drives,
  pick: Pick,
  allocate: Allocate,
	unallocate: Unallocate,
  load: Load,
  save: Save
};