const { desktopCapturer, remote } = require('electron');
const { writeFile } = require('fs');
const { dialog, Menu } = remote;
const dataForge = require('data-forge');
require('data-forge-fs');
// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];
// Buttons
const videoElement = document.querySelector('video');
const stopBtn = document.getElementById('stopBtn');
var end = false;
var detectConfidence = [];
var detectLabel = [];
var detectTime = [];
var counter = 0;
var light = 50;
stopBtn.onclick = e => {
  mediaRecorder.stop();
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );
  videoOptionsMenu.popup();
}
// Change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  hide();
  // Create a Stream
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // Preview the source in a video element
  //videoElement.srcObject = HTMLImageElement;
  //videoElement.play();
  // Create the Media Recorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream , options);
  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.start();
  end = false;
  recordData();

}
// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });
  const id = Date.now();  
  const filename = "vid-"+ id +".webm"
  const buffer = Buffer.from(await blob.arrayBuffer());
  const filePath  = filename;
  writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  end = true;
  counter = 0;
  var dataFrame = new dataForge.DataFrame({
		columns: {
			Time: detectTime,
			Label: detectLabel,
		},
	});
  const csv_name = "output-"+id+".csv";
  dataFrame.asCSV().writeFileSync(csv_name); 
  unhide();
}

function recordData(){
  var startTime = Date.now();
  var DectectStartTime = 0;
  var DectectEndTime = 0;
  var client  = mqtt.connect('mqtt://broker.hivemq.com')
  client.on('connect', function () {
    client.subscribe('openmv/test', function (err) {
    })
  })

  client.on('message', function (topic, message) {
    // message is Buffer
    if(end == false){
      //console.log(message.toString());
      var data = message.toString();
      var defect = data.split(",");
      var label= []
      var confidence= [];
      for(var i = 0 ; i < 5 ; i++)
      {
        var temp=defect[i].split(":");
        label[i]= temp[0];        
        confidence[i]= temp[1];
      }
      console.log( confidence);
      
      var indexOfMaxValue = indexOfMax(confidence);
      console.log(indexOfMaxValue);
      var consecutiveCounter = 0;
      //console.log("Test : " + label[indexOfMaxValue] + " " + confidence[indexOfMaxValue]);
      border(String(label[indexOfMaxValue]),confidence[indexOfMaxValue])
      if(indexOfMax != 0 && confidence[indexOfMax] >= .8)
      {
        if(consecutiveCounter == 0){prevLabel = label[indexOfMax]}
        currentLabel = label[indexOfMax]

        if(currentLabel == prevLabel )
          {
            if(consecutiveCounter = 0){ DectectStartTime = Date.now()-startTime; }
            consecutiveCounter++;
            prevLabel = currentLabel;
          }
        else
          {
            DectectEndTime = Date.now()-startTime
            detectTime[counter] = DectectStartTime.toString + ":" + DectectEndTime;
            detectLabel[counter] = prevLabel;
            consecutiveCounter = 0;
            counter++;
          }
      }
      else 
      {
        consecutiveCounter = 0;
      }

    }
  })
}
function indexOfMax(arr) {
  if (arr.length === 0) {
      return -1;
  }

  var max = arr[0];
  var maxIndex = 0;

  for (var i = 1; i < arr.length; i++) {
      if (arr[i] > max) {
          maxIndex = i;
          max = arr[i];
      }
  }

  return maxIndex;
}
function unhide(){
  var x = document.getElementById("sidebar");
  x.style.display = "inline";
  var x = document.getElementById("home-section");
  x.style.position = "relative";
  x.style.width = "calc(100% - 78px)";
}
function hide(){
  var x = document.getElementById("sidebar");
  x.style.display = "none";
  var x = document.getElementById("home-section");
  x.style.position = "unset"
  x.style.width = "100%"
}
function border(label,confidence){
  console.log(label);
  confidence = (confidence*100).toFixed(2)

  switch(label) {
    case "cracks-breaks-collapses":
      var x = document.getElementById("camera");
      x.style.border = "2px solid #d63031";
      document.getElementById("label").innerHTML = "Crack-Breaks-Collapses  "+String(confidence)+" %";
      break;
    case "root":
      var x = document.getElementById("camera");
      x.style.border = "2px solid #0984e3";
      document.getElementById("label").innerHTML = "Root  "+String(confidence)+" %";
      break;
    case "obstacle":
      var x = document.getElementById("camera");
      x.style.border = "2px solid #00b894";
      document.getElementById("label").innerHTML = "Obstacle  "+String(confidence)+" %";
      break;
    case "displace":
      var x = document.getElementById("camera");
      x.style.border = "2px solid #8c7ae6";
      document.getElementById("label").innerHTML = "Displace  "+String(confidence)+" %";
      break;
      case "normal":
        var x = document.getElementById("camera");
        x.style.border = "2px solid #2d3436";
        document.getElementById("label").innerHTML = "Normal  "+String(confidence)+" %";
      break;     
    default:
      var x = document.getElementById("camera");
      x.style.border = "0px solid #d63031";
      document.getElementById("label").innerHTML = "Unknow"
      // code block
  }
}


var slider = document.getElementById("myRange");
var output = document.getElementById("lightValue");
output.innerHTML = String(slider.value); // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
  output.innerHTML = this.value;
  light = 100-parseInt(this.value);
  client2.publish("TinySewer/light", String(light))
}
var client2  = mqtt.connect('mqtt://broker.hivemq.com')

client2.on('connect', function () {
  //client2.publish("TinySewer/light", String(light))

})

$('#sensor-sleep').click(function(){
  $('#camera').attr('src', '');
  });

$('#sensor-start').click(function(){
  $('#camera').attr('src', 'http://192.168.1.139:8080/');
  });