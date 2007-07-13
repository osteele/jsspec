// Creating namespace
JSSpec = {}

JSSpec.Browser = {
	Trident: navigator.appName == "Microsoft Internet Explorer",
	Webkit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
	Presto: navigator.appName == "Opera"
}

JSSpec.behaviors = [];



describe = function(context, entries) {
	JSSpec.behaviors.push(new JSSpec.Behavior(context, entries));
};



/**
 * Runner
 */
JSSpec.Runner = function() {
	this.behavoirs = JSSpec.behaviors;
}
JSSpec.Runner.prototype.run = function(bindex, eindex) {
	bindex = bindex || 0;
	eindex = eindex || 0;
	
	for(var i = bindex; i < JSSpec.behaviors.length; i++) {
		JSSpec.bindex = i;
		JSSpec.behaviors[i].run(i == bindex ? eindex : 0);
	}
}



/**
 * Behavior contains its own context and examples.
 */
JSSpec.Behavior = function(context, entries) {
	this.context = context;
	this.examples = this.generateExamplesFromEntries(entries);
};

JSSpec.Behavior.prototype.generateExamplesFromEntries = function(entries) {
	// TODO: extract out "before" and "after" entries
	var examples = [];
	for(var name in entries) {
		examples.push(new JSSpec.Example(name, entries[name]));
	}
	return examples;
};

JSSpec.Behavior.prototype.run = function(eindex) {
	eindex = eindex || 0;
	for(var i = eindex; i < this.examples.length; i++) {
		JSSpec.eindex = i;
		this.examples[i].run();
	}
}



/**
 * Example class
 */
JSSpec.Example = function(name, fn) {
	this.name = name;
	this.fn = fn;
	
	this.secondPass = false;
	this.assertionIndex = 0;
	this.failure = null;
	this.exception = null;
}

JSSpec.Example.prototype.recordFail = function(index, expected, actual) {
	this.failure = {index:index, expected:expected, actual:actual};
}
JSSpec.Example.prototype.recordException = function(message, sourceUrl, lineNumber) {
	this.exception = {message:message, sourceUrl:sourceUrl, lineNumber:lineNumber};
}

JSSpec.Example.prototype.parsePrestoException = function(ex) {
	// TODO: Opera cannot handle embeded source correctly. And IE only handles embeded source.
	var str = ex.toString();
	var m = str.match(/message\:.+on line (\d+)\: (.+)$/m);
	var message = m[0];
	var lineNumber = m[1];

	m = str.match(/Line \d+ of linked script (.+)$/m);
	var fileName = m[1];
	
	return {message:message, fileName:fileName, lineNumber:lineNumber};
}

JSSpec.Example.prototype.run = function() {
	this.addBddMethods();

	// First pass
	this.fn();
	if(!this.failure) return;
	
	// Second pass to figure out exception info such as line number.
	this.secondPass = true;
	if(JSSpec.Browser.Trident) {
		// In IE, exception should be handled at onerror handler.
		// It is the only known way to get a valid line number.
		JSSpec.currentExample = this;
		this.fn();
	} else {
		try {
			this.fn();
		} catch(ex) {
			if(JSSpec.Browser.Presto) ex = this.parsePrestoException(ex);
			this.recordException(ex.message, ex.fileName, ex.lineNumber);
		}
	}
	
	console.log(this);
}

JSSpec.Example.prototype.addBddMethods = function() {
	var self = this;
	var targets = [String.prototype, Date.prototype, Number.prototype, Array.prototype];
	
	for(var i = 0; i < targets.length; i++) {
		targets[i].should = function() {
			if(self.secondPass && self.failure.index == self.assertionIndex) return {};
			
			return {
				be: function(expected) {
					if(this != expected) self.recordFail(self.assertionIndex, expected, this);
					self.assertionIndex++;
				}.bind(this)
			}
		}
	}
}



function main() {
	if(JSSpec.Browser.Trident) {
		window.onerror = function(ex, sourceUrl, lineNumber) {
			JSSpec.currentExample.recordException(ex, sourceUrl, lineNumber);
			JSSpec.runner.run(JSSpec.bindex, JSSpec.eindex + 1);
			return true;
		}
	}
	
	window.onload = function() {
		JSSpec.runner = new JSSpec.Runner();
		JSSpec.runner.run();
	}
}

main();