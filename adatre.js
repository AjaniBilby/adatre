require('./install.js');

var cosf = require('cosf');
var fs = require('fs');

var errorCode = JSON.parse(fs.readFileSync(__dirname + '/errorCodes.json'));
var template = require('./components/template.js');
var system = require('./components/system.js');
var index = require('./components/indexer.js');
var drive = require('./components/drive.js');
var Merg = require('./components/merg.js');




/**
 * Create a new item
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 * @return {void}
 */
function New(type, id, callback = function(err){}){
	if (index.exists(type, id)){
		callback(errorCode[300]);
		return;
	}

	var data = cosf.encode({});
	var selected = drive.pick([], 1, data.length);

	if (!selected[0]){
		callback(errorCode[200]);
		return;
	}

	selected = selected[0];

	if (!system.exists(selected.location+type)){
		system.mkdir(selected.location+type);
	}

	system.write(selected.location+type+'/'+id, data, function(err){
		if (err){
			callback(errorCode[301]);
			return;
		}

		drive.allocate(selected.id, data.length);
		index.add(type, id, selected.id, function(err){
			if (err){
			callback(errorCode[301]);
				return;
			}else{
				callback(null);
			}
		});
	});
}

/**
 * Save data to database, overwriting any existing data for that item
 * @param {string} type
 * @param {string} id
 * @param {string} data
 * @param {function} callback
 * @return {void}
 */
function Save(type, id, data, callback = function(err){}){
	var completed = 0;
	var returned = false;

	var revision = 0;
	var size = data.length;
	var count = 0;

	function Rewrite(pointer){
		pointer.location = drive.list[pointer.drive].location;

		system.write(pointer.location+'/'+type+'/'+id, data, function(err){
			if (err){
				completed += 1;

				if (!returned && completed >= count){
					returned = true;
					callback(err);
				}
				return;
			}

			drive.allocate(pointer.drive, data.length-pointer.size);

			index.update(type, id, pointer.drive, revision, data.length, function(err){
				completed += 1;

				console.log(pointer.drive, err);

				if (err){
					if (!returned && completed >= count){
						returned = true;
						callback(err);
					}
					return;
				}

				if (!returned){
					returned = true;
					callback();
				}
			});
		});
	}

	index.get(type, id, function(indexData, indexErr){
		if (indexErr){
			callback(indexErr);
			return;
		}

		revision = indexData[0].revision+1;
		returned = false;
		completed = 1;
		count = indexData.length;

		for (let i=1; i<indexData.length; i++){ //Skip master

			//Has the file became too large and needs to be migrated?
			if (drive.list[indexData[i].drive].capacity <= drive.list[indexData[i].drive].used+size-indexData[i].size){
				Migrate(type, id, indexData[i].drive, function(err){
					if (err){
						completed += 1;
						if (!returned && completed >= count){
							callback();
						}
					}

					Rewrite(indexData[i]);
				});

				return;
			}

			Rewrite(indexData[i]);
		}
	});

	//Do this task after load has been called, so that this possibly large task can be completed during load
	data = cosf.encode(data);
};

/**
 * Get drive data
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 */
function Get(type, id, callback = function(data, err){}){
	index.pick(type, id, function(pointer){
		system.read(drive.list[pointer.drive].location+'/'+type+'/'+id, function(err, data){
			if (err){
				callback(data, err);
				return;
			}

			data = cosf.decode(data.toString());
			callback(data, err);
		});
	});
};




/**
 * Clone a database item to another drive
 * @param {string} type
 * @param {string} id
 * @param {void} callback
 */
function Clone(type, id, callback = function(err){}){
	Get(type, id, function(itemData, itemErr){
		if (itemErr){
			callback(itemErr);
			return;
		}

		data = cosf.encode(itemData);

		index.get(type, id, function(indexData, indexErr){
			if (indexErr){
				callback(indexErr);
				return;
			}

			var exclude = [];

			for (let item of indexData){
				exclude.push(item.drive);
			}

			var selected = drive.pick(exclude, 1, indexData[0].size)[0];

			if (!selected){
				callback(errorCode[201]);
				return;
			}

			if (!system.exists(selected.location+'/'+type)){
				system.mkdir(selected.location+'/'+type);
			}

			system.write(selected.location+'/'+type+'/'+id, data, function(err){
				if (err){
					callback(errorCode[301]);
					return;
				}

				drive.allocate(selected.id, data.length);
				index.add(type, id, selected.id, function(err){
					if (err){
					callback(errorCode[301]);
						return;
					}else{
						callback(null);
					}
				});
			});
		});
	});
};

/**
 * Apply the new object data over the existing item data
 * @param {string} type
 * @param {string} id
 * @param {object} data
 * @param {function} callback
 * @return {void}
 */
function Set(type, id, data, callback = function(err){}){
	Get(type, id, function(currentData, err){
		if (err){
			callback(err);
			return;
		}

		data = Merg(currentData, data);

		Save(type, id, data, callback);
	});
}

/**
 * Remove a single instance of the item specified
 * @param {string} type
 * @param {string} id
 * @param {string} drive
 * @param {callback} callback
 * @return {void}
 */
function Remove(type, id, driveID, callback = function(err){}){
	if (!drive.list[driveID]){
		callback(errorCode[203]);
		return;
	}

	index.remove(type, id, driveID, function(err, pointerRemoved){
		if (err){
			callback(err);
			return;
		}

		system.delete(`${drive.list[driveID].location}/${type}/${id}`, function(err){
			if (err){
				callback(err);
				return;
			}

			drive.unallocate(driveID, pointerRemoved.size);
		});
	})
}

/**
 * Delete every instance of a given item
 * @param {string} type
 * @param {string} id
 * @param {funciton} callback
 * @return {void}
 */
function Delete(type, id, callback = function(err){}){
	var indexData;
	var working = 0;

	function Loop(i){
		system.delete(`${drive.list[indexData[i].drive].location}/${type}/${id}`, function (err){
			drive.unallocate(indexData[i].drive, indexData[i].size);

			working -= 1;

			if (working <= 0){
				callback();
			}
		});
	}

	index.get(type, id, function(data, err){
		if (err){
			callback(err);
			return;
		}

		indexData = data;

		index.delete(type, id, function(err){
			if (err){
				callback(err);
				return;
			}

			for (let i=1; i<indexData.length; i++){
				working += 1;
				Loop(i);
			}
		})
	});

	callback(true);
}

/**
 * Move an item from one drive to another
 * @param {string} type
 * @param {string} id
 * @param {string} drive
 * @param {function} callback
 * @return {void}
 */
function Migrate(type, id, drive, callback = function(err){}){
	Clone(type, id, function(err){
		if (err){
			callback(err);
			return;
		}

		Remove(type, id, drive, callback);
	})
}






module.exports = {
	template: template,
	drive: drive,

	exists: index.exists,
	list: index.list,

	new: New,
	get: Get,
	clone: Clone,
	save: Save,
	set: Set,
	update: Set,
	migrate: Migrate,
	delete: Delete
};