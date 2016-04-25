/*global logger*/
/*
    jqueryknob
    ========================

    @file      : jqueryknob.js
    @version   : 1.0.0
    @author    : Bas Elzinga
    @date      : Wed, 20 Apr 2016 06:18:57 GMT
    @copyright : eMagiz 2016
    @license   : MIT

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "jqueryknob/lib/jquery-1.11.2",
    "jqueryknob/lib/jquery.knob",
    "dojo/text!jqueryknob/widget/template/jqueryknob.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, _jQuery, _jQueryKnob, widgetTemplate) {
    "use strict";
    declare("jquery", [_jQuery])

    var $ = _jQuery.noConflict(true);
    
    // Declare widget's prototype.
    return declare("jqueryknob.widget.jqueryknob", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        knobParent: null,
        firstKnobInput: null,
        knob: null,

        // Parameters configured in the Modeler.

        value: "",     
        // Appearance
        min: null,
        minString: null,
        max: null,
        maxString: null,
        step: null,
        angleOffset: null,
        angleOffsetString: null,
        angleArc: null,
        angleArcString: null,
        stopper: null,
        readOnly: null,
        rotation: null,
        postFix: "",
        preFix: "",
        
        // Behavior
        cursor: null,
        thickness: null,
        lineCap: null,
        width: null,
        height: null,
        displayInput: null,
        displayPrevious: null,
        fgColor: null,
        inputColor: null,
        font: null,
        fontWeight: null,
        bgColor: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        
        propertyDefined: function(property) {
            if (typeof property === 'string') {
                return property;
            } else {
                return property != null;
            }
        },

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            var config = {};
            
            if (this.propertyDefined(this.minString)) { this.min = parseInt(this.minString); }
            if (this.propertyDefined(this.maxString)) { this.max = parseInt(this.maxString); }
            if (this.propertyDefined(this.angleArcString)) { this.angleArc = parseInt(this.angleArcString); }
            if (this.propertyDefined(this.angleOffsetString)) { this.angleOffset = parseInt(this.angleOffsetString); }
            
            if (this.propertyDefined(this.min)) {config.min = this.min};
            if (this.propertyDefined(this.max)) {config.max = this.max};
            if (this.propertyDefined(this.step)) {config.step = this.step;}
            if (this.propertyDefined(this.angleOffset)) {config.angleOffset = this.angleOffset;}
            if (this.propertyDefined(this.angleArc)) {config.angleArc = this.angleArc;}
            if (this.propertyDefined(this.stopper)) {config.stopper = this.stopper;}
            if (this.propertyDefined(this.readOnly)) {config.readOnly = this.readOnly;}
            if (this.propertyDefined(this.rotation)) {config.rotation = this.rotation;}
            if (this.propertyDefined(this.cursor)) {config.cursor = this.cursor;}
            if (this.propertyDefined(this.thickness)) {config.thickness = this.thickness / 100;}
            if (this.propertyDefined(this.lineCap)) {config.lineCap = this.lineCap;}
            if (this.propertyDefined(this.width)) {config.width = this.width;}
            if (this.propertyDefined(this.height)) {config.height = this.height;}
            if (this.propertyDefined(this.displayInput)) {config.displayInput = this.displayInput;}
            if (this.propertyDefined(this.displayPrevious)) {config.displayPrevious = this.displayPrevious;}
            if (this.propertyDefined(this.fgColor)) {config.fgColor = this.fgColor;}
            if (this.propertyDefined(this.inputColor)) {config.inputColor = this.inputColor;}
            if (this.propertyDefined(this.font)) {config.font = this.font;}
            if (this.propertyDefined(this.fontWeight)) {config.fontWeight = this.fontWeight;}
            if (this.propertyDefined(this.bgColor)) {config.bgColor = this.bgColor;}
            
            var that = this;
            config.release = function(v) { 
                if (that._contextObj != null && that.value != null) {
                    var contextValue = that._contextObj.get(that.value);
                    if (contextValue !== v) {
                        that._contextObj.set(that.value, v);
                    }
                }
            }
            config.format = function(v) { return that.preFix + v + that.postFix; }
            
            this.knob = $(this.firstKnobInput).knob(config);
            var horizontalMargin = ($(this.knobParent).width()-this.knob.width())/2;
            //var verticalMargin = ($(this.knobParent).height()-this.knob.height())/2; Did not work
            $(this.knobParent).css({"margin-right": horizontalMargin.toString()+'px', "margin-left":horizontalMargin.toString()+'px'});

            this._updateRendering();
            this._setupEvents();
        },
        


        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            logger.debug(this.id + "._setupEvents");

        },

        // Rerender the interface.
        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                
                var value = this._contextObj.get(this.value);
                var knob = $(this.firstKnobInput);
                var knobValue = knob.val();
                if (knobValue !== value)    {
                    knob.val(value).trigger('change');
                }
                
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function(validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.value);

            if (this.readOnly) {
                validation.removeAttribute(this.value);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.value);
            }
        },

        // Clear validations.
        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function(message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.value,
                    callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, attrHandle, validationHandle ];
            }
        }
    });
});

require(["jqueryknob/widget/jqueryknob"], function() {
    "use strict";
});
