document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const customTimeInput = document.getElementById('customTime');
    const setTimeBtn = document.getElementById('setTimeBtn');

    let timeLeft = 25 * 60; // Default to 25 minutes in seconds
    let timerId = null;

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }

    function startTimer() {
        if (!timerId) {
            timerId = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateDisplay();
                } else {
                    clearInterval(timerId);
                    timerId = null;
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    alert('Pomodoro complete!');
                }
            }, 1000);
            startBtn.disabled = true;
            pauseBtn.disabled = false;
        }
    }

    function pauseTimer() {
        clearInterval(timerId);
        timerId = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function resetTimer() {
        clearInterval(timerId);
        timerId = null;
        timeLeft = parseInt(customTimeInput.value) * 60 || 25 * 60; // Reset to custom time or default to 25 mins
        updateDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    // Function to set the timer based on custom input
    function setCustomTime() {
        clearInterval(timerId); // Stop the timer if it's running
        timeLeft = parseInt(customTimeInput.value) * 60 || 25 * 60; // Set to custom time or default to 25 mins
        updateDisplay();
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    setTimeBtn.addEventListener('click', setCustomTime); // Event listener for setting custom time
    updateDisplay(); // Initial display update
});
