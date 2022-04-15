/*

JQuery plugin piano keyboard compatible with tone.js and midi.js

Structure follows: https://learn.jquery.com/plugins/basic-plugin-creation/
Adapted from view-source:https://tonejs.github.io/Midi/

requires jp_doodle, tone, and midi
*/
'use strict';

(function ($) {
  $.fn.piano_keyboard = function (options, element) {
    element = element || this;
    return new PianoKeyboard(element, options);
  };

  var instrument_defaults = {
      "piano": "harp",
      "drums": "(disable)",
      "reed": "trumpet",
      "bass": "bass-electric",
      "brass": "trombone",
  }

  class PianoKeyboard {
    constructor(element, options) {
      var that = this;
      var s = $.extend(
        {
          property: 'piano',
          white_height: 100,
          black_height: 70,
          key_width: 30,
          margin: 30,
          //spacer: 3,
          low_octave: 2,
          high_octave: 7,
          white_key_normal: 'white',
          white_key_pressed: 'pink',
          black_key_normal: 'black',
          black_key_pressed: 'red',
          background: '#666',
          info_background: '#ee9',
          presses_callback: null,
          single_press_callback: null,
          single_unpress_callback: null,
          reset_callback: null,
          add_spiral: true,
          spiral_implementation: null,
          spiral_height: null,
          add_keyboard: true,
          draw_mid: true,
          fit_margin: 1,
        },
        options
      );
      this.settings = s;
      // save this as property of element if property is set
      if (s.property) {
        element[s.property] = this;
      }
      this.element = element;
      var n_octaves = s.high_octave - s.low_octave;
      var n_white_keys = note_names.length * n_octaves;
      var keys_width = n_white_keys * s.key_width;
      var background_width = keys_width + 2 * s.margin;
      var background_height = s.white_height + 2 * s.margin;
      var canvas_height = background_height;
      if (s.add_spiral) {
        canvas_height = s.spiral_height || 2 * background_height;
      }
      // create the canvas
      element.empty();
      this.canvas = $('<div/>').appendTo(element);
      this.canvas.dual_canvas_helper({
        width: background_width,
        height: canvas_height,
      });
      this.name_to_keys = {};
      // optionally add keyboard
      if (s.add_keyboard) {
          this.add_keyboard_canvas(background_width, background_height);
      }
      // optionally add spiral
      if (s.add_spiral) {
        var spiral_implementation = s.spiral_implementation || SingleSpiral;
        var spiral = new spiral_implementation(this.canvas, {
          x: 0,
          y: background_height,
          width: background_width,
          height: background_height,
          canvas_height: canvas_height,
          low_octave: s.low_octave,
          high_octave: s.high_octave,
          keyboard: this,
        });
        this.spiral = spiral;
        s.presses_callback = function (presses, unpresses) {
          spiral.display_notes(presses, unpresses);
        };
      }
      //this.name_to_keys = name_to_keys;
      this.canvas.fit(null, s.fit_margin);
      this.play_button_div = $('<div/>').appendTo(this.element);
      this.midi_info_div = $("<div>Midi info here</div>").appendTo(element);
      this.show_midi_info();
      this.play_midi_button = $('<button>Play midi</button>').appendTo(this.play_button_div);
      this.play_midi_button.on('click', function () {
        that.play_midi();
      });
      this.presets_div = $('<div/>').appendTo(this.element);
      this.play_button_div.hide();
       this.file_drop_div = $('<div>Choose midi file</div>').appendTo(element);
       this.file_drop_input = $('<input type="file" accept="audio/midi" />').appendTo(this.file_drop_div);
       if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
         this.file_drop_div.html("THIS BROWSER DOESN'T SUPPORT FILE PROCESSING.");
       } else {
         this.file_drop_input.on('change', function (e) {
           const files = e.target.files;
           if (files.length > 0) {
             const file = files[0];
             that.info.html('loaded: ' + file.name);
             that.parseFile(file);
          }
         });
       }

      var fade_area = $("<label class='checkbox-wrap'/>").appendTo(element);
      this.fade_check = $('<input type="checkbox" checked/>').appendTo(fade_area);
      $("<span class='label-body'>Enable graphical fading [graphical fading may degrade audio quality] </span>").appendTo(fade_area);
      this.fading = true;
      this.fade_check.change(function() {
          that.fading = that.fade_check.is(":checked");
      });

      this.info = $('<div class="info-text">keyboard drawn</div>').appendTo(element);
      this.piano = new Tone.PolySynth(Tone.Synth, {
        volume: -8,
        oscillator: {
          partials: [1, 2, 5],
        },
        portamento: 0.005,
      }).toDestination();
      this.silent = false;
      this.playing = false;
      this.synths = [];
      this.events = [];
      // reset midi play settings
      this.play_midi(true);
    }
    add_keyboard_canvas(background_width, background_height) {
      // draw background rectangle
      var s = this.settings;
      this.background = this.canvas.rect({
        x: -s.margin,
        y: -s.margin,
        w: background_width,
        h: background_height,
        color: s.background,
        name: true,
      });
      // draw white keys
      var name_to_keys = {};
      var current_x = 0;
      for (var octave = s.low_octave; octave < s.high_octave; octave++) {
        for (var notei = 0; notei < note_names.length; notei++) {
          var note_name = note_names[notei] + ('' + octave);
          var key = new PianoKey({
            on_frame: this.canvas,
            w: s.key_width,
            h: s.white_height,
            x: current_x,
            y: 0,
            note_name: note_name,
            off_color: s.white_key_normal,
            on_color: s.white_key_pressed,
            player: this,
          });
          name_to_keys[note_name] = key;
          current_x += s.key_width;
        }
      }
      // draw black keys
      current_x = 0;
      var black_y = s.white_height - s.black_height;
      var black_x_offset = s.key_width * 0.75;
      var black_width = s.key_width * 0.5;
      for (var octave = s.low_octave; octave < s.high_octave; octave++) {
        for (var notei = 0; notei < note_names.length; notei++) {
          var note = note_names[notei];
          if (sharpable[note]) {
            var note_name = note + ('#' + octave);
            var key = new PianoKey({
              on_frame: this.canvas,
              w: black_width,
              h: s.black_height,
              x: current_x + black_x_offset,
              y: black_y,
              note_name: note_name,
              off_color: s.black_key_normal,
              on_color: s.black_key_pressed,
              player: this,
            });
            name_to_keys[note_name] = key;
          }
          current_x += s.key_width;
        }
      }
      this.name_to_keys = name_to_keys;
    };
    show_midi_info() {
        var that = this;
        var div = this.midi_info_div;
        var info = this.midi_json;
        if (info) {
            // display info
            div.empty();
            $("<p> Customize instruments: " + info.header.name + "</p>").appendTo(div);
            var tracks_div = $("<div/>").appendTo(div);
            tracks_div.css({
                display: "grid",
                "grid-template-columns": "auto 100px 100px",
                "background-color": "#fee",
                "width": "500px",
            });
            var tracks = this.synths;
            tracks.forEach(function(track) {
                track.add_divs(tracks_div);
            });
        } else {
            // no info
            div.empty();
            div.html("No midi data yet loaded.")
            div.addClass('info-text')
        }
    };
    add_midi_url_button(url, title) {
      title = title || url;
      var that = this;
      var presets_div = this.presets_div;
      //file_drop_div.height(file_drop_div.height() + 20);
      var url_div = $('<div/>').appendTo(presets_div);
      //var url_div = $("<div/>").appendTo(this.element);
      var url_button = $('<button> ' + title + ' </button>').appendTo(url_div);
      var url_click = function () {
        that.parseUrl(url);
      };
      url_button.click(url_click);
    }
    play_midi(playing) {
      playing = playing || this.playing;
      var that = this;
      this.disable_key_draw = false;
      var s = this.settings;

      if (s.reset_callback) {
        s.reset_callback(playing);
      }
      // clear keyboard
      for (var name in this.name_to_keys) {
        var key = this.name_to_keys[name];
        key.do_unpress();
      }
      const midi_json = this.midi_json;
      if (playing) {
          // reset.
          that.set_up_midi_json();
      } else {
        this.play_midi_button.html('Reset: Initializing');
        this.disable_key_draw = true;
        this.silent = true;
        this.playing = true;
        //if (s.reset_callback) {
        //    s.reset_callback(!this.playing);
        //}
        // setting instruments will automatically trigger check_events when all callbacks are resolved.
        this.synths.forEach(function (track) {
            track.set_instrument();
        });
      }
      this.event_loop_active = false;
    };
    check_instruments() {
        if (this.event_loop_active) {
            return;
        }
        var ready = true;
        this.synths.forEach(function(synth) {
            ready = ready && synth.ready();
        });
        if (ready) {
            var events = [];
            var now = Tone.now() + 1;
            this.synths.forEach(function(synth) {
                synth.add_events(events, now);
            });
            // sort the events
            events.sort(function (a, b) {
              return a.time - b.time;
            });
            this.events = events;
            this.event_index = 0;
            this.event_loop_active = true;
            try {
                Tone.start();
            } catch (e) {
                console.log("Failed to (re)start Tone.");
            }
            this.check_events();
        }
    };
    check_events() {
      var that = this;
      var now = Tone.now();
      var fnow = Math.floor(now);
      if ((!this.last_now) || (fnow - this.last_now > 1)) {
          this.play_midi_button.html("Reset " + fnow);
          this.last_now = fnow;
      }
      var events = this.events;
      var nevents = events.length;
      var presses = [];
      var unpresses = [];
      while (this.event_index < nevents && events[this.event_index].time <= now) {
        var event = events[this.event_index];
        var key = this.name_to_keys[event.note];
        if (event.type == 'press') {
          presses.push(event);
          //event.synth.triggerAttack(event.note, event.velocity);
          // xxxx velocity doesn't work???
          event.synth.triggerAttack(event.note);
          //this.info.html('press ' + event.note);
          if (key) {
            key.do_press();
          }
        } else if (event.type == 'unpress') {
          unpresses.push(event);
          event.synth.triggerRelease(event.note);
          //this.info.html('release ' + event.note);
          if (key) {
            key.do_unpress();
          }
        } else {
          throw new Error('unknown type: ' + event.type);
        }
        this.event_index++;
      }
      if (this.event_index < nevents) {
        requestAnimationFrame(function () {
          that.check_events();
        });
      } else {
          this.play_midi_button.html("Complete: Reset");
          that.event_loop_active = false;
      }
      if (this.settings.presses_callback) {
        this.settings.presses_callback(presses, unpresses);
      }
    }
    parseFile(file) {
      var that = this;
      const reader = new FileReader();
      reader.onload = function (e) {
        that.info.html('parsing midi content for ' + file.name);
        const midi = new Midi(e.target.result);
        that.info.html('midi parsed: ' + file.name);
        that.midi_json = midi;
        //that.play_button_div.css("visibility", "visible");
        //that.play_button_div.show();
        //that.play_midi();
        that.set_up_midi_json();
      };
      that.info.html('reading file ' + file.name);
      reader.readAsArrayBuffer(file);
    }
    parseUrl(url) {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
      var oReq = new XMLHttpRequest();
      oReq.open('GET', url, true);
      oReq.responseType = 'arraybuffer';
      var that = this;
      oReq.onload = function (oEvent) {
        var arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer) {
          var byteArray = new Uint8Array(arrayBuffer);
          that.info.html('got url content: ' + [url, arrayBuffer.length]);
          const midi = new Midi(byteArray);
          that.info.html('midi parsed: ' + url);
          that.midi_json = midi;
          //that.play_button_div.show();
          //that.play_midi();
          that.set_up_midi_json();
        }
      };
      oReq.send(null);
    };
    set_up_midi_json() {
        var that = this;
        if (that.midi_json) {
            this.play_midi_button.html('Play midi');
            that.play_button_div.show();
            this.playing = false;
            //var playing = this.playing;
            // clear existing synths
            if (that.synths) {
                that.synths.forEach(function (synth) {
                    synth.dispose();
                });
            }
            that.synths = [];
            // clear annotations
            if (that.events) {
                that.events.forEach(function (event) {
                    if ((event.press) && (event.press.annotations)) {
                        event.press.annotations.forEach(function(annotation) {
                            annotation.forget();
                        })
                    }
                })
            }
            that.events = [];
            // set up tracks
            const midi_json = that.midi_json;
            midi_json.tracks.forEach(function (track) {
                const synth = new MidiTrack(track, that);
                that.synths.push(synth);
            });
        }
        this.show_midi_info();
    };
    press_note(name) {
      if (!this.silent) {
        this.piano.triggerAttack(name);
      }
      if ((!this.disable_key_draw) && (this.settings.single_press_callback)) {
          this.settings.single_press_callback(name);
      }
    }
    unpress_note(name) {
      if (!this.silent) {
        this.piano.triggerRelease(name);
      }
      if ((!this.disable_key_draw) && (this.settings.single_press_callback)) {
          this.settings.single_unpress_callback(name);
      }
    };
  }

  class MidiTrack {
      constructor(track, player) {
          this.player = player;
          this.track = track;
          this.name = track.instrument.name;
          this.family = track.instrument.family;
          this.instrument_ready = false;
          this.instrument = null;
          this.active = true;
          this.disable = "(disable)";
      };
      set_instrument(instrument_name) {
            var that = this;
            if (!instrument_name) {
                instrument_name = this.select.find(":selected").text();
            }
            if (instrument_name == this.disable) {
                this.active = false;
            } else {
                this.instrument = SampleLibrary.load({
                    instruments: instrument_name,
                    onload: function() { that.onload(); },
                    });
            }
      };
      onload() {
          this.instrument_ready = true;
          this.instrument.toDestination();
          this.player.check_instruments();
      };
      ready() {
          return (!this.active) || this.instrument_ready;
      }
      add_events(event_list, now) {
          if (!this.active) {
              return;
          }
          var synth = this.instrument;
          this.track.notes.forEach((note) => {
            var press = {
              type: 'press',
              note: note.name,
              time: note.time + now,
              duration: note.duration,
              velocity: note.velocity,
              synth: synth,
              midi: note.midi,
              annotations: [],
            };
            event_list.push(press);
            var unpress = {
              type: 'unpress',
              note: note.name,
              time: note.time + note.duration + now,
              velocity: note.velocity,
              synth: synth,
              press: press,
            };
            event_list.push(unpress);
          });
      };
      add_divs(container) {
        var namediv = $("<div/>").appendTo(container);
        namediv.css({"border-top": "1px solid #dfdfdf"})
        var familydiv = $("<div/>").appendTo(container);
        familydiv.css({"border-top": "1px solid #afafaf"})
        var optionsdiv = $("<div/>").appendTo(container);
        namediv.html("" + this.name);
        familydiv.html("" + this.family);
        //optionsdiv.html("options...");
        var select = $("<select/>").appendTo(optionsdiv);
        var selected = "piano";
        selected = instrument_defaults[this.family] || selected;
        var instrument_name_list = [...SampleLibrary.list];
        instrument_name_list.push(this.disable);
        instrument_name_list.forEach(function(instrument_name) {
            if (selected == instrument_name) {
                $("<option selected>" + instrument_name + "</option>").appendTo(select);
            } else {
                $("<option>" + instrument_name + "</option>").appendTo(select);
            }
            //selected = false;
        });
        //$("<option>" + this.disable + "</option>").appendTo(select);
        this.select = select;
      };
      dispose() {
          if (this.instrument) {
              this.instrument.disconnect();
              this.instrument.dispose();
          }
      }
  };

  class SingleSpiral {
    constructor(canvas, options) {
      var s = $.extend(
        {
          x: 0,
          y: 0,
          width: 400,
          height: 100,
          spiral_color: 'blue',
          tone_start_color: '#909',
          tone_end_color: '#fff',
          low_octave: 2,
          high_octave: 7,
          background: '#eef',
          alpha: 0.2,
          radius: 15,
        },
        options
      );
      this.settings = s;
      this.canvas = canvas;
      var noctaves = s.high_octave - s.low_octave;
      this.octave_width = (s.width * 1.0) / noctaves;
      this.frame = canvas.frame_region(s.x, s.y, s.x + s.width, s.y + s.height, 0, -1.2, noctaves, 1.2);
      // background rect
      var margin = 0.25;
      this.frame.frame_rect({
        x: -margin,
        y: -1,
        w: noctaves + 2 * margin,
        h: 2,
        color: s.background,
      });
      var spiral_points = [];
      var n_notes = noctaves * fifths.length;
      var nmult = 10;
      var npoints = n_notes * nmult;
      var rescale = 1.0 / nmult;
      for (var ii = 0; ii < npoints; ii++) {
        var i = ii * rescale;
        spiral_points.push(this.xy(i));
      }
      this.frame.polygon({
        points: spiral_points,
        fill: false,
        close: false,
        color: s.spiral_color,
      });
      this.note_positions = {};
      var note_i = 0;
      for (var octave = s.low_octave; octave < s.high_octave; octave++) {
        for (var fifthi = 0; fifthi < fifths.length; fifthi++) {
          var note_name = fifths[fifthi] + ('' + octave);
          var note_position = this.xy(note_i);
          this.note_positions[note_name] = note_position;
          var [x, y] = note_position;
          this.frame.text({
            x: x,
            y: y,
            text: note_name,
            color: s.spiral_color,
          });
          note_i++;
        }
      }
    }
    display_notes(presses, unpresses) {
      for (var i = 0; i < presses.length; i++) {
        var pressi = presses[i];
        this.add_circle(pressi);
        for (var j = i + 1; j < presses.length; j++) {
          var pressj = presses[j];
          if (pressj.duration < pressi.duration) {
            this.add_link(pressj, pressi);
          } else {
            this.add_link(pressi, pressj);
          }
        }
      }
      for (var i = 0; i < unpresses.length; i++) {
        var unpressi = unpresses[i];
        var annotations = unpressi.press.annotations;
        for (var j = 0; j < annotations.length; j++) {
          var annotationj = annotations[j];
          annotationj.forget();
        }
      }
    }
    add_circle(press) {
      var s = this.settings;
      var fading = s.keyboard.fading;
      var name = press.note;
      var position = this.note_positions[name];
      if (position) {
        var [x, y] = position;
        var circle = this.frame.circle({
          x: x,
          y: y,
          r: s.radius,
          color: s.tone_start_color,
          name: true,
        });
        if (fading) {
            circle.transition({
                r: 0, color: s.tone_end_color
            }, press.duration);
        }
        press.annotations.push(circle);
      }
    }
    add_link(short_press, long_press) {
      var s = this.settings;
      var fading = s.keyboard.fading;
      var short_position = this.note_positions[short_press.note];
      var long_position = this.note_positions[long_press.note];
      if (short_position && long_position) {
        var [x1, y1] = short_position;
        var [x2, y2] = long_position;
        var line = this.frame.line({
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          color: s.tone_start_color,
          name: true,
        });
        if (fading) {
            line.transition({
                x2: x1, y2: y1, color: s.tone_end_color,
            }, long_press.duration)
        }
        long_press.annotations.push(line);
      }
    }
    xy(i) {
      var s = this.settings;
      const ipiby2 = i * 0.5 * Math.PI;
      const shift = (i * 1.0) / fifths.length;
      var x = shift + s.alpha * Math.cos(ipiby2);
      var y = Math.sin(ipiby2);
      return [x, y];
    }
  }

  const fifths = ['F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
  const note_names = 'CDEFGAB';
  const sharped = 'CDFGA';
  var sharpable = {};
  for (var i = 0; i < sharped.length; i++) {
    sharpable[sharped[i]] = sharped[i];
  }
  // xxxx not needed?
  const MIDI_NUM_NAMES = [
    'C_1',
    'C#_1',
    'D_1',
    'D#_1',
    'E_1',
    'F_1',
    'F#_1',
    'G_1',
    'G#_1',
    'A_1',
    'A#_1',
    'B_1',
    'C0',
    'C#0',
    'D0',
    'D#0',
    'E0',
    'F0',
    'F#0',
    'G0',
    'G#0',
    'A0',
    'A#0',
    'B0',
    'C1',
    'C#1',
    'D1',
    'D#1',
    'E1',
    'F1',
    'F#1',
    'G1',
    'G#1',
    'A1',
    'A#1',
    'B1',
    'C2',
    'C#2',
    'D2',
    'D#2',
    'E2',
    'F2',
    'F#2',
    'G2',
    'G#2',
    'A2',
    'A#2',
    'B2',
    'C3',
    'C#3',
    'D3',
    'D#3',
    'E3',
    'F3',
    'F#3',
    'G3',
    'G#3',
    'A3',
    'A#3',
    'B3',
    'C4',
    'C#4',
    'D4',
    'D#4',
    'E4',
    'F4',
    'F#4',
    'G4',
    'G#4',
    'A4',
    'A#4',
    'B4',
    'C5',
    'C#5',
    'D5',
    'D#5',
    'E5',
    'F5',
    'F#5',
    'G5',
    'G#5',
    'A5',
    'A#5',
    'B5',
    'C6',
    'C#6',
    'D6',
    'D#6',
    'E6',
    'F6',
    'F#6',
    'G6',
    'G#6',
    'A6',
    'A#6',
    'B6',
    'C7',
    'C#7',
    'D7',
    'D#7',
    'E7',
    'F7',
    'F#7',
    'G7',
    'G#7',
    'A7',
    'A#7',
    'B7',
    'C8',
    'C#8',
    'D8',
    'D#8',
    'E8',
    'F8',
    'F#8',
    'G8',
    'G#8',
    'A8',
    'A#8',
    'B8',
    'C9',
    'C#9',
    'D9',
    'D#9',
    'E9',
    'F9',
    'F#9',
    'G9',
  ];
  var midi_name_to_num = {};
  for (var i = 0; i < MIDI_NUM_NAMES.length; i++) {
    midi_name_to_num[MIDI_NUM_NAMES[i]] = i;
  }

  class PianoKey {
    constructor(options) {
      var that = this;
      this.settings = $.extend(
        {
          on_frame: null,
          player: null,
          w: 50,
          h: 30,
          x: 0,
          y: 0,
          note_name: 'C4',
          off_color: 'white',
          on_color: 'pink',
          border_color: 'black',
        },
        options
      );
      var s = this.settings;
      var frame = s.on_frame;
      if (!frame) {
        throw new Error('frame is required to draw');
      }
      // draw key body rect
      this.rect = frame.frame_rect({
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        color: s.off_color,
        name: true,
      });
      this.rect.on('click', () => that.toggle());
      // draw border
      frame.frame_rect({
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        color: s.border_color,
        fill: false,
      });
      this.pressed = false;
    }
    toggle() {
      // switch on/off status
      if (!this.pressed) {
        this.do_press();
      } else {
        this.do_unpress();
      }
    }
    do_press() {
      if (!this.settings.player.disable_key_draw) {
          this.rect.change({ color: this.settings.on_color });
      }
      if (this.settings.player) {
        this.settings.player.press_note(this.settings.note_name);
      }
      this.pressed = true;
    }
    do_unpress() {
      if (!this.settings.player.disable_key_draw) {
          this.rect.change({ color: this.settings.off_color });
      }
      if (this.settings.player) {
        this.settings.player.unpress_note(this.settings.note_name);
      }
      this.pressed = false;
    }
  }
})(jQuery);
