let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let currentFilter = 'none';
let faceDetectionInterval;
let stream = null;
let isMirrored = false; // Track mirror state
let isGrayscale = false; // Track grayscale state
let isThermal = false; // Track thermal state

// Initialize the start button
const startButton = document.getElementById('startCamera');
updateButtonState();

// Function to update button state based on actual video stream
function updateButtonState() {
    const isStreamActive = stream && stream.active;
    startButton.textContent = isStreamActive ? 'Stop Camera' : 'Start Camera';
    startButton.classList.toggle('camera-on', isStreamActive);
    
    // Update controls visibility
    const controls = document.querySelector('.controls');
    controls.classList.toggle('camera-off', !isStreamActive);
}

// Start/Stop camera function
async function toggleCamera() {
    try {
        if (!stream || !stream.active) {
            // Start camera
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: "user"
                } 
            });
            
            video.srcObject = stream;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    resolve();
                };
            });

            startFaceDetection();
        } else {
            // Stop camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            if (faceDetectionInterval) {
                clearInterval(faceDetectionInterval);
                faceDetectionInterval = null;
            }
            video.srcObject = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Update button state after any changes
        updateButtonState();
    } catch (err) {
        console.error('Error:', err);
        alert('Could not access the camera. Please make sure you have granted camera permissions and that your camera is working properly.');
        updateButtonState();
    }
}

// Apply black and white filter
function applyGrayscale() {
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply thermal filter
function applyThermal() {
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to thermal colors
    for (let i = 0; i < data.length; i += 4) {
        // Calculate brightness/intensity
        const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Map intensity to thermal colors
        if (intensity > 220) {
            // White (hottest)
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
        } else if (intensity > 180) {
            // Yellow
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 0;
        } else if (intensity > 140) {
            // Orange
            data[i] = 255;
            data[i + 1] = 165;
            data[i + 2] = 0;
        } else if (intensity > 100) {
            // Red
            data[i] = 255;
            data[i + 1] = 0;
            data[i + 2] = 0;
        } else if (intensity > 60) {
            // Purple
            data[i] = 128;
            data[i + 1] = 0;
            data[i + 2] = 128;
        } else {
            // Blue (coldest)
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 255;
        }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// Apply mirror filter
function applyMirror() {
    // Save the current context state
    ctx.save();
    
    if (isMirrored) {
        // Flip the context horizontally
        ctx.scale(-1, 1);
        // Move the context back into view
        ctx.translate(-canvas.width, 0);
    }
    
    // Draw the video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Restore the context state
    ctx.restore();
}

// Start face detection
function startFaceDetection() {
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
    }

    faceDetectionInterval = setInterval(() => {
        try {
            // Save the current context state
            ctx.save();
            
            // Apply mirror transformation if needed
            if (isMirrored) {
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
            }
            
            // Draw the video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Apply other filters if needed
            if (isGrayscale) {
                applyGrayscale();
            } else if (isThermal) {
                applyThermal();
            }
            
            // Restore the context state
            ctx.restore();
        } catch (err) {
            console.error('Error applying filter:', err);
        }
    }, 100);
}

// Simple orientation change handler
window.addEventListener('orientationchange', () => {
    // Force reload after a short delay
    setTimeout(() => {
        window.location.reload();
    }, 50);
});

// Also listen for resize events which sometimes accompany orientation changes
window.addEventListener('resize', () => {
    // Force reload after a short delay
    setTimeout(() => {
        window.location.reload();
    }, 50);
});

// Event listeners
document.getElementById('startCamera').addEventListener('click', toggleCamera);

document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (button.dataset.filter === 'mirror') {
            // Toggle mirror state
            isMirrored = !isMirrored;
            console.log('Mirror state:', isMirrored ? 'mirrored' : 'normal');
        } else if (button.dataset.filter === 'grayscale') {
            // Reset thermal state when switching to grayscale
            isThermal = false;
            // Toggle grayscale state
            isGrayscale = !isGrayscale;
            currentFilter = isGrayscale ? 'grayscale' : 'none';
            console.log('Grayscale state:', isGrayscale ? 'on' : 'off');
        } else if (button.dataset.filter === 'thermal') {
            // Reset grayscale state when switching to thermal
            isGrayscale = false;
            // Toggle thermal state
            isThermal = !isThermal;
            currentFilter = isThermal ? 'thermal' : 'none';
            console.log('Thermal state:', isThermal ? 'on' : 'off');
        } else if (button.dataset.filter === 'none') {
            // Reset all states when No Filter is selected
            isMirrored = false;
            isGrayscale = false;
            isThermal = false;
            currentFilter = 'none';
        } else {
            // Don't reset states when switching to other filters
            currentFilter = button.dataset.filter;
        }
        console.log('Filter changed to:', currentFilter);
    });
}); 