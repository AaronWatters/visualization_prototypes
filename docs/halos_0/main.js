
var info = $("#info");

var DATA_FILE = "./halos.json";
var json_data = null;

var category_colors = [
    // r, g, b, a
    [255, 255, 255, 1],
    [239, 98, 36, 1],
    [0, 162, 121, 1],
    [54, 80, 162, 1],
    [0, 132, 197, 1],
    [231, 230, 32, 1],
    [85, 186, 70, 1],
    [58, 46, 137, 1],
    [238, 179, 30, 1],
    [128, 128, 0, 0],
    [0, 128, 128, 0],
    [128, 0, 128, 0],
    [127, 255, 127, 0],
    [255, 105, 180, 0],
    [244, 164, 96, 0],
];

function load_config() {
     $.getJSON(DATA_FILE, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var renderer, scene, camera, orbitControls, clock;

var setup = function(data) {
    json_data = data;
    info.html("json data read.");
    
    set_up_controls();

    var center = data.center;
    var radius = data.radius;
    var pointSize = radius * 0.008;
    radius_multiple = 2.0;
    var container = $("#dot_cloud");
    container.empty();
    var canvas = document.createElement( 'canvas' );
    var context = canvas.getContext( 'webgl2', { alpha: false } ); 
    renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.width(), container.height() );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container[0].appendChild( renderer.domElement );
    camera = new THREE.PerspectiveCamera( 45, container.width()/container.height(), 0.1, 10000 );
    var cx = center[0];
    var cy = center[1];
    var cz = center[2];
    camera.position.x = cx;
    camera.position.y = cy;
    camera.position.z = cz + radius * radius_multiple;
    //camera.lookAt(cx, cy, cz);
    camera.lookAt(new THREE.Vector3(cx, cy, cz));
    scene = new THREE.Scene();

    var g = new THREE.SphereGeometry(radius, 12, 12);
    var m = new THREE.MeshNormalMaterial();
    m.wireframe = true;
    var c = new THREE.Mesh(g, m);
    c.position.set(cx, cy, cz);
    scene.add(c);

    var arrays = get_point_arrays();
    pointsGeometry = new THREE.BufferGeometry();
    var geometry = pointsGeometry;
    geometry.setAttribute( 'position', arrays.positions );
    geometry.setAttribute( 'color', arrays.colors );
    //geometry.setAttribute( 'size', arrays.size );
    var material = new THREE.PointsMaterial( { size: pointSize, vertexColors: true } );
    var points = new THREE.Points( geometry, material );
    scene.add(points);

    renderer.render(scene, camera);
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.center.set( cx, cy, cz );
    orbitControls.update();
    renderer.render(scene, camera);
    // orbitControls.userZoom = false;
    clock = new THREE.Clock();
    animate();

    info.html("running animation and interactive controls.");
};

var reset = function () {
    var geometry = pointsGeometry;
    var arrays = get_point_arrays();
    geometry.setAttribute( 'position', arrays.positions );
    geometry.setAttribute( 'color', arrays.colors );
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
};

var pointsGeometry;

var get_point_arrays = function() {
    var positions = [];
    var colors = [];
    //var sizes = [];
    var halos = json_data.halos;
    for (var halo in halos) {
        var halo_detail = halos[halo];
        //var size = 1
        var color = halo_detail.color || [1, 1, 1];
        var points = halo_detail.points;
        var show_halo = !(halo_detail.hidden);
        for (point in points) {
            var point_position = points[point];
            //sizes.push(size);
            for (var i=0; i<3; i++) {
                if (show_halo) {
                    positions.push(point_position[i]);
                    colors.push(color[i]);
                } else {
                    positions.push(-5000);  // degenerate value
                    colors.push(0);
                }
            }
        }
    }
    var unlabelled = json_data.unlabelled;
    var unlabelled_color = [0.4, 0.4, 0.1]
    var show_unlabelled = !(json_data.hide_unlabelled);
    for (var point in unlabelled) {
        var point_position = unlabelled[point];
        for (var i=0; i<3; i++) {
            if (show_unlabelled) {
                positions.push(point_position[i]);
                colors.push(unlabelled_color[i]);
            } else {
                positions.push(-5000);  // degenerate value
                colors.push(0);
            }
        }
    }

    positions = new Float32Array( positions);
    colors = new Float32Array( colors);
    //sizes = new Float32Array( sizes);
    return {
        positions: new THREE.BufferAttribute( positions, 3 ),
        colors: new THREE.BufferAttribute( colors, 3 ),
        //sizes: new THREE.BufferAttribute( sizes, 1 ),
    };
};

var animate = function() {
    //that.surfaces.check_update_link();
    var delta = clock.getDelta();
    orbitControls.update(delta);
    renderer.render( scene, camera );
    //normals.sync_camera(that.camera);
    //velocities.sync_camera(that.camera);
    requestAnimationFrame( animate );
};

var set_up_controls = function() {
    var unlabelled_cb = $("#show_unlabelled");
    var change = function () {
        json_data.hide_unlabelled = !unlabelled_cb.is(":checked");
        reset();
    };
    unlabelled_cb.change(change);
    var halos = json_data.halos;
    var add_checkbox = function (halo) {
        var halo_detail = halos[halo];
        var c = category_colors[count % category_colors.length];
        halo_detail.color = [c[0]/256.0, c[1]/256.0, c[2]/256.0];
        var controls_div = $("#controls");
        var cb = $('<input type="checkbox" checked>').appendTo(controls_div);
        $("<div>" + halo + "</div>").appendTo(controls_div);
        var change = function () {
            halo_detail.hidden = !cb.is(":checked");
            reset();
        };
        cb.change(change);
    }
    var count = 0
    for (var halo in halos) {
        add_checkbox(halo);
        count += 1;
    }
}

info.html("main.js loaded.")

