document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    let timeLeft = 25 * 60; // 25 minutes in seconds
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
        timeLeft = 25 * 60;
        updateDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
});