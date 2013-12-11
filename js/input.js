

/* **********************************************
     Begin event-manager.js
********************************************** */

( function( window, undefined ) {
	"use strict";
	var document = window.document;

	/**
	 * Handles managing all events for whatever you plug it into. Priorities for hooks are based on lowest to highest in
	 * that, lowest priority hooks are fired first.
	 */
	var EventManager = function() {
		/**
		 * Maintain a reference to the object scope so our public methods never get confusing.
		 */
		var MethodsAvailable = {
			removeFilter : removeFilter,
			applyFilters : applyFilters,
			addFilter : addFilter,
			removeAction : removeAction,
			doAction : doAction,
			addAction : addAction
		};

		/**
		 * Contains the hooks that get registered with this EventManager. The array for storage utilizes a "flat"
		 * object literal such that looking up the hook utilizes the native object literal hash.
		 */
		var STORAGE = {
			actions : {},
			filters : {}
		};

		/**
		 * Adds an action to the event manager.
		 *
		 * @param action Must contain namespace.identifier
		 * @param callback Must be a valid callback function before this action is added
		 * @param priority Defaults to 10
		 */
		function addAction( action, callback, priority ) {
			if( _validateNamespace( action ) === false || typeof callback !== 'function' ) {
				return MethodsAvailable;
			}

			priority = parseInt( ( priority || 10 ), 10 );
			_addHook( 'actions', action, callback, priority );
			return MethodsAvailable;
		}

		/**
		 * Performs an action if it exists. You can pass as many arguments as you want to this function; the only rule is
		 * that the first argument must always be the action.
		 */
		function doAction( /* action, arg1, arg2, ... */ ) {
			var args = Array.prototype.slice.call( arguments );
			var action = args.shift();

			if( _validateNamespace( action ) === false ) {
				return MethodsAvailable;
			}

			_runHook( 'actions', action, args );

			return MethodsAvailable;
		}

		/**
		 * Removes the specified action if it contains a namespace.identifier & exists.
		 *
		 * @param action The action to remove
		 */
		function removeAction( action ) {
			if( _validateNamespace( action ) === false ) {
				return MethodsAvailable;
			}

			_removeHook( 'actions', action );
			return MethodsAvailable;
		}

		/**
		 * Adds a filter to the event manager.
		 *
		 * @param filter Must contain namespace.identifier
		 * @param callback Must be a valid callback function before this action is added
		 * @param priority Defaults to 10
		 */
		function addFilter( filter, callback, priority ) {
			if( _validateNamespace( filter ) === false || typeof callback !== 'function' ) {
				return MethodsAvailable;
			}

			priority = parseInt( ( priority || 10 ), 10 );
			_addHook( 'filters', filter, callback, priority );
			return MethodsAvailable;
		}

		/**
		 * Performs a filter if it exists. You should only ever pass 1 argument to be filtered. The only rule is that
		 * the first argument must always be the filter.
		 */
		function applyFilters( /* filter, filtered arg, arg2, ... */ ) {

			var args = Array.prototype.slice.call( arguments );
			var filter = args.shift();

			if( _validateNamespace( filter ) === false ) {
				return MethodsAvailable;
			}

			return _runHook( 'filters', filter, args );
		}

		/**
		 * Removes the specified filter if it contains a namespace.identifier & exists.
		 *
		 * @param filter The action to remove
		 */
		function removeFilter( filter ) {
			if( _validateNamespace( filter ) === false ) {
				return MethodsAvailable;
			}

			_removeHook( 'filters', filter );
			return MethodsAvailable;
		}

		/**
		 * Removes the specified hook by resetting the value of it.
		 *
		 * @param type Type of hook, either 'actions' or 'filters'
		 * @param hook The hook (namespace.identifier) to remove
		 * @private
		 */
		function _removeHook( type, hook ) {
			if( STORAGE[ type ][ hook ] ) {
				STORAGE[ type ][ hook ] = [];
			}
		}

		/**
		 * Validates that the hook has both a namespace and an identifier.
		 *
		 * @param hook The hook we are checking for namespace and identifier for.
		 * @return {Boolean} False if it does not contain both or is incorrect. True if it has an appropriate namespace & identifier.
		 * @private
		 */
		function _validateNamespace( hook ) {
			if( typeof hook !== 'string' ) {
				return false;
			}
			var identifier = hook.replace( /^\s+|\s+$/i, '' ).split( '.' );
			var namespace = identifier.shift();
			identifier = identifier.join( '.' );

			return ( namespace !== '' && identifier !== '' );
		}

		/**
		 * Adds the hook to the appropriate storage container
		 *
		 * @param type 'actions' or 'filters'
		 * @param hook The hook (namespace.identifier) to add to our event manager
		 * @param callback The function that will be called when the hook is executed.
		 * @param priority The priority of this hook. Must be an integer.
		 * @private
		 */
		function _addHook( type, hook, callback, priority ) {
			var hookObject = {
				callback : callback,
				priority : priority
			};

			// Utilize 'prop itself' : http://jsperf.com/hasownproperty-vs-in-vs-undefined/19
			var hooks = STORAGE[ type ][ hook ];
			if( hooks ) {
				hooks.push( hookObject );
				hooks = _hookInsertSort( hooks );
			}
			else {
				hooks = [ hookObject ];
			}

			STORAGE[ type ][ hook ] = hooks;
		}

		/**
		 * Use an insert sort for keeping our hooks organized based on priority. This function is ridiculously faster
		 * than bubble sort, etc: http://jsperf.com/javascript-sort
		 *
		 * @param hooks The custom array containing all of the appropriate hooks to perform an insert sort on.
		 * @private
		 */
		function _hookInsertSort( hooks ) {
			var tmpHook, j, prevHook;
			for( var i = 1, len = hooks.length; i < len; i++ ) {
				tmpHook = hooks[ i ];
				j = i;
				while( ( prevHook = hooks[ j - 1 ] ) &&  prevHook.priority > tmpHook.priority ) {
					hooks[ j ] = hooks[ j - 1 ];
					--j;
				}
				hooks[ j ] = tmpHook;
			}

			return hooks;
		}

		/**
		 * Runs the specified hook. If it is an action, the value is not modified but if it is a filter, it is.
		 *
		 * @param type 'actions' or 'filters'
		 * @param hook The hook ( namespace.identifier ) to be ran.
		 * @param args Arguments to pass to the action/filter. If it's a filter, args is actually a single parameter.
		 * @private
		 */
		function _runHook( type, hook, args ) {
			var hooks = STORAGE[ type ][ hook ];
			if( typeof hooks === 'undefined' ) {
				if( type === 'filters' ) {
					return args[0];
				}
				return false;
			}

			for( var i = 0, len = hooks.length; i < len; i++ ) {
				if( type === 'actions' ) {
					hooks[ i ].callback.apply( undefined, args );
				}
				else {
					args[ 0 ] = hooks[ i ].callback.apply( undefined, args );
				}
			}

			if( type === 'actions' ) {
				return true;
			}

			return args[ 0 ];
		}

		// return all of the publicly available methods
		return MethodsAvailable;

	};
	
	window.wp = window.wp || {};
	window.wp.hooks = new EventManager();

} )( window );


/* **********************************************
     Begin acf.js
********************************************** */

/*
*  input.js
*
*  All javascript needed for ACF to work
*
*  @type	awesome
*  @date	1/08/13
*
*  @param	N/A
*  @return	N/A
*/ 

var acf = {
	
	// vars
	l10n				: {},
	o					: {},
	
	
	// functions
	get					: null,
	update				: null,
	_e					: null,
	get_atts			: null,
	get_fields			: null,
	get_uniqid			: null,
	serialize_form		: null,
	
	
	// hooks
	add_action			: null,
	remove_action		: null,
	do_action			: null,
	add_filter			: null,
	remove_filtern		: null,
	apply_filters		: null,
	
	
	// helper functions
	helpers				:	{
		is_clone_field	:	null,
	},
	
	
	// modules
	validation			:	null,
	conditional_logic	:	null,
	media				:	null,
	
	
	// fields
	fields				:	{
		date_picker		:	null,
		color_picker	:	null,
		image			:	null,
		file			:	null,
		wysiwyg			:	null,
		gallery			:	null,
		relationship	:	null
	}
};

(function($){
	
	
	/*
	*  Functions
	*
	*  These functions interact with the o object, and events
	*
	*  @type	function
	*  @date	23/10/13
	*  @since	5.0.0
	*
	*  @param	$n/a
	*  @return	$n/a
	*/
	
	$.extend(acf, {
		
		update : function( k, v ){
				
			this.o[ k ] = v;
			
		},
		
		get : function( k ){
			
			return this.o[ k ] || null;
			
		},
		
		_e : function( context, string ){
			
			// defaults
			string = string || false;
			
			
			// get context
			var r = this.l10n[ context ] || false;
			
			
			// get string
			if( string )
			{
				r = r[ string ] || false;
			}
			
			
			// return
			return r || '';
			
		},
		
		get_atts : function( $el ){
		
			var atts = {};
			
			if( $el.exists() )
			{
				$.each( $el[0].attributes, function( index, attr ) {
		        	
		        	if( attr.name.substr(0, 5) == 'data-' )
		        	{
		        		// vars
		        		var v = attr.value,
		        			k = attr.name.replace('data-', '');
		        		
		        		
		        		// convert ints (don't worry about floats. I doubt these would ever appear in data atts...)
		        		if( $.isNumeric(v) )
		        		{
			        		v = parseInt(v);
		        		}
		        		
		        		
		        		// add to atts
			        	atts[ k ] = v;
		        	}
		        });
	        }
	        
	        return atts;
				
		},
		
		get_fields : function( $el, field_type, allow_filter ){
			
			// defaults
			$el = $el || $('body');
			field_type = field_type || false;
			allow_filter = allow_filter || true;
			
			
			// vars
			var selector = '.acf-field';
			
			
			// add field type
			if( field_type )
			{
				selector += '[data-type="' + field_type + '"]';
			}
			
			
			// get fields
			var $fields = $el.find(selector);
			
			//console.log('get_fields(%o, %s, %b). selector = %s', $el, field_type, allow_filter, selector);
			//console.log( $el );
			//console.log( $fields );
			
			// filter out fields
			if( allow_filter )
			{
				$fields = $fields.filter(function(){
					
					return acf.apply_filters('is_field_ready_for_js', true, $(this));			

				});
			}
			
			
			// return
			return $fields;
							
		},
		
		get_uniqid : function( prefix, more_entropy ){
		
			// + original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// + revised by: Kankrelune (http://www.webfaktory.info/)
			// % note 1: Uses an internal counter (in php_js global) to avoid collision
			// * example 1: uniqid();
			// * returns 1: 'a30285b160c14'
			// * example 2: uniqid('foo');
			// * returns 2: 'fooa30285b1cd361'
			// * example 3: uniqid('bar', true);
			// * returns 3: 'bara20285b23dfd1.31879087'
			if (typeof prefix === 'undefined') {
				prefix = "";
			}
			
			var retId;
			var formatSeed = function (seed, reqWidth) {
				seed = parseInt(seed, 10).toString(16); // to hex str
				if (reqWidth < seed.length) { // so long we split
					return seed.slice(seed.length - reqWidth);
				}
				if (reqWidth > seed.length) { // so short we pad
					return Array(1 + (reqWidth - seed.length)).join('0') + seed;
				}
				return seed;
			};
			
			// BEGIN REDUNDANT
			if (!this.php_js) {
				this.php_js = {};
			}
			// END REDUNDANT
			if (!this.php_js.uniqidSeed) { // init seed with big random int
				this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
			}
			this.php_js.uniqidSeed++;
			
			retId = prefix; // start with prefix, add current milliseconds hex string
			retId += formatSeed(parseInt(new Date().getTime() / 1000, 10), 8);
			retId += formatSeed(this.php_js.uniqidSeed, 5); // add seed hex string
			if (more_entropy) {
				// for more entropy we add a float lower to 10
				retId += (Math.random() * 10).toFixed(8).toString();
			}
			
			return retId;
			
		},
		
		serialize_form : function( $form ){
			
			// vars
			var data = {},
				names = {};
			
			
			// populate data
			$.each( $form.serializeArray(), function( i, pair ) {
				
				// initiate name
				if( pair.name.slice(-2) === '[]' )
				{
					// remove []
					pair.name = pair.name.replace('[]', '');
					
					
					// initiate counter
					if( typeof names[ pair.name ] === 'undefined'){
						
						names[ pair.name ] = -1;
					}
					
					
					// increase counter
					names[ pair.name ]++;
					
					
					// add key
					pair.name += '[' + names[ pair.name ] +']';
				}
				
				
				// append to data
				data[ pair.name ] = pair.value;
				
			});
			
			
			// return
			return data;
		},
		
		remove_tr : function( $tr, callback ){
			
			// vars
			var height = $tr.height(),
				children = $tr.children().length;
			
			
			// add class
			$tr.addClass('acf-remove-element');
			
			
			// after animation
			setTimeout(function(){
				
				// remove class
				$tr.removeClass('acf-remove-element');
				
				
				// vars
				$tr.html('<td style="padding:0; height:' + height + 'px" colspan="' + children + '"></td>');
				
				
				$tr.children('td').animate({ height : 0}, 250, function(){
					
					$tr.remove();
					
					if( typeof(callback) == 'function' )
					{
						callback();
					}
					
					
				});
				
					
			}, 250);
			
		},
		
		remove_el : function( $el, callback ){
			
			// set layout
			$el.css({
				height		: $el.height(),
				width		: $el.width(),
				position	: 'absolute',
				padding		: 0
			});
			
			
			// wrap field
			$el.wrap( '<div class="acf-temp-wrap" style="height:' + $el.outerHeight(true) + 'px"></div>' );
			
			
			// fade $el
			$el.animate({ opacity : 0 }, 250);
			
			
			// remove
			$el.parent('.acf-temp-wrap').animate({ height : 0 }, 250, function(){
				
				$(this).remove();
				
				if( typeof(callback) == 'function' )
				{
					callback();
				}
				
			});
			
			
		},
		
		isset_object : function(){
			
			var args = Array.prototype.slice.call(arguments),
				obj = args.shift();
			
			for (var i = 0; i < args.length; i++) {
				if (!obj.hasOwnProperty(args[i])) {
					return false;
				}
				obj = obj[args[i]];
			}
			
			return true;
				
		}
		
	});
	
	
	/*
	*  Hooks
	*
	*  These functions act as wrapper functions for the included event-manajer JS library
	*  Wrapper functions will ensure that future changes to event-manager do not distrupt
	*  any custom actions / filter code written by users
	*
	*  @type	functions
	*  @date	30/11/2013
	*  @since	5.0.0
	*
	*  @param	n/a
	*  @return	n/a
	*/
	
	$.extend(acf, {
		
		add_action : function() {
			
			// allow multiple action parameters such as 'ready append'
			var actions = arguments[0].split(' ');
			
			for( k in actions )
			{
				// prefix action
				arguments[0] = 'acf.' + actions[ k ];
				
				wp.hooks.addAction.apply(this, arguments);
			}
			
			return this;
		},
		
		remove_action : function() {
			
			// prefix action
			arguments[0] = 'acf.' + arguments[0];
			
			wp.hooks.removeAction.apply(this, arguments);
			
			return this;
		},
		
		do_action : function() {
			
			// prefix action
			arguments[0] = 'acf.' + arguments[0];
			
			wp.hooks.doAction.apply(this, arguments);
			
			return this;
		},
		
		add_filter : function() {
			
			// prefix action
			arguments[0] = 'acf.' + arguments[0];
			
			wp.hooks.addFilter.apply(this, arguments);
			
			return this;
		},
		
		remove_filter : function() {
			
			// prefix action
			arguments[0] = 'acf.' + arguments[0];
			
			wp.hooks.removeFilter.apply(this, arguments);
			
			return this;
		},
		
		apply_filters : function() {
			
			// prefix action
			arguments[0] = 'acf.' + arguments[0];
			
			return wp.hooks.applyFilters.apply(this, arguments);
		}
		
	});
    
    
    acf.add_filter('is_field_ready_for_js', function( ready, $field ){
		
		// repeater sub field
		if( $field.parents('.acf-row[data-id="acfcloneindex"]').exists() )
		{
			ready = false;
		}
		
		
		// widget
		if( $field.parents('#available-widgets').exists() )
		{
			ready = false;
		}
		
		
		// debug
		//console.log('is_field_ready_for_js %o, %b', $field, ready);
		
		
		// return
		return ready;
	    
    });
    
    
	/*
	*  is_clone_field
	*
	*  @description: 
	*  @since: 3.5.8
	*  @created: 17/01/13
	*/
	
	acf.helpers.is_clone_field = function( input )
	{
		// sub field
		if( input.attr('name') && input.attr('name').indexOf('[acfcloneindex]') != -1 )
		{
			return true;
		}
		

		return false;
	};
	
	
	/*
	*  Exists
	*
	*  @description: returns true / false		
	*  @created: 1/03/2011
	*/
	
	$.fn.exists = function()
	{
		return $(this).length>0;
	};
	
	
	/*
	*  outerHTML
	*
	*  This function will return a string containing the HTML of the selected element
	*
	*  @type	function
	*  @date	19/11/2013
	*  @since	5.0.0
	*
	*  @param	$.fn
	*  @return	(string)
	*/
	
	$.fn.outerHTML = function() {
	    
	    return $(this).clone().wrap('<div>').parent().html();
	    
	}
	
	
	/*
	*  3.5 Media
	*
	*  @description: 
	*  @since: 3.5.7
	*  @created: 16/01/13
	*/
	
	acf.media = {
	
		div : null,
		frame : null,
		render_timout : null,
		
		clear_frame : function(){
			
			// validate
			if( !this.frame )
			{
				return;
			}
			
			
			// detach
			this.frame.detach();
			this.frame.dispose();
			
			
			// reset var
			this.frame = null;
			
		},
		type : function(){
			
			// default
			var type = 'thickbox';
			
			
			// if wp exists
			if( typeof(wp) == "object" )
			{
				type = 'backbone';
			}
			
			
			// return
			return type;
			
		},
		init : function(){
			
			// bail early if wp.media does not exist (field group edit page)
			if( typeof(wp.media) == 'undefined' )
			{
				return false;
			}
			
			
			// vars
			var _prototype = wp.media.view.AttachmentCompat.prototype;
			
			
			// orig
			_prototype.orig_render = _prototype.render;
			_prototype.orig_dispose = _prototype.dispose;
			
			
			// update class
			_prototype.className = 'compat-item acf_postbox no_box';
			
			
			// modify render
			_prototype.render = function() {
				
				// reference
				var _this = this;
				
				
				// validate
				if( _this.ignore_render )
				{
					return this;	
				}
				
				
				// run the old render function
				this.orig_render();
				
				
				// add button
				setTimeout(function(){
					
					// vars
					var $media_model = _this.$el.closest('.media-modal');
					
					
					// is this an edit only modal?
					if( $media_model.hasClass('acf-media-modal') )
					{
						return;	
					}
					
					
					// does button already exist?
					if( $media_model.find('.media-frame-router .acf-expand-details').exists() )
					{
						return;	
					}
					
					
					// create button
					var button = $([
						'<a href="#" class="acf-expand-details">',
							'<span class="icon"></span>',
							'<span class="is-closed">' + acf.l10n.core.expand_details +  '</span>',
							'<span class="is-open">' + acf.l10n.core.collapse_details +  '</span>',
						'</a>'
					].join('')); 
					
					
					// add events
					button.on('click', function( e ){
						
						e.preventDefault();
						
						if( $media_model.hasClass('acf-expanded') )
						{
							$media_model.removeClass('acf-expanded');
						}
						else
						{
							$media_model.addClass('acf-expanded');
						}
						
					});
					
					
					// append
					$media_model.find('.media-frame-router').append( button );
						
				
				}, 0);
				
				
				// setup fields
				// The clearTimout is needed to prevent many setup functions from running at the same time
				clearTimeout( acf.media.render_timout );
				acf.media.render_timout = setTimeout(function(){

					$(document).trigger( 'acf/setup_fields', [ _this.$el ] );
					
				}, 50);

				
				// return based on the origional render function
				return this;
			};
			
			
			// modify dispose
			_prototype.dispose = function() {
				
				// remove
				$(document).trigger('acf/remove_fields', [ this.$el ]);
				
				
				// run the old render function
				this.orig_dispose();
				
			};
			
			
			// override save
			_prototype.save = function( event ) {
			
				var data = {},
					names = {};
				
				if ( event )
					event.preventDefault();
					
					
				_.each( this.$el.serializeArray(), function( pair ) {
				
					// initiate name
					if( pair.name.slice(-2) === '[]' )
					{
						// remove []
						pair.name = pair.name.replace('[]', '');
						
						
						// initiate counter
						if( typeof names[ pair.name ] === 'undefined'){
							
							names[ pair.name ] = -1;
							//console.log( names[ pair.name ] );
							
						}
						
						
						names[ pair.name ]++
						
						pair.name += '[' + names[ pair.name ] +']';
						
						
					}
 
					data[ pair.name ] = pair.value;
				});
 
				this.ignore_render = true;
				this.model.saveCompat( data );
				
			};
		}
	};
	
	
	/*
	*  Conditional Logic Calculate
	*
	*  @description: 
	*  @since 3.5.1
	*  @created: 15/10/12
	*/
	
	acf.conditional_logic = {
		
		items : [],
		
		init : function(){
			
			// reference
			var _this = this;
			
			
			// events
			$(document).on('change', '.field input, .field textarea, .field select', function(){
				
				// preview hack
				if( $('#acf-has-changed').exists() )
				{
					$('#acf-has-changed').val(1);
				}
				
				_this.change();
				
			});
			
			
			_this.change();
			
		},
		change : function(){
			
			
			// reference
			var _this = this;
			
			
			// loop through items
			$.each(this.items, function( k, item ){
				
				// vars
				var $targets	=	$('.field_key-' + item.field);

				
				// may be multiple targets (sub fields)
				$targets.each(function(){
					
					// vars
					var show = true;
					
					
					// if 'any' was selected, start of as false and any match will result in show = true
					if( item.allorany == 'any' )
					{
						show = false;
					}
					
					
					// vars
					var $target		=	$(this),
						hide_all	=	true;
					
					
					// loop through rules
					$.each(item.rules, function( k2, rule ){
						
						// vars
						var $toggle = $('.field_key-' + rule.field);
						
						
						
						// sub field?
						if( $toggle.hasClass('sub_field') )
						{
							// toggle may be a sibling sub field.
							// if so ,show an empty td but keep the column
							$toggle = $target.siblings('.field_key-' + rule.field);
							hide_all = false;
							
							
							// if no toggle was found, we need to look at parent sub fields.
							// if so, hide the entire column
							if( ! $toggle.exists() )
							{
								$toggle = $target.parents('.row').last().find('.field_key-' + rule.field);
								hide_all = true;
							}
							
						}
						
						
						var calculate = _this.calculate( rule, $toggle, $target );
						
						if( item.allorany == 'all' )
						{
							if( calculate == false )
							{
								show = false;
								
								// end loop
								return false;
							}
						}
						else
						{
							if( calculate == true )
							{
								show = true;
								
								// end loop
								return false;
							}
						}
						
					});
					// $.each(item.rules, function( k2, rule ){
					
					
					// clear classes
					$target.removeClass('acf-conditional_logic-hide acf-conditional_logic-show acf-show-blank');
					
					// hide / show field
					if( show )
					{
						// remove "disabled"
						$target.find('input, textarea, select').removeAttr('disabled');
						
						$target.addClass('acf-conditional_logic-show');
						
						// hook
						$(document).trigger('acf/conditional_logic/show', [ $target, item ]);
						
					}
					else
					{
						// add "disabled"
						$target.find('input, textarea, select').attr('disabled', 'disabled');
						
						$target.addClass('acf-conditional_logic-hide');
						
						if( !hide_all )
						{
							$target.addClass('acf-show-blank');
						}
						
						// hook
						$(document).trigger('acf/conditional_logic/hide', [ $target, item ]);
					}
					
					
				});
				
				
				
				
			});
			
		},
		calculate : function( rule, $toggle, $target ){
			
			// vars
			var r = false;
			

			// compare values
			if( $toggle.hasClass('field_type-true_false') || $toggle.hasClass('field_type-checkbox') || $toggle.hasClass('field_type-radio') )
			{
				var exists = $toggle.find('input[value="' + rule.value + '"]:checked').exists();
				
				
				if( rule.operator == "==" )
				{
					if( exists )
					{
						r = true;
					}
				}
				else
				{
					if( ! exists )
					{
						r = true;
					}
				}
				
			}
			else
			{
				// get val and make sure it is an array
				var val = $toggle.find('input, textarea, select').last().val();
				
				if( ! $.isArray(val) )
				{
					val = [ val ];
				}
				
				
				if( rule.operator == "==" )
				{
					if( $.inArray(rule.value, val) > -1 )
					{
						r = true;
					}
				}
				else
				{
					if( $.inArray(rule.value, val) < 0 )
					{
						r = true;
					}
				}
				
			}
			
			
			// return
			return r;
			
		}
		
	}; 
	
	
	$(document).ready(function(){
		
		acf.do_action('ready', $('body'));
		
		
		// conditional logic
		acf.conditional_logic.init();
		
	});
	
	
	/*
	*  window load
	*
	*  @description: 
	*  @since: 3.5.5
	*  @created: 22/12/12
	*/
	
	$(window).load(function(){
		
		acf.do_action('load', $('body'));
		
		
		// init
		acf.media.init();
		
		
		setTimeout(function(){
			
			// Hack for CPT without a content editor
			try
			{
				// post_id may be string (user_1) and therefore, the uploaded image cannot be attached to the post
				if( $.isNumeric(acf.o.post_id) )
				{
					wp.media.view.settings.post.id = acf.o.post_id;
				}
				
			} 
			catch(e)
			{
				// one of the objects was 'undefined'...
			}
			
			
			// setup fields
			//$(document).trigger('acf/setup_fields', [ $(document) ]);
			
		}, 10);
		
	});
	
	
	/*
	*  Sortable
	*
	*  These functions will hook into the start and stop of a jQuery sortable event and modify the item and placeholder to look seamless
	*
	*  @type	function
	*  @date	12/11/2013
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	acf.add_action('sortstart', function( $item, $placeholder ){
		
		// if $item is a tr, apply some css to the elements
		if( $item.is('tr') )
		{
			// temp set as relative to find widths
			$item.css('position', 'relative');
			
			
			// set widths for td children		
			$item.children().each(function(){
			
				$(this).width($(this).width());
				
			});
			
			
			// revert postision css
			$item.css('position', 'absolute');
			
			
			// add markup to the placeholder
			$placeholder.html('<td style="height:' + $item.height() + 'px; padding:0;" colspan="' + $item.children('td').length + '"></td>');
		}
		
	});
	
	
	
})(jQuery);

/* **********************************************
     Begin ajax.js
********************************************** */

(function($){
	
	acf.ajax = {
		
		o : {
			action 			:	'acf/post/get_field_groups',
			post_id			:	0,
			page_template	:	0,
			page_parent		:	0,
			page_type		:	0,
			post_category	:	0,
			post_format		:	0,
			post_taxonomy	:	0,
			lang			:	0,
			nonce			:	0
		},
		
		update : function( k, v ){
			
			this.o[ k ] = v;
			return this;
			
		},
		
		get : function( k ){
			
			return this.o[ k ] || null;
			
		},
		
		init : function(){
			
			// bail early if ajax is disabled
			if( ! acf.get('ajax') )
			{
				return false;	
			}
			
			
			// vars
			this.update('post_id', acf.o.post_id);
			this.update('nonce', acf.o.nonce);
			
			
			// MPML
			if( $('#icl-als-first').length > 0 )
			{
				var href = $('#icl-als-first').children('a').attr('href'),
					regex = new RegExp( "lang=([^&#]*)" ),
					results = regex.exec( href );
				
				// lang
				this.update('lang', results[1]);
				
			}
			
			
			// add triggers
			this.add_events();
		},
		
		fetch : function(){
			
			// reference
			var _this = this;
			
			
			// ajax
			$.ajax({
				url			: acf.get('ajaxurl'),
				data		: this.o,
				type		: 'post',
				dataType	: 'json',
				success		: function( json ){
					
					if( _.isObject(json) )
					{
						_this.render( json );
					}
					
				}
			});
			
		},
		
		render : function( field_groups ){
			
			// hide all metaboxes
			$('.acf-postbox').addClass('acf-hidden');
			$('.acf-postbox-toggle').addClass('acf-hidden');
			
			
			// show the new postboxes
			$.each(field_groups, function(k, field_group){
				
				// vars
				var $el = $('#acf-' + field_group.ID),
					$toggle = $('#adv-settings .acf_postbox-toggle[for="acf-' + field_group.ID + '-hide"]');
				
				
				// classes
				$el.removeClass('acf-hidden hide-if-js');
				$toggle.removeClass('acf-hidden');
				$toggle.find('input[type="checkbox"]').attr('checked', 'checked');
				
				
				// load fields if needed
				$el.find('.acf-replace-with-fields').each(function(){
					
					$(this).replaceWith( field_group.html );
					
					$(document).trigger('acf/setup_fields', [ $el ]);
					
				});
				
				
				// update style if needed
				if( k === 0 )
				{
					$('#acf-style').html( field_group.style );
				}
				
			});
			
		},
		
		add_events : function(){
			
			// reference
			var _this = this;
			
			
			// page template
			$(document).on('change', '#page_template', function(){
				
				var page_template = $(this).val();
				
				_this.update( 'page_template', page_template ).fetch();
			    
			});
			
			
			// page parent
			$(document).on('change', '#parent_id', function(){
				
				var page_type = 'parent',
					page_parent = 0;
				
				
				if( val != "" )
				{
					page_type = 'child';
					page_parent = $(this).val();
				}
				
				_this.update( 'page_type', page_type ).update( 'page_parent', page_parent ).fetch();
			    
			});
			
			
			// post format
			$(document).on('change', '#post-formats-select input[type="radio"]', function(){
				
				var post_format = $(this).val();
				
				if( post_format == '0' )
				{
					post_format = 'standard';
				}
				
				_this.update( 'post_format', post_format ).fetch();
				
			});
			
			
			// post taxonmy
			$(document).on('change', '.categorychecklist input[type="checkbox"]', function(){
				
				// a taxonomy field may trigger this change event, however, the value selected is not
				// actually a term relatinoship, it is meta data
				if( $(this).closest('.categorychecklist').hasClass('no-ajax') )
				{
					return;
				}
				
				
				// set timeout to fix issue with chrome which does not register the change has yet happened
				setTimeout(function(){
					
					// vars
					var values = [];
					
					
					$('.categorychecklist input[type="checkbox"]:checked').each(function(){
						
						if( $(this).is(':hidden') || $(this).is(':disabled') )
						{
							return;
						}
						
						if( $.inArray( $(this).val(), values ) < 0 )
						{
							values.push( $(this).val() );
						}
						
					});
			
					
					_this.update( 'post_taxonomy', values ).fetch();
					
				
				}, 1);
				
				
			});
			
		}
		
	};
	
	
	/*
	*  Document Ready
	*
	*  Initialize the object
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).ready(function(){
		
		// initialize
		acf.ajax.init();
		
	});


	
})(jQuery);

/* **********************************************
     Begin color-picker.js
********************************************** */

(function($){
	
	/*
	*  Color Picker
	*
	*  jQuery functionality for this field type
	*
	*  @type	object
	*  @date	20/07/13
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	acf.fields.color_picker = {
		
		$el : null,
		$input : null,
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('input[type="text"]');
			
			
			// return this for chaining
			return this;
			
		},
		
		init : function(){
			
			this.$input.wpColorPicker();
			
		}
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		acf.get_fields( $el, 'color_picker' ).each(function(){
			
			acf.fields.color_picker.set({ $el : $(this) }).init();
			
		});
		
	});
	

})(jQuery);

/* **********************************************
     Begin date-picker.js
********************************************** */

(function($){
	
	/*
	*  Date Picker
	*
	*  static model for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.date_picker = {
		
		$el : null,
		$input : null,
		$hidden : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('input[type="text"]');
			this.$hidden = this.$el.find('input[type="hidden"]');
			
			
			// get options
			this.o = acf.get_atts( this.$el );
			
			
			// return this for chaining
			return this;
			
		},
		init : function(){
			
			// get and set value from alt field
			this.$input.val( this.$hidden.val() );
			
			
			// create options
			var args = $.extend( {}, acf.l10n.date_picker, { 
				dateFormat		:	this.o.save_format,
				altField		:	this.$hidden,
				altFormat		:	this.o.save_format,
				changeYear		:	true,
				yearRange		:	"-100:+100",
				changeMonth		:	true,
				showButtonPanel	:	true,
				firstDay		:	this.o.first_day
			});
			
			
			// filter for 3rd party customization
			args = acf.apply_filters('date_picker_args', args);
			
			
			// add date picker
			this.$input.addClass('active').datepicker( args );
			
			
			// now change the format back to how it should be.
			this.$input.datepicker( "option", "dateFormat", this.o.display_format );
			
			
			// wrap the datepicker (only if it hasn't already been wrapped)
			if( $('body > #ui-datepicker-div').length > 0 )
			{
				$('#ui-datepicker-div').wrap('<div class="ui-acf" />');
			}
			
		},
		blur : function(){
			
			if( !this.$input.val() )
			{
				this.$hidden.val('');
			}
			
		}
		
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		acf.get_fields( $el, 'date_picker' ).each(function(){
			
			acf.fields.date_picker.set({ $el : $(this) }).init();
			
		});
		
	});
		
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	$(document).on('blur', '.acf-date_picker input[type="text"]', function( e ){
		
		acf.fields.date_picker.set({ $el : $(this).closest('.acf-field') }).blur();
					
	});
	

})(jQuery);

/* **********************************************
     Begin file.js
********************************************** */

(function($){
	
	/*
	*  File
	*
	*  static model for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	
	// reference
	var _media = acf.media;
	
	
	acf.fields.file = {
		
		$el : null,
		$input : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('input[type="hidden"]');
			
			
			// get options
			this.o = acf.get_atts( this.$el );
			
			
			// multiple?
			this.o.multiple = this.$el.closest('.repeater').exists() ? true : false;
			
			
			// wp library query
			this.o.query = {};
			
			
			// library
			if( this.o.library == 'uploadedTo' )
			{
				this.o.query.uploadedTo = acf.o.post_id;
			}
			
			
			// return this for chaining
			return this;
			
		},
		add : function( file ){
			
			// this function must reference a global div variable due to the pre WP 3.5 uploader
			// vars
			var div = _media.div;
			
			
			// set atts
			div.find('.acf-file-icon').attr( 'src', file.icon );
		 	div.find('.acf-file-title').text( file.title );
		 	div.find('.acf-file-name').text( file.name ).attr( 'href', file.url );
		 	div.find('.acf-file-size').text( file.size );
			div.find('.acf-file-value').val( file.id ).trigger('change');
		 	
		 	
		 	// set div class
		 	div.addClass('active');
		 	
		 	
		 	// validation
			div.closest('.field').removeClass('error');
	
		},
		edit : function(){
			
			// vars
			var id = this.$input.val();
			
			
			// set global var
			_media.div = this.$el;
			

			// clear the frame
			_media.clear_frame();
			
			
			// create the media frame
			_media.frame = wp.media({
				title		:	acf.l10n.file.edit,
				multiple	:	false,
				button		:	{ text : acf.l10n.file.update }
			});
			
			
			// log events
			/*
			acf.media.frame.on('all', function(e){
				
				console.log( e );
				
			});
			*/
			
			
			// open
			_media.frame.on('open',function() {
				
				// set to browse
				if( _media.frame.content._mode != 'browse' )
				{
					_media.frame.content.mode('browse');
				}
				
				
				// add class
				_media.frame.$el.closest('.media-modal').addClass('acf-media-modal acf-expanded');
					
				
				// set selection
				var selection	=	_media.frame.state().get('selection'),
					attachment	=	wp.media.attachment( id );
				
				
				// to fetch or not to fetch
				if( $.isEmptyObject(attachment.changed) )
				{
					attachment.fetch();
				}
				

				selection.add( attachment );
						
			});
			
			
			// close
			_media.frame.on('close',function(){
			
				// remove class
				_media.frame.$el.closest('.media-modal').removeClass('acf-media-modal');
				
			});
			
							
			// Finally, open the modal
			acf.media.frame.open();
			
		},
		remove : function()
		{
			
			// set atts
			this.$el.find('.acf-file-icon').attr( 'src', '' );
			this.$el.find('.acf-file-title').text( '' );
		 	this.$el.find('.acf-file-name').text( '' ).attr( 'href', '' );
		 	this.$el.find('.acf-file-size').text( '' );
			this.$el.find('.acf-file-value').val( '' ).trigger('change');
			
			
			// remove class
			this.$el.removeClass('active');
			
		},
		popup : function()
		{
			// reference
			var t = this;
			
			
			// set global var
			_media.div = this.$el;
			

			// clear the frame
			_media.clear_frame();
			
			
			 // Create the media frame
			 _media.frame = wp.media({
				states : [
					new wp.media.controller.Library({
						library		:	wp.media.query( t.o.query ),
						multiple	:	t.o.multiple,
						title		:	acf.l10n.file.select,
						priority	:	20,
						filterable	:	'all'
					})
				]
			});
			
			
			// customize model / view
			acf.media.frame.on('content:activate', function(){
				
				// vars
				var toolbar = null,
					filters = null;
					
				
				// populate above vars making sure to allow for failure
				try
				{
					toolbar = acf.media.frame.content.get().toolbar;
					filters = toolbar.get('filters');
				} 
				catch(e)
				{
					// one of the objects was 'undefined'... perhaps the frame open is Upload Files
					//console.log( e );
				}
				
				
				// validate
				if( !filters )
				{
					return false;
				}
				
				
				// no need for 'uploaded' filter
				if( t.o.library == 'uploadedTo' )
				{
					filters.$el.find('option[value="uploaded"]').remove();
					filters.$el.after('<span>' + acf.l10n.file.uploadedTo + '</span>')
					
					$.each( filters.filters, function( k, v ){
						
						v.props.uploadedTo = acf.o.post_id;
						
					});
				}
								
			});
			
			
			// When an image is selected, run a callback.
			acf.media.frame.on( 'select', function() {
				
				// get selected images
				selection = _media.frame.state().get('selection');
				
				if( selection )
				{
					var i = 0;
					
					selection.each(function(attachment){
	
				    	// counter
				    	i++;
				    	
				    	
				    	// select / add another file field?
				    	if( i > 1 )
						{
							// vars
							var $td			=	_media.div.closest('td'),
								$tr 		=	$td.closest('.row'),
								$repeater 	=	$tr.closest('.repeater'),
								key 		=	$td.attr('data-field_key'),
								selector	=	'td .acf-file-uploader:first';
								
							
							// key only exists for repeater v1.0.1 +
							if( key )
							{
								selector = 'td[data-field_key="' + key + '"] .acf-file-uploader';
							}
							
							
							// add row?
							if( ! $tr.next('.row').exists() )
							{
								$repeater.find('.add-row-end').trigger('click');
								
							}
							
							
							// update current div
							_media.div = $tr.next('.row').find( selector );
							
						}
												
						
				    	// vars
				    	var file = {
					    	id		:	attachment.id,
					    	title	:	attachment.attributes.title,
					    	name	:	attachment.attributes.filename,
					    	url		:	attachment.attributes.url,
					    	icon	:	attachment.attributes.icon,
					    	size	:	attachment.attributes.filesize
				    	};
				    	
				    	
				    	// add file to field
				        acf.fields.file.add( file );
				        
						
				    });
				    // selection.each(function(attachment){
				}
				// if( selection )
				
			});
			// acf.media.frame.on( 'select', function() {
					 
				
			// Finally, open the modal
			acf.media.frame.open();
				
			
			return false;
		}
		
	};
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('click', '.acf-file-uploader .acf-button-edit', function( e ){
		
		e.preventDefault();
		
		acf.fields.file.set({ $el : $(this).closest('.acf-file-uploader') }).edit();
			
	});
	
	$(document).on('click', '.acf-file-uploader .acf-button-delete', function( e ){
		
		e.preventDefault();
		
		acf.fields.file.set({ $el : $(this).closest('.acf-file-uploader') }).remove();
			
	});
	
	
	$(document).on('click', '.acf-file-uploader .add-file', function( e ){
		
		e.preventDefault();
		
		acf.fields.file.set({ $el : $(this).closest('.acf-file-uploader') }).popup();
		
	});
	

})(jQuery);

/* **********************************************
     Begin google-map.js
********************************************** */

(function($){
	
	/*
	*  Location
	*
	*  static model for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.location = {
		
		$el : null,
		$input : null,
		
		o : {},
		
		geocoder : false,
		map : false,
		maps : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('.value');
			
			
			// get options
			this.o = acf.get_atts( this.$el );
			
			
			// get map
			if( this.maps[ this.o.id ] )
			{
				this.map = this.maps[ this.o.id ];
			}
			
			
			// geocode
			this.geocoder = new google.maps.Geocoder();
			
				
			// return this for chaining
			return this;
			
		},
		init : function(){

			this.render();
					
		},
		render : function(){
			
			// reference
			var _this	= this,
				_$el	= this.$el;
			
			
			// vars
			var args = {
        		zoom		: 14,
        		center		: new google.maps.LatLng(this.o.lat, this.o.lng),
        		mapTypeId	: google.maps.MapTypeId.ROADMAP
        	};
			
			// create map	        	
        	this.map = new google.maps.Map( this.$el.find('.canvas')[0], args);
	        
	        
	        // add search
			var autocomplete = new google.maps.places.Autocomplete( this.$el.find('.search')[0] );
			autocomplete.map = this.map;
			autocomplete.bindTo('bounds', this.map);
			
			
			// add dummy marker
	        this.map.marker = new google.maps.Marker({
		        draggable	: true,
		        raiseOnDrag	: true,
		        map			: this.map,
		    });
		    
		    
		    // add references
		    this.map.$el = this.$el;
		    
		    
		    // value exists?
		    var lat = this.$el.find('.input-lat').val(),
		    	lng = this.$el.find('.input-lng').val();
		    
		    if( lat && lng )
		    {
			    this.update( lat, lng ).center();
		    }
		    
		    
			// events
			google.maps.event.addListener(autocomplete, 'place_changed', function( e ) {
			    
			    // reference
			    var $el = this.map.$el;


			    // manually update address
			    var address = $el.find('.search').val();
			    $el.find('.input-address').val( address );
			    $el.find('.title h4').text( address );
			    
			    
			    // vars
			    var place = this.getPlace();
			    
			    
			    // validate
			    if( place.geometry )
			    {
			    	var lat = place.geometry.location.lat(),
						lng = place.geometry.location.lng();
						
						
				    _this.set({ $el : $el }).update( lat, lng ).center();
			    }
			    else
			    {
				    // client hit enter, manulaly get the place
				    _this.geocoder.geocode({ 'address' : address }, function( results, status ){
				    	
				    	// validate
						if( status != google.maps.GeocoderStatus.OK )
						{
							console.log('Geocoder failed due to: ' + status);
							return;
						}
						
						if( !results[0] )
						{
							console.log('No results found');
							return;
						}
						
						
						// get place
						place = results[0];
						
						var lat = place.geometry.location.lat(),
							lng = place.geometry.location.lng();
							
							
					    _this.set({ $el : $el }).update( lat, lng ).center();
					    
					});
			    }
			    
			});
		    
		    
		    google.maps.event.addListener( this.map.marker, 'dragend', function(){
		    	
		    	// reference
			    var $el = this.map.$el;
			    
			    
		    	// vars
				var position = this.map.marker.getPosition(),
					lat = position.lat(),
			    	lng = position.lng();
			    	
				_this.set({ $el : $el }).update( lat, lng ).sync();
			    
			});
			
			
			google.maps.event.addListener( this.map, 'click', function( e ) {
				
				// reference
			    var $el = this.$el;
			    
			    
				// vars
				var lat = e.latLng.lat(),
					lng = e.latLng.lng();
				
				
				_this.set({ $el : $el }).update( lat, lng ).sync();
			
			});

			
			
	        // add to maps
	        this.maps[ this.o.id ] = this.map;
	        
	        
		},
		
		update : function( lat, lng ){
			
			// vars
			var latlng = new google.maps.LatLng( lat, lng );
		    
		    
		    // update inputs
			this.$el.find('.input-lat').val( lat );
			this.$el.find('.input-lng').val( lng ).trigger('change');
			
			
		    // update marker
		    this.map.marker.setPosition( latlng );
		    
		    
			// show marker
			this.map.marker.setVisible( true );
		    
		    
	        // update class
	        this.$el.addClass('active');
	        
	        
	        // validation
			this.$el.closest('.acf-field').removeClass('error');
			
			
	        // return for chaining
	        return this;
		},
		
		center : function(){
			
			// vars
			var position = this.map.marker.getPosition(),
				latlng = new google.maps.LatLng( position.lat(), position.lng() );
				
			
			// set center of map
	        this.map.setCenter( latlng );
		},
		
		sync : function(){
			
			// reference
			var $el	= this.$el;
				
			
			// vars
			var position = this.map.marker.getPosition(),
				latlng = new google.maps.LatLng( position.lat(), position.lng() );
			
			
			this.geocoder.geocode({ 'latLng' : latlng }, function( results, status ){
				
				// validate
				if( status != google.maps.GeocoderStatus.OK )
				{
					console.log('Geocoder failed due to: ' + status);
					return;
				}
				
				if( !results[0] )
				{
					console.log('No results found');
					return;
				}
				
				
				// get location
				var location = results[0];
				
				
				// update h4
				$el.find('.title h4').text( location.formatted_address );

				
				// update input
				$el.find('.input-address').val( location.formatted_address ).trigger('change');
				
			});
			
			
			// return for chaining
	        return this;
		},
		
		locate : function(){
			
			// reference
			var _this	= this,
				_$el	= this.$el;
			
			
			// Try HTML5 geolocation
			if( ! navigator.geolocation )
			{
				alert( acf.l10n.google_map.browser_support );
				return this;
			}
			
			
			// show loading text
			_$el.find('.title h4').text(acf.l10n.google_map.locating + '...');
			_$el.addClass('active');
			
		    navigator.geolocation.getCurrentPosition(function(position){
		    	
		    	// vars
				var lat = position.coords.latitude,
			    	lng = position.coords.longitude;
			    	
				_this.set({ $el : _$el }).update( lat, lng ).sync().center();
				
			});

				
		},
		
		clear : function(){
			
			// update class
	        this.$el.removeClass('active');
			
			
			// clear search
			this.$el.find('.search').val('');
			
			
			// clear inputs
			this.$el.find('.input-address').val('');
			this.$el.find('.input-lat').val('');
			this.$el.find('.input-lng').val('');
			
			
			// hide marker
			this.map.marker.setVisible( false );
		},
		
		edit : function(){
			
			// update class
	        this.$el.removeClass('active');
			
			
			// clear search
			var val = this.$el.find('.title h4').text();
			
			
			this.$el.find('.search').val( val ).focus();
			
		}
	
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		//vars
		var $fields = acf.get_fields( $el, 'google_map' );
		
		
		// validate
		if( !$fields.exists() )
		{
			return;
		}
		
		
		// validate google
		if( typeof google === 'undefined' )
		{
			$.getScript('https://www.google.com/jsapi', function(){
			
			    google.load('maps', '3', { other_params: 'sensor=false&libraries=places', callback: function(){
			    
			        $fields.each(function(){
					
						acf.fields.location.set({ $el : $(this).find('.acf-google-map') }).init();
						
					});
			        
			    }});
			});
			
		}
		else
		{
			$fields.each(function(){
				
				acf.fields.location.set({ $el : $(this).find('.acf-google-map') }).init();
				
			});
			
		}
		
		
	});
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('click', '.acf-google-map .acf-sprite-remove', function( e ){
		
		e.preventDefault();
		
		acf.fields.location.set({ $el : $(this).closest('.acf-google-map') }).clear();
		
		$(this).blur();
		
	});
	
	
	$(document).on('click', '.acf-google-map .acf-sprite-locate', function( e ){
		
		e.preventDefault();
		
		acf.fields.location.set({ $el : $(this).closest('.acf-google-map') }).locate();
		
		$(this).blur();
		
	});
	
	$(document).on('click', '.acf-google-map .title h4', function( e ){
		
		e.preventDefault();
		
		acf.fields.location.set({ $el : $(this).closest('.acf-google-map') }).edit();
			
	});
	
	$(document).on('keydown', '.acf-google-map .search', function( e ){
		
		// prevent form from submitting
		if( e.which == 13 )
		{
		    return false;
		}
			
	});
	
	$(document).on('blur', '.acf-google-map .search', function( e ){
		
		// vars
		var $el = $(this).closest('.acf-google-map');
		
		
		// has a value?
		if( $el.find('.input-lat').val() )
		{
			$el.addClass('active');
		}
			
	});
	

})(jQuery);

/* **********************************************
     Begin image.js
********************************************** */

(function($){
	
	/*
	*  Image
	*
	*  static model for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	
	// reference
	var _media = acf.media;
	
	
	acf.fields.image = {
		
		$el : null,
		$input : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('input[type="hidden"]');
			
			
			// get options
			this.o = acf.get_atts( this.$el );
			
			
			// multiple?
			this.o.multiple = this.$el.closest('.repeater').exists() ? true : false;
			
			
			// wp library query
			this.o.query = {
				type : 'image'
			};
			
			
			// library
			if( this.o.library == 'uploadedTo' )
			{
				this.o.query.uploadedTo = acf.o.post_id;
			}
			
			
			// return this for chaining
			return this;
			
		},
		add : function( image ){
			
			// this function must reference a global div variable due to the pre WP 3.5 uploader
			// vars
			var div = _media.div;
			
			
			// set atts
			div.find('.acf-image-image').attr( 'src', image.url );
			div.find('.acf-image-value').val( image.id ).trigger('change');
		 	
			
		 	// set div class
		 	div.addClass('active');
		 	
		 	
		 	// validation
			div.closest('.field').removeClass('error');
	
		},
		edit : function(){
			
			// vars
			var id = this.$input.val();
			
			
			// set global var
			_media.div = this.$el;
			

			// clear the frame
			_media.clear_frame();
			
			
			// create the media frame
			_media.frame = wp.media({
				title		:	acf.l10n.image.edit,
				multiple	:	false,
				button		:	{ text : acf.l10n.image.update }
			});
			
			
			// log events
			/*
			acf.media.frame.on('all', function(e){
				
				console.log( e );
				
			});
			*/
			
			
			// open
			_media.frame.on('open',function() {
				
				// set to browse
				if( _media.frame.content._mode != 'browse' )
				{
					_media.frame.content.mode('browse');
				}
				
				
				// add class
				_media.frame.$el.closest('.media-modal').addClass('acf-media-modal acf-expanded');
					
				
				// set selection
				var selection	=	_media.frame.state().get('selection'),
					attachment	=	wp.media.attachment( id );
				
				
				// to fetch or not to fetch
				if( $.isEmptyObject(attachment.changed) )
				{
					attachment.fetch();
				}
				

				selection.add( attachment );
						
			});
			
			
			// close
			_media.frame.on('close',function(){
			
				// remove class
				_media.frame.$el.closest('.media-modal').removeClass('acf-media-modal');
				
			});
			
							
			// Finally, open the modal
			acf.media.frame.open();
			
		},
		remove : function()
		{
			
			// set atts
		 	this.$el.find('.acf-image-image').attr( 'src', '' );
			this.$el.find('.acf-image-value').val( '' ).trigger('change');
			
			
			// remove class
			this.$el.removeClass('active');
			
		},
		popup : function()
		{
			// reference
			var t = this;
			
			
			// set global var
			_media.div = this.$el;
			

			// clear the frame
			_media.clear_frame();
			
			
			 // Create the media frame
			 _media.frame = wp.media({
				states : [
					new wp.media.controller.Library({
						library		:	wp.media.query( t.o.query ),
						multiple	:	t.o.multiple,
						title		:	acf.l10n.image.select,
						priority	:	20,
						filterable	:	'all'
					})
				]
			});
			
			
			/*acf.media.frame.on('all', function(e){
				
				console.log( e );
				
			});*/
			
			
			// customize model / view
			acf.media.frame.on('content:activate', function(){

				// vars
				var toolbar = null,
					filters = null;
					
				
				// populate above vars making sure to allow for failure
				try
				{
					toolbar = acf.media.frame.content.get().toolbar;
					filters = toolbar.get('filters');
				} 
				catch(e)
				{
					// one of the objects was 'undefined'... perhaps the frame open is Upload Files
					//console.log( e );
				}
				
				
				// validate
				if( !filters )
				{
					return false;
				}
				
				
				// filter only images
				$.each( filters.filters, function( k, v ){
				
					v.props.type = 'image';
					
				});
				
				
				// no need for 'uploaded' filter
				if( t.o.library == 'uploadedTo' )
				{
					filters.$el.find('option[value="uploaded"]').remove();
					filters.$el.after('<span>' + acf.l10n.image.uploadedTo + '</span>')
					
					$.each( filters.filters, function( k, v ){
						
						v.props.uploadedTo = acf.o.post_id;
						
					});
				}
				
				
				// remove non image options from filter list
				filters.$el.find('option').each(function(){
					
					// vars
					var v = $(this).attr('value');
					
					
					// don't remove the 'uploadedTo' if the library option is 'all'
					if( v == 'uploaded' && t.o.library == 'all' )
					{
						return;
					}
					
					if( v.indexOf('image') === -1 )
					{
						$(this).remove();
					}
					
				});
				
				
				// set default filter
				filters.$el.val('image').trigger('change');
				
			});
			
			
			// When an image is selected, run a callback.
			acf.media.frame.on( 'select', function() {
				
				// get selected images
				selection = _media.frame.state().get('selection');
				
				if( selection )
				{
					var i = 0;
					
					selection.each(function(attachment){
	
				    	// counter
				    	i++;
				    	
				    	
				    	// select / add another image field?
				    	if( i > 1 )
						{
							// vars
							var $td			=	_media.div.closest('td'),
								$tr 		=	$td.closest('.row'),
								$repeater 	=	$tr.closest('.repeater'),
								key 		=	$td.attr('data-field_key'),
								selector	=	'td .acf-image-uploader:first';
								
							
							// key only exists for repeater v1.0.1 +
							if( key )
							{
								selector = 'td[data-field_key="' + key + '"] .acf-image-uploader';
							}
							
							
							// add row?
							if( ! $tr.next('.row').exists() )
							{
								$repeater.find('.add-row-end').trigger('click');
								
							}
							
							
							// update current div
							_media.div = $tr.next('.row').find( selector );
							
						}
						
						
				    	// vars
				    	var image = {
					    	id		:	attachment.id,
					    	url		:	attachment.attributes.url
				    	};
				    	
				    	// is preview size available?
				    	if( attachment.attributes.sizes && attachment.attributes.sizes[ t.o.preview_size ] )
				    	{
					    	image.url = attachment.attributes.sizes[ t.o.preview_size ].url;
				    	}
				    	
				    	// add image to field
				        acf.fields.image.add( image );
				        
						
				    });
				    // selection.each(function(attachment){
				}
				// if( selection )
				
			});
			// acf.media.frame.on( 'select', function() {
					 
				
			// Finally, open the modal
			acf.media.frame.open();
				

			return false;
		},
		
		// temporary gallery fix		
		text : {
			title_add : "Select Image",
			title_edit : "Edit Image"
		}
		
	};
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('click', '.acf-image-uploader .acf-button-edit', function( e ){
		
		e.preventDefault();
		
		acf.fields.image.set({ $el : $(this).closest('.acf-image-uploader') }).edit();
			
	});
	
	$(document).on('click', '.acf-image-uploader .acf-button-delete', function( e ){
		
		e.preventDefault();
		
		acf.fields.image.set({ $el : $(this).closest('.acf-image-uploader') }).remove();
			
	});
	
	
	$(document).on('click', '.acf-image-uploader .add-image', function( e ){
		
		e.preventDefault();
		
		acf.fields.image.set({ $el : $(this).closest('.acf-image-uploader') }).popup();
		
	});
	

})(jQuery);

/* **********************************************
     Begin post_object.js
********************************************** */

(function($){
	
	/*
	*  Post Object
	*
	*  static model and events for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.post_object = {
		
		$el : null,
		$select : null,
		$input : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$select = this.$el.find('select');
			
			
			// get options
			this.o = acf.get_atts( this.$select );
			
			
			// return this for chaining
			return this;
			
		},
		init : function(){
			
			// read choices
			var choices = [],
				val = [];
			
			this.$select.find('option:selected').each(function(){
				
				choices.push({
					id : $(this).attr('value'),
					text : $(this).text()
				});
				
				val.push( $(this).attr('value') );
				
			});
			
			
			// multiple
			if( this.o.multiple )
			{
				var name = this.$select.attr('name').replace('[]', '');
				this.$select.attr('name', name);
			}
			else
			{
				// single
				choices = choices[0];
			}
			
			
			// generate input
			var input = '<input type="hidden" name="%name%" id="%id%" value="%value%" />';
			
				input = input.replace( '%name%',	this.$select.attr('name') );
				input = input.replace( '%id%',		this.$select.attr('id') );
				input = input.replace( '%value%',	val.join(',') );
				
			this.$input = $(input);
			
			
			
			// replace DOM
			this.$select.replaceWith( this.$input );
			
			
			// vars
			var data = {
				action		: 'acf/fields/post_object/query',
				field_key	: this.$el.attr('data-key'),
				nonce		: acf.get('nonce'),
				post_id		: acf.get('post_id'),
			};
						
			
			// args
			var args = {
				
				width		: '100%',
				placeholder	: this.o.placeholder,
				allowClear	: 1,
				multiple	: this.o.multiple,
				ajax		: {
					url			: acf.get('ajaxurl'),
					dataType	: 'json',
					type		: 'get',
					cache		: true,
					data		: function (term, page) {
						
						//add search term
						data.s = term;
						/*
console.log('-- data --')
						console.log(term);
						console.log(page);
*/
						
						return data;
						
					},
					results		: function (data, page) {
						
						/*
console.log('-- results --')
						console.log(data);
						console.log(page);
*/

						return { results: data };
					}
				},
				initSelection : function (element, callback) {
				
			        callback( choices );
			        
			    }
				
			};
			
			
			// add select2
			this.$input.select2( args );
			
			
			var _this = this;
			
			// sortable?
			if( this.o.sortable )
			{
			
				this.$input.select2("container").find("ul.select2-choices").sortable({
					 containment: 'parent',
					 start: function() {
					 	_this.$input.select2("onSortStart");
					 },
					 update: function() {
					 	_this.$input.select2("onSortEnd")
					 }
				});
			}
			
		}
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		acf.get_fields( $el, 'post_object' ).each(function(){
			
			acf.fields.post_object.set({ $el : $(this) }).init();
			
		});
		
	});
	

})(jQuery);

/* **********************************************
     Begin radio.js
********************************************** */

(function($){
	
	/*
	*  Radio
	*
	*  static model and events for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.radio = {
		
		$el : null,
		$input : null,
		$other : null,
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$input = this.$el.find('input[type="radio"]:checked');
			this.$other = this.$el.find('input[type="text"]');
			
			
			// return this for chaining
			return this;
			
		},
		
		change : function(){
			
			// label classes
			this.$el.find('li').removeClass('active');
			this.$input.closest('li').addClass('active');
			
			
			if( this.$input.val() == 'other' )
			{
				this.$other.attr('name', this.$input.attr('name'));
				this.$other.show();
			}
			else
			{
				this.$other.attr('name', '');
				this.$other.hide();
			}
		}
	};
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('change', '.acf-radio-list input[type="radio"]', function( e ){
		
		acf.fields.radio.set({ $el : $(this).closest('.acf-radio-list') }).change();
		
	});
	

})(jQuery);

/* **********************************************
     Begin select.js
********************************************** */

(function($){
	
	/*
	*  Select
	*
	*  static model and events for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.select = {
		
		$el : null,
		$select : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find input
			this.$select = this.$el.find('select');
			
			
			// get options
			this.o = acf.get_atts( this.$select );
			
			
			// return this for chaining
			return this;
			
		},
		
		init : function(){
			
			// bail early if no ui
			if( ! this.o.ui )
			{
				return;
			}
			
			
			// construct args
			var args = {
				width		: '100%',
				allowClear	: this.o.allow_null,
				placeholder	: this.o.placeholder
			};
			
			
			// remove the blank option as we have a clear all button!
			if( this.o.allow_null )
			{
				this.$select.find('option[value=""]').remove();
			}
			
			
			// add select2
			this.$select.select2( args );
			
		}
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		acf.get_fields( $el, 'select' ).each(function(){
			
			acf.fields.select.set({ $el : $(this) }).init();
			
		});
		
		acf.get_fields( $el, 'user' ).each(function(){
			
			acf.fields.select.set({ $el : $(this) }).init();
			
		});
		
	});
	
	

})(jQuery);

/* **********************************************
     Begin relationship.js
********************************************** */

(function($){
	
	/*
	*  Relationship
	*
	*  static model for this field
	*
	*  @type	event
	*  @date	1/06/13
	*
	*/
	
	acf.fields.relationship = {
		
		$el : null,
		$wrap : null,
		$input : null,
		$filters : null,
		$choices : null,
		$values : null,
				
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find elements
			this.$wrap = this.$el.find('.acf-relationship');
			this.$input = this.$wrap.find('.acf-hidden input');
			this.$choices = this.$wrap.find('.choices'),
			this.$values = this.$wrap.find('.values');
			
			
			// get options
			this.o = acf.get_atts( this.$wrap );
			
			
			// return this for chaining
			return this;
			
		},
		
		init : function(){
			
			// reference
			var _this = this;
			
			
			// right sortable
			this.$values.children('.list').sortable({
				//axis					:	'y',
				items					:	'li',
				forceHelperSize			:	true,
				forcePlaceholderSize	:	true,
				scroll					:	true,
				update					:	function(){
					
					_this.$input.trigger('change');
					
				}
			});
			
			
			// ajax fetch values for left side
			this.fetch();
					
		},
		
		fetch : function(){
			
			// reference
			var _this = this,
				$el = this.$el;
			
			
			// add loading class, stops scroll loading
			this.$choices.children('.list').html('<p>' + acf._e('relationship', 'loading') + '...</p>')
			
			
			// vars
			var data = {
				action		: 'acf/fields/relationship/query',
				field_key	: this.$el.attr('data-key'),
				nonce		: acf.get('nonce'),
				post_id		: acf.get('post_id'),
			};
			
			
			// merge in wrap data
			$.extend(data, this.o);

			
			// abort XHR if this field is already loading AJAX data
			if( this.$el.data('xhr') )
			{
				this.$el.data('xhr').abort();
			}
			
			
			// get results
		    var xhr = $.ajax({
		    	url			: acf.get('ajaxurl'),
				dataType	: 'json',
				type		: 'get',
				cache		: true,
				data		: data,
				success			:	function( json ){
					
					// render
					_this.set({ $el : $el }).render( json );
					
				}
			});
			
			
			// update el data
			this.$el.data('xhr', xhr);
			
		},
		
		render : function( json ){
			
			// reference
			var _this = this;
			
			
			// no results?
			if( ! json || ! json.length )
			{
				this.$choices.children('.list').html( '<li><p>' + acf._e('relationship', 'empty') + '</p></li>' );

				return;
			}
			
			
			// append new results
			this.$choices.children('.list').html( this.walker(json) );
			
						
			// apply .disabled to left li's
			this.$values.find('.acf-relationship-item').each(function(){
				
				var id = $(this).attr('data-id');
				
				_this.$choices.find('.acf-relationship-item[data-id="' + id + '"]').addClass('disabled');
				
			});
			
			
			// underline search match
			if( this.o.s )
			{
				var s = this.o.s;
				
				this.$choices.find('.acf-relationship-item:contains("' + s + '")').each(function(){
					
					var html = $(this).html().replace( s, '<span class="match">' + s + '</span>');
					
					$(this).html( html );
				});
				
			}
			
		},
		
		walker : function( data ){
			
			// vars
			var s = '';
			
			
			// loop through data
			if( $.isArray(data) )
			{
				for( var k in data )
				{
					s += this.walker( data[ k ] );
				}
			}
			else if( $.isPlainObject(data) )
			{
				// optgroup
				if( data.children !== undefined )
				{
					s += '<li><span class="acf-relationship-label">' + data.text + '</span><ul class="acf-bl">';
					
						s += this.walker( data.children );
					
					s += '</ul></li>';
				}
				else
				{
					s += '<li><span class="acf-relationship-item" data-id="' + data.id + '">' + data.text + '</span></li>';
				}
			}
			
			
			return s;
		},
		
		add : function( $span ){
			
			// max posts
			if( this.o.max > 0 )
			{
				if( this.$values.find('.acf-relationship-item').length >= this.o.max )
				{
					alert( acf.l10n.relationship.max.replace('{max}', this.o.max) );
					return false;
				}
			}
			
			
			// can be added?
			if( $span.hasClass('disabled') )
			{
				return false;
			}
			
			
			// disable
			$span.addClass('disabled');
			
			
			// template
			var data = {
					value	:	$span.attr('data-id'),
					text	:	$span.html(),
					name	:	this.$input.attr('name')
				},
				tmpl = _.template(acf.l10n.relationship.tmpl_li, data);
			
			
	
			// add new li
			this.$values.children('.list').append( tmpl )
			
			
			// trigger change on new_li
			this.$input.trigger('change');
			
			
			// validation
			this.$el.removeClass('error');
			
		},
		remove : function( $span ){
			
			// vars
			var id = $span.attr('data-id');
			
			
			// remove
			$span.parent('li').remove();
			
			
			// show
			this.$choices.find('.acf-relationship-item[data-id="' + id + '"]').removeClass('disabled');
			
			
			// trigger change on new_li
			this.$input.trigger('change');
			
		}
		
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready append', function( $el ){
		
		acf.get_fields( $el, 'relationship' ).each(function(){
			
			acf.fields.relationship.set({ $el : $(this) }).init();
			
		});
		
	});
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('keypress', '.acf-relationship .filters [data-filter]', function( e ){
		
		// don't submit form
		if( e.which == 13 )
		{
			e.preventDefault();
		}
		
	});
	
	
	$(document).on('change keyup', '.acf-relationship .filters [data-filter]', function(e){
		
		// vars
		var val = $(this).val(),
			filter = $(this).attr('data-filter'),
			$wrap = $(this).closest('.acf-relationship');
			$el = $wrap.closest('.acf-field');
			
		
		// Bail early if filter has not changed
		if( $wrap.attr('data-' + filter) == val )
		{
			return;
		}
		
		
		// update attr
		$wrap.attr('data-' + filter, val);
		
	    
	    // fetch
	    acf.fields.relationship.set({ $el : $el }).fetch();
		
	});

	
	$(document).on('click', '.acf-relationship .choices .acf-relationship-item', function( e ){
		
		e.preventDefault();
		
		acf.fields.relationship.set({ $el : $(this).closest('.acf-field') }).add( $(this) );
		
		$(this).blur();
		
	});
	
	$(document).on('click', '.acf-relationship .values .acf-icon', function( e ){
		
		e.preventDefault();
		
		acf.fields.relationship.set({ $el : $(this).closest('.acf-field') }).remove( $(this).closest('.acf-relationship-item') );
		
		$(this).blur();
		
	});
	
	
	
	

})(jQuery);

/* **********************************************
     Begin tab.js
********************************************** */

(function($){

	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	$(document).on('acf/setup_fields', function(e, el){
		
		// validate
		if( ! $(el).find('.acf-tab').exists() )
		{
			return;
		}
		
		
		// init
		$(el).find('.acf-tab').each(function(){
			
			// vars
			var $el		=	$(this),
				$field	=	$el.parent(),
				$wrap	=	$field.parent(),
				
				id		=	$el.attr('data-id'),
				label 	= 	$el.html();
				


			// only run once for each tab
			if( $el.hasClass('acf-tab-added') )
			{
				return;
			}
			
			$el.addClass('acf-tab-added');
			
			
			// create tab group if it doesnt exist
			if( ! $wrap.children('.acf-tab-group').exists() )
			{
				$wrap.children('.field_type-tab:first').before('<ul class="hl clearfix acf-tab-group"></ul>');
			}
			
			
			// add tab
			$wrap.children('.acf-tab-group').append('<li class="field_key-' + id + '" data-field_key="' + id + '"><a class="acf-tab-button" href="#" data-id="' + id + '">' + label + '</a></li>');
			
			
		});
		
		
		// trigger conditional logic
		// this code ( acf/setup_fields ) is run after the main acf.conditional_logic.init();
		acf.conditional_logic.change();
		
		
		// trigger
		$(el).find('.acf-tab-group').each(function(){
			
			$(this).find('li:first a').trigger('click');
			
		});

	
	});
	
	
	/*
	*  Events
	*
	*  jQuery events for this field
	*
	*  @type	function
	*  @date	1/03/2011
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	$(document).on('click', '.acf-tab-button', function( e ){
		
		
		e.preventDefault();
		
		
		// vars
		var $a		=	$(this),
			$ul		=	$a.closest('ul'),
			$wrap	=	$ul.parent(),
			id		=	$a.attr('data-id');
		
		
		// classes
		$ul.find('li').removeClass('active');
		$a.parent('li').addClass('active');
		
		
		// hide / show
		$wrap.children('.field_type-tab').each(function(){
			
			var $tab = $(this);
			
			if( $tab.hasClass('field_key-' + id) )
			{
				$tab.nextUntil('.field_type-tab').removeClass('acf-tab_group-hide').addClass('acf-tab_group-show');
			}
			else
			{
				$tab.nextUntil('.field_type-tab').removeClass('acf-tab_group-show').addClass('acf-tab_group-hide');
			}
			
		});

		
		// blur to remove dotted lines around button
		$a.trigger('blur');

		
	});
	
	
	$(document).on('acf/conditional_logic/hide', function( e, $target, item ){
		
		
		// if the $target to be hidden is a tab button, lets toggle a sibling tab button
		setTimeout(function(){
			
			if( $target.parent().hasClass('acf-tab-group') )
			{
				$target.siblings('.acf-conditional_logic-show').first().children('a').trigger('click');
			}
			
		}, 0);
		
		
	});
	
	

})(jQuery);

/* **********************************************
     Begin validation.js
********************************************** */

(function($){
        
	acf.validation = {
		
		// vars
		active	: 1,
		ignore	: 0,
		
		
		// classes
		error_class : 'error',
		message_class : 'acf-error-message',
		
		
		// el
		$trigger : null,
		
		
		// functions
		init : function(){
			
			// bail early if disabled
			if( this.active == 0 )
			{
				return;
			}
			
			
			// add events
			this.add_events();
		},
		
		add_error : function( $field, message ){
			
			// add class
			$field.addClass(this.error_class);
			
			
			// add message
			if( message !== undefined )
			{
				$field.children('.acf-input').children('.' + this.message_class).remove();
				$field.children('.acf-input').prepend('<div class="' + this.message_class + '"><p>' + message + '</p></div>');
			}
			
			
			// hook for 3rd party customization
			acf.do_action('add_field_error', $field);
		},
		
		remove_error : function( $field ){
			
			// var
			$message = $field.children('.acf-input').children('.' + this.message_class);
			
			
			// remove class
			$field.removeClass(this.error_class);
			
			
			// remove message
			setTimeout(function(){
				
				acf.remove_el( $message );
				
			}, 250);
			
			
			// hook for 3rd party customization
			acf.do_action('remove_field_error', $field);
		},
		
		fetch : function( $form ){
			
			// reference
			var _this = this;
			
			
			// vars
			var data = acf.serialize_form( $form );
				
			
			// append AJAX action		
			data.action = 'acf/validate_save_post';
			
				
			// ajax
			$.ajax({
				url			: acf.get('ajaxurl'),
				data		: data,
				type		: 'post',
				dataType	: 'json',
				success		: function( json ){
					
					_this.complete( $form, json );
					
				}
			});
			
		},
		
		complete : function( $form, json ){
			
			// reference
			var _this = this;
			
			
			// remove previous error message
			$form.children('.' + this.message_class).remove();
			
			
			// validate json
			if( !json || json.result == 1)
			{
				// remove hidden postboxes (this will stop them from being posted to save)
				$form.find('.acf-postbox:hidden').remove();
					
					
				// bypass JS and submit form
				this.ignore = 1;
				
				
				// submit form again
				if( this.$trigger )
				{
					this.$trigger.click();
				}
				else
				{
					$form.submit();
				}
				
				
				// end function
				return;
			}
			
			
			// hide ajax stuff on submit button
			if( $('#submitdiv').exists() )
			{
				$('#save-post').removeClass('button-disabled');
				$('#publish').removeClass('button-primary-disabled');
				$('#ajax-loading').removeAttr('style');
				$('#publishing-action .spinner').hide();
			}
			
			
			// show error message	
			$form.prepend('<div class="' + this.message_class + '"><p>' + json.message + '</p></div>');
			
			
			// show field error messages
			$.each( json.errors, function( k, v ){
				
				var $field = $('.acf-field[data-key="' + k + '"]');
				
				_this.add_error( $field, v );
				
			});
						
			
		},
		
		add_events : function(){
			
			var _this = this;
			
			
			// focus
			$(document).on('focus click change', '.acf-field.required input, .acf-field.required textarea, .acf-field.required select', function( e ){
				
				_this.remove_error( $(this).closest('.acf-field') );
				
			});
			
			
			// click save
			$(document).on('click', '#save-post', function(){
				
				_this.ignore = 1;
				_this.$trigger = $(this);
				
			});
			
			
			// click publish
			$(document).on('click', '#publish', function(){
				
				_this.$trigger = $(this);
				
			});
			
			
			// submit
			$(document).on('submit', 'form', function( e ){
				
				// bail early if this form does not contain ACF data
				if( ! $(this).find('#acf-form-data').exists() )
				{
					return true;
				}
				
				
				// ignore this submit?
				if( _this.ignore == 1 )
				{
					_this.ignore = 0;
					return true;
				}
				
				
				// bail early if disabled
				if( _this.active == 0 )
				{
					return true;
				}
				
				
				// prevent default
				e.preventDefault();
				
				
				// run validation
				_this.fetch( $(this) );
								
			});
			
		}
		
	};
	
	
	acf.add_action('ready', function(){
		
		//acf.validation.init();
		
	});
	

})(jQuery);

/* **********************************************
     Begin wysiwyg.js
********************************************** */

(function($){
	
	/*
	*  WYSIWYG
	*
	*  jQuery functionality for this field type
	*
	*  @type	object
	*  @date	20/07/13
	*
	*  @param	N/A
	*  @return	N/A
	*/
	
	acf.fields.wysiwyg = {
		
		$el : null,
		$textarea : null,
		
		o : {},
		
		set : function( o ){
			
			// merge in new option
			$.extend( this, o );
			
			
			// find textarea
			this.$textarea = this.$el.find('textarea');
			
			
			// get options
			this.o = acf.get_atts( this.$el );
			
			
			// add ID
			this.o.id = this.$textarea.attr('id');
			
			
			// return this for chaining
			return this;
			
		},
		has_tinymce : function(){
		
			var r = false;
			
			if( typeof(tinyMCE) == "object" )
			{
				r = true;
			}
			
			return r;
			
		},
		init : function(){
			
			// temp store tinyMCE.settings
			var backup = $.extend( {}, tinyMCE.settings );
			
			
			// reset tinyMCE settings
			tinyMCE.settings.theme_advanced_buttons1 = '';
			tinyMCE.settings.theme_advanced_buttons2 = '';
			tinyMCE.settings.theme_advanced_buttons3 = '';
			tinyMCE.settings.theme_advanced_buttons4 = '';
			
			if( acf.isset_object( this.toolbars, this.o.toolbar ) )
			{
				$.each( this.toolbars[ this.o.toolbar ], function( k, v ){
					tinyMCE.settings[ k ] = v;
				})
			}
				
			
			// hook for 3rd party customization
			tinyMCE.settings = acf.apply_filters('wysiwyg_tinymce_settings', tinyMCE.settings, this.o.id);
			
			
			// add functionality back in
			tinyMCE.execCommand("mceAddControl", false, this.o.id);
				
				
			// add events (click, focus, blur) for inserting image into correct editor
			this.add_events();
				
			
			// restore tinyMCE.settings
			tinyMCE.settings = backup;
			
			
			// set active editor to null
			wpActiveEditor = null;
					
		},
		add_events : function(){
		
			// vars
			var id = this.o.id,
				editor = tinyMCE.get( id );
			
			
			// validate
			if( !editor )
			{
				return;
			}
			
			
			// vars
			var	$container = $('#wp-' + id + '-wrap'),
				$body = $( editor.getBody() ),
				$textarea = $( editor.getElement() );
	
			
			// events
			$container.on('click', function(){
				
				acf.validation.remove_error( $container.closest('.acf-field') );
				
			});
			
			$body.on('focus', function(){
			
				wpActiveEditor = id;
		
				acf.validation.remove_error( $container.closest('.acf-field') );
				
			});
			
			$body.on('blur', function(){
			
				wpActiveEditor = null;
				
				// update the hidden textarea
				// - This fixes a but when adding a taxonomy term as the form is not posted and the hidden tetarea is never populated!

				// save to textarea	
				editor.save();
				
				
				// trigger change on textarea
				$textarea.trigger('change');
				
			});
			
			
		},
		destroy : function(){
			
			// vars
			var id = this.o.id,
				editor = tinyMCE.get( id );
			
			
			// Remove tinymcy functionality.
			// Due to the media popup destroying and creating the field within such a short amount of time,
			// a JS error will be thrown when launching the edit window twice in a row.
			try
			{
				tinyMCE.execCommand("mceRemoveControl", false, id);
			} 
			catch(e)
			{
				console.log( e );
			}
			
			
			// set active editor to null
			wpActiveEditor = null;
			
		}
		
	};
	
	
	/*
	*  acf/setup_fields
	*
	*  run init function on all elements for this field
	*
	*  @type	event
	*  @date	20/07/13
	*
	*  @param	{object}	e		event object
	*  @param	{object}	el		DOM object which may contain new ACF elements
	*  @return	N/A
	*/
	
	acf.add_action('ready', function( $el ){
		
		// validate
		if( ! acf.fields.wysiwyg.has_tinymce() )
		{
			return;
		}
		
		
		// events
		acf.add_action('remove', function( $el ){
		
			acf.get_fields( $el, 'wysiwyg' ).each(function(){
				
				acf.fields.wysiwyg.set({ $el : $(this).find('.acf-wysiwyg-wrap') }).destroy();
				
			});
			
		}).add_action('sortstart', function( $el ){
		
			acf.get_fields( $el, 'wysiwyg' ).each(function(){
				
				acf.fields.wysiwyg.set({ $el : $(this).find('.acf-wysiwyg-wrap') }).destroy();
				
			});
			
		}).add_action('sortstop', function( $el ){
		
			acf.get_fields( $el, 'wysiwyg' ).each(function(){
				
				acf.fields.wysiwyg.set({ $el : $(this).find('.acf-wysiwyg-wrap') }).init();
				
			});
			
		}).add_action('load', function( $el ){
		
			// vars
			var wp_content = $('#wp-content-wrap').exists(),
				wp_acf_settings = $('#wp-acf_settings-wrap').exists()
				mode = 'tmce';
			
			
			// has_editor
			if( wp_acf_settings )
			{
				// html_mode
				if( $('#wp-acf_settings-wrap').hasClass('html-active') )
				{
					mode = 'html';
				}
			}
			
			
			setTimeout(function(){
				
				// trigger click on hidden wysiwyg (to get in HTML mode)
				if( wp_acf_settings && mode == 'html' )
				{
					$('#acf_settings-tmce').trigger('click');
				}
				
			}, 1);
			
			
			setTimeout(function(){
				
				// vars
				var $fields = acf.get_fields( $el, 'wysiwyg' );
				
				
				// Destory all WYSIWYG fields
				// This hack will fix a problem when the WP popup is created and hidden, then the ACF popup (image/file field) is opened
				$fields.each(function(){
					
					acf.fields.wysiwyg.set({ $el : $(this).find('.acf-wysiwyg-wrap') }).destroy();
					
				});
				
				
				// Add WYSIWYG fields
				setTimeout(function(){
					
					$fields.each(function(){
					
						acf.fields.wysiwyg.set({ $el : $(this).find('.acf-wysiwyg-wrap') }).init();
						
					});
					
				}, 0);
				
			}, 10);
			
			
			setTimeout(function(){
				
				// trigger html mode for people who want to stay in HTML mode
				if( wp_acf_settings && mode == 'html' )
				{
					$('#acf_settings-html').trigger('click');
				}
				
				// Add events to content editor
				if( wp_content )
				{
					acf.fields.wysiwyg.set({ $el : $('#wp-content-wrap') }).add_events();
				}
				
				
			}, 11);
			
		});
		
		
	});
	
	
	/*
	*  Full screen
	*
	*  @description: this hack will hide the 'image upload' button in the wysiwyg full screen mode if the field has disabled image uploads!
	*  @since: 3.6
	*  @created: 26/02/13
	*/
	
	$(document).on('click', '.acfacf.fields.wysiwyg a.mce_fullscreen', function(){
		
		// vars
		var wysiwyg = $(this).closest('.acfacf.fields.wysiwyg'),
			upload = wysiwyg.attr('data-upload');
		
		if( upload == 'no' )
		{
			$('#mce_fullscreen_container td.mceToolbar .mce_add_media').remove();
		}
		
	});
	

})(jQuery);