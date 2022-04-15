
var DATA_FILE = "./tracked_tsc_3d_geometry.json";
var SIDE = 1200;
var radius_multiple = 2;

var info, ellipsoids, slider;
var json_data = null;

function load_ellipsoids() {
    info = $("#info");
    ellipsoids = $("#ellipsoids");
    ellipsoids.width(SIDE).height(SIDE);
    ellipsoids.css("background-color", "cyan")
    slider = $("#slider");
    slider.width(SIDE)
    slider.css("background-color", "yellow");
    info.html("loading: " + DATA_FILE);
    $.getJSON(DATA_FILE, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var renderer, scene, camera, orbitControls, clock, geometry;

var setup = function(data) {
    debugger;
    json_data = data
    info.html("loaded! " + data.length);
    var container = ellipsoids;
    container.empty();
    var canvas = document.createElement( 'canvas' );
    var context = canvas.getContext( 'webgl2', { alpha: false } ); 
    renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.width(), container.height() );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container[0].appendChild( renderer.domElement );
    camera = new THREE.PerspectiveCamera( 45, container.width()/container.height(), 0.1, 10000 );   
    scene = new THREE.Scene();

    //const light = new THREE.HemisphereLight();
    //scene.add( light );

    var tsinfo = data[0];
    var center = tsinfo.center;
    var radius = tsinfo.radius;
    var cx = center[0];
    var cy = center[1];
    var cz = center[2];
    //var radius_multiple = 2.0;
    var sr = radius * radius_multiple;

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( cx+sr, cy+sr, cz+sr );
    scene.add( light );

    light = new THREE.DirectionalLight( 0x995555 );
    light.position.set( cx+sr, cy-sr, cz-sr );
    scene.add( light );

    light = new THREE.DirectionalLight( 0x555599 );
    light.position.set( cx-sr, cy-sr, cz+sr );
    scene.add( light );

    light = new THREE.DirectionalLight( 0x559955 );
    light.position.set( cx-sr, cy+sr, cz-sr );
    scene.add( light );


    camera.position.x = cx;
    camera.position.y = cy;
    camera.position.z = cz + radius * radius_multiple;
    camera.lookAt(new THREE.Vector3(cx, cy, cz));

    var boundary_sphere = false;
    if (boundary_sphere) {
        var g = new THREE.SphereGeometry(radius, 12, 12);
        var m = new THREE.MeshNormalMaterial();
        m.wireframe = true;
        var c = new THREE.Mesh(g, m);
        c.position.set(cx, cy, cz);
        scene.add(c);
    }

    geometry = new THREE.BufferGeometry();
    var vertices = tsinfo.vertices;
    var normals = tsinfo.normals;
    var colors = tsinfo.colors;
    var indices = tsinfo.indices;

    geometry.setIndex( indices );
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    
    const material = new THREE.MeshPhongMaterial( {
        //side: THREE.DoubleSide,
        side: THREE.BackSide,
        vertexColors: true,
        opacity: 0.5,
        transparent: true,
    } );
    material.depthWrite = false

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );


    renderer.render(scene, camera);
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.center.set( cx, cy, cz );
    orbitControls.update();
    //renderer.render(scene, camera);
    // orbitControls.userZoom = false;
    clock = new THREE.Clock();
    animate();

    // set up slider
    slider.empty();

    slider.slider({
        value: 0,
        slide: update_timestamp,
        change: update_timestamp,
        min: 0,
        max: data.length - 1,
        step: 1,
    });

    info.html("running animation and interactive controls.");
};

var update_timestamp = function () {
    var tsindex = slider.slider("option", "value");
    var tsinfo = json_data[tsindex];
    info.html("Slide to tsid: " + tsinfo.tsid);
    var vertices = tsinfo.vertices;
    var normals = tsinfo.normals;
    var colors = tsinfo.colors;
    var indices = tsinfo.indices;

    geometry.setIndex( indices );
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

    var center = tsinfo.center;
    var radius = tsinfo.radius;
    var cx = center[0];
    var cy = center[1];
    var cz = center[2];
    camera.position.x = cx;
    camera.position.y = cy;
    camera.position.z = cz + radius * radius_multiple;
    camera.lookAt(new THREE.Vector3(cx, cy, cz));
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