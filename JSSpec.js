/**
 * JSSpec
 *
 * Copyright 2007 Alan Kang
 *  - mailto:jania902@gmail.com
 *  - http://jania.pe.kr
 *
 * http://jania.pe.kr/aw/moin.cgi/JSSpec
 *
 * Dependencies:
 *  - diff_match_patch.js ( http://code.google.com/p/diff_match_patch )
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc, 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA
 */

// defining namespace
JSSpec = {
	specs: []
}


JSSpec.EMPTY_FUNCTION = function() {};

// Browser detection code
JSSpec.Browser = {
	Trident: navigator.appName == "Microsoft Internet Explorer",
	Webkit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
	Presto: navigator.appName == "Opera"
}



// Exception handler for Trident. It helps to collect exact line number where exception occured.
JSSpec.Executor = function(target, onSuccess, onException) {
	this.target = target;
	this.onSuccess = typeof onSuccess == 'function' ? onSuccess : JSSpec.EMPTY_FUNCTION;
	this.onException = typeof onException == 'function' ? onException : JSSpec.EMPTY_FUNCTION;
	
	if(JSSpec.Browser.Trident) {
		window.onerror = function(message, fileName, lineNumber) {
			var self = window._curExecutor;
			var ex = {message:message, fileName:fileName, lineNumber:lineNumber};

			if(JSSpec._secondPass)  {
				ex = self.mergeExceptions(JSSpec._assertionFailure, ex);
				delete JSSpec._secondPass;
				delete JSSpec._assertionFailure;
				
				ex.type = "failure";
				self.onException(self, ex);
			} else if(JSSpec._assertionFailure) {
				JSSpec._secondPass = true;
				self.run();
			} else {
				self.onException(self, ex);
			}
			
			return true;
		}
	}
}
JSSpec.Executor.prototype.mergeExceptions = function(assertionFailure, normalException) {
	var merged = {
		message:assertionFailure.message,
		fileName:normalException.fileName,
		lineNumber:normalException.lineNumber
	};
	
	return merged;
}
JSSpec.Executor.prototype.run = function() {
	var self = this;
	var target = this.target;
	var onSuccess = this.onSuccess;
	var onException = this.onException;
	
	window.setTimeout(
		function() {
			if(JSSpec.Browser.Trident) {
				window._curExecutor = self;
				
				var result = self.target();
				self.onSuccess(self, result);
			} else {
				try {
					var result = self.target();
					self.onSuccess(self, result);
				} catch(ex) {
					if(JSSpec.Browser.Webkit) ex = {message:ex.message, fileName:ex.sourceURL, lineNumber:ex.line}
					
					if(JSSpec._secondPass)  {
						ex = self.mergeExceptions(JSSpec._assertionFailure, ex);
						delete JSSpec._secondPass;
						delete JSSpec._assertionFailure;
						
						ex.type = "failure";
						self.onException(self, ex);
					} else if(JSSpec._assertionFailure) {
						JSSpec._secondPass = true;
						self.run();
					} else {
						self.onException(self, ex);
					}
				}
			}
		},
		0
	);
}



// CompositeExecutor composites one or more executors and execute them sequencially.
JSSpec.CompositeExecutor = function(onSuccess, onException, continueOnException) {
	this.queue = [];
	this.onSuccess = typeof onSuccess == 'function' ? onSuccess : JSSpec.EMPTY_FUNCTION;
	this.onException = typeof onException == 'function' ? onException : JSSpec.EMPTY_FUNCTION;
	this.continueOnException = !!continueOnException;
}
JSSpec.CompositeExecutor.prototype.addFunction = function(func) {
	this.addExecutor(new JSSpec.Executor(func));
}
JSSpec.CompositeExecutor.prototype.addExecutor = function(executor) {
	var last = this.queue.length == 0 ? null : this.queue[this.queue.length - 1];
	if(last) {
		last.next = executor;
	}
	
	executor.parent = this;
	executor.onSuccessBackup = executor.onSuccess;
	executor.onSuccess = function(result) {
		this.onSuccessBackup(result);
		if(this.next) {
			this.next.run()
		} else {
			this.parent.onSuccess();
		}
	}
	executor.onExceptionBackup = executor.onException;
	executor.onException = function(executor, ex) {
		this.onExceptionBackup(executor, ex);

		if(this.parent.continueOnException) {
			if(this.next) {
				this.next.run()
			} else {
				this.parent.onSuccess();
			}
		} else {
			this.parent.onException(executor, ex);
		}
	}

	this.queue.push(executor);
}
JSSpec.CompositeExecutor.prototype.run = function() {
	if(this.queue.length > 0) {
		this.queue[0].run();
	}
}



// Spec is a set of Examples in a specific context
JSSpec.Spec = function(context, entries) {
	this.id = JSSpec.Spec.id++;
	this.context = context;
	
	this.filterEntriesByEmbeddedExpressions(entries);
	this.extractOutSpecialEntries(entries);
	this.examples = this.makeExamplesFromEntries(entries);
}
JSSpec.Spec.id = 0;
JSSpec.Spec.prototype.getExamples = function() {
	return this.examples;
}
JSSpec.Spec.prototype.hasException = function() {
	return this.getTotalFailures() > 0 || this.getTotalErrors() > 0;
}
JSSpec.Spec.prototype.getTotalFailures = function() {
	var examples = this.examples;
	var failures = 0;
	for(var i = 0; i < examples.length; i++) {
		if(examples[i].isFailure()) failures++;
	}
	return failures;
}
JSSpec.Spec.prototype.getTotalErrors = function() {
	var examples = this.examples;
	var errors = 0;
	for(var i = 0; i < examples.length; i++) {
		if(examples[i].isError()) errors++;
	}
	return errors;
}

JSSpec.Spec.prototype.filterEntriesByEmbeddedExpressions = function(entries) {
	var isTrue;
	for(name in entries) {
		var m = name.match(/\[\[(.+)\]\]/);
		if(m && m[1]) {
			eval("isTrue = (" + m[1] + ")");
			if(!isTrue) delete entries[name];
		}
	}
}
JSSpec.Spec.prototype.extractOutSpecialEntries = function(entries) {
	this.beforeEach = JSSpec.EMPTY_FUNCTION;
	this.beforeAll = JSSpec.EMPTY_FUNCTION;
	this.afterEach = JSSpec.EMPTY_FUNCTION;
	this.afterAll = JSSpec.EMPTY_FUNCTION;
	
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
JSSpec.Spec.prototype.makeExamplesFromEntries = function(entries) {
	var examples = [];
	for(name in entries) {
		examples.push(new JSSpec.Example(name, entries[name], this.beforeEach, this.afterEach));
	}
	return examples;
}
JSSpec.Spec.prototype.getExecutor = function() {
	var self = this;
	var onException = function(executor, ex) {self.exception = ex}
	
	var composite = new JSSpec.CompositeExecutor();
	composite.addFunction(function() {JSSpec.log.onSpecStart(self)});
	composite.addExecutor(new JSSpec.Executor(this.beforeAll, null, function(exec, ex) {
		self.exception = ex;
		JSSpec.log.onSpecEnd(self);
	}));
	
	var exampleAndAfter = new JSSpec.CompositeExecutor(null,null,true);
	for(var i = 0; i < this.examples.length; i++) {
		exampleAndAfter.addExecutor(this.examples[i].getExecutor());
	}
	exampleAndAfter.addExecutor(new JSSpec.Executor(this.afterAll, null, onException));
	exampleAndAfter.addFunction(function() {JSSpec.log.onSpecEnd(self)});
	composite.addExecutor(exampleAndAfter);
	
	return composite;
}




// Example
JSSpec.Example = function(name, target, before, after) {
	this.id = JSSpec.Example.id++;
	this.name = name;
	this.target = target;
	this.before = before;
	this.after = after;
}
JSSpec.Example.id = 0;
JSSpec.Example.prototype.isFailure = function() {
	return this.exception && this.exception.type == "failure";
}
JSSpec.Example.prototype.isError = function() {
	return this.exception && !this.exception.type;
}

JSSpec.Example.prototype.getExecutor = function() {
	var self = this;
	var onException = function(executor, ex) {
		self.exception = ex
	}
	
	var composite = new JSSpec.CompositeExecutor();
	composite.addFunction(function() {JSSpec.log.onExampleStart(self)});
	composite.addExecutor(new JSSpec.Executor(this.before, null, function(exec, ex) {
		self.exception = ex;
		JSSpec.log.onExampleEnd(self);
	}));
	
	var targetAndAfter = new JSSpec.CompositeExecutor(null,null,true);
	
	targetAndAfter.addExecutor(new JSSpec.Executor(this.target, null, onException));
	targetAndAfter.addExecutor(new JSSpec.Executor(this.after, null, onException));
	targetAndAfter.addFunction(function() {JSSpec.log.onExampleEnd(self)});
	
	composite.addExecutor(targetAndAfter);
	
	return composite;
}


JSSpec.Runner = function(specs, logger) {
	JSSpec.log = logger;
	this.specs = specs;
}
JSSpec.Runner.prototype.getSpecs = function() {
	return this.specs;
}
JSSpec.Runner.prototype.hasException = function() {
	return this.getTotalFailures() > 0 || this.getTotalErrors() > 0;
}
JSSpec.Runner.prototype.getTotalFailures = function() {
	var specs = this.specs;
	var failures = 0;
	for(var i = 0; i < specs.length; i++) {
		failures += specs[i].getTotalFailures();
	}
	return failures;
}
JSSpec.Runner.prototype.getTotalErrors = function() {
	var specs = this.specs;
	var errors = 0;
	for(var i = 0; i < specs.length; i++) {
		errors += specs[i].getTotalErrors();
	}
	return errors;
}

JSSpec.Runner.prototype.run = function() {
	JSSpec.log.onRunnerStart();
	var executor = new JSSpec.CompositeExecutor(function() {JSSpec.log.onRunnerEnd()},null,true);
	for(var i = 0; i < this.specs.length; i++) {
		executor.addExecutor(this.specs[i].getExecutor());
	}
	executor.run();
}



// Logger
JSSpec.Logger = function() {}

JSSpec.Logger.prototype.onRunnerStart = function() {
	var summary = document.createElement("H1");
	summary.id = "summary";
	summary.className = "ongoing";
	summary.innerHTML = 'JSSpec results <span style="font-size:0.5em;">(<span id="total_examples">0</span> examples / <span id="total_failures">0</span> failures / <span id="total_errors">0</span> errors)</span>';
	document.body.appendChild(summary);
	
	var specs = JSSpec.runner.getSpecs();

	var total_examples = 0;
		
	for(var i = 0; i < specs.length; i++) {
		var spec = specs[i];
		var div = document.createElement("DIV");
		div.id = "spec_" + spec.id;
		div.className = "waiting";
		document.body.appendChild(div);
		
		var heading = document.createElement("H2");
		heading.id = "spec_heading_" + spec.id;
		heading.className = "waiting";
		heading.appendChild(document.createTextNode(spec.context));
		div.appendChild(heading);
		
		var examples = spec.getExamples();
		
		var ul = document.createElement("UL");
		div.appendChild(ul);
		
		for(var j = 0; j < examples.length; j++) {
			total_examples++;
			var example = examples[j];
			var li = document.createElement("LI");
			li.id = "example_" + example.id;
			li.className = "waiting";
			var p = document.createElement("P");
			p.appendChild(document.createTextNode(example.name));
			li.appendChild(p);
			ul.appendChild(li);
		}
	}

	document.getElementById("total_examples").innerHTML = total_examples;
}
JSSpec.Logger.prototype.onRunnerEnd = function() {
	
}
JSSpec.Logger.prototype.onSpecStart = function(spec) {
	var div = document.getElementById("spec_" + spec.id);
	div.className = "ongoing";
	
	var heading = document.getElementById("spec_heading_" + spec.id);
	heading.className = "ongoing";
}
JSSpec.Logger.prototype.onSpecEnd = function(spec) {
	var div = document.getElementById("spec_" + spec.id);
	div.className = spec.exception ? "exception" : "success";
	
	var heading = document.getElementById("spec_heading_" + spec.id);
	heading.className = spec.hasException() ? "exception" : "success";
	
	if(spec.exception) {
		heading.appendChild(document.createTextNode(" - " + spec.exception.message));
	}
}
JSSpec.Logger.prototype.onExampleStart = function(example) {
	var li = document.getElementById("example_" + example.id);
	li.className = "ongoing";
}
JSSpec.Logger.prototype.onExampleEnd = function(example) {
	var li = document.getElementById("example_" + example.id);
	li.className = example.exception ? "exception" : "success";
	
	if(example.exception) {
		var p = document.createElement("P");
		
		var div = document.createElement("DIV");
		div.innerHTML = example.exception.message;
		p.appendChild(div);
		
		p.appendChild(document.createTextNode(" at " + example.exception.fileName + ", line " + example.exception.lineNumber));
		li.appendChild(p);
	}
	
	var summary = document.getElementById("summary");
	var runner = JSSpec.runner;
	
	summary.className = runner.hasException() ? "exception" : "success";
	document.getElementById("total_failures").innerHTML = runner.getTotalFailures();
	document.getElementById("total_errors").innerHTML = runner.getTotalErrors();

}



// Include Matcher
JSSpec.IncludeMatcher = function(actual, expected, condition) {
	this.actual = actual;
	this.expected = expected;
	this.condition = condition;
	this.match = false;
	this.explaination = this.makeExplain();
}
JSSpec.IncludeMatcher.createInstance = function(actual, expected, condition) {
	return new JSSpec.IncludeMatcher(actual, expected, condition);
}
JSSpec.IncludeMatcher.prototype.matches = function() {
	return this.match;
}
JSSpec.IncludeMatcher.prototype.explain = function() {
	return this.explaination;
}
JSSpec.IncludeMatcher.prototype.makeExplain = function() {
	if(typeof this.actual.length == 'undefined') {
		return this.makeExplainForNotArray();
	} else {
		return this.makeExplainForArray();
	}
}
JSSpec.IncludeMatcher.prototype.makeExplainForNotArray = function() {
	var sb = [];
	sb.push('<p>actual value:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual) + '</p>');
	sb.push('<p>should ' + (this.condition ? '' : 'not') + ' include:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected) + '</p>');
	sb.push('<p>but since it\s not an array, include or not doesn\'t make any sense.</p>');
	return sb.join("");
}
JSSpec.IncludeMatcher.prototype.makeExplainForArray = function() {
	if(this.condition) {
		for(var i = 0; i < this.actual.length; i++) {
			var matches = JSSpec.EqualityMatcher.createInstance(this.expected, this.actual[i]).matches();
			if(matches) {
				this.match = true;
				break;
			}
		}
	} else {
		for(var i = 0; i < this.actual.length; i++) {
			var matches = JSSpec.EqualityMatcher.createInstance(this.expected, this.actual[i]).matches();
			if(matches) {
				this.match = false;
				break;
			}
		}
	}
	
	if(this.match) return "";
	
	var sb = [];
	sb.push('<p>actual value:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual, false, this.condition ? null : i) + '</p>');
	sb.push('<p>should ' + (this.condition ? '' : 'not') + ' include:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected) + '</p>');
	return sb.join("");
}




// Property length Matcher
JSSpec.PropertyLengthMatcher = function(num, property, o, condition) {
	this.num = num;
	this.o = o;
	this.property = property;
	if((property == 'characters' || property == 'items') && typeof o.length != 'undefined') {
		this.property = 'length';
	}
	
	this.condition = condition;
	this.conditionMet = function(x) {
		if(condition == 'exactly') return x.length == num;
		if(condition == 'at least') return x.length >= num;
		if(condition == 'at most') return x.length <= num;

		throw "Unknown condition '" + condition + "'";
	};
	this.match = false;
	this.explaination = this.makeExplain();
}
JSSpec.PropertyLengthMatcher.prototype.makeExplain = function() {
	if(this.o._type == 'String' && this.property == 'length') {
		this.match = this.conditionMet(this.o);
		return this.match ? '' : this.makeExplainForString();
	} else if(typeof this.o.length != 'undefined' && this.property == "length") {
		this.match = this.conditionMet(this.o);
		return this.match ? '' : this.makeExplainForArray();
	} else if(typeof this.o[this.property] != 'undefined' && this.o[this.property] != null) {
		this.match = this.conditionMet(this.o[this.property]);
		return this.match ? '' : this.makeExplainForObject();
	} else if(typeof this.o[this.property] == 'undefined' || this.o[this.property] == null) {
		this.match = false;
		return this.makeExplainForNoProperty();
	}

	this.match = true;
}
JSSpec.PropertyLengthMatcher.prototype.makeExplainForString = function() {
	var sb = [];
	
	var exp = this.num == 0 ?
		'be an <strong>empty string</strong>' :
		'have <strong>' + this.condition + ' ' + this.num + ' characters</strong>';
	
	sb.push('<p>actual value has <strong>' + this.o.length + ' characters</strong>:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.o) + '</p>');
	sb.push('<p>but it should ' + exp + '.</p>');
	
	return sb.join("");
}
JSSpec.PropertyLengthMatcher.prototype.makeExplainForArray = function() {
	var sb = [];
	
	var exp = this.num == 0 ?
		'be an <strong>empty array</strong>' :
		'have <strong>' + this.condition + ' ' + this.num + ' items</strong>';

	sb.push('<p>actual value has <strong>' + this.o.length + ' items</strong>:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.o) + '</p>');
	sb.push('<p>but it should ' + exp + '.</p>');
	
	return sb.join("");
}
JSSpec.PropertyLengthMatcher.prototype.makeExplainForObject = function() {
	var sb = [];

	var exp = this.num == 0 ?
		'be <strong>empty</strong>' :
		'have <strong>' + this.condition + ' ' + this.num + ' ' + this.property + '.</strong>';

	sb.push('<p>actual value has <strong>' + this.o[this.property].length + ' ' + this.property + '</strong>:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.o, false, this.property) + '</p>');
	sb.push('<p>but it should ' + exp + '.</p>');
	
	return sb.join("");
}
JSSpec.PropertyLengthMatcher.prototype.makeExplainForNoProperty = function() {
	var sb = [];
	
	sb.push('<p>actual value:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.o) + '</p>');
	sb.push('<p>should have <strong>' + this.condition + ' ' + this.num + ' ' + this.property + '</strong> but there\'s no such property.</p>');
	
	return sb.join("");
}
JSSpec.PropertyLengthMatcher.prototype.matches = function() {
	return this.match;
}
JSSpec.PropertyLengthMatcher.prototype.explain = function() {
	return this.explaination;
}

JSSpec.PropertyLengthMatcher.createInstance = function(num, property, o, condition) {
	return new JSSpec.PropertyLengthMatcher(num, property, o, condition);
}



// Equality Matcher
JSSpec.EqualityMatcher = {}

JSSpec.EqualityMatcher.createInstance = function(expected, actual) {
	if(expected == null || actual == null) {
		return new JSSpec.NullEqualityMatcher(expected, actual);
	} else if(expected._type == actual._type) {
		if(expected._type == "String") {
			return new JSSpec.StringEqualityMatcher(expected, actual);
		} else if(expected._type == "Date") {
			return new JSSpec.DateEqualityMatcher(expected, actual);
		} else if(expected._type == "Number") {
			return new JSSpec.NumberEqualityMatcher(expected, actual);
		} else if(expected._type == "Array") {
			return new JSSpec.ArrayEqualityMatcher(expected, actual);
		} else if(expected._type == "Boolean") {
			return new JSSpec.BooleanEqualityMatcher(expected, actual);
		}
	}
	
	return new JSSpec.ObjectEqualityMatcher(expected, actual);
}
JSSpec.EqualityMatcher.basicExplain = function(expected, actual, expectedDesc, actualDesc) {
	var sb = [];
	
	sb.push(actualDesc || '<p>actual value:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(actual) + '</p>');
	sb.push(expectedDesc || '<p>should be:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(expected) + '</p>');
	
	return sb.join("");
}
JSSpec.EqualityMatcher.diffExplain = function(expected, actual) {
	var sb = [];

	sb.push('<p>diff:</p>');
	sb.push('<p style="margin-left:2em;">');
	
	var dmp = new diff_match_patch();
	var diff = dmp.diff_main(expected, actual);
	dmp.diff_cleanupEfficiency(diff);
	
	sb.push(JSSpec.util.inspect(dmp.diff_prettyHtml(diff), true));
	
	sb.push('</p>');
	
	return sb.join("");
}



JSSpec.BooleanEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
}
JSSpec.BooleanEqualityMatcher.prototype.explain = function() {
	var sb = [];
	
	sb.push('<p>actual value:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual) + '</p>');
	sb.push('<p>should be:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected) + '</p>');
	
	return sb.join("");
}
JSSpec.BooleanEqualityMatcher.prototype.matches = function() {
	return this.expected == this.actual;
}



JSSpec.NullEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
}
JSSpec.NullEqualityMatcher.prototype.matches = function() {
	return this.expected == this.actual;
}
JSSpec.NullEqualityMatcher.prototype.explain = function() {
	return JSSpec.EqualityMatcher.basicExplain(this.expected, this.actual);
}



JSSpec.DateEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
}
JSSpec.DateEqualityMatcher.prototype.matches = function() {
	return this.expected.getTime() == this.actual.getTime();
}
JSSpec.DateEqualityMatcher.prototype.explain = function() {
	var sb = [];
	
	sb.push(JSSpec.EqualityMatcher.basicExplain(this.expected, this.actual));
	sb.push(JSSpec.EqualityMatcher.diffExplain(this.expected.toString(), this.actual.toString()));

	return sb.join("");
}



JSSpec.ObjectEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
	this.match = this.expected == this.actual;
	this.explaination = this.makeExplain();
}
JSSpec.ObjectEqualityMatcher.prototype.matches = function() {return this.match}
JSSpec.ObjectEqualityMatcher.prototype.explain = function() {return this.explaination}
JSSpec.ObjectEqualityMatcher.prototype.makeExplain = function() {
	
	if(this.expected == this.actual) {
		this.match = true;
		return "";
	}
	
	if(JSSpec.util.isDomNode(this.expected)) {
		return this.makeExplainForDomNode();
	}
	
	for(var key in this.expected) {
		var expectedHasItem = this.expected[key] != null && typeof this.expected[key] != 'undefined';
		var actualHasItem = this.actual[key] != null && typeof this.actual[key] != 'undefined';
		if(expectedHasItem && !actualHasItem) return this.makeExplainForMissingItem(key);
	}
	for(var key in this.actual) {
		var expectedHasItem = this.expected[key] != null && typeof this.expected[key] != 'undefined';
		var actualHasItem = this.actual[key] != null && typeof this.actual[key] != 'undefined';
		if(actualHasItem && !expectedHasItem) return this.makeExplainForUnknownItem(key);
	}
	
	for(var key in this.expected) {
		var matcher = JSSpec.EqualityMatcher.createInstance(this.expected[key], this.actual[key]);
		if(!matcher.matches()) return this.makeExplainForItemMismatch(key);
	}
		
	this.match = true;
}
JSSpec.ObjectEqualityMatcher.prototype.makeExplainForDomNode = function(key) {
	var sb = [];
	
	sb.push(JSSpec.EqualityMatcher.basicExplain(this.expected, this.actual));
//	sb.push(JSSpec.EqualityMatcher.diffExplain(this.expected.toString(), this.actual.toString()));
	
	return sb.join("");
}
JSSpec.ObjectEqualityMatcher.prototype.makeExplainForMissingItem = function(key) {
	var sb = [];

	sb.push('<p>actual value has no item named <strong>' + JSSpec.util.inspect(key) + '</strong></p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual, false, key) + '</p>');
	sb.push('<p>but it should have the item whose value is <strong>' + JSSpec.util.inspect(this.expected[key]) + '</strong></p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected, false, key) + '</p>');
	
	return sb.join("");
}
JSSpec.ObjectEqualityMatcher.prototype.makeExplainForUnknownItem = function(key) {
	var sb = [];

	sb.push('<p>actual value has item named <strong>' + JSSpec.util.inspect(key) + '</strong></p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual, false, key) + '</p>');
	sb.push('<p>but there should be no such item</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected, false, key) + '</p>');
	
	return sb.join("");
}
JSSpec.ObjectEqualityMatcher.prototype.makeExplainForItemMismatch = function(key) {
	var sb = [];

	sb.push('<p>actual value has an item named <strong>' + JSSpec.util.inspect(key) + '</strong> whose value is <strong>' + JSSpec.util.inspect(this.actual[key]) + '</strong></p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual, false, key) + '</p>');
	sb.push('<p>but it\'s value should be <strong>' + JSSpec.util.inspect(this.expected[key]) + '</strong></p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected, false, key) + '</p>');
	
	return sb.join("");
}



JSSpec.ArrayEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
	this.match = this.expected == this.actual;
	this.explaination = this.makeExplain();
}
JSSpec.ArrayEqualityMatcher.prototype.matches = function() {return this.match}
JSSpec.ArrayEqualityMatcher.prototype.explain = function() {return this.explaination}
JSSpec.ArrayEqualityMatcher.prototype.makeExplain = function() {
	if(this.expected.length != this.actual.length) return this.makeExplainForLengthMismatch();
	
	for(var i = 0; i < this.expected.length; i++) {
		var matcher = JSSpec.EqualityMatcher.createInstance(this.expected[i], this.actual[i]);
		if(!matcher.matches()) return this.makeExplainForItemMismatch(i);
	}
		
	this.match = true;
}
JSSpec.ArrayEqualityMatcher.prototype.makeExplainForLengthMismatch = function() {
	return JSSpec.EqualityMatcher.basicExplain(
		this.expected,
		this.actual,
		'<p>but it should be <strong>' + this.expected.length + '</strong></p>',
		'<p>actual value has <strong>' + this.actual.length + '</strong> items</p>'
	);
}
JSSpec.ArrayEqualityMatcher.prototype.makeExplainForItemMismatch = function(index) {
	var postfix = ["th", "st", "nd", "rd", "th"][Math.min((index + 1) % 10,4)];
	
	var sb = [];

	sb.push('<p>' + (index + 1) + postfix + ' item (index ' + index + ') of actual value is <strong>' + JSSpec.util.inspect(this.actual[index]) + '</strong>:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual, false, index) + '</p>');
	sb.push('<p>but it should be <strong>' + JSSpec.util.inspect(this.expected[index]) + '</strong>:</p>');
	sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.expected, false, index) + '</p>');
	
	return sb.join("");
}


JSSpec.NumberEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
}
JSSpec.NumberEqualityMatcher.prototype.matches = function() {
	if(this.expected == this.actual) return true;
}
JSSpec.NumberEqualityMatcher.prototype.explain = function() {
	return JSSpec.EqualityMatcher.basicExplain(this.expected, this.actual);
}



JSSpec.StringEqualityMatcher = function(expected, actual) {
	this.expected = expected;
	this.actual = actual;
}
JSSpec.StringEqualityMatcher.prototype.matches = function() {
	if(this.expected == this.actual) return true;
}
JSSpec.StringEqualityMatcher.prototype.explain = function() {
	var sb = [];

	sb.push(JSSpec.EqualityMatcher.basicExplain(this.expected, this.actual));
	sb.push(JSSpec.EqualityMatcher.diffExplain(this.expected, this.actual));	
	return sb.join("");
}



JSSpec.PatternMatcher = function(actual, pattern, condition) {
	this.actual = actual;
	this.pattern = pattern;
	this.condition = condition;
	this.match = false;
	this.explaination = this.makeExplain();
}
JSSpec.PatternMatcher.createInstance = function(actual, pattern, condition) {
	return new JSSpec.PatternMatcher(actual, pattern, condition);
}
JSSpec.PatternMatcher.prototype.makeExplain = function() {
	if(this.actual == null || this.actual._type != 'String') {
		var sb = [];
		sb.push('<p>actual value:</p>');
		sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual) + '</p>');
		sb.push('<p>should ' + (this.condition ? '' : 'not') + ' match with pattern:</p>');
		sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.pattern) + '</p>');
		sb.push('<p>but pattern matching cannot be performed.</p>');
		return sb.join("");
	} else {
		this.match = this.condition == !!this.actual.match(this.pattern);
		if(this.match) return "";
		
		var sb = [];
		sb.push('<p>actual value:</p>');
		sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.actual) + '</p>');
		sb.push('<p>should ' + (this.condition ? '' : 'not') + ' match with pattern:</p>');
		sb.push('<p style="margin-left:2em;">' + JSSpec.util.inspect(this.pattern) + '</p>');
		return sb.join("");
	}
	
}
JSSpec.PatternMatcher.prototype.matches = function() {
	return this.match;
}
JSSpec.PatternMatcher.prototype.explain = function() {
	return this.explaination;
}



// Domain Specific Languages
JSSpec.DSL = {};



JSSpec.DSL.forString = {
	asHtml: function() {
		var html = this;
			
		// Uniformize quotation, turn tag names and attribute names into lower case
		html = html.replace(/<(\/?)(\w+)([^>]*?)>/img, function(str, closingMark, tagName, attrs) {
			var sortedAttrs = JSSpec.util.sortHtmlAttrs(JSSpec.util.correctHtmlAttrQuotation(attrs).toLowerCase())
			return "<" + closingMark + tagName.toLowerCase() + sortedAttrs + ">"
		})
		
		// validation self-closing tags
		html = html.replace(/<br([^>]*?)>/mg, function(str, attrs) {
			return "<br" + attrs + " />"
		})
		html = html.replace(/<hr([^>]*?)>/mg, function(str, attrs) {
			return "<hr" + attrs + " />"
		})
		html = html.replace(/<img([^>]*?)>/mg, function(str, attrs) {
			return "<img" + attrs + " />"
		})
		
		// append semi-colon at the end of style value
		html = html.replace(/style="(.*)"/mg, function(str, styleStr) {
			styleStr = JSSpec.util.sortStyleEntries(styleStr.strip()); // for Safari
			if(styleStr.charAt(styleStr.length - 1) != ';') styleStr += ";"
			
			return 'style="' + styleStr + '"'
		})
		
		// sort style entries
		
		// remove empty style attributes
		html = html.replace(/ style=";"/mg, "")
		
		// remove new-lines
		html = html.replace(/\r/mg, '')
		html = html.replace(/\n/mg, '')
		html = html.replace(/(>[^<>]*?)\s+([^<>]*?<)/mg, '$1$2')
		
		return html;
	}
}



JSSpec.DSL.describe = function(context, entries) {
	JSSpec.specs.push(new JSSpec.Spec(context, entries));
}
JSSpec.DSL.expect = function(target) {
	if(JSSpec._secondPass) return {}
	
	var subject = new JSSpec.DSL.Subject(target);
	return subject;
}
JSSpec.DSL.Subject = function(target) {
	this.target = target;
}
JSSpec.DSL.Subject.prototype._type = 'Subject';
JSSpec.DSL.Subject.prototype.should_be = function(expected) {
	var matcher = JSSpec.EqualityMatcher.createInstance(expected, this.target);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
}
JSSpec.DSL.Subject.prototype.should_not_be = function(expected) {
	// TODO JSSpec.EqualityMatcher should support 'condition'
	var matcher = JSSpec.EqualityMatcher.createInstance(expected, this.target);
	if(matcher.matches()) {
		JSSpec._assertionFailure = {message:"'" + this.target + "' should not be '" + expected + "'"};
		throw JSSpec._assertionFailure;
	}
},
JSSpec.DSL.Subject.prototype.should_be_empty = function() {
	this.should_have(0, this.getType() == 'String' ? 'characters' : 'items');
},
JSSpec.DSL.Subject.prototype.should_be_true = function() {
	this.should_be(true);
},
JSSpec.DSL.Subject.prototype.should_be_false = function() {
	this.should_be(false);
},
JSSpec.DSL.Subject.prototype._should_have = function(num, property, condition) {
	var matcher = JSSpec.PropertyLengthMatcher.createInstance(num, property, this.target, condition);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
},
JSSpec.DSL.Subject.prototype.should_have = function(num, property) {
	this._should_have(num, property, "exactly");
},
JSSpec.DSL.Subject.prototype.should_have_exactly = function(num, property) {
	this._should_have(num, property, "exactly");
},
JSSpec.DSL.Subject.prototype.should_have_at_least = function(num, property) {
	this._should_have(num, property, "at least");
},
JSSpec.DSL.Subject.prototype.should_have_at_most = function(num, property) {
	this._should_have(num, property, "at most");
},
JSSpec.DSL.Subject.prototype.should_include = function(expected) {
	var matcher = JSSpec.IncludeMatcher.createInstance(this.target, expected, true);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
},
JSSpec.DSL.Subject.prototype.should_not_include = function(expected) {
	var matcher = JSSpec.IncludeMatcher.createInstance(this.target, expected, false);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
},
JSSpec.DSL.Subject.prototype.should_match = function(pattern) {
	var matcher = JSSpec.PatternMatcher.createInstance(this.target, pattern, true);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
},
JSSpec.DSL.Subject.prototype.should_not_match = function(pattern) {
	var matcher = JSSpec.PatternMatcher.createInstance(this.target, pattern, false);
	if(!matcher.matches()) {
		JSSpec._assertionFailure = {message:matcher.explain()};
		throw JSSpec._assertionFailure;
	}
}

JSSpec.DSL.Subject.prototype.getType = function() {
	if(typeof this.target == 'undefined') {
		return 'undefined';
	} else if(this.target == null) {
		return 'null';
	} else if(this.target._type) {
		return this.target._type;
	} else if(JSSpec.util.isDomNode(this.target)) {
		return 'DomNode';
	} else {
		return 'object';
	}
}



JSSpec.util = {
	parseOptions: function() {
		var options = {};
		
		var url = location.href;
		var queryIndex = url.indexOf('?');
		if(queryIndex == -1) return options;
		
		var query = url.substring(queryIndex + 1);
		var pairs = query.split('&');
		for(var i = 0; i < pairs.length; i++) {
			var tokens = pairs[i].split('=');
			options[tokens[0]] = tokens[1];
		}
		
		return options;
	},
	correctHtmlAttrQuotation: function(html) {
		html = html.replace(/(\w+)=['"]([^'"]+)['"]/mg,function (str, name, value) {return name + '=' + '"' + value + '"'});
		html = html.replace(/(\w+)=([^ '"]+)/mg,function (str, name, value) {return name + '=' + '"' + value + '"'});
		html = html.replace(/'/mg, '"');
		
		return html;
	},
	sortHtmlAttrs: function(html) {
		var attrs = []
		html.replace(/((\w+)="[^"]+")/mg, function(str, matched) {
			attrs.push(matched);
		})
		return attrs.length == 0 ? "" : " " + attrs.sort().join(" ");
	},
	sortStyleEntries: function(styleText) {
		var entries = styleText.split(/; /);
		return entries.sort().join("; ");
	},
	escapeHtml: function(str) {
		if(!this._div) {
			this._div = document.createElement("DIV");
			this._text = document.createTextNode('');
			this._div.appendChild(this._text);
		}
		this._text.data = str;
		return this._div.innerHTML;
	},
	isDomNode: function(o) {
		// TODO: make it more stricter
		return (typeof o.nodeName == 'string') && (typeof o.nodeType == 'number');
	},
	inspectDomPath: function(o) {
		var sb = [];
		while(o && o.nodeName != '#document' && o.parent) {
			var siblings = o.parentNode.childNodes;
			for(var i = 0; i < siblings.length; i++) {
				if(siblings[i] == o) {
					sb.push(o.nodeName + (i == 0 ? '' : '[' + i + ']'));
					break;
				}
			}
			o = o.parentNode;
		}
		return sb.join(" &gt; ");
	},
	inspectDomNode: function(o) {
		if(o.nodeType == 1) {
			var sb = [];
			sb.push('<span class="dom_value">');
			sb.push("&lt;");
			sb.push(o.nodeName);
			
			var attrs = o.attributes;
			for(var i = 0; i < attrs.length; i++) {
				if(
					attrs[i].nodeValue &&
					attrs[i].nodeName != 'contentEditable' &&
					attrs[i].nodeName != 'style' &&
					typeof attrs[i].nodeValue != 'function'
				) sb.push(' <span class="dom_attr_name">' + attrs[i].nodeName + '</span>=<span class="dom_attr_value">"' + attrs[i].nodeValue + '"</span>');
			}
			if(o.style && o.style.cssText) {
				sb.push(' <span class="dom_attr_name">style</span>=<span class="dom_attr_value">"' + o.style.cssText + '"</span>');
			}
			sb.push('&gt; <span class="dom_path">(' + JSSpec.util.inspectDomPath(o) + ')</span>' );
			sb.push('</span>');
			return sb.join("");
		} else if(o.nodeType == 3) {
			return '<span class="dom_value">#text ' + o.nodeValue + '</span>';
		} else {
			return '<span class="dom_value">UnknownDomNode</span>';
		}
	},
	inspect: function(o, dontEscape, emphasisKey) {
		if(typeof o == 'undefined') return '<span class="undefined_value">undefined</span>';
		if(o == null) return '<span class="null_value">null</span>';
		if(o._type == 'String') return '<span class="string_value">"' + (dontEscape ? o : JSSpec.util.escapeHtml(o)) + '"</span>';

		if(o._type == 'Date') {
			return '<span class="date_value">"' + o.toString() + '"</span>';
		}
		
		if(o._type == 'Number') return '<span class="number_value">' + (dontEscape ? o : JSSpec.util.escapeHtml(o)) + '</span>';
		
		if(o._type == 'Boolean') return '<span class="boolean_value">' + o + '</span>';

		if(o._type == 'RegExp') return '<span class="regexp_value">' + o + '</span>';

		if(JSSpec.util.isDomNode(o)) return JSSpec.util.inspectDomNode(o);

		if(o._type == 'Array' || typeof o.length != 'undefined') {
			var sb = [];
			for(var i = 0; i < o.length; i++) {
				var inspected = JSSpec.util.inspect(o[i]);
				sb.push(i == emphasisKey ? ('<strong>' + inspected + '</strong>') : inspected);
			}
			return '<span class="array_value">[' + sb.join(', ') + ']</span>';
		}
		
		// object
		var sb = [];
		for(var key in o) {
			if(key == 'should') continue;
			
			var inspected = JSSpec.util.inspect(key) + ":" + JSSpec.util.inspect(o[key]);
			sb.push(key == emphasisKey ? ('<strong>' + inspected + '</strong>') : inspected);
		}
		return '<span class="object_value">{' + sb.join(', ') + '}</span>';
	}
}

describe = JSSpec.DSL.describe;
expect = JSSpec.DSL.expect;

String.prototype._type = "String";
Number.prototype._type = "Number";
Date.prototype._type = "Date";
Array.prototype._type = "Array";
Boolean.prototype._type = "Boolean";
RegExp.prototype._type = "RegExp";

var targets = [Array.prototype, Date.prototype, Number.prototype, String.prototype, Boolean.prototype, RegExp.prototype];

String.prototype.asHtml = JSSpec.DSL.forString.asHtml;



// Main
window.onload = function() {
	var options = JSSpec.util.parseOptions();
	
	if(JSSpec.specs.length > 0) {
		if(!options.inSuite) {
			JSSpec.runner = new JSSpec.Runner(JSSpec.specs, new JSSpec.Logger());
			JSSpec.runner.run();
		} else {
			// in suite, send all specs to parent
			var parentWindow = window.frames.parent.window;
			for(var i = 0; i < JSSpec.specs.length; i++) {
				parentWindow.JSSpec.specs.push(JSSpec.specs[i]);
			}
		}
	} else {
		loadSpecs();
	}
}

function loadSpecs() {
	var links = document.getElementById('list').getElementsByTagName('A');
	var frameContainer = document.createElement('DIV');
	frameContainer.style.display = 'none';
	document.body.appendChild(frameContainer);
	
	for(var i = 0; i < links.length; i++) {
		var frame = document.createElement('IFRAME');
		frame.src = links[i].href + '?inSuite=0';
		frameContainer.appendChild(frame);
	}
}