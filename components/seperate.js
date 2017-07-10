
/**
 * Remove a from b
 * @param {object} a
 * @param {object} b
 */
function Seperate(a, b){
	var isA = a instanceof Object || a instanceof Array;
	var isB = b instanceof Object || b instanceof Array;

	if (!isA){
		return b;
	}else if (!isB){
		return a;
	}

	var c;
	if (Array.isArray(b)){
		c = [];
	}else{
		c = {};
	}

	for (let key in b){
		if (a[key] !== b[key]){
			if (typeof(a[key]) == "object" && typeof(b[key]) == "object"){
				c[key] = Seperate(a[key], b[key]);
			}else{
				c[key] = b[key];
			}
		}
	}

	return c;
}

module.exports = Seperate;