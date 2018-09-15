var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

var IP1PATTERN = [
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
];

var IP2PATTERN = [
	{ id: 0, label: 'Off' },
	{ id: 1, label: 'H-Ramp' },
	{ id: 2, label: 'V-Ramp'},
	{ id: 3, label: '100% Bars'},
	{ id: 4, label: '16x16 Grid'},
	{ id: 5, label: '32x32 Grid'},
	{ id: 6, label: 'Burst'},
	{ id: 7, label: '75% Bars'},
	{ id: 8, label: '50% Grey'},
	{ id: 9, label: 'Grey steps 1'},
	{ id: 10, label: 'Grey steps 2'},
	{ id: 11, label: 'White'},
	{ id: 12, label: 'Black'},
	{ id: 13, label: 'SMPTE'},
];

var IP1INPUT = [
	{ id: 1, label: 'DVI' },
	{ id: 2, label: 'VGA' },
	{ id: 3, label: 'Component'},
	{ id: 4, label: 'SDI'},
	{ id: 5, label: 'Black/logo'}
];

var IP2INPUT = [
	{ id: 1, label: 'DVI' },
	{ id: 2, label: 'Analog' },
	{ id: 3, label: 'HDMI'},
	{ id: 4, label: 'DisplayPort'},
	{ id: 5, label: 'SDI 1'},
	{ id: 6, label: 'SDI 2'},
	{ id: 7, label: 'Logo'},
	{ id: 8, label: 'Black'}
];



function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.updateDropD()
	self.config = config;
	self.init_tcp();
	self.actions();
};

instance.prototype.updateDropD = function() {
	var self = this;

	if (self.config.ver == 'ip1') {
			self.pattern = IP1PATTERN;
			self.ipInput = IP1INPUT;
			debug(self.config.ver,self.ipInput,self.pattern)
	};

	if (self.config.ver == 'ip2') {
			self.pattern = IP2PATTERN;
			self.ipInput = IP2INPUT;
			debug(self.config.ver,self.ipInput,self.pattern)
	};


};

instance.prototype.init = function() {
	var self = this;
	debug = self.debug;
	log = self.log;


	self.status(1,'Connecting'); // status ok!
	self.updateDropD()
	self.init_tcp();
	self.actions(); // export actions
};

instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	};

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
		},
		{
			type: 'dropdown',
			id: 'ver',
			label: 'ImagePro Version',
			width: 6,
			default: 'ip1',
			choices: [
				{ id: 'ip1', label: 'ImagePro 1/HD' },
				{ id: 'ip2', label: 'ImagePro II' },
			]
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
					default: '0',
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
					default: '0',
					choices: self.pattern

				},
				{
					type: 'dropdown',
					label: 'Scroling on/off',
					id: 'scrolId',
					default: '0',
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
						 default: '1',
						 choices: self.ipInput
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

		debug('sending ',cmd);


		if (self.config.ver == 'ip1') {
			if (self.socket !== undefined && self.socket.connected) {
				self.socket.send(cmd + "\r");
				debug('to ImagePro 1 at',self.config.host)
			} else {
				debug('Socket not connected :(');
			}
		};

		if (self.config.ver == 'ip2') {
			if (self.socket !== undefined && self.socket.connected) {
				self.socket.send(cmd + "\n");
				debug('to ImagePro 2 at',self.config.host)
			} else {
				debug('Socket not connected :(');
			}
		};

	}

	// debug('action():', action);

};

instance.module_info = {
	label: 'Barco ImagePro',
	id: 'imagepro',
	version: '0.0.2'
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
