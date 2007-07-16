// defining namespace
JSSpec = {
	specs: []
}



// Browser detection code
JSSpec.Browser = {
	Trident: navigator.appName == "Microsoft Internet Explorer",
	Webkit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
	Gecko: navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
	Presto: navigator.appName == "Opera"
}



// Cross-platform exception handler. It helps to collect exact line number where exception occured.
JSSpec.Executor = function(target, onSuccess, onException) {
	this.target = target;
	this.onSuccess = typeof onSuccess == 'function' ? onSuccess : function() {};
	this.onException = typeof onException == 'function' ? onException : function() {};
	
	if(JSSpec.Browser.Trident) {
		window.onerror = function(message, fileName, lineNumber) {
			var self = window._curExecutor;
			var ex = {message:message, fileName:fileName, lineNumber:lineNumber};

			if(JSSpec._secondPass)  {
				ex = self.mergeExceptions(JSSpec._assertionFailure, ex);
				delete JSSpec._secondPass;
				delete JSSpec._assertionFailure;
				
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
		lineNumber:normalException.lineNumber,
		expected:assertionFailure.expected,
		actual:assertionFailure.actual
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
					if(JSSpec.Browser.Webkit) ex = {message:ex.message, fileName:ex.sourceUrl, lineNumber:ex.line}
					
					if(JSSpec._secondPass)  {
						ex = self.mergeExceptions(JSSpec._assertionFailure, ex);
						delete JSSpec._secondPass;
						delete JSSpec._assertionFailure;
						
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
	this.onSuccess = typeof onSuccess == 'function' ? onSuccess : function() {};
	this.onException = typeof onException == 'function' ? onException : function() {};
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
	this.context = context;
	
	this.extractOutSpecialEntries(entries);
	this.examples = this.makeExamplesFromEntries(entries);
}
JSSpec.Spec.prototype.extractOutSpecialEntries = function(entries) {
	this.beforeEach = function() {};
	this.beforeAll = function() {};
	this.afterEach = function() {};
	this.afterAll = function() {};
	
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
	var onException = function(executor, ex) {document.title += '{' + ex.lineNumber + "," + ex.message + '}'};

	var composite = new JSSpec.CompositeExecutor();
	composite.addExecutor(new JSSpec.Executor(this.beforeAll, null, onException));
	
	var exampleAndAfter = new JSSpec.CompositeExecutor(null,null,true);
	for(var i = 0; i < this.examples.length; i++) {
		exampleAndAfter.addExecutor(this.examples[i].getExecutor());
	}
	exampleAndAfter.addExecutor(new JSSpec.Executor(this.afterAll, null, onException));
	composite.addExecutor(exampleAndAfter);
	return composite;
}




// Example
JSSpec.Example = function(name, target, before, after) {
	this.name = name;
	this.target = target;
	this.before = before;
	this.after = after;
}
JSSpec.Example.prototype.getExecutor = function() {
	var onException = function(executor, ex) {document.title += '{' + ex.lineNumber + "," + ex.message + '}'};
	
	var composite = new JSSpec.CompositeExecutor();
	composite.addExecutor(new JSSpec.Executor(this.before, null, onException));
	
	var targetAndAfter = new JSSpec.CompositeExecutor(null,null,true);

	targetAndAfter.addExecutor(new JSSpec.Executor(this.target, null, onException));
	targetAndAfter.addExecutor(new JSSpec.Executor(this.after, null, onException));
	
	composite.addExecutor(targetAndAfter);

	return composite;
}



// Domain Specific Languages
JSSpec.DSL = {};
JSSpec.DSL.describe = function(context, entries) {
	JSSpec.specs.push(new JSSpec.Spec(context, entries));
}
JSSpec.DSL.assertion = {
	should:function() {
		if(JSSpec._secondPass) return {}
		
		var self = this;
		return {
			be: function(expected) {
				if(self != expected) {
					JSSpec._assertionFailure = {message:"AssertionFailure", expected:expected, actual:self};
					throw JSSpec._assertionFailure;
				}
			}
		}
	}
}

describe = JSSpec.DSL.describe;

String.prototype.should = JSSpec.DSL.assertion.should;



// Main
window.onload = function() {
	var runner = new JSSpec.CompositeExecutor(null,null,true);
	for(var i = 0; i < JSSpec.specs.length; i++) {
		runner.addExecutor(JSSpec.specs[i].getExecutor());
	}
	runner.run();
}