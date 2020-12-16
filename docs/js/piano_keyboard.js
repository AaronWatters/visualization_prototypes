/*

JQuery plugin piano keyboard compatible with tone.js and midi.js

Structure follows: https://learn.jquery.com/plugins/basic-plugin-creation/
Adapted from view-source:https://tonejs.github.io/Midi/

requires jp_doodle, tone, and midi
*/
"use strict";


(function($) {

    $.fn.piano_keyboard = function (options, element) {
        debugger;
        element = element || this;
        return new PianoKeyboard(element, options);
    };

    class PianoKeyboard {

        constructor(element, options) {
            var that = this;
            var s = $.extend({
                property: "piano",
                white_height: 100,
                black_height: 70,
                key_width:30,
                margin:30,
                //spacer: 3,
                low_octave: 2,
                high_octave: 7,
                white_key_normal: "white",
                white_key_pressed: "pink",
                black_key_normal: "black",
                black_key_pressed: "red",
                background: "#666",
                info_background: "#ee9",
            }, options);
            this.settings = s;
            // save this as property of element if property is set
            if (s.property) {
                element[s.property] = this;
            }
            this.element = element;
            var n_octaves = s.high_octave - s.low_octave;
            var n_white_keys = note_names.length * n_octaves;
            var keys_width = n_white_keys * (s.key_width);
            var background_width = keys_width + 2 * s.margin;
            var background_height = s.white_height + 2 * s.margin;
            // create the canvas
            element.empty();
            this.canvas = $("<div/>").appendTo(element);
            this.canvas.dual_canvas_helper({
                width: background_width,
                height: background_height,
            });
            // draw background rectangle
            this.background = this.canvas.rect({
                x: -s.margin,
                y: -s.margin,
                w: background_width,
                h: background_height,
                color: s.background,
                name:true,
            });
            // draw white keys
            var name_to_keys = {};
            var current_x = 0;
            for (var octave=s.low_octave; octave<s.high_octave; octave++) {
                for (var notei=0; notei<note_names.length; notei++) {
                    var note_name = note_names[notei] + ("" + octave);
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
            for (var octave=s.low_octave; octave<s.high_octave; octave++) {
                for (var notei=0; notei<note_names.length; notei++) {
                    var note = note_names[notei];
                    debugger;
                    if (sharpable[note]) {
                        var note_name = note + ("#" + octave);
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
            this.canvas.fit();
            this.file_drop_div = $("<div>Choose midi file</div>").appendTo(element);
            //this.file_drop_div.css({
                //height: "50px",
                //width: background_width+"px",
                //text_align: "center",
                //border: "2px dashed black",
                //"background-color": "#ffe",
            //});
            this.file_drop_input = $('<input type="file" accept="audio/midi" />').appendTo(
                this.file_drop_div
            );
            this.play_button_div = $("<div/>").appendTo(this.element);
            this.play_midi_button = $('<button>Play midi</button>ß').appendTo(
                this.play_button_div
            );
            this.play_midi_button.on("click", function() {
                that.play_midi();
            });
            //this.play_button_div.css({
            //    visibility: "hidden",
            //});
            this.play_button_div.hide();
            if (
				!(
					window.File &&
					window.FileReader &&
					window.FileList &&
					window.Blob
				)
			) {
                this.file_drop_div.html("THIS BROWSER DOESN'T SUPPORT FILE PROCESSING.");
            } else {
                this.file_drop_input.on("change", function(e) {
                    const files = e.target.files;
                    if (files.length > 0) {
                        const file = files[0];
                        that.info.html("loaded: " + file.name);
                        that.parseFile(file);
                    }
                })
            };
            this.info = $("<div>keyboard drawn</div>").appendTo(element);
            this.piano = new Tone.PolySynth(Tone.Synth, {
                "volume" : -8,
                "oscillator" : {
                    "partials" : [1, 2, 5],
                },
                "portamento" : 0.005
            }).toDestination();
            this.silent = false;
            this.playing = false;
            this.synths = [];
            this.events = [];
        };
        add_midi_url_button(url, title) {
            title = title || url;
            var that = this;
            var file_drop_div = this.file_drop_div;
            //file_drop_div.height(file_drop_div.height() + 20);
            var url_div = $("<div/>").appendTo(file_drop_div);
            //var url_div = $("<div/>").appendTo(this.element);
            var url_button = $("<button> " + title + " </button>").appendTo(url_div);
            var url_click = function() {
                that.parseUrl(url);
            };
            url_button.click(url_click);
        };
        play_midi() {
            var that = this;
            const midi_json = this.midi_json;
            //var synths = this.midi_synths;
            if (this.playing) {
                // reset
                this.synths.forEach(function(synth) {
                    synth.disconnect();
                });
                for (var name in this.name_to_keys) {
                    var key = this.name_to_keys[name];
                    key.do_unpress();
                }
                this.synths = [];
                this.events = [];
                this.playing = false;
                this.silent = false;
                this.play_midi_button.html("Play midi");
            } else {
                this.play_midi_button.html("Reset midi");
                this.silent = true;
                this.playing = true;
                this.events = [];
                var now = Tone.now();
                midi_json.tracks.forEach(function (track) {
                    const synth = new Tone.PolySynth(Tone.Synth, {
                        envelope: {
                            attack: 0.02,
                            decay: 0.1,
                            sustain: 0.3,
                            release: 1,
                        },
                    }).toDestination();
                    that.synths.push(synth);
                    //schedule all of the events
                    track.notes.forEach((note) => {
                        //synth.triggerAttackRelease(
                        //    note.name,
                        //    note.duration,
                        //    note.time + now,
                        //    note.velocity
                        //);
                        var press = {
                            type: "press",
                            note: note.name,
                            time: note.time + now,
                            velocity: note.velocity,
                            synth: synth,
                        };
                        that.events.push(press)
                        var unpress = {
                            type: "unpress",
                            note: note.name,
                            time: note.time + note.duration + now,
                            velocity: note.velocity,
                            synth: synth,
                        };
                        that.events.push(unpress)
                    });
                });
                // sort the events
                this.events.sort(function (a, b) { return a.time - b.time; });
                this.event_index = 0;
                this.check_events();
            }
        };
        check_events() {
            var that = this;
            var now = Tone.now();
            var events = this.events;
            var nevents = events.length;
            while ((this.event_index < nevents) && (events[this.event_index].time <= now)) {
                var event = events[this.event_index];
                var key = this.name_to_keys[event.note];
                if (event.type == "press") {
                    event.synth.triggerAttack(event.note, event.velocity);
                    this.info.html("press " + event.note);
                    if (key) {
                        key.do_press();
                    }
                } else if (event.type == "unpress") {
                    event.synth.triggerRelease(event.note);
                    this.info.html("release " + event.note);
                    if (key) {
                        key.do_unpress();
                    }
                } else {
                    throw new Error("unknown type: " + event.type);
                }
                this.event_index ++;
            }
            if (this.event_index < nevents) {
                requestAnimationFrame(
                    function () { that.check_events(); }
                )
            }
        };
        parseFile(file) {
            var that = this;
            const reader = new FileReader();
            reader.onload = function (e) {
                that.info.html("parsing midi content for " + file.name);
                const midi = new Midi(e.target.result);
                that.info.html("midi parsed: " + file.name);
                that.midi_json = midi;
                //that.play_button_div.css("visibility", "visible");
                that.play_button_div.show();
            };
            that.info.html("reading file " + file.name);
			reader.readAsArrayBuffer(file);
        };
        parseUrl(url) {
            // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";
            var that = this;
            oReq.onload = function (oEvent) {
                var arrayBuffer = oReq.response; // Note: not oReq.responseText
                if (arrayBuffer) {
                    var byteArray = new Uint8Array(arrayBuffer);
                    that.info.html("got url content: " + [url, arrayBuffer.length]);
                    const midi = new Midi(byteArray);
                    that.info.html("midi parsed: " + url);
                    that.midi_json = midi;
                    that.play_button_div.show();
                }
            };
            oReq.send(null);
        };
        press_note(name) {
            if (!this.silent) {
                this.piano.triggerAttack(name);
            }
        };
        unpress_note(name) {
            if (!this.silent) {
                this.piano.triggerRelease(name);
            }
        };
    };

    const note_names = "CDEFGAB";
    const sharped = "CDFGA";
    var sharpable = {};
    for (var i=0; i<sharped.length; i++) {
        sharpable[sharped[i]] = sharped[i];
    }

    class PianoKey {
        constructor(options) {
            var that = this;
            this.settings = $.extend({
                on_frame: null,
                player: null,
                w: 50,
                h: 30,
                x: 0,
                y: 0,
                note_name: "C4",
                off_color: "white",
                on_color: "pink",
                border_color: "black",
            }, options);
            var s = this.settings;
            var frame = s.on_frame;
            if (!frame) {
                throw new Error("frame is required to draw");
            };
            // draw key body rect
            this.rect = frame.frame_rect({
                x: s.x, y: s.y, w: s.w, h: s.h, color: s.off_color, name:true,
            });
            this.rect.on("click", () => that.toggle());
            // draw border
            frame.frame_rect({
                x: s.x, y: s.y, w: s.w, h: s.h, color: s.border_color, fill:false,
            });
            this.pressed = false;
        };
        toggle() {
            // switch on/off status
            if (!this.pressed) {
                this.do_press();
            } else {
                this.do_unpress();
            }
        };
        do_press() {
            this.rect.change({color: this.settings.on_color})
            if (this.settings.player) {
                this.settings.player.press_note(this.settings.note_name);
            }
            this.pressed = true;
        };
        do_unpress() {
            this.rect.change({color: this.settings.off_color})
            if (this.settings.player) {
                this.settings.player.unpress_note(this.settings.note_name);
            }
            this.pressed = false;
        };
    };

})(jQuery);