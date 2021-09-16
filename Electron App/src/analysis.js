var first = false;
var vid = document.getElementById("myPlayerID");
vid.ontimeupdate = function(){
  var percentage = ( vid.currentTime / vid.duration ) * 100;
  $("#custom-seekbar span").css("width", percentage+"%");

};

$("#custom-seekbar").on("click", function(e){
    var offset = $(this).offset();
    var left = (e.pageX - offset.left);
    var totalWidth = $("#custom-seekbar").width();
    var percentage = ( left / totalWidth );
    var vidTime = vid.duration * percentage;
    vid.currentTime = vidTime;
});//click()


chapterStartTimes = [9]
chapterEndTimes = [18]

vid.onloadedmetadata = function() {
    console.log('metadata loaded!');
    addMarkers(chapterStartTimes,chapterEndTimes,vid.duration);

  };

// +++ Add chapter markers +++
function addMarkers(StartTimes,EndTimes, videoDuration) {
  var iMax = StartTimes.length;
  playheadWell = document.getElementById("test2");
  console.log(videoDuration)
  // Loop over each cue point, dynamically create a div for each
  // then place in div progress bar
  if ( first == true){
  $( ".marker" ).remove();


  for (i = 0; i < iMax; i++) {
    var elem = document.createElement("div");
    elem.className = "marker";
    elem.id = "marker" + i;
    elem.style.height = "100%";
    elem.style.zIndex = 9;
    elem.style.backgroundColor = "#0984e3";
    elem.style.position = "absolute";
    elem.style.pointerEvents = "none";
    elem.style.opacity = .8

    var lenght = ((EndTimes[i]-StartTimes[i]) / videoDuration) * 100  ;
    var bar = lenght.toString()+"%"
    console.log(bar)

    elem.style.width = bar;
    elem.style.marginLeft = StartTimes[i]/ videoDuration * 100 + "%";
    console.log("width: " + elem.style.width);
    
    playheadWell.appendChild(elem);
  }
  }
}


(function localFileVideoPlayer() {
  'use strict'
  var URL = window.URL || window.webkitURL
  var playSelectedFile = function(event) {
    first = true;
    var file = this.files[0]
    var type = file.type
    var videoNode = document.querySelector('video')
    var canPlay = videoNode.canPlayType(type)
    if (canPlay === '') canPlay = 'no'
    var message = 'Can play type "' + type + '": ' + canPlay
    var isError = canPlay === 'no'

    if (isError) {
      return
    }

    var fileURL = URL.createObjectURL(file)
    videoNode.src = fileURL
  }
  var inputNode = document.querySelector('input')
  inputNode.addEventListener('change', playSelectedFile, false)
})()


 