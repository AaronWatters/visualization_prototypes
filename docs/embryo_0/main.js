var info = $('#info');
//var canvas_div = null;
var element = null;
var target = null;

var setup = function () {
  info.html('setting up embryo.');
  element = $('#embryo');
  element.empty();
  var file_input = $('<input type="file" />').appendTo(element);
  //canvas_div = $("<div/>").appendTo(element);
  file_input.change(function(event){
    var uploadedFile = event.target.files[0]; 
    if (uploadedFile) {
        var readFile = new FileReader();
        readFile.onload = function(e) { 
            var contents = e.target.result;
            var json = JSON.parse(contents);
            element.empty();
            process_embryo_data(json, element, info);
        };
        readFile.readAsText(uploadedFile);
    } else { 
        info.html("Failed to load file");
    }
  })
  info.html('Please load a JSON file.');
};

info.html('main.js loaded.');
