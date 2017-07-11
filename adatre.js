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
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
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

	template.unapply(type, data, function(err, NoTemplate){
		if (err){
			callback(err);
			return;
		}

		data = cosf.encode(NoTemplate);
		size = data.length;

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
				console.log(drive.list[indexData[i].drive].capacity, drive.list[indexData[i].drive].used);
				console.log(size, indexData[i].size);
				if (drive.list[indexData[i].drive].capacity <= drive.list[indexData[i].drive].used+size-indexData[i].size){
					Migrate(type, id, indexData[i].drive, function(err, newDrive){
						if (err){
							completed += 1;
							if (!returned && completed >= count){
								callback(err);
							}
						}

						indexData[i].drive = newDrive;

						Rewrite(indexData[i]);
					});

					return;
				}

				Rewrite(indexData[i]);
			}
		});
	});
};

/**
 * Get drive data
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 */
function Get(type, id, callback = function(data, err){}){
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
	index.pick(type, id, function(pointer){
		system.read(drive.list[pointer.drive].location+'/'+type+'/'+id, function(err, data){
			if (err){
				callback(err, data);
				return;
			}

			data = cosf.decode(data.toString());

			template.apply(type, data, function(err, merged){
				callback(err, data);
			});
		});
	});
};




/**
 * Clone a database item to another drive
 * @param {string} type
 * @param {string} id
 * @param {void} callback
 */
function Clone(type, id, callback = function(err, newDrive){}){
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
	Get(type, id, function(itemErr, itemData){
		if (itemErr){
			callback(itemErr, null);
			return;
		}

		data = cosf.encode(itemData);

		index.get(type, id, function(indexData, indexErr){
			if (indexErr){
				callback(indexErr, null);
				return;
			}

			var exclude = [];

			for (let item of indexData){
				exclude.push(item.drive);
			}

			var selected = drive.pick(exclude, 1, indexData[0].size)[0];

			if (!selected){
				callback(errorCode[201], null);
				return;
			}

			if (!system.exists(selected.location+'/'+type)){
				system.mkdir(selected.location+'/'+type);
			}

			system.write(selected.location+'/'+type+'/'+id, data, function(err){
				if (err){
					callback(errorCode[301], null);
					return;
				}

				drive.allocate(selected.id, data.length);
				index.add(type, id, selected.id, function(err){
					if (err){
					callback(errorCode[301], null);
						return;
					}else{
						callback(null, selected.id);
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
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
	Get(type, id, function(err, currentData){
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
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
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
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
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
function Migrate(type, id, drive, callback = function(err, newDrive){}){
	if (!index.exists(type, id)){
		callback('Invalid item');
		return;
	}
	
	Clone(type, id, function(err, newDrive){
		if (err){
			callback(err, null);
			return;
		}

		Remove(type, id, drive, function(err){
			if (err){
				callback(err, null);
				return;
			}

			callback(err, newDrive);
		});
	})
}






module.exports = {
	template: template,
	drive: drive,
	index: index,

	exists: index.exists,
	list: index.list,

	new: New,
	get: Get,
	clone: Clone,
	save: Save,
	set: Set,
	migrate: Migrate,
	remove: Remove,
	delete: Delete
};