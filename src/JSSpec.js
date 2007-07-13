JSSpec = {};

JSSpec.behaviors = [];

Describe = function(context, entries) {
	JSSpec.behaviors.push(new JSSpec.Behavior(context, entries));
};




JSSpec.Behavior = function(context, entries) {
	this.context = context;
	this.examples = entries;
};
JSSpec.Behavior.prototype.run = function() {
	for(var name in this.examples) {
		JSSpec.Behavior._pass = 1;
		this.examples[name]();

		JSSpec.Behavior._pass = 2;
		this.examples[name]();
	}
}


JSSpec.Runner = function(behaviors, logger) {
	this.behaviors = behaviors;
	this.logger = logger;
};

JSSpec.Runner.prototype.pass = function() {
	document.title += "."
}

JSSpec.Runner.prototype.fail = function(expected, actual) {
	document.title += "F"
}

JSSpec.Runner.prototype.error = function(e) {
	document.title += "E"
}

JSSpec.Runner.prototype.run = function() {
	this.addBddMethods();
	
	for(var i = 0; i < this.behaviors.length; i++) {
		this.behaviors[i].run();
	}
};

JSSpec.Runner.prototype.addBddMethods = function() {
	String.prototype.should = function(expected) {
		if(JSSpec.Behavior._pass == 1) {
			
		} else {
			
		}
	};
}


JSSpec.Logger = function() {
	this.summary = this.createSummary();
	this.logTable = this.createLogTable();
};
JSSpec.Logger.prototype.createSummary = function() {
	var id = 'JSSpec_summary';
	var summary = document.getElementById(id);
	if(!summary) {
		summary = document.createElement('DIV');
		summary.id = id;
		document.body.appendChild(summary);
	}
	
	return summary;
};
JSSpec.Logger.prototype.createLogTable = function() {
	var id = 'JSSpec_logTable';
	var logTable = document.getElementById(id);
	if(!logTable) {
		var logTableContainer = document.createElement('DIV');
		logTableContainer.innerHTML = '<table></table>';
		var logTable = logTableContainer.firstChild;
		logTable.id = id;
		document.body.appendChild(logTable);
	}
	
	return logTable;
};

window.onload = function() {
	var runner = new JSSpec.Runner(JSSpec.behaviors, new JSSpec.Logger());
	runner.run();
};