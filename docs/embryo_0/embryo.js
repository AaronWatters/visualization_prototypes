
function process_embryo_data(json, element, info, target) {

    var time_to_dicts = json.time_to_dicts;
    var times = json.times;
    var current_dicts = time_to_dicts[times[0]];

    //element.empty();
    var slider = $("<div></div>").appendTo(element);
    slider.slider(({
        min: 0,
        max: times.length,
        slide: (function(event,ui) {
            var value = ui.value;
            var time = times[value];
            info.html("Time = " + time);
            current_dicts = time_to_dicts[time];
            draw_current(current_dicts);
        }),
    }));

    element.set_time_index = function (index) {
        index = Math.min(times.length, index);
        var time = times[index];
        draw_current(time_to_dicts[time]);
    };
    
    if (!target) {
        target = $("<div/>").appendTo(element);
        var canvas_config = {
            width: 600,
            height: 600,
        };
        target.dual_canvas_helper(canvas_config);
    }
    var frame = target.frame_region(
        0, 0, 600, 600,
        0, 0, 100, 100);
    var nd_frame = target.nd_frame({
        dedicated_frame: frame,
    });
    var time_info = target.text({
        x:10, y:10, text:"time here", color:"black", background:"white", name:true
    })
    var gene_color = {'Wg': 'red', 'Byn': 'green', 'Hkb': 'blue', 'Tll': 'cyan', 'Fkh': 'magenta'};
    var gene_container = $("<div/>").appendTo(element);
    for (var gene in gene_color) {
        var gene_info = $('<span>' + gene + " \u2B24 ; </span>").appendTo(gene_container);
        //gene_info.css("color", gene_color[gene]);
        gene_info.css({"color": gene_color[gene]})
    }

    var tooltip_not_rotate = false;
    var mode_button = $("<button>Enable tooltips</button>").appendTo(element);
    var mode_click = function () {
        tooltip_not_rotate = !tooltip_not_rotate;
        if (tooltip_not_rotate) {
            mode_button.html("Enable rotation");
        } else {
            mode_button.html("Show tooltips");
        }
        draw_current(current_dicts);
    };
    mode_button.click(mode_click);
    
    function draw_current(current_dicts) {
        target.reset_events();
        nd_frame.reset();
        nd_frame.orbit_off();
        var the_time;
        for (var i=0; i<current_dicts.length; i++) {
            var d = current_dicts[i];
            var intensities = d.intensities;
            var coords = [...d.coord];
            var tooltip = [d.nucleus];
            the_time = "" + d.time_info;
            tooltip.push("times: " + d.time_info);
            tooltip.push("xyz: " + coords.map(Math.floor));
            var intstr = "";
            for (var j=0; j<intensities.length; j++) {
                var [intensity, gene] = intensities[j];
                intstr += " " + gene + ":" + intensity.toFixed(2);
            }
            tooltip.push(intstr)
            nd_frame.circle({
                location: coords, 
                r:5 , 
                color:"rgba(200,200,200, 0.3)",
                tooltip:tooltip.join("<br>\n"),
                name: tooltip_not_rotate,
            });
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
            time_info.change({text: the_time})
        }
        var center = [100,100,100];
        var radius = 300;
        if (tooltip_not_rotate) {
            enable_tooltip();
            info.html("Please slide the slider or mouse over a dot to show tooltip.")
        } else {
            nd_frame.orbit_all(radius, center);
            info.html("Please slide the slider or rotate the view.")
        }
    }
    draw_current(current_dicts);

    // install tooltip logic

    var enable_tooltip = function() {
        let ttwidth="140px";
        let ttheight="auto";
        let ttbackground="white";
        let ttfont="12pt Arial";
        let tooltip_attribute="tooltip";
        let event_types= ["mousemove", "mouseover"];
        let tt_shift_left=10;
        let tt_shift_top=10;
        let tt_visible_opacity=0.8;
        let tooltip = $("<div>tooltip here</div>").appendTo(element);
        tooltip.css({
            position: "absolute",
            width: ttwidth,
            height: ttheight,
            background: ttbackground,
            font: ttfont,
            opacity: 0,  // initially invisible.
        });
        element.jp_doodle_tooltip = tooltip;
        var event_handler = function(event) {
            var name = event.canvas_name;
            var tooltip_text = null;
            if (name) {
                if (event.object_info) {
                    if (event.object_info.shape_name == "circle") {
                        debugger;
                    }
                    tooltip_text = event.object_info[tooltip_attribute];
                }
            }
            if (tooltip_text) {
                var element_offset = target.visible_canvas.offset();
                //var canvas_location = element.event_model_location(event);
                var pixel_offset = target.event_pixel_location(event);
                tooltip.offset({
                    left: pixel_offset.x + element_offset.left + tt_shift_left,
                    top: pixel_offset.y + element_offset.top + tt_shift_top,
                });
                tooltip.css({opacity: tt_visible_opacity});
                tooltip.html("<div>" + tooltip_text + "</div>");
            }
        };
        element.jp_doodle_tooltip_handler = event_handler;
        for (var i=0; i<event_types.length; i++) {
            var event_type = event_types[i];
            target.on_canvas_event(event_type, event_handler);
        }
        target.on_canvas_event("mouseout", function(event) {
            tooltip.css({opacity: 0});
            // move the tooltip off the canvas
            var vc = target.visible_canvas;
            var element_offset = vc.offset();
            tooltip.offset({
                left: element_offset.left + vc.width(),
                top: element_offset.top,
            });
        })
    };

    info.html("Please slide the slider or rotate the view.")
    
    nd_frame.fit(0.8);
};
