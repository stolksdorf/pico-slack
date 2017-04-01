const _ = require('lodash');
const test = require('ava');

const config = require('nconf')
	.argv()
	.env({ lowerCase: true })
	.file('environment', { file: `config/${process.env.NODE_ENV}.json` })
	.file('defaults', { file: 'config/default.json' });


const Geobot = require('../server/geobot.js');

const loc = {
	test1 : { lat : 43.987031, lon: -80.438622 },
	test2 : { lat : 43.987039, lon: -80.435339 },
	test3 : { lat : 43.984599, lon : -80.435007}
};


test.skip('test', (t)=>{

});

test((t)=>{t.pass()});


/*
test.skip('Message should be formatted nice', (t)=>{
	return Geobot.send.geomessage('scott', {
		text: 'I hope you enjoy this sweet trail',
		author: 'lp',
		ts: 1488726592201,
		geo: { lat: 43.987039, lon: -80.435339, ts: 1488726592197 }
	}).catch((err)=>{console.log(err);})
})

test.skip('Message should trigger', (t)=>{

	Geobot.storeGeo('test1', loc.test1.lat, loc.test1.lon)
		.then(()=>{
			return Geobot.storeMessage('test1', ['test2', 'test3'], 'holla');
		})
		.then((geo)=>{
			return Geobot.storeGeo('test2', loc.test2.lat, loc.test2.lon);
		})
		.then((geo)=>{
			return Geobot.storeMessage('test2', ['test1', 'test3'], 'MORE');
		})
		.then(()=>{
			//Storage.getMsgs('test2').then((msgs)=>console.log('test2',msgs));
			//Storage.getMsgs('test3').then((msgs)=>console.log('test3',msgs));

			Storage.getGeos(['test1', 'test2', 'test3'])
				.then((res)=>{
					console.log(res);
				})



			console.log('----------------------');
			t.pass();
		})
})

test.skip('Should get all geos', (t)=>{
	return Geobot.storeGeo('test1', loc.test1.lat, loc.test1.lon)
		.then(()=>Geobot.storeGeo('test2', loc.test2.lat, loc.test2.lon))
		.then(()=>Storage.getGeos(['test1', 'test2', 'test3']))
		.then((res)=>{
			console.log(res);
		})
})

*/