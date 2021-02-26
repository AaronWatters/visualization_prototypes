var info = $('#info');
//var canvas_div = null;
var element = null;
var volume = null;
var DATA_FILE = "./vector_field.json";
var json_data = null;
var width = 1200;

var setup = function () {
    debugger;
    info.html('setting up visualization.');
    element = $('#viz');
    element.empty();
    $.getJSON(DATA_FILE, process_json).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var process_json = function(data) {
    json_data = data;
    info.html("json data read.");
    json_data.volume_options.threshold = 0.5;
    volume = element.volume32(json_data.volume_options);
    //json_data.stream_options.stream_lines = json_data.streamlines;
    var stream_options = {
        basis_scale: json_data.stream_options.basis_scale,
        cycle_duration: json_data.stream_options.cycle_duration,
        stream_lines: json_data.streamlines,
    };
    volume.settings.stream_lines_parameters = stream_options;
    var valuesArray = new Float32Array(json_data.array);
    volume.buffer = valuesArray;
    element.V_container = $("<div/>").appendTo(element);
    volume.build_scaffolding(element.V_container, width);
    volume.wires_check.prop("checked", true);
    volume.focus_volume();
};

info.html('main.js loaded.');
