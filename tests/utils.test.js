const _ = require('lodash');
const test = require('ava');

const utils = require('../server/utils.js');


const loc = {
	t1 : { lat : 43.987031, lon: -80.438622 },
	t2 : { lat : 43.987039, lon: -80.435339 },
	t3 : { lat : 43.984599, lon : -80.435007}
};

//Distamce
test('dist: should be close', (t)=>{
	t.true(utils.dist(loc.t1, loc.t2) <= 40);
});

test('dist: should be far', (t)=>{
	t.true(utils.dist(loc.t1, loc.t3) >= 40);
});


//getTargets
test.skip('targets: Returns a subset of users', (t)=>{

});
test.skip('targets: Returns all users', (t)=>{

});
