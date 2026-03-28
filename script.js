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

// =====================
// START CAMERA
// =====================
function startCamera() {
    const video = document.getElementById("camera");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (s) {
            stream = s;
            video.srcObject = stream;
            video.play();

            speak("Camera started");

            loadModel().then(() => {
                startDetection(video);
            });
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
        stream.getTracks().forEach(track => track.stop());
        document.getElementById("camera").srcObject = null;
        stream = null;
        speak("Camera stopped");
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
// VOICE COMMAND AUTO START
// =====================
document.body.addEventListener("click", () => {
    startListening();
}, { once: true });

// =====================
// VOICE COMMAND
// =====================
function startListening() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.start();

    recognition.onresult = function (event) {
        let text = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Heard:", text);

        if (text.includes("start") && text.includes("camera")) {
            startCamera();
        }

        if (text.includes("stop") && text.includes("camera")) {
            stopCamera();
        }

        if (text.includes("location")) {
            getLocation();
        }

        if (text.includes("stop voice")) {
            stopListening();
        }
    };
}

// =====================
// STOP VOICE
// =====================
function stopListening() {
    if (recognition) {
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
    window.speechSynthesis.speak(speech);
}