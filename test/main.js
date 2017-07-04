var adatre = require('./../adatre.js');

adatre.index.add('person', 'greg', 'C://', function(data){
	adatre.index.update('person', 'greg', 'C://', 42, 1024, function(data){
		adatre.index.get('person', 'greg', function(data){
			console.log('end', data);

			adatre.index.update('person', 'greg', 'E://', 42, 1014, function(){

				adatre.index.pick('person', 'greg', function(drive){
					console.log('pick', drive);

					adatre.index.remove('person', 'greg', drive, function(success){
						console.log(adatre.index.exists('person', 'greg'));
					});
				});
			});
		});
	});
});