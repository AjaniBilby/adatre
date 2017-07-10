var system = require('./system.js');
var Merg = require('./merg.js');
var Seperate = require('./seperate.js');




/**
 * Get template data
 * @param {string} type
 * @param {function} callback
 * @return {void}
 */
function Get(type, callback){
  if (!Exists(type)){
    callback('Non Existent template', null);;
    return;
  }

  system.read('./data/template/'+type+'.json', function(err, data){
    if (data){
      data = data.toString();
      data = JSON.parse(data);
      callback(null, data);
    }else{
      callback(err, data);
    }
  });
}

/**
 * Apply the template to an object
 * @param {String} type
 * @param {object} data
 * @param {function} callback
 */
function Apply(type, data, callback){
  Get(type, function(err, template){
    data = Merg(template, data);
    callback(null, data);
  });
}

/**
 * Remove the default values of a template from the object
 * @param {String} type
 * @param {object} data
 * @param {function} callback
 */
function Unapply(type, data, callback){
  Get(type, function(err, template){
    data = Seperate(template, data);

		console.log(template);
		console.log(data);

    callback(null, data);
  });
}

/**
 * Test if a template exists
 * @param {string} type
 */
function Exists(type){
  return system.exists('./data/template/'+type+'.json');
}

module.exports = {
  get: Get,
  apply: Apply,
	unapply: Unapply,
  exists: Exists
};
