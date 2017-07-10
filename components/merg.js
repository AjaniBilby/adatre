/**
 * Merg b to a (b will overwrite a)
 * @param {object} a
 * @param {object} b
 * @return {object} c
 */
function Merg(a, b){
  var isA = a instanceof Object || a instanceof Array;
	var isB = b instanceof Object || b instanceof Array;

	if (!isA || !isB){
		if (isA){
			return a;
		}else if (isB){
			return b;
		}else{
			return null;
		}
	}

	var c;
	if (Array.isArray(a)){
		c = [];
	}else{
		c = {};
	}

  for (let key in b){
    if (!a[key]){
      c[key] = b[key];
    }else{
      if (typeof(b[key]) === "object" && typeof(a[key]) === "object"){
        c[key] = Merg(a[key], b[key]);
      }else{
        c[key] = b[key];
      }
    }
  }

	return c;
}

module.exports = Merg;