const { getTrace } = require('../pico-slack.js').utils;

const path = require('path');




const nestedFunc = ()=>{
	a + b;
};




const run = ()=>{
	console.log(getTrace(1));

	try {
		nestedFunc();
	} catch (err){
		console.log(getTrace(err));
	}
};


run();


// const callsiteParse = (stackLine)=>{
// 	let name, loc = stackLine.replace('at ', '').trim();
// 	const res = /(.*?) \((.*?)\)/.exec(loc);
// 	if(res){
// 		name = res[1];
// 		loc = res[2];
// 	}
// 	const [_, fullpath, line, col] = /(.*?):(\d*):(\d*)/.exec(loc);
// 	return {
// 		file : path.relative(process.cwd(), fullpath),
// 		name,
// 		line,
// 	};
// };


// callsiteParse(' at getTrace (C:\\Dropbox\\root\\Programming\\Javascript\\pico-slack\\pico-slack.js:99:3)  ');
// callsiteParse('at internal/main/run_main_module.js:17:11  ');