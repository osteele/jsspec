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
	this.examples = this.makeExamples(entries);
	this.index = 0;
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

	if(this.index == 0) {
		JSSpec.logger.startBehavior(this);
		this.examples[this.index++].run();
	} else if(this.index >= this.examples.length) {
		JSSpec.logger.endBehavior(this);
		JSSpec.runner.run();
	} else {
		this.examples[this.index++].run();
	}
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

	if(this.index == 0) {
		JSSpec.logger.startRunner(this);
		this.behaviors[this.index++].run();
	} else if(this.index >= this.behaviors.length) {
		JSSpec.logger.endRunner(this);
	} else {
		this.behaviors[this.index++].run();
	}
}



/**
 * Logger
 */
JSSpec.Logger = function() {
	//TODO
}
JSSpec.Logger.prototype.startRunner = function(runner) {
	console.log("start runner");
	console.log(runner);
}
JSSpec.Logger.prototype.endRunner = function(runner) {
	console.log("end runner");
	console.log(runner);
}
JSSpec.Logger.prototype.startBehavior = function(behavior) {
	console.log("start behavior");
	console.log(behavior);
}
JSSpec.Logger.prototype.endBehavior = function(behavior) {
	console.log("end behavior");
	console.log(behavior);
}
JSSpec.Logger.prototype.startExample = function(example) {
	console.log("start example");
	console.log(example);
}
JSSpec.Logger.prototype.endExample = function(example) {
	console.log("end example");
	console.log(example);
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
				throw "AssertionFailure"
			}
		}
}



if(JSSpec.Browser.Trident) {
	window.onerror = function(ex, sourceUrl, lineNumber) {
		var example = JSSpec.example;
		
		if(ex == "AssertionFailure") {
			// Second pass
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


window.console = {
	log: function(msg) {
		var div = document.createElement("div");
		div.innerHTML = msg;
		document.body.appendChild(div);
	}
}
window.onload = function() {
	JSSpec.logger = new JSSpec.Logger();
	JSSpec.runner = new JSSpec.Runner();
	
	JSSpec.runner.run();
}