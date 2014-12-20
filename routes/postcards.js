var express = require('express');
var router = express.Router();
var firebase = require('firebase');
var Backbone = require('backbone');
var lobFactory = require('lob');
var twilio = require('twilio');
var twimlResp = new twilio.TwimlResponse();
var request = require('request').defaults({ encoding: null });
var lwip = require('lwip');
var fs = require('fs');
var gm = require('gm').subClass({ imageMagick: true });
var firebase = require('firebase');
var Backbone = require('backbone');

var Lob = new lobFactory('test_7896a0f2b2c8d6ce3a4419551a3672df7fa');


var eventModel = Backbone.Model.extend({
	defaults:{
		name: '',
		event_id : ''
	}
});

var eCollection = Backbone.Collection.extend({
	model: eventModel
});

var eventsCollection = new eCollection();

var addressModel = Backbone.Model.extend({
	defaults:{
		adr_id: '',
		name: '',
		address_line1: '',
		address_line2: '',
		address_city: '',
		address_state: '',
		address_zip: '',
		address_country: '',
		phone: '',
		email: '',
		date_created: '',
		date_modified: ''
	}
});

var aCollection = Backbone.Collection.extend({
	model: addressModel
});

var addressCollection = new aCollection();

var fbRef = new firebase('PUT FIREBASE HERE');
var addressRef = new firebase('PUT FIREBASE HERE/address/');
var eventsRef = new firebase('PUT FIREBASE HERE/events/');
var numbersRef = new firebase('PUT FIREBASE HERE/numbers/');
var eventKeyRef = new firebase('PUT FIREBASE HERE/event_keys');


var salt = '2375gnkl23jk@422!!3';


eventsRef.once('child_added', function(childSnap){
	var tModel = new eventModel();

	tModel.set( 'name', childSnap.child('name').val() );
	tModel.set( 'event_id', childSnap.child('event_id').val() );
	
	eventsCollection.add(tModel);
});

addressRef.once('child_added', function(dataSnapshot){
	var tModel = new addressModel();
	
	tModel.set('adr_id', dataSnapshot.child('adr_id').val());
	tModel.set('name' , dataSnapshot.child('name').val());
	tModel.set('address_line1', dataSnapshot.child('address_line1').val());
	tModel.set('address_line2', dataSnapshot.child('address_line2').val());
	tModel.set('address_city', dataSnapshot.child('address_city').val());
	tModel.set('address_state', dataSnapshot.child('address_state').val());
	tModel.set('address_zip',  dataSnapshot.child('address_zip').val());
	tModel.set('address_country', dataSnapshot.child('address_country').val());
	tModel.set('phone', dataSnapshot.child('phone').val());
	tModel.set('email',  dataSnapshot.child('email').val());
	tModel.set('date_created', dataSnapshot.child('date_created').val());
	tModel.set('date_modified', dataSnapshot.child('date_modified').val());

	addressCollection.add(tModel);

});

function lobCard(toLob){
	console.log('lobbing a card');
	Lob.postcards.create(toLob, function (err, res) {
		console.log("SENDING A LOB TO: " + toLob.to);
		if(res.errors){ 
			console.log('lob err'); console.log(err);
		}else{
			console.log(res);
			console.log('--------------------------');
		}
	});
};


/* POST to incoming */

router.post('/incoming', function(req, res){
	console.log("---/|\\----INCOMING----/|\\---");
	//console.log(req);
	console.log( 'SmsSid: ' + req.body.SmsSid);
	console.log( 'From: ' + req.body.From);
	console.log( 'Body: ' + req.body.Body);
	console.log( 'NumMedia: ' + req.body.NumMedia);

	var twimlResp = new twilio.TwimlResponse();

	var fNumber = req.body.From;
	var allowedEvents = [];
	var currentEvent = '';
	var allowedAddresses = [];

	if (fNumber.indexOf('+1') > -1){
		fNumber = fNumber.substr(2);
	}

	numbersRef.child(fNumber).once('value', function(dataSnapshot){
		currentEvent = dataSnapshot.child('current_event').val() || '';
		console.log ('current_Event : ' + currentEvent);
		my_adr = dataSnapshot.child('adr_id').val();

		if (req.body.Body && req.body.NumMedia === 0){
			var sBody = req.body.Body.split(' ');
			switch (sBody[0].toLowerCase()){
				case 'event':
					event_key = sBody[1];
					eventKeyRef.child(event_key).once('value', function(dSnap){
						if (dSnap.key() === event_key){
							console.log('you got the right key!');
							numbersRef.child(fNumber).child('current_event').set(dSnap.val());
						}
					});
					break;
				default:
					twimlResp.message("Welcome to Post.Cards! Reply with 'event <code>' to get started.", { to: '1+' + fNumber });
					
					res.end(twimlResp.toString());
					console.log('switch: user is not registed to an event');				
					break;
				}
			}

		else if (currentEvent === ''){
			twimlResp.message("Welcome to Post.Cards! Reply with 'event <code>' to get started.", {
				to: '1+' + fNumber
			});
			
			
			res.end(twimlResp.toString());
			console.log('user is not registed to an event');
		}else{
			if (req.body.NumMedia === 0){
				
			}else{  //we have media 
				eventsRef.child(currentEvent).once('value', function(dSnap){
					var event_name = dSnap.child('name').val();
					if (dSnap.child('address').hasChildren()){
						dSnap.child('address').forEach(function(cSnap){
							allowedAddresses.push(cSnap.val());
						});
					}else{
						console.log('only 1 address to send to');
						console.log( dSnap.child('address').val());
						allowedAddresses.push(dSnap.child('address').val());
					}
					
					if (allowedAddresses.length > 0){
						request.get(req.body.MediaUrl0, function (err, res, body) {
					  		//process exif here					  		
					  		fs.writeFileSync('./cardsToSend/image.jpg', body);
					  		console.log('file write');
							gm('./cardsToSend/image.jpg').resample(400,800).write('./cardsToSend/image-resample.jpg', function(err){
								var lobMult = 0
								allowedAddresses.forEach(function(aAddress){
									lobMult++;
									var lobbable = {
										name: event_name,
										to: aAddress,
										from: my_adr,
										front: '@./cardsToSend/image-rcc.jpg',
										message: req.body.Body || event_name
									};
									setTimeout(function(){
										lobCard(lobbable);
									}, 500 * lobMult)
								});
							});		
					  	});
					}
				});
			} // ENDS MEDIA IF CHECK
		} // ENDS EVENT INFO CHECK
	});

	console.log ('-------------------');
	console.log(req.body);

	twimlResp.say('Message recieved, doing a thing!');
    res.end(twimlResp.toString());

});

/* POST to finisehd */
router.post('/finished', function(req, res){
	console.log("---/|\\----FINISHED----/|\\---");
	//console.log(req);
	console.log( 'SmsSid: ' + req.body.SmsSid);
	console.log( 'From: ' + req.body.from);
	console.log( 'Body: ' + req.body.body);
	console.log( 'NumMedia: ' + req.body.NumMedia);

	console.log ('-------------------');
	console.log(req.body);
});

module.exports = router;
