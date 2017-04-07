# pico-slack
An incredibly tiny Slack bot library

[![NPM](https://nodei.co/npm/pico-slack.png)](https://nodei.co/npm/pico-slack/)

## install

```
npm install --save pico-slack
```


## features

- **Under 150 lines**
-



### test
Add a file called `./tests/slack_token.json`, that has
```
{
	"token" : "xoxb-00000000000-xxxxxxxxxxxxxxxxxxxx"
}
```



## documentation

### usage

```javascript
const Slack = require('pico-slack');


Slack.connect('xoxb-00000000000-xxxxxxxxxxxxxxxxxxxx')
	.then(()=>Slack.msg('general', 'hello world!'))

Slack.onMessage((msg)=>{
	if(msg.channel == 'general'){
		Slack.react(msg, 'pizza');
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


#### `.msg(target, text, [opts])`
Sends an IM to `target` (user or channel, id or name) with the `text`. `opts` is additional parameters to be sent with the request. Uses `.api()`.

#### `.react(event_object, emoji)`
Reacts to a given message with the `emoji`. This function uses the channel id and timestamp from the provided `event_object` to make the API call.


### events

#### `.emitter`
Access to `pico-slack` event emitter used for the web socket. Full list of all the event types that can be emitted [here](https://api.slack.com/events)

```javascript
Slack.emitter.on('user_typing', (event)=>{
	//...
});
```

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
  channel_id: 'C00000000',
  user_id: 'U00000000',
  isDirect : false
}
```

#### `.onMessage(handler)`
Alias for `Slack.emitter.on('message', handler)`


#### `.onReact(handler)`
Alias for `Slack.emitter.on('reaction_added', handler)`


### properties
On connect, `pico-slack` will populate several properities in the lib about your Slack team.

```
log_channel : 'diagnostics',
channels : {
	C0VL784KT: 'general',
	C0VL376TS: 'random',
	C46606JAK: 'coolchats',
},
users    : {
	U0VKSFTB6: 'higgins',
	U0VL783MX: 'scott',
	U0WLTH1MY: 'coolguy',
},
bots     : {
	B0VKVBSQ6: 'U0VKSFTB6',
},
dms      : {
	D0VKSFTBN: 'scott'
},
bot : {
	id : 'U0VKSFTB6',
	name : 'higgins',
	icon : ':robot_face:'
},
```


### utils & logging
Logging what your bot is doing can be tricky with Slack, so `pico-slack` has built in log functions.

log : log.bind(null, ''),
info : log.bind(null, 'good'),
warn : log.bind(null, 'warning'),
error : log.bind(null, 'danger'),


