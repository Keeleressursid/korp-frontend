//************
// Result view objects
//************



var KWICResults = {
	
	initialize : function() {
		if(!Modernizr.inputtypes.number) {
			var $select = $('<select name="num_hits" id="num_hits"></div>');
			$("#num_hits").replaceWith($select);
			
			$.each([25, 50, 75, 100], function(i, item) {
				$("<option />").attr("value", item).text(item).appendTo($select);
			});
			$select.val(25)
			.css("margin-right", 5)
			.change(function() {
				$.log("select", $(this).val());
			});
		}
	},
		
	renderTable : function(data) {
		var self = this;
		if(data.ERROR) {
			$.error("json fetch error: " + $.dump(data.ERROR));
			$("#results-table").empty();
			$("#Pagination").empty();
			kwicResults.hidePreloader();
			return;
		} 
		if(!num_result) {
			buildPager(data.hits);
		}
		num_result = data.hits;
		$('#num-result').html(data.hits);
		if(!data.hits) {

			$.log("no kwic results");
			$("#results-table").empty();
			$("#Pagination").empty();
			kwicResults.hidePreloader();
			return;
		}				


		var effectSpeed = 100;
		if($.trim($("#results-table").html()).length) {
			$("#results").fadeOut(effectSpeed, function() {
				$("#results-table").empty();
				self.renderTable(data);
			});
			return;
		}
		else {
			$("#results").hide();
		}
		if($("#sidebar").css("right") == "0px" && !$("#result-container").tabs("option", "selected")) {
			showSidebar();
		}
		$.log("corpus_results");
		
		$.each(data.kwic, function(i,sentence){
			var offset = 0; 
		    var splitObj = {
		    		"left" : selectLeft(sentence, offset),
		    		"match" : selectMatch(sentence),
		    		"right" : selectRight(sentence)
		    };
		    
			$( "#sentenceTmpl" ).tmpl( splitObj, {rowIndex : i})
					.appendTo( "#results-table" )
					.find(".word")
					.click(function(event) {
							event.stopPropagation();
							util.SelectionManager.select($(this));
							var clickedWord = parseInt($(this).attr("name").split("-")[1]);
							var data = sentence.tokens[offset + clickedWord];
							updateSidebar(sentence.structs, data, sentence.corpus);
						}
							
					);
			
			$('.result_table tr:even').addClass('alt');
		});
//			make the first matched word selected by default.
		$(".match").children().first().click();
		$("#results").fadeIn(effectSpeed);
		
		kwicResults.centerScrollbar();
		kwicResults.hidePreloader();
	},
		
	centerScrollbar : function() {
		if(!$(".match").first().length) return;
		$("#table_scrollarea").scrollLeft(0);
		var matchLeft = $(".match").first().position().left;
		var sidebarWidth = $("#sidebar").outerWidth() || 0;
		$("#table_scrollarea").scrollLeft(matchLeft - ($("body").innerWidth() - sidebarWidth ) / 2);
	},
		
	showPreloader : function() {
		$("<div class='spinner' />").appendTo("#result-container li:first")
		.spinner({innerRadius: 5, outerRadius: 7, dashes: 8, strokeWidth: 3});
	},
	hidePreloader : function() {
		$("#result-container li:first .spinner").remove();
	},
	
	getCurrentRow : function() {
		return $(".token_selected").closest("tr").find(".word");
	},
	
	selectNext : function() {
		var i = this.getCurrentRow().index($(".token_selected").get(0));
		var next = this.getCurrentRow().get(i+1);
		if(next == null) return;
		util.SelectionManager.select($(next));
	},
	selectPrev : function() {
		var i = this.getCurrentRow().index($(".token_selected").get(0));
		if(i == 0) return;
		var prev = this.getCurrentRow().get(i-1);
		util.SelectionManager.select($(prev));
	}
	

};

var LemgramResults = {
		
	initialize : function() {
		
	},
	
	renderHeader : function(wordClass) {
		$.log("renderHeader", $("#results-lemgram"));
		var colorArray = ["color_blue", "color_purple", "color_green", "color_yellow", "color_azure", "color_red"];
		var $parent = $("<div id='lemgram_help' />").prependTo("#results-lemgram");
		
		$(".lemgram_result").each(function(i) {
			if($(this).data("rel")) {
				var color = colorArray.shift();
				$($.format("<span>%s</span>", wordClass == "av" ? util.getLocaleString("head") : $(this).data("rel")))
				.addClass(color)
				.appendTo($parent)
				.tooltip({
					delay : 600,
					bodyHandler : function() {
						return util.getLocaleString("tooltip_" + $(this).text());
					}
				})
				.mouseenter(function(event) {
					$(".lemgram_result." + $(this).attr("class")).addClass("lemgram_highlight");
				})
				.mouseleave(function() {
					$(".lemgram_result." + $(this).attr("class")).removeClass("lemgram_highlight");
				});
				$(this).addClass(color)
				.css("border-color", $(this).css("background-color"));
			}
			else {
				$($.format("<span><b>%s</b></span>", $(this).data("word")))
				.appendTo($parent);
			}
				
		});
		
		$("</label><input id='wordclassChk' type='checkbox' /><label rel='localize[show_wordclass]' for='wordclassChk'>").appendTo($parent)
		.change(function() {
			if($(this).is(":checked")) {
				$("#results-lemgram .wordclass_suffix").show();
			}
			else {
				$("#results-lemgram .wordclass_suffix").hide();
			}
		
		}).filter("label").css("margin-left", "5px");
		
		util.localize();
	},
	
	renderResults : function (lemgram, data) {
		var self = this;
//			"_" represents the actual word in the order
		var order = {
			vb : "SS,_,IO,OO,OA,RA,TA".split(","),
			nn : "AT,_,ET".split(","),
			av :"_,AT".split(",")
		};
		var wordClass = util.splitLemgram(lemgram)[1].slice(0, 2);
		
		if(order[wordClass] == null) {
			lemgramResults.showNoResults();
			return;
		}
		
		$.log("wordClass", lemgram, wordClass);
		var relMapping = {};
		var sortedList = [];
		$.each(data, function(index, item) {
			var toIndex = $.inArray(item.rel, order[wordClass]);
			if(toIndex == -1) {
				$.log("getting rel index failed for " + item.rel);
				return;
			}
			if(!sortedList[toIndex]) sortedList[toIndex] = [];
			sortedList[toIndex].push(item); 
		});
		
		$.each(sortedList, function(index, list) {
			if(list) {
				list.sort(function(first, second) {
					return second.freq - first.freq;
				});
			}
		});
		var toIndex = $.inArray("_", order[wordClass]);
		sortedList.splice(toIndex, 0, {"word" : util.lemgramToString(lemgram).split(" ")[0]});
		sortedList = $.grep ( sortedList, function(item, index){
			return Boolean(item);
		});
		
		$("#lemgramRowTmpl").tmpl(sortedList, {lemgram : lemgram, isAdj : wordClass == "av"})
		.appendTo("#results-lemgram")
		.addClass("lemgram_result")
		.find("#example_link").addClass("ui-icon ui-icon-document")
		.css("cursor", "pointer")
		.click($.proxy(this.onClickExample, this));
		
		// splits up the label
		$("#results-lemgram td:first-child").each(function() {
			var $siblings = $(this).parent().siblings().find("td:first-child");
			
			var siblingLemgrams = $.map($siblings, function(item) {
				return $(item).data("lemgram").slice(0, -1);
			});
			var hasHomograph = $.inArray($(this).data("lemgram").slice(0, -1), siblingLemgrams) != -1;
			var prefix = $(this).data("depextra").length ? $(this).data("depextra") + " " : "";
//				prefix = "";
			$(this).html(prefix + util.lemgramToString($(this).data("lemgram"), hasHomograph));
			
		});
		$("#results-lemgram .wordclass_suffix").hide();
			
		this.renderHeader(wordClass);
		$('#results-wraper').show();
		util.localize();
		this.hidePreloader();
	},
	
	onClickExample : function(event) {
		$("#dialog").remove();
		var self = this;
		this.showPreloader();
		var $target = $(event.currentTarget);
		$.ajax({ url : settings.cgi_script, 
			data:{
				command : 'relations_sentences',
				head : $target.data("head"),
				dep : $target.data("dep"),
				rel : $target.data("rel"),
				depextra : $target.data("depextra"),
				corpus : $target.data("corpus").split(",")
			},
			success: function(data) {
				$.log("example success", data);
				self.hidePreloader();
				if(data.ERROR) {
					$.error($.dump(data));
					return;
				} else if(data.hits == 0) {
					$.log("An error has occurred: no results from example, head: " + $target.data("head"));
					var pElems = $("<i>An error occurred while fetching examples.</i>");
				} else {
					var pElems = $.map(data.kwic, function(sentence) {
						return $.format("<li>%s</li>", $.map(sentence.tokens, function(token, i) {
							var prefix = postfix = "";
							if(sentence.match.start == i)
								prefix = "<b>";
							else if(sentence.match.end == (i))
								postfix = "</b>";
							return prefix + token.word + postfix;
						}).join(" ").replace(/\s([\.,\:])/g, "$1"));
					}).join("\n");
				}
				
				
				$($.format("<div id='dialog' title='%s'></div>", util.getLocaleString("example_dialog_header")))
				.appendTo("#results-lemgram").append("<ol />")
				.dialog({
					width : 600,
					height : 500
				})
				.find("ol").html(pElems);
			}
		});
	},
	
	showNoResults : function() {
		this.hidePreloader();
		$("#results-lemgram")
		.append($.format("<p><i rel='localize[no_lemgram_results]'>%s</i></p>", util.getLocaleString("no_lemgram_results")));
	},
	
	hideWordclass : function() {
		$("#results-lemgram td:first-child").each(function() {
			$(this).html($.format("%s <span class='wordClass'>%s</span>", $(this).html().split(" ")));
		});
	},
	
	showPreloader : function() {
		$("<div class='spinner' />").appendTo("#result-container li:nth-child(3)")
		.spinner({innerRadius: 5, outerRadius: 7, dashes: 8, strokeWidth: 3});
	},
	hidePreloader : function() {
		$("#result-container li:nth-child(3) .spinner").remove();
	}
		
};


var StatsResults = {
	
	initialize : function() {
	},
		
	renderTable : function(data) {
		
		$("#results-stats").empty();
		
		var wordArray = [];
		var corpusArray = [];
		
		$.each(data, function(corpus, obj) {
			if(corpus == "time") return;
			corpusArray.push(corpus);
			$.each(obj, function(word, freq) {
				if($.inArray(word, wordArray) == -1)
					wordArray.push(word);
			});
		});
		
		
		$("#results-wraper").show();
		$("#statTableTmpl").tmpl(data, {wordArray : wordArray, corpusArray : corpusArray})
		.appendTo("#results-stats");
		
		$("#results-stats").append($("<div />").css("clear", "both"));
		statsResults.hidePreloader();
	},
	
	showError : function() {
		this.hidePreloader();
		$("<p rel='localize[error_occurred]>")
		.text(util.getLocaleString("error_occurred"))
		.appendTo("#results-stats");
	},
	
	showPreloader : function() {
		$("<div class='spinner' />").appendTo("#result-container li:nth-child(4)")
		.spinner({innerRadius: 5, outerRadius: 7, dashes: 8, strokeWidth: 3});
	},
	hidePreloader : function() {
		$("#result-container li:nth-child(4) .spinner").remove();
	}
};


view.KWICResults = new Class(KWICResults);
view.LemgramResults = new Class(LemgramResults);
view.StatsResults = new Class(StatsResults);
delete KWICResults;
delete LemgramResults;
delete StatsResults;