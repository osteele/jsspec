load("/prj/jsspec/exp/src/JSSpec2.js")

with(JSSpec2) {
	story("Core functions")
		scenario("Polymorphic 'Scenario.addGiven' - object")
		given("Empty scenario", {scenario: new JSSpec2.Scenario("Scenario 1")})
		when("'addGiven' is called with an object", function() {
			this.scenario.addGiven("Two numbers", {a:1, b:2})
			this.scenario.run()
		})
		then("contents of the object should be copied into context", function() {
			value_of(this.scenario.context.a).should_be(1)
			value_of(this.scenario.context.b).should_be(2)
		})
		
		
		
		scenario("Polymorphic 'Scenario.addGiven' - function")
		given("Empty scenario", {scenario: new JSSpec2.Scenario("Scenario 1")})
		when("'addGiven' is called with an object", function() {
			this.scenario.addGiven("Two numbers", function() {
				this.a = 1
				this.b = 2
			})
			this.scenario.run()
		})
		then("contents of the object should be copied into context", function() {
			value_of(this.scenario.context.a).should_be(1)
			value_of(this.scenario.context.b).should_be(2)
		})
		
		
		
		scenario("Scenario.addEvent")
		given("Empty scenario", {scenario: new JSSpec2.Scenario("Scenario 1")})
		when("'addEvent' is called with a event function", function() {
			this.scenario.addEvent("Event 1", function() {
				this.a = 1
			})
			this.scenario.run()
		})
		then("the function should be executed", function() {
			value_of(this.scenario.context.a).should_be(1)
		})

		
		
		scenario("Polymorphic 'Scenario.addOutcome' - object")
		given("Empty scenario", {scenario: new JSSpec2.Scenario("Scenario 1")})
		when("'addOutcome' is called with an object", function() {
			this.scenario.addGiven("Given 1", {a:1})
			this.scenario.addOutcome("Outcome 1", {a:1})
			this.scenario.run()
		})
		then("object matching should be performed", function() {
			value_of(this.scenario.isPassed()).should_be(true)
		})



		scenario("Polymorphic 'Scenario.addOutcome' - function")
		given("Empty scenario", {scenario: new JSSpec2.Scenario("Scenario 1")})
		when("'addOutcome' is called with a function", function() {
			this.scenario.addOutcome("Outcome 1", function() {
				this.a = 1
			})
			this.scenario.run()
		})
		then("the function should be executed", function() {
			value_of(this.scenario.context.a).should_be(1)
		})



		scenario("Scenario execution")
		given("plain scenario", function() {
			this.scenario = new JSSpec2.Scenario("Scenario 1")
			this.scenario.addGiven(
				"Given 1",
				function() {
					this.log = []
					this.log.push("given")
					this.a = 1
				},
				function() {
					this.log.push("cleanup")
					this.d = 4
				}
			)
			this.scenario.addEvent("When 1", function() {
				this.log.push("when")
				this.b = 2
			})
			this.scenario.addOutcome("Then 1", function() {
				this.log.push("then")
				this.c = 3
			})
		})
		when("the scenario runned", function() {
			this.scenario.run()
		})
		then("'given', 'when' and 'then' should be executed in exact order", function() {
			value_of(this.scenario.context.log.join(",")).should_be("given,when,then,cleanup")
		})
		and("context should be preserved", function() {
			value_of(this.scenario.context.a).should_be(1)
			value_of(this.scenario.context.b).should_be(2)
			value_of(this.scenario.context.c).should_be(3)
			value_of(this.scenario.context.d).should_be(4)
		})
		and("the scenario should be passed", function() {
			value_of(this.scenario.isPassed()).should_be(true)
		})
		
		
		
		scenario("Cleanup")
		given("scenario throwing an exception", function() {
			this.scenario = new JSSpec2.Scenario("Scenario 1")
			this.scenario.addGiven(
				"Given 1",
				function() {this.cleanup = false},
				function() {this.cleanup = true}
			)
			this.scenario.addEvent("When 1", function() {
				throw "an exception"
			})
		})
		when("the scenario runned", function() {
			this.scenario.run()
		})
		then("'givens' should be cleaned-up", function() {
			value_of(this.scenario.context.cleanup).should_be(true)
		})
}

runner.run()