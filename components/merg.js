function Merg(obj1, obj2){
	if (typeof(obj1) != "object"){
		return obj2;
	}
	if (typeof(obj2) != "object"){
		return obj1;
	}

	for (let key in obj2){
		if (typeof obj1[key] == "object" && typeof(obj2[key]) === "object"){
			obj1[key] = Merg(obj1[key], obj2[key]);
		}

		obj1[key] = obj2[key];
	}

	return obj1;
}

module.exports = Merg;