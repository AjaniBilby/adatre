var adatre = require('./../adatre.js');
var cosf = require('cosf');

// adatre.new('person', 'greg', function(success){});
// adatre.clone('person', 'greg');
adatre.save('person', 'greg', {
	alive: true,
	happyness: 2.2,
	id: '4134'
}, function(err){
	console.log('Completed save', err);

	// adatre.update('person', 'greg', {
	// 	happyness: 1
	// }, function(err){
	// 	console.log('COMPLETED:', err);
	// });
});