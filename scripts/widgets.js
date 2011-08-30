$.widget("ui.radioList", {
	options : {change : $.noop, separator : "|", selected : 0},
	_init : function() {
		var self = this;
		$.each(this.element, function() {
			
			$(this).children().wrap("<li />")
			.click(function() {
				if(!$(this).is(".radioList_selected")) {
					self.select($(this).parent().index());
					$.proxy(self.options.change, this)();
				}
			})
			.parent().prepend(
						$("<span>").text(self.options.separator)
					).wrapAll("<ul class='inline_list' />");
			
		});
		this.element.find(".inline_list span:first").remove();
		this.select(this.options.selected);
	},
	
	select : function(index) {
		this.options.selected = index;
		this.element.find(".radioList_selected").removeClass("radioList_selected");
		this.element.find($.format("a:nth(%s)", String(index))).addClass("radioList_selected");
		return this.element;
	},
	getSelected: function() {
		return this.element.find(".radioList_selected");
	}
});

$.fn.korp_autocomplete = function(options) {
	var selector = $(this);
	
	if(typeof options === "string" && options == "abort") {
		lemgramProxy.abort();
		selector.preloader("hide");
		return;
	}
	
	options = $.extend({
		type : "lem",
		select : $.noop,
		labelFunction : util.lemgramToString,
		sortFunction : view.lemgramSort
	},options);
	
	selector.preloader({
		timeout: 500,
		position: {
			my: "right center",
			at: "right center",
			offset: "-1 0",
			collision: "none"
		}
	})
	.autocomplete({
		html : true,
		source: function( request, response ) {
			
			var promise = lemgramProxy.sblexSearch(request.term, options.type)
			.done(function(idArray) {
				idArray = $.unique(idArray);
				idArray.sort(options.sortFunction);
				
				var labelArray = util.sblexArraytoString(idArray, options.labelFunction);
				var listItems = $.map(idArray, function(item, i) {
					return {
						label : labelArray[i],
						value : item,
						input : request.term
					};
				});
				
				selector.data("dataArray", listItems);
				response(listItems);
				if(selector.autocomplete("widget").height() > 300) {
					selector.autocomplete("widget").addClass("ui-autocomplete-tall");
				}
				$("#autocomplete_header").remove();	
				
				$("<li id='autocomplete_header' />")
				.localeKey("autocomplete_header")
				.css("font-weight", "bold").css("font-size", 10)
				.prependTo(selector.autocomplete("widget"));
				
				selector.preloader("hide");
			})
			.fail(function() {
				$.log("sblex fail", arguments);
			});
				
			
			selector.data("promise", promise);
		},
		search: function() {
			selector.preloader("show");
		},
		minLength: 1,
		select: function( event, ui ) {
			event.preventDefault();
			var selectedItem = ui.item.value;
			$.log("autocomplete select", options.select, selectedItem, ui.item.value, ui, event);
			
			$.proxy(options.select, selector)(selectedItem);
		},
		close : function(event) {
			return false;
		},
		focus : function() {
			return false;
		}
	});
	return selector;
};

var KorpTabs = {
	_create : function() {
//		this._super( "_create");
//		$.ui.tabs.prototype._create.call(this);
		var self = this;
		this.n = 0;
		this.urlPattern = "#custom-tab-";
		$(".tabClose").live("click", function() {
			if(!$(this).parent().is(".ui-state-disabled")) {
				var index = self.lis.index($(this).parent());
	            if (index > -1) {
	                // call _trigger to see if remove is allowed
	                if (false === self._trigger("closableClick", null, self._ui( $(self.lis[index]).find( "a" )[ 0 ], self.panels[index] ))) return;
	                // remove this tab
	                self.remove(index);
	            }
	            // don't follow the link
	            return false;
			}
		});
		this.lis.first().data("instance", kwicResults);
	},
	
	_tabify : function(init) {
//		this._super( "_tabify", init );
		this._super(init);
		this.redrawTabs();
	},
	
	redrawTabs : function() {
		$(".custom_tab").css("margin-left", "auto");
		$(".custom_tab:first").css("margin-left", 8);
	},
	
	addTab : function(klass) {
		var url = this.urlPattern + this.n;
		this.add(url, util.getLocaleString("example"));
		var li = this.element.find("li:last"); 
		this.redrawTabs();
		var instance = new klass(li, url);
		
		li.data("instance", instance);
		this.n++;
		li.find("a").trigger("mouseup");
		return instance;
	},
	
	enableAll : function() {
		var self = this;
		$.each(".custom_tab", function(i, elem) {
			self.enable(i);
		});
	},
	
	getCurrentInstance : function() {
//		var ret = this.lis.filter(".ui-tabs-active").data("instance") || null; //for jquery ui 1.9
		var ret = this.lis.filter(".ui-tabs-selected").data("instance") || null;
		$.log("getCurrentInstance", this.lis, ret);
		return ret;
	}
	
};
//$.widget( "ui.korptabs", $.ui.tabs, KorpTabs);
$.ui.tabs.subclass = $.ui.widget.subclass;
$.ui.tabs.subclass("ui.korptabs", KorpTabs);

var Sidebar = {
	options : {},
	_init : function() {
	},
	
	updateContent : function(sentenceData, wordData, corpus) {
		this.element.html('<div id="selected_sentence" /><div id="selected_word" />');
		
		var corpusObj = settings.corpora[corpus.toLowerCase()];
		$("<div />").html(
				$.format("<h4 rel='localize[corpus]'>%s</h4> <p>%s</p>", [util.getLocaleString("corpus"), corpusObj.title]))
				.prependTo("#selected_sentence");
		
		if(!$.isEmptyObject(corpusObj.struct_attributes)) {
			$("#sidebarTmpl")
			.tmpl([sentenceData], {"header" : "sentence", "corpusAttributes" : corpusObj.struct_attributes})
//			.find(".exturl").hoverIcon("ui-icon-extlink")
			.appendTo("#selected_sentence");
		}
		
		if($("#sidebarTmpl").length > 0)
			$("#sidebarTmpl")
			.tmpl([wordData], {"header" : "word", "corpusAttributes" : corpusObj.attributes, parseLemma : this._parseLemma})
			.appendTo("#selected_word");
		else
			$.error("sidebartemplate broken");
		
		this._sidebarSaldoFormat();
		//$("[data-lang=" + $.defaultLanguage.split("-")[0] + "]").click();
	},
	
	_parseLemma : function(attr) {
		var seq = [];
		if(attr != null) {
			seq = $.map(attr.split("|"), function(item) {
				return item.split(":")[0];
			});
		}
		seq = $.grep(seq, function(itm) {
			return itm && itm.length;
		});
		return $.arrayToHTMLList(seq).outerHTML();
	},
	
	_sidebarSaldoFormat : function() {
		$("#sidebar_lex, #sidebar_prefix, #sidebar_suffix").each(function() {
			var idArray = $.grep($(this).text().split("|"), function(itm) {
				return itm && itm.length;  
			}).sort();
				
			var labelArray = util.sblexArraytoString(idArray);
			$(this)
			.html($.arrayToHTMLList(labelArray))
			.find("li")
			.wrap("<a href='javascript:void(0)' />")
			.click(function() {
				var split = util.splitLemgram(idArray[$(this).parent().index()]);
				var id = $.format("%s..%s.%s", split); //split[0] + ".." + split[1] + "." + split[2];
				$.log("sidebar click", split, idArray, $(this).parent().index(), $(this).data("lemgram"));
				simpleSearch.selectLemgram(id);
			})
			.hoverIcon("ui-icon-search");
			
		});
		var $saldo = $("#sidebar_saldo"); 
		var saldoidArray = $.grep($saldo.text().split("|"), function(itm) {
			return itm && itm.length;  
		}).sort();
		var saldolabelArray = util.sblexArraytoString(saldoidArray, util.saldoToString);

		$saldo.html($.arrayToHTMLList(saldolabelArray))
		.find("li")
		.each(function(i, item){
			var id = saldoidArray[i].match(util.saldoRegExp).slice(1,3).join("..");
			$(item).wrap($.format("<a href='http://spraakbanken.gu.se/sblex/%s' target='_blank' />", id));
		})
		.hoverIcon("ui-icon-extlink");
	},
	
	refreshContent : function(mode) {
		var self = this;
		if(mode == "lemgramWarning") {
			return $.Deferred(function( dfd ){
				self.element.load("parse_warning.html", function() {
					util.localize();
					self.element.addClass("ui-state-highlight").removeClass("kwic_sidebar");
					dfd.resolve();
				});
			}).promise();
			 
		} else {
			this.element.removeClass("ui-state-highlight").addClass("kwic_sidebar");
			var instance = $('#result-container').korptabs('getCurrentInstance');
			if(instance && instance.selectionManager.selected)
				instance.selectionManager.selected.click();
			
		}
	},
	
	updatePlacement : function() {
		var max = Math.round($("#columns").position().top);
		if($(window).scrollTop() < max) {
			this.element.css("top", "");
			this.element.css("position", "absolute");
		}
		else {
			this.element.css("top", 8);
			this.element.css("position", "fixed");
		}
	},
	
	show : function(mode) {
//		$.sm.send("sidebar.show.start");
		var self = this;
		// make sure that both hide animation and content load is done before showing
		$.when(this.element).pipe(function() {
			return self.refreshContent(mode);
		}).done(function() {
			self.element.show("slide", {direction : "right"});
			$("#left-column").animate({
				right : 273
			}, null, null, function() {
				$.sm.send("sidebar.show.end");
			});
		});      
	}, 
	hide : function() {
//		$.sm.send("sidebar.hide.start");
		if($("#left-column").css("right") == "8px") return;
		var self = this;
		self.element.hide("slide", {direction : "right"});
		$("#left-column").animate({
			right : 8
		}, null, null, function() {
			$.sm.send("sidebar.hide.end");
		});
	}
};


var ExtendedToken = {
	options : {showClose : true},
	_init : function() {
		var self = this;
		
        this.element.find(".logic_switcher")
        .hide()
        .find("select").change(function() {
        	$.log("change", $(this).val());
        	self.element.find(".and_any").localeKey($(this).val());
        	self._trigger("change");
        }).end()
        .next() //close icon
        .log()
        .click(function() {
        	$.log("close");
        	self.element.remove();
        	self._trigger("close");
        });;
        
        this.table = this.element;
	    this.insertArg();
	},
	
	insertArg : function(token) {
		$.log("insertArg");
		var self = this;
	    var row = $("<tr/>").addClass("query_arg").appendTo(this.table);
	    
	    var arg_select = this.makeSelect();
	    
	    var arg_value = $("<input type='text'/>").addClass("arg_value")
	    .change(function(){
    		self._trigger("change");
		});
	    
	    var remove = $('<img src="img/minus.png">')
        .addClass("image_button")
        .addClass("remove_arg")
        .click(function(){
        	if(row.is(":last-child")) {
        		row.prev().find(".insert_arg").show();
        		row.prev().find(".and_any").hide();
        	}
        	self.removeArg(this);
        	if(self.element.find(".query_arg").length < 2)
        		self.element.find(".logic_switcher").fadeOut("fast");
    	});

	    var insert = $('<img src="img/plus.png"/>')
        .addClass("image_button")
	    .addClass("insert_arg")
	    .click(function() {
	    	self.insertArg(this);
	    	$(this).hide();
	    	$(this).prev().show();
	    	self.element.find(".logic_switcher").fadeIn("fast");
	    });
	    
//	    var closeBtn = $("<span />", {"class" : "ui-icon ui-icon-circle-close btn-icon"})
//	    .click(function() {
//	    	$(this).closest("table").remove();
//	    	self._trigger("close");
//	    });
	    
	    
	    
	    var leftCol = $("<div />").append(remove).css("display", "inline-block").css("vertical-align", "top");
	    var rightCol = $("<div />").append(arg_select, arg_value)
	    .css("display", "inline-block")
	    .css("margin-left", 5);
	    
	    if($.browser.msie && $.browser.version.slice(0, 1) == "7") { // IE7 :(
	    	// let's patch it up! (maybe I shouldn't have used inline-block)
	    	leftCol.add(rightCol).css("display", "inline");
	    	rightCol.find("input").css("float", "right");
//	    	closeBtn.css("right", "-235").css("top", "-55");
	    }
	    
	    var wrapper = $("<div />").append($("<span/>", {"class" : "and_any"}).localeKey("and").hide(), insert);
	    row.append(
	        $("<td/>").append(leftCol, rightCol, wrapper)
	    );
	    
	    if(row.is(":nth-child(2)")) {
	    	remove.css("visibility", "hidden");
	    }
	    
	    this._trigger("change");
	},
	
	removeArg : function(arg) {
	    arg = $(arg).closest(".query_arg");
	    if (arg.siblings().length >= 1) {
	        arg.remove();
	    } else {
	        arg.closest(".query_token").remove();
	    }
	    this._trigger("change");
	},
	
	makeSelect : function() {
		var arg_select = $("<select/>").addClass("arg_type")
		.change($.proxy(this.onArgTypeChange, this));

		var groups = $.extend({}, settings.arg_groups, {
			"word_attr" : getCurrentAttributes(),
			"sentence_attr" : getStructAttrs()
			});
		
		$.each(groups, function(lbl, group) {
			if($.isEmptyObject(group)) {
				return;
			}
			var optgroup = $("<optgroup/>", {label : util.getLocaleString(lbl).toLowerCase(), "data-locale-string" : lbl}).appendTo(arg_select);
			$.each(group, function(key, val) {
				if(val.displayType == "hidden")
					return;
//				var labelKey = val.label || val;
				
				$('<option/>',{rel : $.format("localize[%s]", val.label)})
				.val(key).text(util.getLocaleString(val.label) || "")
				.appendTo(optgroup)
				.data("dataProvider", val);

			});
		});
		
		var arg_opts = this.makeOptsSelect(settings.defaultOptions);
		$.log("arg_opts", arg_opts);
		
		return $("<div>", {"class" : "arg_selects"}).append(arg_select, arg_opts);
	},
	
	makeOptsSelect : function(groups) {
		var self = this;
		if($.isEmptyObject(groups)) return $("<span>", {"class" : "arg_opts"});
		return $("<select>", {"class" : "arg_opts"}).append(
				$.map(groups, function(key, value) {
					return $("<option>", {value : key}).localeKey(key).get(0);
				})
		).change(function() {
			self._trigger("change");
		});
	},
	
	refresh : function() {
		var self = this;
		this.table.find(".arg_selects").each(function() {
			var oldVal = $(this).find(".arg_type").val();
			var optVal = $(this).find(".arg_opts").val();
			var newSelects = self.makeSelect(); 
			$(this).replaceWith(newSelects);
			newSelects.find(".arg_type").val(oldVal).trigger("change");
			newSelects.find(".arg_opts").val(optVal);
		});
	},
	
	onArgTypeChange : function(event) {
		// change input widget
		var self = this;
		var target = $(event.currentTarget);
		var oldVal = target.parent().siblings(".arg_value:input[type=text]").val() || "";
		var oldOptVal = target.next().val();
		
		var data = target.find(":selected").data("dataProvider");
		$.log("didSelectArgtype ", data);
		var arg_value = null;
		switch(data.displayType) {
		case "select":
			arg_value = $("<select />");
			$.each(data.dataset, function(key, value) {
				$("<option />").localeKey(value).val(key).appendTo(arg_value);
			});
			break;
		case "autocomplete":
			$.log("displayType autocomplete");
			var type, labelFunc, sortFunc;
			if(data.label == "lemgram") {
				type = "lem";
				labelFunc = util.lemgramToString;
				sortFunc = view.lemgramSort;
			} else {
				type = "saldo";
				labelFunc = util.saldoToString;
				sortFunc = view.saldoSort;
			}
			arg_value = $("<input type='text'/>").korp_autocomplete({
				labelFunction : labelFunc,
				sortFunction : sortFunc,
				type : type, 
				select : function(lemgram) {
					$.log("extended lemgram", lemgram, $(this));
					$(this).data("value", data.label == "baseform" ? lemgram.split(".")[0] : lemgram);
					$(this).attr("placeholder", labelFunc(lemgram, true).replace(/<\/?[^>]+>/gi, '')).val("").blur().placeholder();
				}
			})
			.change(function(event) {
				$.log("value null");
				$(this).attr("placeholder", null)
				.data("value", null)
				.placeholder();
			}).blur(function() {
				var input = this;
				setTimeout(function() {
					$.log("blur");
					//if($(this).autocomplete("widget").is(":visible")) return;
					if(util.isLemgramId($(input).val()) || $(input).data("value") != null)
						$(input).removeClass("invalid_input");
					else {
						$(input).addClass("invalid_input")
						.attr("placeholder", null)
						.data("value", null)
						.placeholder();
					}
					self._trigger("change");
				}, 100);
			});
			break;
		case "date":
			// at some point, fix this.
		default:
			arg_value = $("<input type='text'/>");
			break;
		} 
		
		if(target.val() == "anyword") {
			arg_value.css("visibility", "hidden");
		}
		
		arg_value.addClass("arg_value")
	    .change(function() {
	    	self._trigger("change");
	    });
		
		target.parent().siblings(".arg_value").replaceWith(arg_value);
		target.next().replaceWith(this.makeOptsSelect(data.opts || settings.defaultOptions));
		target.next().val(oldOptVal);
		
		if(oldVal != null && oldVal.length)
			arg_value.val(oldVal);
		
		this._trigger("change");
	},
	
	getCQP : function() {
		var self = this;
	    var query = {token: [], min: "", max: ""};

	    var args = {};
	    this.table.find(".query_arg").each(function(){
	        var type = $(this).find(".arg_type").val();
	        var data = $(this).find(".arg_type :selected").data("dataProvider");
	        var value = $(this).find(".arg_value").val();
	        var opt = $(this).find(".arg_opts").val();
	        
	        if(data.displayType == "autocomplete") {
	        	value = null;
	        }
	        if (!args[type]) { 
	        	args[type] = []; 
	    	}
	        args[type].push({
	        	data : data, 
	        	value : value || $(this).find(".arg_value").data("value") || "",
	        	opt : opt
        	});
	    });
	    
	    $.each(args, function(type, valueArray) {
	    	var inner_query = [];
	    	
	    	if(settings.outer_args[type] != null) {
	    		settings.outer_args[type](query, $.map(args[type], function(item) {
	            	return item.value;
	            }));
	    		return;
	    	} 
	    	$.each(valueArray, function(i, obj) {
	    		function defaultArgsFunc(s, op) {
	    			var operator = obj.data.type == "set" ? "contains" : "=";
	    			var not_operator = obj.data.type == "set" ? "not contains" : "!=";
	    			var prefix = obj.data.isStructAttr != null ? "_." : "";
	    			var formatter = op == "matches" ? function(arg) {return arg;} : regescape;
	    			var value = formatter(s);
	    			op = {
	    					"is" : [operator, "", value, ""],
	    					"is_not" : [not_operator, "", value, ""],
	    					"starts_with" : ["=", "", value, ".*"],
	    					"ends_with" : ["=", ".*", value, ""],
	    					"matches" : ["=", "", value, ""]
	    				}[op];
	    			
	    			return $.format('%s%s %s "%s%s%s"', [prefix, type].concat(op));
	    		};
	    		var argFunc = settings.inner_args[type] ||  defaultArgsFunc; 
	    		inner_query.push(argFunc(obj.value, obj.opt || settings.defaultOptions));
	    	});
	    	if (inner_query.length) {
	    		var op = self.element.find("select").first().val() == "or" ? " | " : " & ";
	    		query.token.push(inner_query.join(op));
	    	}
	    	
	    });
	    var query_string = "[" + query.token.join(" & ") + "]";
	    if (query.min | query.max) {
	        query_string += "{" + (query.min || 0) + "," + query.max + "}";
	    }
	    return query_string;
	}
};
$.widget("ui.sidebar", Sidebar);
$.widget("ui.extendedToken", ExtendedToken);