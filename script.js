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

// 🎤 Start Voice (Hold)
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true; // 🔥 important for live text

        recognition.onresult = function (event) {
            let last = event.results[event.results.length - 1];
            let transcript = last[0].transcript.toLowerCase().trim();
            let confidence = last[0].confidence;

            // 📝 Show live speech
            document.getElementById("heardText").innerText = "You said: " + transcript;
            document.getElementById("confidenceText").innerText = "Confidence: " + confidence.toFixed(2);

            console.log("Heard:", transcript, "Confidence:", confidence);

            // Only act on final result
            if (!last.isFinal) return;

            if (confidence < 0.4 || transcript.length < 2) return;

            // 🤖 Command detection
            if (transcript.includes("camera") && transcript.includes("start")) {
                document.getElementById("statusText").innerText = "Action: Starting Camera";
                startCamera();
            }
            else if (transcript.includes("camera") && transcript.includes("stop")) {
                document.getElementById("statusText").innerText = "Action: Stopping Camera";
                stopCamera();
            }
            else if (transcript.includes("location")) {
                document.getElementById("statusText").innerText = "Action: Getting Location";
                getLocation();
            }
            else if (transcript.includes("stop")) {
                document.getElementById("statusText").innerText = "Action: Stopping Voice";
                stopVoiceSafe();
            }
            else {
                document.getElementById("statusText").innerText = "Action: Not recognized";
            }
        };

        recognition.onerror = function () {
            stopVoiceSafe();
        };

        recognition.start();
        isListening = true;
        console.log("Mic ON");

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
    console.log("Mic OFF");
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
// ✋ TOUCH CONTROLS
// ==========================

document.body.addEventListener("touchstart", function () {
    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", function () {
    stopVoiceSafe();
});

document.body.addEventListener("touchcancel", function () {
    stopVoiceSafe();
});

document.body.addEventListener("touchmove", function () {
    stopVoiceSafe();
});

// ==========================
// 🔊 Auto Instruction
// ==========================
window.onload = function () {
    speak("Hold and speak. Say start camera or location");
};