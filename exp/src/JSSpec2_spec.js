load("/prj/jsspec/exp/src/JSSpec2.js")

with(JSSpec2) {
	story("Fullstack DSL for BDD")
		as_a("spec writer")
		i_want("to write specs in fullstack DSL")
		so_that("the specs can be read and understood as easily as possible")
		
		scenario("High level APIs should be defined")
			given("JSSpec2 instance", {v: JSSpec2})
			when("loaded", function() {})
			then("BDD vocabulary should be defined as functions", function() {
				value_of(this.v.story).should_be_function()
				value_of(this.v.as_a).should_be_function()
				value_of(this.v.i_want).should_be_function()
				value_of(this.v.so_that).should_be_function()
				value_of(this.v.scenario).should_be_function()
				value_of(this.v.given).should_be_function()
				value_of(this.v.when).should_be_function()
				value_of(this.v.then).should_be_function()
				value_of(this.v.and).should_be_function()
			})
	
	story("Expectation APIs")
		scenario("Boolean expectation")
			given("boolean expectations are in test mode", function() {
				this.true_1 = new JSSpec2.Expectation(true); this.true_1.set_mode("test")
				this.true_2 = new JSSpec2.Expectation(true); this.true_2.set_mode("test")
				this.false_1 = new JSSpec2.Expectation(false); this.false_1.set_mode("test")
				this.false_2 = new JSSpec2.Expectation(false); this.false_2.set_mode("test")
			})
			when("runner performs various tests", function() {
				this.true_1.should_be(true)
				this.true_2.should_be_true()
				this.false_1.should_be(false)
				this.false_2.should_be_false()
			})
			then("the tests should be performed correctly", function() {
				value_of(this.true_1.is_passed()).should_be_true()
				value_of(this.true_2.is_passed()).should_be_true()
				value_of(this.false_1.is_passed()).should_be_true()
				value_of(this.false_2.is_passed()).should_be_true()
			})
		
		scenario("Type expectation")
			given("type expectations are in test mode", function() {
				this.function_type = new JSSpec2.Expectation(function() {}); this.function_type.set_mode("test")
				this.string_type = new JSSpec2.Expectation("Hello"); this.string_type.set_mode("test")
				// TODO: Add more types such as boolean, number, array, date, regex, object, ...
			})
			when("runner performs various tests", function() {
				this.function_type.should_be_function()
				this.string_type.should_be_string()
			})
			then("the tests should be performed correctly", function() {
				value_of(this.function_type.is_passed()).should_be_true()
				value_of(this.string_type.is_passed()).should_be_true()
			})

	
	
	// -----------------------------------------------------------------------
	
	story("Temporary specs for bootstrap")
		scenario("polymorphic 'Scenario.add_given' - object")
			given("empty scenario", {scenario: new JSSpec2.Scenario("scenario 1")})
			when("'addGiven' is called with an object", function() {
				this.scenario.add_given("two numbers", {a:1, b:2})
				this.scenario.run()
			})
			then("contents of the object should be copied into context", function() {
				value_of(this.scenario.context.a).should_be(1)
				value_of(this.scenario.context.b).should_be(2)
			})
		
		scenario("polymorphic 'Scenario.add_given' - function")
			given("empty scenario", {scenario: new JSSpec2.Scenario("scenario 1")})
			when("'addGiven' is called with an object", function() {
				this.scenario.add_given("two numbers", function() {
					this.a = 1
					this.b = 2
				})
				this.scenario.run()
			})
			then("contents of the object should be copied into context", function() {
				value_of(this.scenario.context.a).should_be(1)
				value_of(this.scenario.context.b).should_be(2)
			})
		
		scenario("scenario.add_event")
			given("empty scenario", {scenario: new JSSpec2.Scenario("scenario 1")})
			when("'addEvent' is called with a event function", function() {
				this.scenario.add_event("event 1", function() {
					this.a = 1
				})
				this.scenario.run()
			})
			then("the function should be executed", function() {
				value_of(this.scenario.context.a).should_be(1)
			})

		scenario("polymorphic 'Scenario.add_outcome' - object")
			given("empty scenario", {scenario: new JSSpec2.Scenario("scenario 1")})
			when("'addOutcome' is called with an object", function() {
				this.scenario.add_given("given 1", {a:1})
				this.scenario.add_outcome("outcome 1", {a:1})
				this.scenario.run()
			})
			then("object matching should be performed", function() {
				value_of(this.scenario.is_passed()).should_be_true()
			})

		scenario("polymorphic 'Scenario.add_outcome' - function")
			given("empty scenario", {scenario: new JSSpec2.Scenario("scenario 1")})
			when("'addOutcome' is called with a function", function() {
				this.scenario.add_outcome("outcome 1", function() {
					this.a = 1
				})
				this.scenario.run()
			})
			then("the function should be executed", function() {
				value_of(this.scenario.context.a).should_be(1)
			})

		scenario("scenario execution")
			given("plain scenario", function() {
				this.scenario = new JSSpec2.Scenario("scenario 1")
				this.scenario.add_given(
					"given 1",
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
				this.scenario.add_event("when 1", function() {
					this.log.push("when")
					this.b = 2
				})
				this.scenario.add_outcome("then 1", function() {
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
				value_of(this.scenario.is_passed()).should_be_true()
			})
}

runner.run()