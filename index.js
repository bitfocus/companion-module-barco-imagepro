var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_tcp();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.status(1,'Connecting'); // status ok!

	self.init_tcp();
};

instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, 10001);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			debug("Connected");
		})

		self.socket.on('data', function (data) {});
	}
};


// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug("destroy", self.id);;
};


instance.prototype.actions = function(system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {
		'freeze':     {
			label: 'Freeze Output',
			options: [
				{
					type: 'dropdown',
					label: 'Freeze on/off',
					id: 'frzId',
					choices: [
						{ id: 0, label: 'Off' },
						{ id: 1, label: 'On' },
					]
				}
			]
		},
		'pattern':     {
			label: 'Test Pattern',
			options: [
				{
					type: 'dropdown',
					label: 'Select Pattern',
					id: 'pat',
					choices: [
						{ id: 0, label: 'Off' },
						{ id: 1, label: 'H-Ramp' },
						{ id: 2, label: 'V-Ramp'},
						{ id: 3, label: '100% Bars'},
						{ id: 4, label: '75% Bars'},
						{ id: 5, label: '16x16 Grid'},
						{ id: 6, label: '32x32 Grid'},
						{ id: 7, label: 'Burst'},
						{ id: 8, label: '50% Grey'},
						{ id: 9, label: 'Grey steps 1'},
						{ id: 10, label: 'Grey steps 2'}
					]
				},
				{
					type: 'dropdown',
					label: 'Scroling on/off',
					id: 'scrolId',
					choices: [
						{ id: 0, label: 'Off' },
						{ id: 1, label: 'On' },
					]
				}

			]
		},
		'inpSel':   {
			label: 'Input Select',
			options: [
				{
					type: 'dropdown',
						 label: 'Input',
						 id: 'inpId',
						 choices: [
							 { id: 1, label: 'DVI' },
							 { id: 2, label: 'VGA' },
							 { id: 3, label: 'Component'},
							 { id: 4, label: 'SDI'},
							 { id: 5, label: 'Black/logo'}
						 ]
				}
			]
		}

	});
};


	instance.prototype.action = function(action) {
		var self = this;
		var opt = action.options

		switch (action.action) {

			case 'inpSel':
				cmd = 'RTE '+ opt.inpId;
				break;

			case 'pattern':
				cmd = 'OTPM '+ opt.pat + ' 0 ' + opt.scrolId;
				break;

			case 'freeze':
				cmd = 'FREEZ '+ opt.frzId;
				break;

	};





	if (cmd !== undefined) {

		debug('sending ',cmd,"to",self.config.host);

		if (self.socket !== undefined && self.socket.connected) {
			self.socket.send(cmd + "\r");
		} else {
			debug('Socket not connected :(');
		}

	}

	// debug('action():', action);

};

instance.module_info = {
	label: 'Barco ImagePro',
	id: 'imagepro',
	version: '0.0.1'
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
