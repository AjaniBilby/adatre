var system = require('./system.js');




/**
 * Merg b to a (b will overwrite a)
 * @param {object} a
 * @param {object} b
 * @return {object} c
 */
function Merg(a, b){
  isA = typeof(a) == "object";
  isB = typeof(b) == "object";

  if (!isA && !isB){
    return null;
  }else{
    if (!isA && isB){
      return isB;
    }else if(isA && !isB){
      return isA;
    }
  }

  for (let key of b){
    if (!a[key]){
      a[key] = b[key];
    }else{
      if (typeof(b[key]) === "object" && typeof(a[key]) === "object"){
        a[key] = Merg(a[key], b[key]);
      }else{
        a[key] = b[key];
      }
    }
  }
}




/**
 * Get template data
 * @param {string} type
 * @param {function} callback
 * @return {void}
 */
function Get(type, callback){
  if (!Exists(type)){
    callback(null);
    return;
  }

  system.readFile('./data/template/'+type+'.json', function(err, data){
    if (data){
      data = data.toString();
      data = JSON.parse(data);
      callback(data);
    }else{
      callback(null);
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
  Get(type, function(template){
    if (data){
      data = Merg(template, data);
      callback(data);
    }else{
      callback(data);
    }
  });
}

/**
 * Test if a template exists
 * @param {string} type
 */
function Exists(type){
  return fs.existsSync('./data/template/'+type+'.json');
}

module.exports = {
  get: Get,
  apply: Apply,
  exists: Exists
};
