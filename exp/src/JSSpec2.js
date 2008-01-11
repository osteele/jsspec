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
	alias: function(name, resource) {
		
	},
	story: function(name) {
		this.current_story = new JSSpec2.Story(name);
		this.current_scenario = null;
		
		runner.addStory(this.current_story);
	},
	scenario: function(name) {
		this.current_scenario = new JSSpec2.Scenario(name);
		this.current_story.addScenario(this.current_scenario);
	},
	given: function(givens) {
		this.current_scenario.givens = givens;
	},
	
	when: function(events) {
		this.current_scenario.events = events;
	},
	
	then: function(outcomes) {
		this.current_scenario.outcomes = outcomes;
	},
	
	value_of: function(value) {
		return new JSSpec2.Expectation(value);
	},
	
	run: function() {
		this.current_scenario.run();
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
	
	this.run = function() {
		this.context = {};
		
		try {
			// setup "givens"
			for(var key in this.givens) this.givens[key][0].apply(this.context);
		
			// execute "events"
			for(var key in this.events) this.events[key].apply(this.context);
		
			// check "outcomes"
			for(var key in this.outcomes) this.outcomes[key].apply(this.context);
		} catch(e) {
			// TODO
		} finally {
			// cleanup "givens"
			for(var key in this.givens) {
				try {
					this.givens[key][1].apply(this.context);
				} catch(ignored) {}
			}
		}
	}
}

JSSpec2.Expectation = function(actual_value) {
	this.should_be = function(expected_value) {
		if(expected_value != actual_value) {
			print("[" + actual_value + "] should be [" + expected_value + "]");
		}
	}
}

// Main
var runner = new JSSpec2.RhinoRunner();