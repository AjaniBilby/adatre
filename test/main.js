var adatre = require('./../adatre.js');
var cosf = require('cosf');

// adatre.new('person', 'greg', function(success){});
// adatre.save('person', 'greg', {
// 	alive: true,
// 	happyness: 2.2,
// 	id: '4134'
// }, function(err){
// 	console.log('Edited', err);
// });

// adatre.migrate('person', 'greg', 'demo', function(err){
// 	console.log('migrated', err);
// });

adatre.delete('person', 'greg', function(err){
	console.log('return', err);
});