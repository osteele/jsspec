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

JSSpec2.Story = function(name) {
	this.name = name;
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
	this.should_be_type = function(expected_type) {
		var actual_type = typeof actual_value;
		
		if(expected_type != actual_type) {
			this.passed = false;
			if(this.mode == "test") {
				// do nothing
			} else {
				throw "[" + actual_value + "] should be a " + expected_type + " but [" + actual_type + "]";
			}
		}
	}
}

JSSpec2.EMPTY_FUNCTION = function() {}

// Main
var runner = new JSSpec2.RhinoRunner();