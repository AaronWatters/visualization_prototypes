
var DATA_FILE = "./lineage.json";

var DATA_MAP = {
    "F32Full.json": "F32Full",
    "F32_ICMTE.json": "F32_ICMTE",
}
var SIDE = 800;
var radius_multiple = 2;

var info, surfaces, options, filename;
var json_data = null;

function load_surfaces() {
    info = $("#info");
    surfaces = $("#surfaces");
    surfaces.width(SIDE).height(SIDE);
    surfaces.css("background-color", "cyan");
    var sources = $("#sources");
    sources.empty();
    options = $("<select/>").appendTo(sources);
    var selected = ""
    for (var filename in DATA_MAP) {
        var abbrev = DATA_MAP[filename];
        $(`<option value="${filename}" ${selected}> ${abbrev} </option>`).appendTo(options);
        selected = "";
    }
    load_selected_file();
    //options.on("change", load_selected_file)
    options.change(load_selected_file);
}

function load_selected_file() {
    var filename = options.find(":selected").val();
    info.html("loading: " + filename);
    $.getJSON(filename, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var setup = function(data) {
    debugger;
    json_data = data
    info.html("loaded " + filename);
    var container = surfaces;
    var display3d = container.surfaces_sequence(json_data);
    display3d.load_3d_display(container);
};
