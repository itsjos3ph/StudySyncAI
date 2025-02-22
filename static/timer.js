document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const customTimeInput = document.getElementById('customTime');
    const setTimeBtn = document.getElementById('setTimeBtn');
    const totalStudyTimeDisplay = document.getElementById('total-study-time');
    const resetTotalBtn = document.getElementById('reset-total-btn');

    let defaultTime = parseInt(timerDisplay.textContent.split(':')[0]) || 25;
    let timeLeft = defaultTime * 60; // Convert to seconds
    let timerId = null;
    let sessionElapsedTime = 0; // Time spent in current session

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }

    function updateTotalStudyTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        totalStudyTimeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
        if (!timerId) {
            timerId = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    sessionElapsedTime++;
                    updateDisplay();
                    sendElapsedTime(1); // Send 1 second at a time
                } else {
                    clearInterval(timerId);
                    timerId = null;
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    alert('Pomodoro complete!');
                    sessionElapsedTime = 0;
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
        timeLeft = parseInt(customTimeInput.value) * 60 || defaultTime * 60;
        sessionElapsedTime = 0;
        updateDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function sendElapsedTime(increment) {
        fetch('/update_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_time: increment })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateTotalStudyTime(data.total_study_time);
            }
        })
        .catch(error => console.error('Error updating study time:', error));
    }

    function resetTotalStudyTime() {
        fetch('/reset_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateTotalStudyTime(0);
            }
        })
        .catch(error => console.error('Error resetting study time:', error));
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    resetTotalBtn.addEventListener('click', resetTotalStudyTime);

    updateDisplay();
    // Set initial total study time from backend
    updateTotalStudyTime(parseInt(totalStudyTimeDisplay.textContent.split(':').reduce((acc, time) => (60 * acc) + parseInt(time))));
});