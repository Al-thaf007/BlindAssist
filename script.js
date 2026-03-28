let stream;
let recognition;
let isListening = false;
let cameraOn = false;

// 🔊 Speak
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(msg);
}

// 📷 Start Camera
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
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

// 🎤 Start Voice (FIXED)
function startVoice() {
    if (isListening) return;

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Command:", command);

        if (command.includes("start camera")) startCamera();
        else if (command.includes("stop camera")) stopCamera();
        else if (command.includes("location")) getLocation();
        else if (command.includes("stop voice")) stopVoice();
        else speak("Command not recognized");
    };

    // 🔥 IMPORTANT: auto-restart mic
    recognition.onend = function () {
        if (isListening) {
            recognition.start();
        }
    };

    recognition.start();
    isListening = true;
    speak("Voice control started");
}

// 🛑 Stop Voice
function stopVoice() {
    if (recognition) {
        isListening = false;
        recognition.stop();
        speak("Voice stopped");
    }
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

// 👆 TOUCH ANYWHERE (FIXED)
document.body.addEventListener("touchstart", function () {
    startVoice();
}, { passive: true });

// 🔊 Auto instruction
window.onload = function () {
    speak("Tap anywhere to start voice control");
};