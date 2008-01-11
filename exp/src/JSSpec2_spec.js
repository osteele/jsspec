load("/prj/jsspec/exp/src/JSSpec2.js")

with(JSSpec2) {
	__log__ = [];
	
	story("Core functions")
	
	scenario("Scenario execution")
	given({
		"plain scenario": [
		function() {
			this.scenario = new JSSpec2.Scenario("Scenario 1")
			this.scenario.givens = {
				"Given 1": [
				function() {
					__log__.push("given")
					this.a = 1
				},
				function() {
					__log__.push("cleanup")
					this.d = 4
				}]
			}
			this.scenario.events = {
				"When 1": function() {
					__log__.push("when")
					this.b = 2
				}
			}
			this.scenario.outcomes = {
				"Then 1": function() {
					__log__.push("then")
					this.c = 3
				}
			}
		},
		function() {
		}]
	})
	when({
		"the scenario runned": function() {
			this.scenario.run()
		}
	})
	then({
		"'given', 'when' and 'then' should be executed in exact order": function() {
			value_of(__log__.join(",")).should_be("given,when,then,cleanup")
		},
		"context should be preserved": function() {
			value_of(this.scenario.context.a).should_be(1)
			value_of(this.scenario.context.b).should_be(2)
			value_of(this.scenario.context.c).should_be(3)
			value_of(this.scenario.context.d).should_be(4)
		}
	})
	
	
	
	scenario("Cleanup")
	given({
		"scenario throwing an exception": [
		function() {
			this.scenario = new JSSpec2.Scenario("Scenario 1")
			this.scenario.givens = {
				"Given 1": [
				function() {
					this.cleanup = false
				},
				function() {
					this.cleanup = true
				}]
			}
			this.scenario.events = {
				"When 1": function() {
					throw "an exception"
				}
			}
			this.scenario.outcomes = {
				"Then 1": function() {}
			}
		},
		function() {}
		]
	})
	when({
		"the scenario runned": function() {
			this.scenario.run()
		}
	})
	then({
		"'givens' should be cleaned-up": function() {
			value_of(this.scenario.context.cleanup).should_be(false)
		}
	})
}

runner.run()