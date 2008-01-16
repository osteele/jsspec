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
		
		runner.addStory(this.current_story);
	},
	scenario: function(name) {
		this.current_scenario = new JSSpec2.Scenario(name);
		this.current_story.addScenario(this.current_scenario);
	},
	given: function(name, before, after) {
		this.current_scenario.addGiven(name, before, after);
		this.last_method = "given";
	},
	when: function(name, event) {
		this.current_scenario.addEvent(name, event);
		this.last_method = "when";
	},
	then: function(name, outcome) {
		this.current_scenario.addOutcome(name, outcome);
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
	
	this.addStory = function(story) {
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
	this.scenarios = [];
	
	this.addScenario = function(scenario) {
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
	
	this.addGiven = function() {
		if(arguments.length >= 2 && typeof arguments[1] == "function") {
			this._addGivenFunction.apply(this, arguments);
		} else {
			this._addGivenObject.apply(this, arguments);
		}
	}
	
	this.addEvent = function(name, f) {
		this.events[name] = f;
	}
	
	this.addOutcome = function(name, f) {
		if(arguments.length >= 2 && typeof arguments[1] == "function") {
			this._addOutcomeFunction.apply(this, arguments);
		} else {
			this._addOutcomeObject.apply(this, arguments);
		}
	}
	
	this.isPassed = function() {
		return this.passed;
	}
	
	this._addGivenFunction = function(name, before, after) {
		this.givens[name] = { 
			"before": before,
			"after": after || JSSpec2.EMPTY_FUNCTION
		}
	}
	
	this._addGivenObject = function(name, o) {
		this.givens[name] = { 
			"before": function() {
				for(var key in o) if(o.hasOwnProperty(key)) {
					this[key] = o[key];
				}
			},
			"after": JSSpec2.EMPTY_FUNCTION
		}
	}
	
	this._addOutcomeFunction = function(name, f) {
		this.outcomes[name] = f;
	}
	
	this._addOutcomeObject = function(name, o) {
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
			print(' ');
		}
	}
}

JSSpec2.Expectation = function(actual_value) {
	this.should_be = function(expected_value) {
		if(expected_value != actual_value) {
			throw "[" + actual_value + "] should be [" + expected_value + "]";
		}
	}
}

JSSpec2.EMPTY_FUNCTION = function() {}

// Main
var runner = new JSSpec2.RhinoRunner();