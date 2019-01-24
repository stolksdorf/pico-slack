const request = require('superagent');
const _ = require('lodash');
const WebSocket = require('ws');
const Events = require('events');

let pingCount = 0;

const processTeamData = (teamData)=>{
	Slack.bot.id = teamData.self.id;
	_.each(teamData.channels, (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.groups,   (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.users,    (user)   =>{
		Slack.users[user.id] = user.name;
		if(user.profile && user.profile.bot_id) Slack.bots[user.profile.bot_id] = user.id;
	});
	_.each(teamData.ims,(im)=>{ Slack.dms[im.id] = Slack.users[im.user]});
};

const processIncomingEvent = (msg)=>{
	const res = _.assign({}, msg);
	res.text = res.text || "";
	res.channel_id = msg.channel;
	res.user_id = msg.user;
	if(msg.bot_id) res.user_id = Slack.bots[msg.bot_id];

	//For reactions
	if(msg.item && msg.item.channel) res.channel_id = msg.item.channel;

	if(res.channel_id) res.channel = Slack.channels[res.channel_id];
	if(res.user_id) res.user = Slack.users[res.user_id];
	if(msg.username) res.user = msg.username;
	if(res.channel_id && res.channel_id[0] == 'D'){
		res.isDirect = true;
		res.channel = res.channel_id;
	}
	res.isTalkingToBot = res.isDirect || Slack.msgHas(res.text, [Slack.bot.id, Slack.bot.name]);
	return res;
};
const log = (color, ...args)=>{
	const text = args.map((arg)=>{
		if(arg instanceof Error) return arg.toString();
		return JSON.stringify(arg, null, '  ')
	});
	console.log(...text);
	if(!Slack.connected) return;
	const cache = Error.prepareStackTrace;
	Error.prepareStackTrace = (_, stack)=>stack;
	const err = args.find((arg) =>arg instanceof Error);
	const caller = err ? err.stack[0] : (new Error()).stack[1];
	const info = {
		name : caller.getFunctionName && caller.getFunctionName(),
		file : caller.getFileName && caller.getFileName(),
		line : caller.getLineNumber && caller.getLineNumber(),
		col  : caller.getColumnNumber && caller.getColumnNumber(),
	};
	Error.prepareStackTrace = cache;
	return Slack.api('chat.postMessage', {
		channel    : Slack.log_channel,
		username   : Slack.bot.name,
		icon_emoji : Slack.bot.icon,
		attachments: [{
			color     : color,
			text      : '```' + text.join(', ') + '```',
			mrkdwn_in : ['text'],
			footer : `${info.file}:${info.line} from ${info.name}`
		}]
	}).catch(()=>{})
};

const Slack = {
	connected : false,
	token : '',
	socket : null,
	pingTimer : null,
	log_channel : 'diagnostics',
	channels : {},
	users    : {},
	bots     : {},
	dms      : {},
	bot : {
		id : '',
		name : 'bot',
		icon : ':robot_face:'
	},
	setInfo : (name, icon)=>{
		Slack.bot.name = name;
		Slack.bot.icon = `:${_.replace(icon, /:/g, '')}:`
	},
	connect : (token)=>{
		Slack.token = token;
		return Slack.api('rtm.start')
			.then((data) => {
				return new Promise((resolve, reject)=>{
					if (!data.ok || !data.url) return reject(`bad access token`);
					processTeamData(data);
					Slack.socket = new WebSocket(data.url);

					Slack.socket.on('open', resolve);
					Slack.socket.on('message', (rawData, flags) => {
						try{
							const msg = JSON.parse(rawData);
							if(msg.error) return Slack.error(msg);
							const message = processIncomingEvent(msg);
							if(message.user_id === Slack.bot.id) return;
							Slack.emitter.emit(message.type, message);
						}catch(err){ Slack.error(err); }
					});
				});
			})
			.then(()=>Slack.pingTimer=setInterval(Slack.ping, 5000))
			.then(()=>Slack.connected = true)
	},
	close : ()=>new Promise((resolve, reject)=>{
		clearInterval(Slack.pingTimer);
		Slack.socket.close(()=>resolve())
	}),
	api : (command, payload) => {
		if(payload && payload.attachments) payload.attachments = JSON.stringify(payload.attachments);
		return new Promise((resolve, reject)=>{
			request
				.get(`https://slack.com/api/${command}`)
				.query(_.assign({ token : Slack.token }, payload))
				.end((err, res)=>{
					if(err || (res.body && res.body.ok === false)) return reject(err || res.body.error);
					return resolve(res.body);
				});
		});
	},
	send : (target, text, opts)=>{
		target = target.channel_id || target;
		text = typeof text === 'string' ? { text } : text;
		const directMsg = _.findKey(Slack.dms, (user)=>target == user);
		return Slack.api('chat.postMessage', _.assign({
			channel    : (directMsg || target),
			username   : Slack.bot.name,
			icon_emoji : Slack.bot.icon
		}, text, opts));
	},
	sendAs : (botname, boticon, target, text)=>Slack.send(target, text, {username: botname, icon_emoji:`:${_.replace(boticon, /:/g, '')}:`}),
	react : (msg, emoji)=>{
		return Slack.api('reactions.add', {
			channel   : msg.channel_id || msg.channel,
			name      : _.replace(emoji, /:/g, ''),
			timestamp : msg.ts
		});
	},
	reply: (msg, text, opts = {})=>{
		if(msg.ts && msg.thread_ts && msg.thread_ts !== msg.ts) {
			opts.thread_ts = msg.thread_ts;
		}
		return Slack.send(msg.channel, text, opts);
	},
	thread: (msg, text, opts = {})=>{
		opts.thread_ts = msg.thread_ts || msg.ts;
		return Slack.send(msg.channel, text, opts);
	},

	emitter   : new Events(),
	onMessage : (handler)=>Slack.emitter.on('message', handler),
	onReact   : (handler)=>Slack.emitter.on('reaction_added', handler),

	log   : log.bind(null, ''),
	debug : log.bind(null, '#3498db'),
	info  : log.bind(null, 'good'),
	warn  : log.bind(null, 'warning'),
	error : log.bind(null, 'danger'),

	//Utils
	msgHas : (msg, ...filters)=>{
		if(!msg) return false;
		if(msg.text) msg = msg.text;
		if(!_.isString(msg)) return false;
		msg = msg.toLowerCase();
		return _.every(filters, (opts)=>{
			if(_.isString(opts)) opts = [opts];
			return _.some(opts, (opt)=>msg.indexOf(opt.toLowerCase()) !== -1)
		});
	},
	ping : ()=>{
		pingCount++;
		Slack.socket.send(JSON.stringify({id: pingCount, type : 'ping'}));
	},

};

//Aliases
Slack.msg   = Slack.send;
Slack.msgAs = Slack.sendAs;


module.exports = Slack;
