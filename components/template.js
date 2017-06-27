var system = require('./system.js');




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
function Exists(type){
  return fs.existsSync('./data/template/'+type+'.json');
}

module.exports = {
  get: Get,
  apply: Apply,
  exists: Exists
};
