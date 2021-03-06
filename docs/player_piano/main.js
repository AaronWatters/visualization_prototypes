var info = $('#info');
var piano_element;

var setup = function () {
  info.html("Set up SampleLibrary.")
  //SampleLibrary.baseUrl = "https://nbrosowsky.github.io/tonejs-instruments/samples/";
  SampleLibrary.baseUrl = "../sound_samples/";
  info.html('setting up piano.');
  var element = $('#piano');
  piano_element = element;  // for debugging
  element.empty();
  element.piano_keyboard({
      add_keyboard: false,
      spiral_implementation: Double_Helix,
      spiral_height: 600,
      fit_margin: 30,
      reset_callback: (function() { element.piano.spiral.reset(); }),
    });
  //element.piano.add_midi_url_button('./mary_had_a_little_lamb_PNO.mid', 'Mary had a little lamb');
  //element.piano.add_midi_url_button('./Bach-Jesu_Joy_of_Man_Desiring.mid', "Bach: Jesu Joy of Man's Desiring");
  piano_element.piano.add_midi_url_button(
    './Coltrane_giant_steps.mid',
    "John Coltrane - Giant Steps");
//   element.piano.add_midi_url_button('./beethoven_opus10_1_format0.mid', 'Beethoven: Opus 10');
//   element.piano.add_midi_url_button('./handel_hallelujah.mid', 'Handel: Hallelujah Chorus');
//   element.piano.add_midi_url_button('./Take-Five-1.mid', 'Take five');
  //element.piano.add_midi_url_button(
  //    './7862_Why-Do-Lovers-Break-Each-Others-Hearts.mid',
  //    "Why Do Lovers Break Eachother's Hearts?");
//   piano_element.piano.add_midi_url_button('./canon_simplified_for_piano.mid', "Pachelbel's Canon - simple arrangement for piano");
//   piano_element.piano.add_midi_url_button('./Bach-Jesu_Joy_of_Man_Desiring.mid', "Bach: Jesu Joy of Man's Desiring");
  //piano_element.piano.add_midi_url_button('./Take-Five-1.mid', 'Take five');
//   piano_element.piano.add_midi_url_button('./snoopy.mid', 'Peanuts (Linus and Lucy) - Vince Guaraldi');
};

// xxxx much pasted from starburst_0/main

const pi_d2 = 0.5 * Math.PI;

function spiral_note_position(offset, spiral) {
    var radius = 1.0;
    // rotate spiral 1 a half turn
    var theta = pi_d2 *  (offset + spiral * 2);
    var y = radius * Math.sin(theta);
    var z = radius * Math.cos(theta);
    //return [offset, y, z];
    return [z, y, offset];  // offset in z -- rotation in x,y
};


var parse_midi_note = function(name) {
    var len = name.length;
    var octave = parseInt(name.slice(len - 1));
    var note = name.slice(0, len-1);
    return [note, octave];
};

var midi_chord_info = function(names) {
    var notes_and_octaves = [];
    var notes = {};
    var name_to_note = {};
    for (name in names) {
        var n_o = parse_midi_note(name);
        var [note, octave] = n_o
        notes[note] = octave;
        notes_and_octaves.push(n_o)
        name_to_note[name] = note
    }
    return {notes_and_octaves, notes, name_to_note}
}

function chord_positions(notes) {
    var positions = {};
    var test = {};
    for (var i=0; i<note_positions.length; i++) {
        var [offset, spiral, note] = note_positions[i];
        if (notes[note]) {
            test[note] = [offset, spiral];
            if (positions[note]) {
                if (chord_span(test) <= chord_span(positions)) {
                    for (var name in positions) {
                        positions[name] = test[name];
                    }
                }
            } else {
                positions[note] = [offset, spiral];
            }
        }
    }
    return positions;
};

function chord_span(note_to_positions) {
    var positions = [];
    for (note in note_to_positions) {
        positions.push(note_to_positions[note][0]);
    }
    return Math.max(...positions) - Math.min(...positions);
};

function color_gradient(for_value, min_rgb, max_rgb, min_value, max_value) {
    var lmd = (for_value - min_value) * 1.0 / (max_value - min_value);
    lmd = Math.min(1.0, lmd);
    lmd = Math.max(0.0, lmd);
    var lmd1 = 1.0 - lmd;
    var color = [];
    for (var i=0; i<3; i++) {
        var ci = Math.round(max_rgb[i] * lmd + min_rgb[i] * lmd1);
        color.push(ci)
    }
    return "rgb(" +  color + ")";
};

function interpolate(for_value, to_min, to_max, from_min, from_max) {
    var lmd = (for_value - from_min) * 1.0 / (from_max - from_min);
    lmd = Math.min(1.0, lmd);
    lmd = Math.max(0.0, lmd);
    var lmd1 = 1.0 - lmd;
    return lmd * to_max + lmd1 * to_min;
}

class Double_Helix {

    constructor(canvas, options) {
        var that = this;
        var s = $.extend(
          {
            x: 0,
            y: 0,
            width: 400,
            height: 100,
            canvas_height: 400,
            //spiral_colors: ['blue', 'red'], // no longer used
            interp_colors: [
                [
                    [158, 1, 66],   // low color, spiral 0
                    [213, 62, 79], // high color, spiral 0
                ],
                [
                    [49, 57, 144],  // low color, spiral 1
                    [1, 111, 185],  // high color, spiral 1
                ],
            ],
            min_width: 5,
            max_width: 9,
            tone_start_color: '#e6f598',  // this is the color of the wandering circle
            low_octave: 2,
            high_octave: 5,
            low_octave_c: 2,
            high_octave_c: 4,
            background: '#eef',
            alpha: 0.2,
            max_radius: 150,
            spiral_width: 10,
            graphic_width: 18,
            central_radius: 50,
            low_octave_color: [0, 50, 0],  // color for very low notes
            high_octave_color: [150, 155, 255],  // color for very high notes
          },
          options
        );
        this.settings = s;
        this.canvas = canvas;
        this.frame = canvas.frame_region(0, 0, s.canvas_height, s.canvas_height, -1.0, -1.0, 1.0, 1.0);
        // background rect
        /*
        var margin = 0.25;
        this.frame.frame_rect({
          x: -1-margin,
          y: -1-margin,
          w: 2 * (1 + margin),
          h: 2 * (1 + margin),
          color: s.background,
        });
        */
        var font = "normal 100px Arial";
        var zfont = "normal 120px Arial";
        var xs = -3.7;
        var distortion = 0.2
        var ts = 0.2;
        var d = 1.0;
        var hl = 0.1;
        var origin = this.project2d([0, 0, 0]);
        var x_ind = this.project2d([d, 0, 0]);
        var y_ind = this.project2d([0, d, 0]);
        var z_ind = this.project2d([0, 0, d*1.323]);
        origin[0] += xs + distortion;
        x_ind[0] += xs;
        y_ind[0] += xs;
        z_ind[0] += xs + distortion;
        that.frame.arrow({
            x1: origin[0], y1:origin[1], x2:x_ind[0], y2:x_ind[1],
           lineWidth: s.spiral_width, head_length: hl, symmetric: true,
        });
        that.frame.text({
            x:x_ind[0] + ts,
            y:x_ind[1],
            text: "X", font:font,
            valign: "center",
        });
        that.frame.arrow({
            x1: origin[0], y1:origin[1], x2:y_ind[0], y2:y_ind[1],
            lineWidth: s.spiral_width, head_length: hl, symmetric: true,
        });
        that.frame.text({
            x:y_ind[0],
            y:y_ind[1] + ts,
            text: "Y", font:font,
            align: "center",
        });
        that.frame.arrow({
            x1: origin[0], y1:origin[1], x2:z_ind[0], y2:z_ind[1],
            lineWidth: s.spiral_width, head_length: hl * 1.3, symmetric: true,  s
        });
        that.frame.text({
            x:z_ind[0] + ts,
            y:z_ind[1] + ts,
            text: "Z", font:zfont,
            valign: "center", align: "center"
        });
        var spiral_points = [[], []];
        var count = 0;
        var ln = note_positions.length;
        note_positions.forEach(function(position) {
            var [offset, spiral, note] = position;
            var xy = that.spiral_position_2d(offset, spiral);
            //var spiral_seq = spiral_points[spiral];
            //spiral_seq.push(xy);
            var [x,y] = xy;
            var colors = s.interp_colors[spiral];
            var color = color_gradient(
                count, colors[0], colors[1], 0, ln,
            );
            var width_c = interpolate(
                count, s.min_width, s.max_width, 0, ln,
            )
            //that.frame.circle({x: x, y:y, r:s.spiral_width * 2, color:s.spiral_colors[spiral]});
            that.frame.circle({x: x, y:y, r: width_c * 2, color:color});
            count ++;
        });
        const frag = 4;
        for (var offset=-6; offset<7; offset++) {
            for (var f=0; f<frag; f++) {
                var foffset = offset + f/frag;
                for (var sp=0; sp<2; sp++) {
                    var xy = that.spiral_position_2d(foffset, sp);
                    var spiral_seq = spiral_points[sp];
                    spiral_seq.push(xy);
                }
            }
        }

        for (var nspiral=0; nspiral<2; nspiral++) {
            //debugger;
            var points = spiral_points[nspiral];
            var colors = s.interp_colors[nspiral];
            var min_c = colors[0];
            var max_c = colors[1];
            var ln = points.length;
            for (var i=1; i<ln; i++) {
                var color = color_gradient(
                    i, min_c, max_c, 0, ln,
                );
                var width_c = interpolate(
                    i, s.min_width, s.max_width, 0, ln,
                )
                var [x0, y0] = points[i-1]
                var [x1, y1] = points[i]
                this.frame.line({
                    x2: x0,
                    y2: y0,
                    x1: x1,
                    y1: y1,
                    color:color,
                    lineWidth: width_c,
                })
            }
        }
        /*
        this.frame.polygon({
            points: spiral_points[0],
            fill: false,
            close: false,
            color: s.spiral_colors[0],
            lineWidth: s.spiral_width,
        });
        this.frame.polygon({
            points: spiral_points[1],
            fill: false,
            close: false,
            color: s.spiral_colors[1],
            lineWidth: s.spiral_width,
        });
        */
        this.center_circle = this.frame.circle({x:0, y:0, r:0, color:s.tone_start_color, name:true});
        this.center_tone_xy = [0, 0];
        this.note_graphics = [];
    };
    color_for_octave(octave_number) {
        var s = this.settings;
        return color_gradient(octave_number, s.low_octave_color, s.high_octave_color, s.low_octave_c, s.high_octave_c);
    }
    inactive_note_graphics(length) {
        var result = [];
        var note_graphics = this.note_graphics;
        for (var i=0; i<note_graphics.length; i++) {
            if (result.length>=length) {
                break;
            }
            var ni = note_graphics[i];
            if (!ni.active) {
                result.push(ni);
            }
        }
        // add more as needed
        while (result.length<length) {
            var ni = new NoteGraphic(this);
            note_graphics.push(ni);
            result.push(ni);
        }
        return result;
    };
    reset() {
        this.note_graphics.forEach(function(ng) {
            ng.hide();
        });
        this.center_circle.change({r: 0, x:0, y:0});
    }
    display_notes(presses, unpresses) {
        var s = this.settings;
        // inactivate all unpresses
        for (var i=0; i<unpresses.length; i++) {
            var press = unpresses[i].press;
            if (press.graphics) {
                press.graphics.hide();
            }
        }
        // activate presses and assign positions
        var available_graphics = this.inactive_note_graphics(presses.length);
        var pressed = {};
        for (var i=0; i<presses.length; i++) {
            var press = presses[i];
            press.graphics = available_graphics[i];
            press.graphics.active = true;
            var name = press.note;
            pressed[name] = name;
            //debugger;
        }
        var info = midi_chord_info(pressed);
        //var notes_and_octaves = info.notes_and_octaves;
        var notes = info.notes;
        var note_positions = chord_positions(notes);
        var name_to_note = info.name_to_note;
        for (var i=0; i<presses.length; i++) {
            var press = presses[i];
            var name = press.note;
            var [note1, octave] = parse_midi_note(name);
            press.graphics.octave = octave;
            var note = name_to_note[name];
            var [offset, spiral] = note_positions[note];
            var xy = this.spiral_position_2d(offset, spiral);
            press.graphics.position = xy;
        }
        // find center
        var [old_cx, old_cy] = this.center_tone_xy;
        var x_sum = 0;
        var y_sum = 0;
        var active_count = 0;
        this.note_graphics.forEach(function(graphics) {
            if (graphics.active) {
                var [x, y] = graphics.position;
                x_sum += x;
                y_sum += y;
                active_count += 1;
            }
        });
        var new_cx = old_cx;
        var new_cy = old_cy;
        if (active_count) {
            new_cx = x_sum / active_count;
            new_cy = y_sum / active_count;
        }
        this.center_tone_xy = [new_cx, new_cy];
        // update press graphics
        var min_duration = 10;
        for (var i=0; i<presses.length; i++) {
            var press = presses[i];
            var duration =  press.duration;
            min_duration = Math.min(min_duration, duration);
            press.graphics.change(new_cx, new_cy, duration);
        }
        if (presses.length) {
            //debugger;
            this.center_circle.transition({r: s.central_radius, x:new_cx, y:new_cy}, min_duration * 0.4);
        }
    };
    spiral_position_2d(offset, spiral) {
        var xyz = spiral_note_position(offset, spiral)
        return this.project2d(xyz);
    };
    project2d(xyz) {
        var [x1, y1, z6] = xyz;
        var z_shift = z6 / 6.0;
        var z_scale = (12.0 + z6) / 9.0;
        var x = z_scale * (x1 + z_shift);
        var y = z_scale * (y1 + z_shift);
        return [x, y];
    };
};

class NoteGraphic {
    constructor (in_helix) {
        this.active = false;
        this.in_helix = in_helix;
        this.position = [0, 0];
        this.octave = 3.5; // temp values
        var s = in_helix.settings;
        var frame = in_helix.frame;
        this.circle = frame.circle({x:0, y:0, r:0, lineWidth:0, color:s.tone_start_color, fill:false, name:true});
        this.line = frame.line({x1:0, y1:0, x2:0, y2:0, lineWidth:0, color:s.tone_start_color, name:true});
    };
    hide() {
        var [x, y] = this.position
        this.circle.change({
            r:0, lineWidth:0,
        });
        this.line.change({
            lineWidth: 0, x1: x, x2: x, y1: y, y2: y,
        });
        this.active = false;
    }
    change(cx, cy, duration) {
        debugger;
        var octave = this.octave;
        var color = this.in_helix.color_for_octave(octave);
        var s = this.in_helix.settings;
        var [x1, y1] = this.position;
        var radius_scale = interpolate(octave, 2, 0.3, s.low_octave, s.high_octave);
        var radius = s.max_radius * radius_scale;
        this.circle.change({lineWidth: s.graphic_width, x: x1, y: y1, r:radius, color:color,});
        //this.line.change({lineWidth: s.graphic_width});
        this.circle.transition({r: 0, lineWidth: 0}, duration);
        this.line.change({x1: x1, y1: y1, x2: cx, y2: cy, lineWidth: s.graphic_width, color:color,});
        this.line.transition({lineWidth: 0, x2:x1, y2:y1}, duration);
        this.active = true;
    }
};

var note_positions = [
 [-6, 0, 'A'],
 [-6, 1, 'D'],
 [-5, 0, 'B'],
 [-5, 1, 'E'],
 [-4, 0, 'C#'],
 [-4, 1, 'F#'],
 [-3, 0, 'D#'],
 [-3, 1, 'G#'],
 [-2, 0, 'F'],
 [-2, 1, 'A#'],
 [-1, 0, 'G'],
 [-1, 1, 'C'],
 [0, 0, 'A'],
 [0, 1, 'D'],
 [1, 0, 'B'],
 [1, 1, 'E'],
 [2, 0, 'C#'],
 [2, 1, 'F#'],
 [3, 0, 'D#'],
 [3, 1, 'G#'],
 [4, 0, 'F'],
 [4, 1, 'A#'],
 [5, 0, 'G'],
 [5, 1, 'C']];


info.html('main.js loaded.');
