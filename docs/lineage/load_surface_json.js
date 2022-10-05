
var DATA_FILE = "./lineage.json";

var DATA_MAP = {
    "F32Full.json": "F32Full",
    "F32_ICMTE.json": "F32_ICMTE",
}
var SIDE = 900;
var radius_multiple = 2;

var info, graphics, tree, surfaces, options, filename;
var json_data = null;

function load_surfaces() {
    info = $("#info");
    surfaces = $("#surfaces");
    graphics = $("#graphics");
    tree = $("#tree");
    graphics.css({
        "display": "flex",
        "flex-direction": "row",
        "gap": "10px",
    })
    surfaces.width(SIDE).height(SIDE);
    surfaces.css("background-color", "cyan");
    tree.width(SIDE/2).height(SIDE);
    tree.css("background-color", "#eee");
    tree.empty();
    tree.dual_canvas_helper({
        width: SIDE/2,
        height: SIDE,
    });
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
    filename = options.find(":selected").val();
    info.html("loading: " + filename);
    $.getJSON(filename, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var display3d;

var setup = function(data) {
    debugger;
    json_data = data
    info.html("loaded " + filename);
    var container = surfaces;
    display3d = container.surfaces_sequence(json_data);
    display3d.load_3d_display(container);
    draw_tree(tree);
    // override the slider callback?
    display3d.slider.slider({
        slide: update_timestamp,
        change: update_timestamp,
    })
};

var update_timestamp = function () {
    var tsindex = display3d.slider.slider("option", "value");
    tree_rect.change({y: ntimestamps - tsindex});
    display3d.update_timestamp();
}

var rgb_from_array = function(color_array) {
    var rgb256 = [];
    var cvt = 255.0 / 999.0;  // magic constant 999
    for (var i=0; i<3; i++) {
        var x = Math.floor(color_array[i] * cvt);
        rgb256.push(x)
    }
    return "rgb(" + rgb256 + ")";
}

var tree_rect, ntimestamps;

var draw_tree = function(tree) {
    //debugger;
    //tree.empty();
    //tree.dual_canvas_helper({
    //    width: SIDE/2,
    //    height: SIDE,
    //});
    tree.reset_canvas()
    var max_surfaces = 0;
    var color_map = {};
    var color_max_number = {};
    var timestamp2color2number = {};
    var sequence = json_data.sequence;
    ntimestamps = sequence.length;
    for (var i=0; i<ntimestamps; i++) {
        var surface_info = sequence[i];
        var surfaces = surface_info.surfaces;
        for (var surface_id in surfaces) {
            var surface = surfaces[surface_id];
            var color = surface.color;
            var color_id = "" + color;
            color_map[color_id] = rgb_from_array(color);
            color_max_number[color_id] = 0;
        }
    }
    for (var i=0; i<ntimestamps; i++) {
        var color2number = {};
        for (color_id in color_map) {
            color2number[color_id] = 0;
        }
        timestamp2color2number[i] = color2number;
    }
    for (var i=0; i<ntimestamps; i++) {
        var surface_info = sequence[i];
        var surfaces = surface_info.surfaces;
        for (var surface_id in surfaces) {
            var surface = surfaces[surface_id];
            var color = surface.color;
            var color_id = "" + color;
            timestamp2color2number[i][color_id] += 1;
        }
    }
    for (var i=0; i<ntimestamps; i++) {
        var ts_width = 0;
        for (var color_id in color_map) {
            var tscount = timestamp2color2number[i][color_id];
            color_max_number[color_id] = Math.max(color_max_number[color_id], tscount)
            ts_width += tscount;
        }
        max_surfaces = Math.max(ts_width, max_surfaces);
    }
    var color_sequence = [];
    for (var color_id in color_map) {
        color_sequence.push(color_id);
    }
    var frame = tree.frame_region(
        0, 0, SIDE/2, SIDE,
        0, 0, max_surfaces, ntimestamps,
    );
    var radius = 0.5;
    var vertical_cursor = ntimestamps;
    for (var i=0; i<ntimestamps; i++) {
        var horizontal_cursor = 0;
        for (var j=0; j<color_sequence.length; j++) {
            var color_id = color_sequence[j];
            var color = color_map[color_id];
            var tscount = timestamp2color2number[i][color_id];
            var colormax = color_max_number[color_id];
            start = horizontal_cursor + 0.5 * (colormax - tscount);
            for (var k=0; k<tscount; k++) {
                frame.frame_circle({x: start + k, y: vertical_cursor, r: radius, color: color});
            }
            horizontal_cursor += colormax;
        }
        vertical_cursor--;
    }
    tree_rect = frame.frame_rect({
        x: 0,
        y: ntimestamps-1,
        dx: -0.5, dy: -0.5,
        w: max_surfaces + 1,
        h: 1,
        fill:false,
        lineWidth: 2,
        //lineDash:[5,5],
        name: true,
    })
    tree.fit();
};
