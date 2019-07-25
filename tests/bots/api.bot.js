const Slack = require('../../pico-slack.js');


const router = require('express').Router();

router.get('/test', (req, res)=>{
	Slack.log('here');
	Slack.send('general', 'api bot working!');
	res.send('ok');
});


module.exports = router;