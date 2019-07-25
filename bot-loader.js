const Slack = require('./pico-slack.js');

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const fs_stat = promisify(fs.stat);
const fs_readdir = promisify(fs.readdir);

process.on('unhandledRejection', (err)=>{
	Slack.utils.log(err, { footer : 'Unhandled rejection within promise', color : 'danger', logger : console.error });
});
process.on('uncaughtException', (err)=>Slack.error(err));

const findBotPaths = async (dir)=>{
	const stats = await fs_stat(dir);
	if(stats.isFile()) return dir.endsWith('.bot.js') ? dir : false;

	const files = await fs_readdir(dir);
	const bots = await Promise.all(files.map((filename)=>findBotPaths(path.resolve(dir, filename))));
	return bots.flat().filter((bots)=>!!bots);
};

const loadBots = async (dir = './bots')=>{
	const botPaths = await findBotPaths(dir);
	return botPaths.map((botPath)=>{
		const bot = {
			name : path.basename(botPath, '.bot.js'),
			path : botPath,
		};
		try {
			bot.result = require(botPath);
			if(typeof bot.result === 'object' && Object.keys(bot.result).length === 0){
				delete bot.result;
			}
		} catch (err){
			Slack.error(err);
			bot.error = err;
		}
		return bot;
	});
};

module.exports = loadBots;
