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

JSSpec.Behavior.prototype.run = function() {
	for(var i = 0; i < this.examples.length; i++) {
		this.examples[i].run();
	}
}



/**
 * Example class
 */
JSSpec.Example = function(name, fn) {
	this.name = name;
	this.fn = fn;
	this.pass = 1;
}

JSSpec.Example.prototype.error = function(message, sourceUrl, lineNumber) {
	alert([message, sourceUrl, lineNumber]);
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
			this.error(ex.message, ex.fileName, ex.lineNumber);
		}
	}
}



function main() {
	if(JSSpec.Browser.Trident) {
		window.onerror = function(ex, sourceUrl, lineNumber) {
			JSSpec.currentExample.error(ex, sourceUrl, lineNumber);
			return true;
		}
	}
	
	window.onload = function() {
		for(var i = 0; i < JSSpec.behaviors.length; i++) {
			JSSpec.behaviors[i].run();
		}
	}
}

main();