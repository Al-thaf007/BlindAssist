let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

// 🔊 Speak (no overlap)
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// 📷 Start Camera (BACK CAMERA)
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        document.getElementById("camera").srcObject = stream;
        cameraOn = true;
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
        speak("Camera stopped");
    }
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

            document.getElementById("heardText").innerText = "You said: " + transcript;
            document.getElementById("confidenceText").innerText = "Confidence: " + confidence.toFixed(2);

            if (!last.isFinal) return;
            if (confidence < 0.4 || transcript.length < 2) return;

            speak("You said " + transcript);

            if (transcript.includes("camera") && transcript.includes("start")) {
                document.getElementById("statusText").innerText = "Action: Starting Camera";
                speak("Starting camera");
                startCamera();
            }
            else if (transcript.includes("camera") && transcript.includes("stop")) {
                document.getElementById("statusText").innerText = "Action: Stopping Camera";
                speak("Stopping camera");
                stopCamera();
            }
            else if (transcript.includes("location")) {
                document.getElementById("statusText").innerText = "Action: Getting Location";
                speak("Getting location");
                getLocation();
            }
            else if (transcript.includes("stop")) {
                document.getElementById("statusText").innerText = "Action: Stopping Voice";
                speak("Stopping voice");
                stopVoiceSafe();
            }
            else {
                document.getElementById("statusText").innerText = "Action: Not recognized";
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
        try {
            recognition.stop();
        } catch { }
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
// ✋ TOUCH CONTROLS (Mobile)
// ==========================
document.body.addEventListener("touchstart", () => startVoice(), { passive: true });
document.body.addEventListener("touchend", () => stopVoiceSafe());
document.body.addEventListener("touchcancel", () => stopVoiceSafe());
document.body.addEventListener("touchmove", () => stopVoiceSafe());

// ==========================
// 🖱️ MOUSE CONTROLS (Laptop)
// ==========================
document.body.addEventListener("mousedown", (e) => {
    e.preventDefault(); // prevent text selection
    startVoice();
});

document.body.addEventListener("mouseup", () => {
    stopVoiceSafe();
});

document.body.addEventListener("mouseleave", () => {
    stopVoiceSafe();
});

// ==========================
// 🔊 Auto Instruction
// ==========================
window.onload = function () {
    speak("Hold screen or mouse and speak your command");
};