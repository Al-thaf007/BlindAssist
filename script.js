// =====================
// GLOBAL VARIABLES
// =====================
let model = null;
let detecting = false;
let lastSpoken = "";
let stream = null;
let recognition = null;


// =====================
// LOAD AI MODEL
// =====================
async function loadModel() {
    try {
        model = await cocoSsd.load();
        console.log("AI loaded");
        speak("AI ready");
    } catch (err) {
        console.log(err);
        alert("AI failed to load");
    }
}

window.onload = function () {
    speak("Press start voice button");
};

// =====================
// START CAMERA
// =====================
function startCamera() {
    const video = document.getElementById("camera");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (s) {
            stream = s;
            video.srcObject = stream;
        })
        .catch(function (err) {
            console.log(err);
            alert("Camera not working");
        });
}
// =====================
// STOP CAMERA
// =====================
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        document.getElementById("camera").srcObject = null;
        stream = null;
    }
}

// =====================
// DETECTION LOOP
// =====================
function startDetection(video) {
    if (detecting) return;
    detecting = true;

    setInterval(async () => {
        if (!model) return;

        const predictions = await model.detect(video);

        let obstacleDetected = false;
        let veryClose = false;

        predictions.forEach(pred => {
            if (pred.score > 0.6) {

                let [x, y, width, height] = pred.bbox;
                let area = width * height;

                if (area > 150000) {
                    veryClose = true;
                } else if (area > 50000) {
                    obstacleDetected = true;
                }
            }
        });

        let message = "";

        if (veryClose) {
            message = "Stop, obstacle very close";
        } else if (obstacleDetected) {
            message = "Obstacle ahead";
        }

        if (message && message !== lastSpoken) {
            speak(message);
            console.log(message);
            lastSpoken = message;
        }

    }, 1500);
}

// =====================
// GPS LOCATION
// =====================
function getLocation() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            let lat = pos.coords.latitude;
            let lon = pos.coords.longitude;

            document.getElementById("location").innerText =
                "Lat: " + lat + " | Long: " + lon;

            speak("Location fetched");
        },
        () => {
            alert("Location permission denied");
        }
    );
}

// =====================
// VOICE COMMAND
// =====================
let recognition = null;

function startListening() {
    if (recognition) {
        recognition.stop(); // reset if already running
        recognition = null;
    }

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.start();

    recognition.onstart = function () {
        console.log("Voice started");
    };

    recognition.onresult = function (event) {
        let text = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Heard:", text);

        if (text.includes("start") && text.includes("camera")) {
            startCamera();
        }

        if (text.includes("stop") && text.includes("camera")) {
            stopCamera();
        }
    };

    recognition.onerror = function (event) {
        console.log("Error:", event.error);
    };

    recognition.onend = function () {
        console.log("Voice stopped");
    };
}
// =====================
// STOP VOICE
// =====================
function stopListening() {
    if (recognition) {
        recognition.onend = null;
        recognition.stop();
        recognition = null;
        speak("Voice stopped");
    }
}

// =====================
// SPEAK FUNCTION
// =====================
function speak(text) {
    let speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}