var JSSpec = {
	behaviors: [],
	
	example: null,
	behavior: null,
	runner: null,
	logger: null
}

JSSpec.Browser = {
	Trident: navigator.appName == "Microsoft Internet Explorer",
	Webkit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
	Presto: navigator.appName == "Opera"
}

describe = function(context, entries) {
	JSSpec.behaviors.push(new JSSpec.Behavior(context, entries));
}



/**
 * Example
 */
JSSpec.Example = function(name, fn) {
	this.name = name;
	this.fn = fn;
}

JSSpec.Example.prototype.run = function() {
	JSSpec.example = this;
	JSSpec.logger.startExample(this);
	
	if(JSSpec.Browser.Trident) {
		// First pass
		this.fn();
		this.finished();
	} else {
		// First pass
		try {
			this.fn();
			this.finished();
			return;
		} catch(ex) {
			if(ex != "AssertionFailure") {
				this.recordError(ex.message, ex.fileName, ex.lineNumber);
				this.finished();
				return;
			}
		}
		
		// Second pass
		try {
			this.fn();
		} catch(ex) {
			this.recordFailure(ex.fileName, ex.lineNumber);
			this.finished();
			return;
		}
	}
}

JSSpec.Example.prototype.recordError = function(message, fileName, lineNumber) {
	this.error = {};
	this.error.message = message;
	this.error.fileName = fileName;
	this.error.lineNumber = lineNumber;
}
	
JSSpec.Example.prototype.recordFailure = function(fileName, lineNumber) {
	this.failure.fileName = fileName;
	this.failure.lineNumber = lineNumber;
}
	
JSSpec.Example.prototype.finished = function() {
	JSSpec.logger.endExample(this);
	window.setTimeout(JSSpec.behavior.run.bind(JSSpec.behavior));
}



/**
 * Behavior
 */
JSSpec.Behavior = function(context, entries) {
	this.context = context;
	this.extractOutSpecialEntries(entries);
	this.examples = this.makeExamples(entries);
	this.index = 0;
}

JSSpec.Behavior.prototype.extractOutSpecialEntries = function(entries) {
	for(name in entries) {
		if(name == 'before' || name == 'before each') {
			this.beforeEach = entries[name];
		} else if(name == 'before all') {
			this.beforeAll = entries[name];
		} else if(name == 'after' || name == 'after each') {
			this.afterEach = entries[name];
		} else if(name == 'after all') {
			this.afterAll = entries[name];
		}
	}
	
	delete entries['before'];
	delete entries['before each'];
	delete entries['before all'];
	delete entries['after'];
	delete entries['after each'];
	delete entries['after all'];
}

JSSpec.Behavior.prototype.makeExamples = function(entries) {
	var examples = [];
	for(name in entries) {
		examples.push(new JSSpec.Example(name, entries[name]));
	}
	return examples;
}

JSSpec.Behavior.prototype.run = function() {
	JSSpec.behavior = this;
	
	var example = this.examples[this.index];
	
	if(this.index == 0) {
		JSSpec.logger.startBehavior(this);
		if(this.beforeAll) {
			this.beforeAll();
		}
		window.setTimeout(example.run.bind(example));
	} else if(this.index >= this.examples.length) {
		JSSpec.logger.endBehavior(this);
		if(this.afterAll) {
			this.afterAll();
		}
		window.setTimeout(JSSpec.runner.run.bind(JSSpec.runner));
	} else {
		window.setTimeout(example.run.bind(example));
	}
	
	this.index++;
}



/**
 * Runner
 */
JSSpec.Runner = function() {
	this.behaviors = JSSpec.behaviors;
	this.index = 0;
}

JSSpec.Runner.prototype.run = function() {
	JSSpec.runner = this;

	var behavior = this.behaviors[this.index];
	
	if(this.index == 0) {
		JSSpec.logger.startRunner(this);
		window.setTimeout(behavior.run.bind(behavior), 0);
	} else if(this.index >= this.behaviors.length) {
		JSSpec.logger.endRunner(this);
	} else {
		window.setTimeout(behavior.run.bind(behavior), 0);
	}
	
	this.index++;
}



/**
 * Logger
 */
JSSpec.Logger = function() {
	this.summary = null;
	this.log = null;
}
JSSpec.Logger.prototype.startRunner = function(runner) {
	this.summary = document.createElement("DIV");
	document.body.appendChild(this.summary);

	this.log = document.createElement("DIV");
	document.body.appendChild(this.log);
}
JSSpec.Logger.prototype.startBehavior = function(behavior) {
	var heading = document.createElement("H2");
	this.log.appendChild(heading);
	heading.appendChild(document.createTextNode(behavior.context));
	
	var ul = document.createElement("UL");
	this.log.appendChild(ul);
}
JSSpec.Logger.prototype.startExample = function(example) {
}
JSSpec.Logger.prototype.endExample = function(example) {
	var ul = this.log.lastChild;
	var li = document.createElement("LI");
	ul.appendChild(li);
	li.appendChild(document.createTextNode(example.name));
	
	var message
	if(example.error) li.innerHTML += (" / " + example.error.message + " / line " + example.error.lineNumber);
	if(example.failure) li.innerHTML += (" / " + example.failure.message + " / line " + example.failure.lineNumber);
}
JSSpec.Logger.prototype.endBehavior = function(behavior) {
	
}
JSSpec.Logger.prototype.endRunner = function(runner) {
	
}



/**
 * BDD Extentions
 */
String.prototype.should = function() {
	var self = this;
	var secondPass = !!JSSpec.example.failure;
	
	return secondPass ?
		{} :
		{
			be: function(expected) {
				if(self == expected) return;
				JSSpec.example.failure = {
					expected:expected,
					actual:self,
					message: "Expected [" + expected + "] but [" + self + "]"
				};
				
				if(JSSpec.Browser.Trident) JSSpec.example.firstPass = true;
				throw "AssertionFailure";
			}
		}
}



if(JSSpec.Browser.Trident) {
	window.onerror = function(ex, sourceUrl, lineNumber) {
		var example = JSSpec.example;

		if(ex == "AssertionFailure" || example.firstPass) {
			// Second pass
			delete example.firstPass;
			window.setTimeout(example.fn, 0);
		} else if(example.failure) {
			example.recordFailure(sourceUrl, lineNumber);
			example.finished();
		} else {
			example.recordError(ex.toString(), sourceUrl, lineNumber);
			example.finished();
		}
		
		return true;
	}
}

window.onload = function() {
	JSSpec.logger = new JSSpec.Logger();
	JSSpec.runner = new JSSpec.Runner();
	
	window.setTimeout(JSSpec.runner.run.bind(JSSpec.runner));
}
