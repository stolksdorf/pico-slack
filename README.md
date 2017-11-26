# pico-slack
An incredibly tiny Slack bot library

[![NPM](https://nodei.co/npm/pico-slack.png)](https://nodei.co/npm/pico-slack/)

## install

```
npm install --save pico-slack
```


## features

- **150 lines**
- Logging to Slack with traces
- Mapping of Slack User ids to User names


## documentation

### usage

```javascript
const Slack = require('pico-slack');

Slack.connect('xoxb-00000000000-xxxxxxxxxxxxxxxxxxxx')
	.then(()=>Slack.msg('general', 'hello world!'))

Slack.onMessage((msg)=>{
	if(msg.channel == 'general' && Slack.msgHas(msg.text, ['hey', 'hello'])){
		Slack.react(msg, 'wave');
	}
});
```

### commands

#### `.connect(slack_token)`
Creates a web socket connection with Slack using the provided token. On connect, `pico-slack` will parse and store all team data on the [properities]. The `slack_token` will be stored and automatically attached to any API calls. Any events from Slack will be emitted using the `.emitter`.

#### `.close()`
Closes the socket.

#### `.setInfo(bot_name, bot_icon)`
Changes the default bot name and icon used for each `.msg` call


#### `.api(command, payload)`
Sends a promised web API request to Slack using the `token`. `command` is from [this list](https://api.slack.com/methods).


#### `.send(target, text, [opts])`
Sends an IM to `target` (user or channel, id or name) with the `text`. `opts` is additional parameters to be sent with the request. Uses `.api()`. Alias: `.msg`

#### `.sendAs(bot_name, bot_icon, target, text)`
Sends an IM as `bot_name` with `bot_icon` to `target` with `text`. Alias: `.msgAs`


#### `.react(event_object, emoji)`
Reacts to a given message with the `emoji`. This function uses the channel id and timestamp from the provided `event_object` to make the API call. It's best to jst pass the `event_object` you get from a handler.


### events

#### `.emitter`
Access to `pico-slack` event emitter used for the web socket. Full list of all the event types that can be emitted [here](https://api.slack.com/events)

```javascript
Slack.emitter.on('user_typing', (event)=>{
	//...
});
```

#### `.socket`
Access tot he websocket communicating with Slack.

#### `event object`
`pico-slack` will parse and extend the incoming socket event from Slack. This is what is passed to event handlers.

```javascript
{
  type: 'message',
  channel: 'general',
  user: 'scott',
  text: 'This is a test message',
  ts: '1491187485.521588',
  team: 'T0000000',
  channel_id: 'C0VL784KT',
  user_id: 'U0VL783MX',
  isDirect : false
}
```

#### `.onMessage(handler)`
Alias for `Slack.emitter.on('message', handler)`

```javascript
Slack.onMessage((msg)=>{
	console.log('I got a message', msg);
	Slack.react(msg, ':thumbsup:')
		.catch((err)=>console.log(err))
});
```


#### `.onReact(handler)`
Alias for `Slack.emitter.on('reaction_added', handler)`


### properties
On connect, `pico-slack` will populate several properities in the lib about your Slack team for ease of use.

```
Slack.log_channel : 'diagnostics',
Slack.channels : {
	C0VL784KT: 'general',
	C0VL376TS: 'random',
	C46606JAK: 'coolchats',
},
Slack.users : {
	U0VKSFTB6: 'higgins',
	U0VL783MX: 'scott',
	U0WLTH1MY: 'coolguy',
},
Slack.bots : {
	B0VKVBSQ6: 'U0VKSFTB6',
},
Slack.dms : {
	D0VKSFTBN: 'scott'
},
Slack.bot : {
	id : 'U0VKSFTB6',
	name : 'higgins',
	icon : ':robot_face:'
},
```


### logging
Logging what your bot is doing can be tricky with Slack, so `pico-slack` has built in log functions.

```javascript
Slack.log(...args)
Slack.debug(...args)
Slack.info(...args)
Slack.warn(...args)
Slack.error(...args)
```

These will print out a log message to the channel specified with `Slack.log_channel`. The filename and line number will be included, along with a color indicator of the type of log you used.

### utils

#### `.msgHas(text, ...filters)`

`msgHas` checks if the given `text` passes the `filters`. The `filters` can be any number of strings or array of strings. The text must have a substring from each parameter, or at least of one them if it's an array. Case-insenstive.

*examples*
```javascript
Slack.msgHas('Hey there!', 'hey') -> true
Slack.msgHas('Hey there!', 'hey', 'champ') -> false
Slack.msgHas('Hey cool guy', ['greetings', 'hey'], ['scott', 'cool guy']) -> true
```


### test
Add a file called `./tests/slack_token.json`, that has your slack token for the bot.
```
{
	"token" : "xoxb-00000000000-xxxxxxxxxxxxxxxxxxxx"
}
```

run `npm run test`


