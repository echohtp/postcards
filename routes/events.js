var express = require('express');
var router = express.Router();
var firebase = require('firebase');
var Backbone = require('backbone');
var crypto = require('crypto');
var firebase = require('firebase');
var Backbone = require('backbone');

var eventModel = Backbone.Model.extend({
	defaults:{
		address: [], //array of adr_id
		name: '',
		event_id : '',
		type: '', //personal or party
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
var eventKeyRef = new firebase('PUT FIREBASE HERE/event_keys/');

var salt = '2375gnkl23jk@422!!3';


eventsRef.on('child_added', function(childSnap){
	var tModel = new eventModel();

	tModel.set( 'name', childSnap.child('name').val() );
	tModel.set( 'event_id', childSnap.child('event_id').val() );
	tModel.set( 'type', childSnap.child('type').val());
	tModel.set( 'address', childSnap.child('address').val());
	
	eventsCollection.add(tModel);
});

addressRef.on('child_added', function(dataSnapshot){
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


addressRef.on('child_removed', function(dataSnap){
	var tM = addressCollection.where({adr_id: dataSnap.name()});
	addressCollection.remove(tM[0]);
});

eventsRef.on('child_removed', function(dataSnap){
	var tM = eventsCollection.where({event_id: dataSnap.child('event_id').val()});
	eventsCollection.remove(tM[0]);
});


router.get('/', function(req, res){
	res.render( 'index_events', { events: eventsCollection.toJSON() }, function(err, html){
		if(err){
			console.log('index_events error: ' + err);
		}else{
			res.write(html);
			res.end();
		}
	});
});

router.get('/new', function(req, res){
	var event_key = Math.floor(Math.random() * 100000);
	res.render('add_event', { addresses:  addressCollection.toJSON(), event_key: event_key }, function(err,html){
		if (err){
			console.log(err);
		}else{
			res.send(html);
			res.end();
		}
	});
});

router.get('/delete/:event_id', function(req, res){
	var e_id = req.params.event_id;
	eventsRef.child(e_id).once('value', function(dSnap){
		eventKeyRef.child(dSnap.child('event_key').val()).remove();
		eventsRef.child(e_id).remove();
	});



	res.redirect('/events/');
});

router.get('/:event_id', function(req, res){
	var e_id = req.params.event_id;

	var this_event = eventsCollection.findWhere({event_id: e_id});
	var e = this_event.toJSON();
	
	var toWhom = new aCollection();
	var w = this_event.get('address');
	w = String(w);
	w = w.split(',');
	w.forEach(function(adr_id){
		var whom = addressCollection.findWhere({'adr_id': adr_id});
		if (whom){
			toWhom.add(whom);
		}
	});

	var whomJSON = toWhom.toJSON();
	e['toWhom'] = whomJSON;

	res.render('single_event', { e: e }, function(err, html){
		if(err){
			console.log('index_events error: ' + err);
		}else{
			res.write(html);
			res.end();
		}
	});
	
	res.end();
	
});

/* POST new address */
router.post('/add', function(req,res){
	var md5sum = crypto.createHash('md5');
	var newEvent = {name : req.body.inputName };
	md5sum.update(salt + new Date().getTime());
	var e_id = md5sum.digest('hex') || 'wompwomp' ;
	newEvent = { 
		name: req.body.inputName,
		event_id: e_id.substr(16),
		event_key: req.body.event_key,
		address: req.body.address,
		type: req.body.type
	};
	if (typeof(newEvent['address']) === 'object'){
		newEvent['address'].forEach(function(adr_id){
			var whom = addressCollection.findWhere({ 'adr_id': adr_id});
			numbersRef.child(whom.get('phone')).child('events').push().set(newEvent['event_id']);
		});
	}else if (typeof(newEvent['address']) === 'string'){
		var whom = addressCollection.findWhere({'adr_id': newEvent['address'] });
		numbersRef.child(whom.get('phone')).child('events').push().set(newEvent['event_id']);
	}

	eventsRef.child(newEvent['event_id']).set(newEvent, function(){
		eventKeyRef.child(req.body.event_key).set(newEvent['event_id'], function(){
			res.redirect('/events/');
		});
	});
	


});


module.exports = router;
