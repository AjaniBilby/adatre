/*--------------------------------------------------------------------------------------------------------
	Indexes will be encoded as a CSV file, in the order;
	DriveId,Revision[base64],size[base64]
	A master element will be in the first row to keep a constand value of the state of the correct data
--------------------------------------------------------------------------------------------------------*/

var customRadix = require('custom-radix');
var system = require('./system.js');

var radix = new customRadix();


/*--------------------------------------------
	Core functions
--------------------------------------------*/

/**
 * Does the item have an index
 * @param {string} type
 * @param {string} id
 * @returns {boolean} Exists?
 */
function Exists(type, id){
	return system.exists(`./data/index/${type}/${id}.csv`);
}

/**
 * Get index data
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 * @return {void}
 */
function Get(type, id, callback){
	var path = `./data/index/${type}/${id}.csv`;

	system.read(path, function(err, data){
		if (data != null){
			data = data.toString().split('\r\n');
			for (let i=0; i<data.length; i++){
				data[i] = data[i].split(',');
				data[i] = {drive: data[i][0], revision: radix.convert(data[i][1]), size: radix.convert(data[i][2])};
			}
		}

		callback(data, err);
	});
}

/**
 * Save index data as CSV
 * @param {string} type
 * @param {string} id
 * @param {array} data
 * @param {function} callback
 * @return {void}
 */
function Save(type, id, data, callback){
	var string = '';
	var revision;
	var size;

	for (let i=0; i<data.length; i++){
		if (i != 0){
			string += '\r\n';
		}

		revision = radix.convert(data[i].revision);
		size = radix.convert(data[i].size);

		string += `${data[i].drive},${revision},${size}`;
	}

	if (!system.exists('./data/index/'+type)){
		system.mkdir('./data/index/'+type);
	}

	system.write(`./data/index/${type}/${id}.csv`, string, callback);
}

/**
 * Delete the index file
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 */
function Delete(type, id, callback){
	system.delete(`./data/index/${type}/${id}.csv`, callback);
}





/**
 * Create a new index
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 * @return {void}
 */
function New(type, id, callback){
	if (Exists(type, id)){
		if (callback){
			callback(false);
		}
		return;
	}

	if (!system.exists(`./data/index/${type}`)){
		system.mkdir(`./data/index/${type}`);
	}

	Save(type, id, [{drive: 'MASTER', revision: 0, size: 0}], callback);
}

/**
 * Add a drive to the index (Can create item from scratch)
 * @param {string} type
 * @param {string} id
 * @param {string} driveId
 * @param {function} callback
 * @return {void}
 */
function Add(type, id, driveId, callback){

	function hasData(data, err){
		if (err !== null){
			console.error(new Error(`Corrupt Index ${type} ${id}\n\n${data}\n${err}`));
			process.exit();
			return;
		}

		if (typeof(driveId) != 'object'){
			driveId = [driveId];
		}

		var revision = data[0].revision;
		var size = data[0].size;

		for (let i=0; i<driveId.length; i++){
			var exists = false;
			for (let j=0; j<data.length; j++){
				if (driveId[i] === data[j].drive){
					data[j].revision = revision;
					data[j].size = size;
					exists = true;
				}
			}

			if (!exists){
				data.push({drive: driveId[i], revision: revision, size: size});
			}
		}

		Save(type, id, data, callback);
	}

	if (!Exists(type, id)){
		New(type, id, function(){
			hasData([{'drive': 'MASTER', 'revision': 0, 'size': 0}], null);
		});
	}else{
		Get(type, id, hasData);
	}
}

/**
 * Remove drive from index
 * @param {string} type
 * @param {string} id
 * @param {string} drive
 * @param {function} callback
 * @return {void}
 */
function Remove(type, id, drive, callback){
	if (drive === "MASTER"){
		callback(false);
		return;
	}

	if (!Exists(type, id)){
		callback(true);
		return;
	}

	Get(type, id, function(data){
		for (let i=1; i<data.length; i++){
			if (data[i].drive === drive){
				data.splice(i, 1);
				break;
			}
		}

		//new bests
		var bRevision = 0;
		var bSize = 0;

		for (let item of data){
			if (item.revision > bRevision){
				bRevision = item.revision;
				bSize = item.size;
			}
		}

		data[0].revision = bRevision;
		data[0].size = bSize;

		//If there are no more drives, then destroy the index file
		if (data.length <= 1){
			Delete(type, id, function(err){
				callback(!err);
			});
			return;
		}

		Save(type, id, data, function(err){
			callback(!err);
		});
	})
}

/**
 * Update a drive's item metadata
 * @param {string} type
 * @param {string} id
 * @param {string} drive
 * @param {number} revision
 * @param {number} size
 * @param {function} callback
 */
function Update(type, id, drive, revision, size, callback = function(){}){
	if (!Exists(type, id)){
		callback(false);
		return;
	}

	Get(type, id, function(data, err){
		if (err){
			callback(err);
			return;
		}

		//Best values
		var bRevision = 0;
		var bSize = 0;

		var updated = false;

		for (let i=1; i<data.length; i++){

			//Target drive
			if (data[i].drive === drive){
				//Only change the necacary data
				if (revision){
					data[i].revision = revision;
				}
				if (size){
					data[i].size = size;
				}
				updated = true;
			}

			//Updated the highest stats
			if (data[i].revision > bRevision){
				bRevision = data[i].revision;
				bSize = data[i].size;
			}
		}

		//If there wasn't a pointer to update, then create it
		if (!updated){
			data.push({drive: drive, revision: revision, size: size});

			//Updated the highest stats
			if (revision > bRevision){
				bRevision = revision;
				bSize = size;
			}
		}

		//Update bests
		data[0].revision = bRevision;
		data[0].size = bSize;

		Save(type, id, data, function(err){
			callback(err);
		});
	})
};

/**
 * Pick a drive with the latest revision
 * @param {string} type
 * @param {string} id
 * @param {function} callback
 */
function Pick(type, id, callback){
	Get(type, id, function(data){
		if (data === null){
			callback(null);
			return;
		}

		var options = null;
		var revision = -1;
		for (let i=1; i<data.length; i++){
			if (data[i].revision > revision){
				revision = data[i].revision;
				options = [ data[i] ];
			}else if (data[i].revision === revision){
				options.push(data[i]);
			}
		}

		if (options === null){
			callback(null);
			return null;
		}

		callback(options[Math.floor(options.length*Math.random())]);
	});
}

/**
 * Get array of all items of the type
 * @param {string} type
 */
function List(type){
	if (!system.exists('./data/index/'+type)){
		return [];
	}

	var folder = system.readDir('./data/index/'+type);
	for (let i=0; i<folder.length; i++){
		folder[i] = folder[i].slice(0, -4);
	}

	return folder;
}



module.exports = {
	new: New,
	get: Get,
	add: Add,
	pick: Pick,
	list: List,
	remove: Remove,
	update: Update,
	exists: Exists,
	delete: Delete
};