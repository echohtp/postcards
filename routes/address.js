var express = require('express');
var router = express.Router();
var firebase = require('firebase');
var Backbone = require('backbone');
var lobFactory = require('lob');

var Lob = new lobFactory('test_7896a0f2b2c8d6ce3a4419551a3672df7fa');

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


var salt = '2375gnkl23jk@422!!3';


eventsRef.on('child_added', function(childSnap){
	var tModel = new eventModel();

	tModel.set( 'name', childSnap.child('name').val() );
	tModel.set( 'event_id', childSnap.child('event_id').val() );
	
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

function lobNewAddress(newAddress, o_res){
	/* name: 'Test Name',
        email: 'test@gmail.com',
        phone: '123456789',
        address_line1: '123 Test Street',
        address_line2: 'Unit 199',
        address_city: 'Chicago',
        address_state: 'IL',
        address_zip: '60012',
        address_country: 'US',
        */


    var aModel = new addressModel();
	aModel.set('name', newAddress.inputName);
	aModel.set('address_line1', newAddress.inputAddress1);
	aModel.set('address_line2', newAddress.inputAddress2);
	aModel.set('address_city', newAddress.inputCity);
	aModel.set('address_state', newAddress.inputState);
	aModel.set('address_country', newAddress.inputCountry);
	aModel.set('address_zip', newAddress.inputZip);
	aModel.set('phone', newAddress.inputPhone);
	aModel.set('email', newAddress.inputEmail);


	var aa = aModel.clone();
	var a = aa.attributes;
	delete a.phone;
	delete a.email;
	delete a.adr_id;
	delete a.date_created;
	delete a.date_modified;


	Lob.addresses.create ( a, function (err, res) {
        if (err){
        	console.log( err );
        }else{
        	aModel.set('adr_id', res.id);
        	aModel.set('date_created', res.date_created);
        	aModel.set('date_modified', res.date_modified);

	        addressRef.child(res.id).set(aModel.attributes, function(){
	        	numbersRef.child(aModel.get('phone')).child('adr_id').set(res.id, function(){
	        		o_res.redirect('/address');

	        	});
        	});
        }
    }); 
};


router.get('/', function(req, res){
	res.render('index_address', { addresses: addressCollection.toJSON() }, function(err, html){
		if (err){
			console.log(err);
		}else{
			res.write(html);
		}
		res.end();
	});
});

router.get('/new', function(req, res){
	res.render('add_address');
});

/* POST new address */
router.post('/add', function(req, res){
	lobNewAddress(req.body, res);
});

router.get('/:adr_id', function(req, res){
	var a_id = req.params.adr_id;

	var this_addr = addressCollection.where({adr_id: a_id});
	
	res.render('single_address', { e: this_addr[0].toJSON() }, function(err, html){
		if(err){
			console.log('index_events error: ' + err);
		}else{
			res.write(html);
			res.end();
		}
	});
	res.end();
});

router.get('/delete/:adr_id', function(req, res){
	var a_id = req.params.adr_id;
	var o_res = res;
	var this_addr = addressCollection.where({adr_id: a_id});
	addressCollection.remove(this_addr[0]);

	Lob.addresses.delete(a_id, function (err, res) {
        if (err){
        	console.log(err);
        }else{
        	var tRef = new firebase('PUT FIREBASE HERE/address/' + a_id);
        	tRef.remove();
			o_res.redirect('/address/');
        }
    });
});


module.exports = router;
