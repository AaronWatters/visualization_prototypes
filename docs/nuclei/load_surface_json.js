
var DATA_FILE = "./big.json";
var SIDE = 1000;
var radius_multiple = 2;

var info, surfaces;
var json_data = null;

function load_surfaces() {
    info = $("#info");
    surfaces = $("#surfaces");
    surfaces.width(SIDE).height(SIDE);
    surfaces.css("background-color", "cyan")
    info.html("loading: " + DATA_FILE);
    $.getJSON(DATA_FILE, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var setup = function(data) {
    debugger;
    json_data = data
    info.html("loaded!");
    var container = surfaces;
    var display3d = container.surfaces_sequence(json_data);
    display3d.load_3d_display(container);
};
