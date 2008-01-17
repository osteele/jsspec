/**
 * JSSpec2
 *
 * Copyright 2007 Alan Kang
 *  - mailto:jania902@gmail.com
 *  - http://jania.pe.kr
 *
 * http://jania.pe.kr/aw/moin.cgi/JSSpec2
 *
 * Dependencies:
 *  - diff_match_patch.js ( http://code.google.com/p/google-diff-match-patch )
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
var JSSpec2 = {
	last_method: null,
	
	story: function(name) {
		this.current_story = new JSSpec2.Story(name);
		this.current_scenario = null;
		
		runner.add_story(this.current_story);
	},
	as_a: function(role) {
		this.current_story.set_role(role);
	},
	i_want: function(feature) {
		this.current_story.set_feature(feature);
	},
	so_that: function(benefit) {
		this.current_story.set_benefit(benefit);
	},
	scenario: function(name) {
		this.current_scenario = new JSSpec2.Scenario(name);
		this.current_story.add_scenario(this.current_scenario);
	},
	given: function(name, before, after) {
		this.current_scenario.add_given(name, before, after);
		this.last_method = "given";
	},
	when: function(name, event) {
		this.current_scenario.add_event(name, event);
		this.last_method = "when";
	},
	then: function(name, outcome) {
		this.current_scenario.add_outcome(name, outcome);
		this.last_method = "then";
	},
	and: function() {
		this[this.last_method].apply(this, arguments);
	},
	
	value_of: function(value) {
		return new JSSpec2.Expectation(value);
	}
};

JSSpec2.RhinoRunner = function() {
	this.stories = [];
	
	this.add_story = function(story) {
		this.stories.push(story);
	}
	
	this.run = function() {
		for(var i = 0; i < this.stories.length; i++) {
			this.stories[i].run();
		}
	}
};

JSSpec2.PlainTextLoader = function() {
	this.currnet_story = null;
	
	this.interprete = function(message) {
		var lines = message.split("\n");
		for(var i = 0; i < lines.length; i++) {
			this.interprete_line(JSSpec2.UTILS.strip(lines[i]));
		}
	}
	
	this.get_story = function() {
		return this.current_story;
	}
	
	this.interprete_line = function(line) {
		if(line.indexOf("Story:") == 0) {
			this.current_story = new JSSpec2.Story(line.match(/^Story\:\s*(.*)/i)[1]);
		} else if(line.indexOf("As a") == 0) {
			this.current_story.set_role(line.match(/^As a\s*(.*)/i)[1]);
		} else if(line.indexOf("I want") == 0) {
			this.current_story.set_feature(line.match(/^I want\s*(.*)/i)[1]);
		} else if(line.indexOf("So that") == 0) {
			this.current_story.set_benefit(line.match(/^So that\s*(.*)/i)[1]);
		} else if(line.indexOf("Scenario:") == 0) {
			this.current_scenario = new JSSpec2.Scenario();
			this.current_story.add_scenario(this.current_scenario);
		} else {
			// just ignore
		}
	}
};

JSSpec2.Story = function(title) {
	this.title = title;
	this.role = null;
	this.feature = null;
	this.benefit = null;
	
	this.scenarios = [];
	
	this.set_role = function(role) {
		this.role = role;
	}
	
	this.set_feature = function(feature) {
		this.feature = feature;
	}
	
	this.set_benefit = function(benefit) {
		this.benefit = benefit;
	}
	
	this.add_scenario = function(scenario) {
		this.scenarios.push(scenario);
	}
	
	this.get_title = function() {return this.title;}
	this.get_role = function() {return this.role;}
	this.get_feature = function() {return this.feature;}
	this.get_benefit = function() {return this.benefit;}
	this.get_scenarios = function() {return this.scenarios;}
	
	
	this.run = function() {
		for(var i = 0; i < this.scenarios.length; i++) {
			this.scenarios[i].run();
		}
	}
};

JSSpec2.Scenario = function(name) {
	this.name = name;
	this.passed = true;
	this.exception = null;
	
	this.context = {};
	this.givens = {};
	this.events = {};
	this.outcomes = {};
	
	this.add_given = function() {
		if(arguments.length >= 2 && typeof arguments[1] == "function") {
			this._add_given_function.apply(this, arguments);
		} else {
			this._add_given_object.apply(this, arguments);
		}
	}
	
	this.add_event = function(name, f) {
		this.events[name] = f;
	}
	
	this.add_outcome = function(name, f) {
		if(arguments.length >= 2 && typeof arguments[1] == "function") {
			this._add_outcome_function.apply(this, arguments);
		} else {
			this._add_outcome_object.apply(this, arguments);
		}
	}
	
	this.is_passed = function() {
		return this.passed;
	}
	
	this._add_given_function = function(name, before, after) {
		this.givens[name] = { 
			"before": before,
			"after": after || JSSpec2.EMPTY_FUNCTION
		}
	}
	
	this._add_given_object = function(name, o) {
		this.givens[name] = { 
			"before": function() {
				for(var key in o) if(o.hasOwnProperty(key)) {
					this[key] = o[key];
				}
			},
			"after": JSSpec2.EMPTY_FUNCTION
		}
	}
	
	this._add_outcome_function = function(name, f) {
		this.outcomes[name] = f;
	}
	
	this._add_outcome_object = function(name, o) {
		this.outcomes[name] = function() {
			for(var key in o) if(o.hasOwnProperty(key)) {
				JSSpec2.value_of(this[key]).should_be(o[key]);
			}
		}
	}
	
	this.run = function() {
		try {
			// setup "givens"
			for(var key in this.givens) {
				this.givens[key].before.apply(this.context);
			}
		
			// execute "events"
			for(var key in this.events) this.events[key].apply(this.context);
		
			// check "outcomes"
			for(var key in this.outcomes) this.outcomes[key].apply(this.context);
		} catch(e) {
			this.passed = false;
			this.exception = e;
		} finally {
			// cleanup "givens"
			for(var key in this.givens) {
				try {
					this.givens[key].after.apply(this.context);
				} catch(ignored) {}
			}
		}
		
		if(!this.passed) {
			print(this.name);
			print('=====');
			print('Given ');
			for(var key in this.givens) {
				print(' - ' + key);
			}
			print('When ');
			for(var key in this.events) {
				print(' - ' + key);
			}
			print('Then ');
			for(var key in this.outcomes) {
				print(' - ' + key);
			}
			print('Message ');
			print(' - ' + this.exception);
			
			print(' ');
		}
	}
}

JSSpec2.Step = function(message, args, context, handler) {
	this.message = message;
	this.args = args;
	this.context = context;
	this.handler = handler;
	
	this.run = function() {
		this.handler.apply(this.context, [this.args]);
	}
}

JSSpec2.Expectation = function(actual_value) {
	this.mode = "first_pass";
	this.passed = true;
	
	this.is_passed = function() {
		return this.passed
	}
	this.set_mode = function(mode) {
		this.mode = mode;
	}
	
	/*
	 * boolean tests
	 */
	this.should_be_true = function() {this.should_be(true);}
	this.should_be_false = function() {this.should_be(false);}
	this.should_be = function(expected_value) {
		if(expected_value != actual_value) {
			this.passed = false;
			if(this.mode == "test") {
				// do nothing
			} else {
				throw "[" + actual_value + "] should be [" + expected_value + "]";
			}
		}
	}
	
	/*
	 * type tests
	 */
	this.should_be_function = function() {this.should_be_type("function");}
	this.should_be_string = function() {this.should_be_type("string");}
	this.should_be_boolean = function() {this.should_be_type("boolean");}
	this.should_be_number = function() {this.should_be_type("number");}
	this.should_be_array = function() {this.should_be_type("array");}
	this.should_be_date = function() {this.should_be_type("date");}
	this.should_be_regexp = function() {this.should_be_type("regexp");}
	this.should_be_object = function() {this.should_be_type("object");}
	
	this.should_be_type = function(expected_type) {
		var actual_type = this._typeof(actual_value);
		
		if(expected_type != actual_type) {
			this.passed = false;
			if(this.mode == "test") {
				// do nothing
			} else {
				throw "[" + actual_value + "] should be a " + expected_type + " but [" + actual_type + "]";
			}
		}
	}
	this._typeof = function(o) {
		var ctor = o.constructor;
		
		if(ctor == Array) {
			return "array";
		} else if(ctor == Date) {
			return "date";
		} else if(ctor == RegExp) {
			return "regexp";
		} else {
			return typeof o;
		}
	}
}



JSSpec2.EMPTY_FUNCTION = function() {}



JSSpec2.UTILS = {};
JSSpec2.UTILS.strip = function(str) {
	return str.replace(/^\s+/, '').replace(/\s+$/, '');
}



// Main
var runner = new JSSpec2.RhinoRunner();