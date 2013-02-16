//set config and initialize
//CSSUtilities.define('mode', 'author');
CSSUtilities.define('mode', 'browser');
CSSUtilities.define('attributes', false);
CSSUtilities.init();

//store a reference to the inspect button, 
//the output area, and its container demo area
var button = document.getElementById('cssutilities-demotrigger'),
    output = document.getElementById('content-demo'),
    demoarea = output.parentNode,
    editCSSText = document.getElementById('targetStyle');

//track the currently selected element
var selected = null;

//create a contains method of the container
//to evaluate whether the selected node is inside it
demoarea.contains = function (node) {
    if(node == this) {
        return true;
    }
    if(node == null) {
        return false;
    }
    else {
        return this.contains(node.parentNode);
    }
};

//bind a document mouse listener for highlighting the selected element
addEvent(document, 'mouseover', function (e) {
    //if inspection is turned on
    if(button.className == 'on') {
        //get event target and convert for text nodes
        var target = e.target ? e.target : e.srcElement;
        while(/#text/i.test(target.nodeName)) {
            target = target.parentNode;
        }

        //if we have a current selection, remove its highlight
        if(selected != null) {
            selected.style.outline = 'none';
        }

        //ignore target inside the demo area itself
        //it's too distracting when you're trying to read tooltips
        if(editCSSText.contains(target)) {
            return true;
        }

        //save the new selection and add its highlight
        selected = target;
        selected.style.outline = '1px solid red';
    }

    return true;
});


//bind a document click listener
addEvent(document, 'click', function (e) {
    //get event target and convert for text nodes
    var target = e.target ? e.target : e.srcElement;
    while(/#text/i.test(target.nodeName)) {
        target = target.parentNode;
    }

    //if this was a click on the inspect button
    if(target == button) {
        //toggle it on or off (inverting its current state)
        buttonToggle(button.className == 'on' ? 'off' : 'on');
    }

    //else if inspection is turned on and the target matches selection
    //(the flow logic means you can never inspect the button itself)
    else if(button.className == 'on' && target == selected) {
        //clear selection and its outline
        target.style.outline = 'none';
        selected = null;

        //and try to reset scrolling back to the top
        try {
            output.scrollTop = 0;
        }
        catch(err) {}

        //then wait a tiny moment for the message to show
        //before the process pause that's to come
        window.setTimeout(function () {
            //call getCSSRules for the data we need
            //and pass the results to the sort and output method
            sortThenOutput(target, CSSUtilities.getCSSRules(
            target,
                'screen',
                'selector,properties,inheritance,media,specificity,href,index',
            true));
            //this is quite long enough
        }, 100);

        //block default action
        try {
            e.preventDefault();
        }
        catch(err) {}
        return false;
    }

    //if we get here just return true
    return true;

});

//toggle the button state
function buttonToggle(state) {
    //clear any  existing selection and its outline
    if(selected != null) {
        selected.style.outline = 'none';
        selected = null;
    }

    //toggle button state class and value
    if(state == 'on') {
        button.className = 'on';
        button.innerHTML = 'Inspect <em>= ON</em>';
    }
    else {
        button.className = 'off';
        button.innerHTML = 'Inspect <em>= OFF</em>';
    }
}

//sort and output a rules set
function sortThenOutput(target, rules) {
    //pass the rules array through a multi-part sort
    //to put it in primary order of inverse inheritance depth, then
    //secondary order of specificity, then tertiary order of source index
    //(the default sort is specificity > index > inheritance)
    rules.sort(function (a, b) {
        if(a.inheritance.length == b.inheritance.length) {
            if(a.specificity.toString() === b.specificity.toString()) {
                return a.index - b.index;
            }

            if(a.specificity[0] !== b.specificity[0]) {
                return a.specificity[0] - b.specificity[0];
            }
            if(a.specificity[1] !== b.specificity[1]) {
                return a.specificity[1] - b.specificity[1];
            }
            if(a.specificity[2] !== b.specificity[2]) {
                return a.specificity[2] - b.specificity[2];
            }
            return a.specificity[3] - b.specificity[3];
        }

        return b.inheritance.length - a.inheritance.length;
    });

    //now reverse the whole thing 
    //so that the highest values are at the top
    rules.reverse();

    //assemble the HTML output
    for(var editCSSText = '',
    editCSSTextForm = '',
    currentnode = null,
    previousnode = null,
    i = 0; i < rules.length; i++) {
        //track the current inheritance context node
        //so we can output a key term when it changes
        var currentnode = rules[i].inheritance.length > 0 ? rules[i].inheritance[0] : null;

        //ignore rules with no properties
        //(these will be inherited rules that contain no inheritable properties)
        if(rules[i].properties == null) {
            continue;
        }

        //add an inheritance key term if applicable
        if(rules[i].inheritance.length > 0 && currentnode != previousnode) {
            previousnode = currentnode;
            key = currentnode.nodeName.toLowerCase() + (currentnode.id != '' ? ('#' + currentnode.id) : currentnode.className != '' ? ('.' + currentnode.className) : '');

            editCSSText += '//Following styles are inherited from ' + key + '\n';

        }

        //add the rule's tooltip information
        var ilen = rules[i].inheritance.length;
        if(ilen > 0) {
            for(var chain = '', k = 0; k < ilen; k++) {
                chain += rules[i].inheritance[k].nodeName.toLowerCase() + ' > ';
            }
            chain += target.nodeName.toLowerCase();
        }

        editCSSText += rules[i].selector + '{\n'

        //iterate to add the properties
        for(var x in rules[i].properties) {
            if(!rules[i].properties.hasOwnProperty(x)) {
                continue;
            }

            //add the data for cancelled or active properties
            var prop = rules[i].properties[x];

            if(prop.status == 'cancelled') {
                editCSSText += "//" + x + ":" + prop.value + ';\n';
            }
            else {
                editCSSText += x + ":" + prop.value + ';\n';
            }
        }

        editCSSText += '} \n \n'

        $('#targetStyle').val(editCSSText);
    }

    //try to reset scrolling back to the top
    try {
        output.scrollTop = 0;
    }
    catch(err) {}
}



//add event construct
function addEvent(node, ename, handler) {
    if(typeof document.addEventListener != 'undefined') {
        node.addEventListener(ename, handler, false);
    }
    else if(typeof document.attachEvent != 'undefined') {
        node.attachEvent('on' + ename, handler);
    }
}

$('document').ready(function () {
	
    $('#targetStyle').bind('keypress keydown', function (event) {
        setTimeout(function () {
            if($('.DonTheDOMStyle').length) {
                $('.DonTheDOMStyle').append($('#targetStyle').val())
            }
            else {
                $('head').append('<style class="DonTheDOMStyle">' + $('#targetStyle').val()) //+'<style>')    			
            }
        }, 500);
    });

});