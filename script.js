let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

// 🔊 Speak
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// 📷 Start Camera (BACK)
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        document.getElementById("camera").srcObject = stream;
        cameraOn = true;

        updateStatus("Camera started");
        speak("Camera started");

    } catch {
        speak("Camera permission denied");
    }
}

// 🛑 Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraOn = false;

        updateStatus("Camera stopped");
        speak("Camera stopped");
    }
}

// 🧠 Update debug safely
function updateStatus(text) {
    const el = document.getElementById("statusText");
    if (el) el.innerText = "Action: " + text;
}

// 🎤 Start Voice
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = function (event) {
            let last = event.results[event.results.length - 1];
            let transcript = last[0].transcript.toLowerCase().trim();
            let confidence = last[0].confidence;

            // 📝 Always show text
            document.getElementById("heardText").innerText = "You said: " + transcript;
            document.getElementById("confidenceText").innerText = "Confidence: " + confidence.toFixed(2);

            if (!last.isFinal) return;
            if (confidence < 0.35 || transcript.length < 2) return;

            console.log("Final:", transcript);

            speak("You said " + transcript);

            // 🔥 BETTER COMMAND DETECTION

            // START CAMERA
            if (
                transcript.includes("start camera") ||
                transcript.includes("open camera") ||
                transcript.includes("turn on camera") ||
                (transcript.includes("camera") && transcript.includes("start"))
            ) {
                updateStatus("Starting Camera");
                speak("Starting camera");
                startCamera();
            }

            // STOP CAMERA (IMPROVED)
            else if (
                transcript.includes("stop camera") ||
                transcript.includes("close camera") ||
                transcript.includes("camera off") ||
                transcript.includes("turn off camera") ||
                transcript.includes("disable camera") ||
                (transcript.includes("camera") && transcript.includes("stop"))
            ) {
                updateStatus("Stopping Camera");
                speak("Stopping camera");
                stopCamera();
            }

            // LOCATION
            else if (
                transcript.includes("location") ||
                transcript.includes("where am i")
            ) {
                updateStatus("Getting Location");
                speak("Getting location");
                getLocation();
            }

            // STOP VOICE
            else if (transcript.includes("stop")) {
                updateStatus("Stopping Voice");
                speak("Stopping voice");
                stopVoiceSafe();
            }

            else {
                updateStatus("Not recognized");
                speak("Command not recognized");
            }
        };

        recognition.onerror = function () {
            stopVoiceSafe();
        };

        recognition.start();
        isListening = true;

    } catch {
        speak("Microphone not supported");
    }
}

// 🛑 Stop Voice
function stopVoiceSafe() {
    if (recognition) {
        try { recognition.stop(); } catch { }
        recognition = null;
    }
    isListening = false;
}

// 📍 Location
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;
        speak("Your location is latitude " + lat + " longitude " + lon);
    }, () => {
        speak("Location access denied");
    });
}

// ==========================
// TOUCH (Mobile)
// ==========================
document.body.addEventListener("touchstart", () => startVoice(), { passive: true });
document.body.addEventListener("touchend", () => stopVoiceSafe());
document.body.addEventListener("touchcancel", () => stopVoiceSafe());
document.body.addEventListener("touchmove", () => stopVoiceSafe());

// ==========================
// MOUSE (Laptop)
// ==========================
document.body.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startVoice();
});
document.body.addEventListener("mouseup", () => stopVoiceSafe());
document.body.addEventListener("mouseleave", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Hold and speak your command");
};