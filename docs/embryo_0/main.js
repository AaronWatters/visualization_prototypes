var info = $('#info');
var canvas_div = null;

var setup = function () {
  info.html('setting up embryo.');
  var element = $('#embryo');
  element.empty();
  var file_input = $('<input type="file" />').appendTo(element);
  file_input.change(function(event){
    var uploadedFile = event.target.files[0]; 
    if (uploadedFile) {
        var readFile = new FileReader();
        readFile.onload = function(e) { 
            var contents = e.target.result;
            var json = JSON.parse(contents);
            process_data(json, element);
        };
        readFile.readAsText(uploadedFile);
    } else { 
        info.html("Failed to load file");
    }
  })
  canvas_div = $("<div/>").appendTo(element);
  info.html('Please load a JSON file.');
};

function process_data(json, element) {

    var time_to_dicts = json.time_to_dicts;
    var times = json.times;
    var current_dicts = time_to_dicts[times[0]];

    element.empty();
    var slider = $("<div></div>").appendTo(element);
    slider.slider(({
        min: 0,
        max: times.length,
        slide: (function(event,ui) {
            var value = ui.value;
            var time = times[value];
            info.html("Time = " + time);
            var current_dicts = time_to_dicts[time];
            draw_current(current_dicts);
        }),
    }));
    
    var target = $("<div/>").appendTo(element);
    var canvas_config = {
        width: 600,
        height: 600,
    };
    target.dual_canvas_helper(canvas_config);
    var frame = target.frame_region(
        0, 0, 600, 600,
        0, 0, 100, 100);
    var nd_frame = target.nd_frame({
        dedicated_frame: frame,
    });
    var gene_color = {'Wg': 'red', 'Byn': 'green', 'Hkb': 'blue', 'Tll': 'cyan', 'Fkh': 'magenta'};
    for (var gene in gene_color) {
        var gene_info = $('<div>' + gene + " \u2B24 </div>").appendTo(element);
        //gene_info.css("color", gene_color[gene]);
        gene_info.css({"color": gene_color[gene]})
    }
    
    function draw_current(current_dicts) {
        nd_frame.reset();
        for (var i=0; i<current_dicts.length; i++) {
            var d = current_dicts[i];
            var intensities = d.intensities;
            var coords = [...d.coord];
            nd_frame.circle({location: coords, r:5 , color:"rgba(200,200,200, 0.3)"});
            var cum = 0.0;
            var descs = []
            var radius_scale = 6;
            for (var j=0; j<intensities.length; j++) {
                var [intensity, gene] = intensities[j];
                cum += intensity;
                var sqrtcum = Math.sqrt(cum);
                //nd_frame.circle({location:coords, r:sqrtcum*10, color:gene_color[gene]})
                var desc = {location:coords, r:radius_scale*sqrtcum, color:gene_color[gene]};
                descs.push(desc);
            }
            while (descs.length > 0) {
                // modify shared reference
                coords[2] += 0.1;
                var desc = descs.pop();
                nd_frame.circle(desc);
            }
        }
        var center = [100,100,100];
        var radius = 300;
        nd_frame.orbit_all(radius, center);
    }
    
    draw_current(current_dicts);
    info.html("Please slide the slider or rotate the view.")
    
    nd_frame.fit(0.8);
};

info.html('main.js loaded.');