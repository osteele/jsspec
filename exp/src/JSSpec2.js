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
 
JSSpec2 = {
	DSL: {
		Epic: function(title) {
			var epic = new JSSpec2.Epic();
			epic.title = title;
			JSSpec2.Epics[title] = epic;
			return epic;
		},
		Given_for_epic: function() {
		},
		
		Story: function() {},
		Given_for_story: function() {},
		As_a: function() {},
		I_want: function() {},
		So_that: function() {},
		
		Scenario: function() {},
		Given_for_scenario: function() {},
		When: function() {},
		Then: function() {},
		
		Given: function() {}
	},
	
	Epics: {}
}

JSSpec2.Epic = function() {
}