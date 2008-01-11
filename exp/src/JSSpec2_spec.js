load("/prj/jsspec/exp/src/JSSpec2.js")

with(JSSpec2) {
	__log__ = [];
	
	given({"new scenario": function() {
			this.scenario = new JSSpec2.Scenario("Scenario 1")
			this.scenario.givens = {
				"Given 1": function() {
					__log__.push("given")
					this.a = 1
				}
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
		}
	})
	
	when({
		"the scenario runned": function() {
			this.scenario.run()
		}
	})
	
	then({
		"'given', 'when' and 'then' should be executed in exact order": function() {
			value_of(__log__.join(",")).should_be("given,when,then")
		},
		"context should be preserved": function() {
			value_of(this.scenario.context.a).should_be(1);
			value_of(this.scenario.context.b).should_be(2);
			value_of(this.scenario.context.c).should_be(3);
		}
	})
}

runner.run()