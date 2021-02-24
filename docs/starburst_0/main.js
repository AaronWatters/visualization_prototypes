var info = $('#info');


const settings = {
    color: "0xd4af37",
    metalness: 0.8,
    roughness: 0.0,
    ambientIntensity: 1.0,
    aoMapIntensity: 1.0,
    envMapIntensity: 1.0,
    displacementScale: 2.436143, // from original model
    normalScale: 1.0
};

var setup = function () {
    debugger;
    info.html("Set up SampleLibrary.")
    SampleLibrary.baseUrl = "https://nbrosowsky.github.io/tonejs-instruments/samples/";
  info.html('setting up volume.');
  var element = $('#piano');
  element.empty();
  var volume_element = $("<div/>").appendTo(element);
  add_volume(volume_element);
  display_surface(volume_element);
  info.html('setting up piano.');
  var piano_element = $("<div/>").appendTo(element);
  piano_element.piano_keyboard({
    presses_callback: volume_element.presses_callback,
    reset_callback: volume_element.reset,
    single_press_callback: volume_element.press,
    single_unpress_callback: volume_element.unpress,
    add_spiral: false,
  });
  piano_element.piano.add_midi_url_button('./canon_simplified_for_piano.mid', "Pachelbel's Canon - simple arrangement for piano");
  piano_element.piano.add_midi_url_button('./Bach-Jesu_Joy_of_Man_Desiring.mid', "Bach: Jesu Joy of Man's Desiring");
  piano_element.piano.add_midi_url_button('./beethoven_opus10_1_format0.mid', 'Beethoven: Opus 10');
  piano_element.piano.add_midi_url_button('./handel_hallelujah.mid', 'Handel: Hallelujah Chorus');
  //piano_element.piano.add_midi_url_button('./Take-Five-1.mid', 'Take five');
  piano_element.piano.add_midi_url_button('./snoopy.mid', 'Snoopy - Vince Guaraldi');
  piano_element.piano.add_midi_url_button(
      './Coltrane_giant_steps.mid', 
      "John Coltrane - Giant Steps");
  info.html('Piano ready.');
};

const MAX_NOTE = 12;
var num_rows = 50;
var num_cols = num_rows;
var num_layers = 2 * num_rows;

function add_volume(element) {
    // add 3d spiral thing

    // DEBUG
    //num_rows = 3;
    //num_cols = 3;
    //num_layers = 12;

    element.feedbackContext = $.fn.feedWebGL2({});

    element.program = element.feedbackContext.program({
        vertex_shader: musical_shader,
        feedbacks: {
            closeness: {num_components: 1},
            //sampler_copy: {num_components: 1},  // debug
        },
    });

    // starburst arm data for up to 12 notes, initially all zeros
    var arm_vector;
    function clear_arm_vector() {
        arm_vectors = [];
        for (var note=0; note<MAX_NOTE; note++) {
            arm_vectors.push([[0, 0, 0,], [0, 0, 0,], [0, 0, 0,], ])
        }
    }
    clear_arm_vector();

    var get_arm_array = function() {
        // flattened arm_vectors
        var result = [];
        for (var note=0; note<MAX_NOTE; note++) {
            for (var i=0; i<3; i++) {
                for (var j=0; j<3; j++) {
                    result.push(arm_vectors[note][i][j]);
                }
            }
        }
        return result;
    };

    element.texture = element.feedbackContext.texture("ArmData", "FLOAT", "RGB", "RGB32F");

    element.load_arm_data = function() {
        var data = get_arm_array();
        var width = 3;
        // three floats per entry
        var height = MAX_NOTE;
        element.texture.load_array(data, width, height);
    };

    element.reload_arm_data = function () {
        data = get_arm_array();
        element.texture.reload_array(data);
        element.feedbackContext.gl.flush();
    }

    var load_test_vectors = function() {
        for (var i=0; i<TEST_VECTORS.length; i++) {
            arm_vectors[i] = TEST_VECTORS[i];
        }
    }
    //load_test_vectors();

    element.load_arm_data();

    element.runner = element.program.runner({
        vertices_per_instance: num_rows * num_cols * num_layers,
        uniforms: {
            num_rows: {
                vtype: "1iv",
                default_value: [num_rows],
            },
            num_cols: {
                vtype: "1iv",
                default_value: [num_cols],
            },
            num_layers: {
                vtype: "1iv",
                default_value: [num_layers],
            },
        },
        inputs: {},
        samplers: {
            ArmData: {
                dim: "2D",
                from_texture: "ArmData"
            },
        },
    });
    element.get_closeness = function() {
        element.runner.run();
        var result = element.runner.feedback_array("closeness");
        return Array.from(result);
    };

    function add_surface() {
        element.runner.run();
        var closeness = element.runner.feedback_array("closeness");
        var surface = element.webGL2surfaces3dopt({
            feedbackContext: element.feedbackContext,
            valuesArray: closeness,
            num_rows: num_rows,
            num_cols: num_cols,
            num_layers: num_layers,
            color: [1, 0, 0],
            rasterize: false,
            threshold: 0.6,
            shrink_factor: 0.06,
            dx: [1,0,0],
            dy: [0,1,0],
            dz: [0,0,1],
            translation: [-num_layers/2, -num_rows/2, -num_cols/2],
            sorted: false,   // unsorted because we will replace the input array
        });
        element.surface = surface;
    };

    add_surface();

    element.current_presses = {};

    element.press = function(note) {
        element.presses_callback([{note}],[])
    };
    element.unpress = function(note) {
        element.presses_callback([],[{note}])
    };

    element.is_rotating = false;

    element.reset = function (rotate) {
        element.current_presses = {};
        element.presses_callback([], []);
        if (rotate) {
            if (element.is_rotating) {
                // do nothing... keep rotating.
            } else {
                var do_rotate = function () {
                    var delta = clock.getDelta();
                    orbitControls.update(delta);
                    renderer.render( scene, camera );
                    if (element.is_rotating) {
                        requestAnimationFrame(do_rotate);
                    }
                };
                element.is_rotating = true;
                requestAnimationFrame(do_rotate);
            }
        } else {
            element.is_rotating = false;
        }
    }

    element.presses_callback = function(presses, unpresses) {
        //debugger;
        var next_presses = {};
        var unpressed = {};
        for (var i=0; i<unpresses.length; i++) {
            var name = unpresses[i].note;
            unpressed[name] = name;
        }
        for (var current in element.current_presses) {
            if (!unpressed[current]) {
                next_presses[current] = current;
            }
        }
        for (var i=0; i<presses.length; i++) {
            var name = presses[i].note;
            next_presses[name] = name;
        }
        element.current_presses = next_presses;
        //element.reload_arm_data();
        //requestAnimationFrame( element.update_volume );
        element.update_volume();
    };

    element.update_volume = function () {
        clear_arm_vector();
        var presses = element.current_presses;
        var info = midi_chord_info(presses);
        var notes_and_octaves = info.notes_and_octaves;
        var note_positions = chord_positions(notes);
        var count = 0;
        var sum = [0, 0, 0];
        for (var i=0; i<notes_and_octaves.length; i++) {
            if (i >= MAX_NOTE) { break; }
            var [note, octave] = notes_and_octaves[i];
            var [offset, spiral] = note_positions[note];
            var position = spiral_note_position(offset, spiral);
            for (var j=0; j<3; j++) {
                sum[j] += position[j];
            }
            arm_vectors[i][1] = position;
            var radius = (MAX_OCTAVE - octave) / MAX_OCTAVE;
            var radius1 = 0.1;
            var weight = 1;
            arm_vectors[i][2] = [radius, radius1, weight];
            count += 1;
        }
        //debugger;
        if (count > 0) {
            for (var j=0; j<3; j++) {
                sum[j] = sum[j] * 1.0 / count;
            }
            for (var i=0; i<count; i++) {
                arm_vectors[i][0] = sum;
                //arm_vectors[i][0] = [0,0,0];
            }
        }
        element.reload_arm_data();
        // extra run???
        //element.runner.run();
        requestAnimationFrame(element.run_all);
    };

    element.run_all = function () {
        //debugger;
        element.runner.run();
        //var closeness = element.runner.feedback_array("closeness");
        var to_buffer_name = element.surface.crossing.buffer.name; // should encapsulate
        //to_buffer.copy_from_array(closeness);
        // DEBUG
        //element.sampler_copy = element.runner.feedback_array("sampler_copy");
        //element.arm_array = get_arm_array(); // should be same in the beginning?
        // END DEBUG
        element.runner.copy_feedback_to_buffer("closeness", to_buffer_name);
        element.surface.link_needs_update = true;
        element.surface.run()
        element.surface.check_update_link();
        renderer.render(scene, camera);
    }

    info.html('Isosurfaces initialized..');

};

const pi_d2 = 0.5 * Math.PI;

function spiral_note_position(offset, spiral) {
    var radius = 1.0;
    var theta = pi_d2 *  (offset + spiral);
    var y = radius * Math.sin(theta);
    var z = radius * Math.cos(theta);
    return [offset, y, z];
}

const TEST_VECTORS = [
    [[ 0.6,  0.0 ,  0.0 ],
    [ 1.0 ,  1. ,  1. ],
    [ 0.5,  0.2,  1.0 ]],

    [[ 0.6,  0.0 ,  0.0 ],
    [-1. , -1. ,  1. ],
    [ 0.5,  0.2,  1. ]],

    [[ 0.6,  0. ,  0. ],
    [ 1. , -1. , -1. ],
    [ 0.5,  0.2,  1. ]],

    [[ 0.6,  0. ,  0. ],
    [-1. ,  1. , -1. ],
    [ 0.5,  0.2,  1. ]]
];

const MAX_OCTAVE = 9.0;

var scene, camera, geometry, mesh,orbitControls, clock, positions;

function display_surface(element) {
    element.empty();
    var $container = $("<div></div>").appendTo(element);
    var container = $container[0];
    var canvas = document.createElement( 'canvas' ); 
    var context = canvas.getContext( 'webgl2', { alpha: false } ); 
    renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
    //renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    var width = 1500;
    var height = 611;
    renderer.setSize( width, height );
    //renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    // lights
    const ambientLight = new THREE.AmbientLight( 0xffffff, settings.ambientIntensity );
    //scene.add( ambientLight );

    const pointLight = new THREE.PointLight( 0xff0000, 0.5 );
    pointLight.position.z = 2500;
    scene.add( pointLight );

    const pointLight2 = new THREE.PointLight( 0xff6666, 1 );
    pointLight2.position.y = - 1000;
    pointLight2.position.x = 1000;
    scene.add( pointLight2 );

    const pointLight3 = new THREE.PointLight( 0x0000ff, 0.5 );
    pointLight3.position.x = - 1000;
    pointLight3.position.z = 1000;
    scene.add( pointLight3 );

    element.scene = scene;

    scene.add( new THREE.AmbientLight( 0x444444 ) );

    camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 );
    // old: 0.4, 1.3
    //camera.position.set( 0.3 * num_layers, 0.2 * num_layers, 0.5 * num_layers );
    camera.position.set( 0.0, 0.2 * num_layers, 0.5 * num_layers );
    //camera.lookAt(new THREE.Vector3(0.5 * num_layers, 0, 0));
    
    element.surface.run();
    geometry = element.surface.linked_three_geometry(THREE);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
    // material
    //var material = new THREE.MeshNormalMaterial( {  } );

    var on_texture_load = function() {
        var color = 0xD4AF37;
        material = new THREE.MeshStandardMaterial( {

                color: color,
                //color: 0x887744,
                roughness: settings.roughness,
                metalness: settings.metalness,
                envMap: reflectionCube,
                envMapIntensity: settings.envMapIntensity,

                side: THREE.DoubleSide

            } );
        material.wireframe = false;

        // mesh
        mesh = new THREE.Mesh( geometry,  material );
        scene.add( mesh );

        //update_scene();
        positions = geometry.attributes.position.array;
        renderer.render( scene, camera );
    };

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.target = new THREE.Vector3(0.5 * num_layers, 0, 0);
    orbitControls.update();
    //orbitControls.userZoom = false;
    clock = new THREE.Clock();

    // stuff for envmap
    const path = "../textures/cube/pisa/";
    const format = '.png';
    const urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    const reflectionCube = new THREE.CubeTextureLoader().load( urls, on_texture_load );
    reflectionCube.encoding = THREE.sRGBEncoding;
    
};


const musical_shader = `#version 300 es

uniform int num_rows, num_cols, num_layers;

uniform float voxel_scale;

// starburst "arm" psrameters: 
//   each row P1, P2, [radius, radius2, weight]
uniform sampler2D ArmData;

out float closeness;

// DEBUGGING
//out float sampler_copy;

int divmod(in int numerator, in int denominator, out int remainder) {
    int result = numerator / denominator;
    remainder = numerator - (result * denominator);
    return result;
}

const float PI = 3.1415926535897932384626433832795;
const float PI_D_2 = 0.5 * PI;
const float epsilon = 1e-10;
const float SPIRAL_ROTATION_RADIUS = 1.0;

// A point at the threshold radius has a nearness of 0.5
const float SPIRAL_THRESHOLD_RADIUS = 0.1;

// index to geometric location:
//  x (layers) ranges from -6 to 6
//  y (rows) and z (columns) ranges from -2 to 2
// spiral rotation radius is always 1.0

const float x_mult = 12.0;
const float yz_mult = 3.5;

vec3 locate(in int index) {
    int layer_remainder, column_index;
    int layer_index = divmod(gl_VertexID, num_rows * num_cols, layer_remainder);
    int row_index = divmod(layer_remainder, num_cols, column_index);
    // ijk centered around origin.
    //ivec3 ijk = ivec3(layer_index, row_index, column_index) - (ivec3(num_layers, num_rows, num_cols) / 2);
    vec3 f_ijk = vec3(ivec3(layer_index, row_index, column_index)) - 0.5 * vec3(ivec3(num_layers, num_rows, num_cols));
    // scaling by dimension
    vec3 scaling = vec3(
        x_mult / float(num_layers),
        yz_mult / float(num_cols),
        yz_mult / float(num_rows)
    );
    vec3 location = scaling * f_ijk;
    return location;
}

// x offset to associated point on numbered spiral
vec3 spiral_point(in float x_offset, in int spiral_number) {
    float theta = PI_D_2 * (float(spiral_number) + x_offset);
    float y = SPIRAL_ROTATION_RADIUS * sin(theta);
    float z = SPIRAL_ROTATION_RADIUS * cos(theta);
    return vec3(x_offset, y, z);
}

// nearness to numbered spiral (1.0 is on the spiral 0.0 is infinitely far away)
float spiral_nearness(in vec3 location, in int spiral_number) {
    vec3 point = spiral_point(location.x, spiral_number);
    float distance = length(location - point);
    return SPIRAL_THRESHOLD_RADIUS / (SPIRAL_THRESHOLD_RADIUS + distance);
}

const float NEARNESS_SCALAR = 2.0 / PI;

float bounded_angle_nearness(
        in vec3 location,
        in vec3 P0,
        in vec3 plane_normal,
        in float nearness_min,
        in float stretch
    ) {
    vec3 V = location - P0;
    float scale = dot(V, plane_normal);
    if (scale < epsilon) {
        return 0.0;
    }
    float lenV = length(V);
    float sine = 1.0;
    if (scale < lenV) {
        sine = scale / lenV;
    }
    float nearness = NEARNESS_SCALAR * asin(sine);
    //float stretch = 1.0 / (1.0 - nearness_min);
    float adjusted_nearness = stretch * (nearness - nearness_min);
    return max(0.0, adjusted_nearness);
}

const float PIN_RADIUS_MAX = 1.2;
const float PIN_LENGTH_TO_RADIUS = 1.0;

float pin_nearness(
        in vec3 location,
        in vec3 P1,
        in vec3 P2,
        in float radius,
        in float radius2,
        in float weight
    ) {
    vec3 V12 = P2 - P1;
    float lenV12 = length(V12);
    vec3 n12;
    if (lenV12 < epsilon) {
        n12 = vec3(0,0,1);  // arbitrary
    } else {
        n12 = V12 / lenV12;
    }
    vec3 n21 = - n12;
    // compute torus nearness
    vec3 V = location - P1;
    vec3 Vp12 = dot(n12, V) * n12;
    vec3 Pproj = location - Vp12;
    vec3 Vproj = Pproj - P1;
    vec3 nproj = normalize(Vproj);
    vec3 Pcircle = P1 + radius * nproj;
    float circle_distance = length(location - Pcircle);
    float weighted_radius = max(epsilon, radius2 * weight);
    float torus_nearness = weighted_radius / (weighted_radius + circle_distance);
    // compute line nearness
    float line_radius = min(lenV12 * PIN_LENGTH_TO_RADIUS * weight, PIN_RADIUS_MAX);
    float tangent = lenV12 * 0.5 / line_radius;
    float nearness_min = atan(tangent) * NEARNESS_SCALAR;
    float stretch = 1.0 / (1.0 - nearness_min);
    float a1 = bounded_angle_nearness(location, P1, n12, nearness_min, stretch);
    float a2 = bounded_angle_nearness(location, P2, n21, nearness_min, stretch);
    float line_nearness = a1 * a2;
    return max(torus_nearness, line_nearness);
}

void main() {
    vec3 location = locate(gl_VertexID);
    //closeness = location.z; return; // DEBUG
    // default
    float nearness = 0.0;
    ivec2 sampler_size = textureSize(ArmData, 0);
    int num_arms = sampler_size[1];
    // DEBUGGING -- dump the current sampler
    //sampler_copy = 0.0;
    //int sampler_i, sampler_j, sampler_k, sampler_rem;
    //sampler_i = divmod(gl_VertexID, 9, sampler_rem);
    //sampler_j = divmod(sampler_rem, 3, sampler_k);
    //if (sampler_i < num_arms) {
    //    sampler_copy = texelFetch(ArmData, ivec2(sampler_j, sampler_i), 0).rgb[sampler_k];
    //}
    // END DEBUGGING
    for (int i=0; i<num_arms; i++) {
        vec3 P2 = texelFetch(ArmData, ivec2(0, i), 0).rgb;
        vec3 P1 = texelFetch(ArmData, ivec2(1, i), 0).rgb;
        vec3 params = texelFetch(ArmData, ivec2(2, i), 0).rgb;
        float weight = params[2];
        float radius = params[0];
        float radius2 = params[1];
        float npin = pin_nearness(location, P1, P2, radius, radius2, weight);
        nearness = max(nearness, npin);
    }
    nearness = max(nearness, spiral_nearness(location, 0));
    nearness = max(nearness, spiral_nearness(location, 1));
    closeness = nearness;
}
`

var parse_midi_note = function(name) {
    var len = name.length;
    var octave = parseInt(name.slice(len - 1));
    var note = name.slice(0, len-1);
    return [note, octave];
};

var midi_chord_info = function(names) {
    notes_and_octaves = [];
    notes = {};
    for (name in names) {
        var n_o = parse_midi_note(name);
        var [name, octave] = n_o
        notes[name] = octave;
        notes_and_octaves.push(n_o)
    }
    return {notes_and_octaves, notes}
}

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

info.html('main.js loaded.');
