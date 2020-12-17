var info = $('#info');

var setup = function () {
  info.html('setting up piano.');
  var element = $('#piano');
  element.empty();
  element.piano_keyboard();
  element.piano.add_midi_url_button('./mary_had_a_little_lamb_PNO.mid', 'Mary had a little lamb');
  element.piano.add_midi_url_button('./Bach-Jesu_Joy_of_Man_Desiring.mid', "Bach: Jesu Joy of Man's Desiring");
  element.piano.add_midi_url_button('./beethoven_opus10_1_format0.mid', 'Beethoven: Opus 10');
  element.piano.add_midi_url_button('./handel_hallelujah.mid', 'Handel: Hallelujah Chorus');
  element.piano.add_midi_url_button('./Take-Five-1.mid', 'Take five');
  info.html('Piano ready.');
};

info.html('main.js loaded.');
