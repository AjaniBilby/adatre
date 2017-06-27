/*--------------------------------------------------------------
    Create all required folders
--------------------------------------------------------------*/

var fs = require("fs");

if (!fs.existsSync('./data/')){
  fs.mkdirSync('./data/');
}
if (!fs.existsSync('./data/template/')){
  fs.mkdirSync('./data/template/');
}
if (!fs.existsSync('./data/index/')){
  fs.mkdirSync('./data/index/');
}
if (!fs.existsSync('./data/config.json')){
  fs.writeFileSync('./data/config.json', '{\n    "drives": {}\n}\n');
}

console.log(fs.existsSync('./data/'));
