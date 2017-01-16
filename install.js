/*--------------------------------------------------------------
    Create all required folders
--------------------------------------------------------------*/

var fs = require("fs");


//Does database folder exist?
if (fs.readdirSync("./").indexOf("database") == -1){
  fs.mkdirSync("database");
}
//Dose template folder exist?
if (fs.readdirSync("./database/").indexOf("templates") == -1){
  fs.mkdirSync("database/templates");
}
//Dose storage folder exist?
if (fs.readdirSync("./database/").indexOf("storage") == -1){
  fs.mkdirSync("database/storage");
}

if (!fs.existsSync('./database/config.json')){
  fs.writeFileSync('./database/config.json', '{\n    "drives": {}\n}\n');
}


/*--------------------------------------------------------------
    Setup Profiler
--------------------------------------------------------------*/

var defualtUser = {
  username: "username",
  password: {
    salt: "salt",
    hash: "hash"
  }
};


//Setup profile defualts
if (typeof(fs.readdirSync("./database/")) == "object"){
    var folderData = fs.readdirSync("./database/templates/");
    if (typeof(folderData) == "object"){
      //Dose profile template exist?
      if (folderData.indexOf("profile.json") == -1){
        fs.writeFileSync("./database/templates/profile.json", JSON.stringify(defualtUser, null, 2));
      }
    }else{
      console.log("***Error***: Database/templates are non-existent");
    }
}else{
  console.log("***Error***: Database is non-existent");
}
