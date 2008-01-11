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
	given: function(givens) {
		// make new current scenario
		this.current_scenario = new JSSpec2.Scenario();
		runner.addScenario(this.current_scenario);
		
		// set givens into current scenario
		this.current_scenario.givens = givens;
	},
	
	when: function(events) {
		// set events into current scenario
		this.current_scenario.events = events;
	},
	
	then: function(outcomes) {
		// set expected outcomes into current scenario
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
	this.scenarios = [];
	
	this.addScenario = function(scenario) {
		this.scenarios.push(scenario);
	}
	
	this.run = function() {
		for(var i = 0; i < this.scenarios.length; i++) {
			this.scenarios[i].run();
		}
	}
}

JSSpec2.Scenario = function() {
	this.run = function() {
		this.context = {};
		
		for(var key in this.givens) {
			this.givens[key].apply(this.context);
		}
		
		for(var key in this.events) {
			this.events[key].apply(this.context);
		}
		
		for(var key in this.outcomes) {
			this.outcomes[key].apply(this.context);
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