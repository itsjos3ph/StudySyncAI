document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const customTimeInput = document.getElementById('customTime');
    const studyBalanceDisplay = document.getElementById('study-balance');
    const resetTotalBtn = document.getElementById('reset-total-btn');
    const breakSection = document.querySelector('.break-section');
    const creditsDisplay = document.getElementById('credits');
    const creditsProfileDisplay = document.getElementById('credits-display');
    const playMinesweeperBtn = document.getElementById('play-minesweeper');
    const breakPopout = document.getElementById('break-popout');

    let defaultTime = parseInt(timerDisplay.textContent.split(':')[0]) || 25;
    let timeLeft = defaultTime * 60 * 1000; // Convert to milliseconds
    let startTime = null;
    let timerId = null;
    let sessionElapsedTime = 0; // Time spent in current session in milliseconds

    function updateDisplay() {
        if (!timerId) return;
        const now = performance.now();
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        timeLeft = Math.max(0, (defaultTime * 60 * 1000) - elapsed);
        sessionElapsedTime = elapsed;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const timeStr = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        timerDisplay.textContent = timeStr;
        document.title = `StudySync AI - ${timeStr}`;
        if (timeLeft <= 0) {
            cancelAnimationFrame(timerId);
            timerId = null;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            clearActive();
            breakPopout.classList.remove('hidden');
            breakSection.style.display = 'block';
            sessionElapsedTime = 0;
            sendElapsedTime(elapsed);
        } else {
            timerId = requestAnimationFrame(updateDisplay);
        }
    }

    function updateStudyBalance(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        studyBalanceDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function clearActive() {
        startBtn.classList.remove('active');
        pauseBtn.classList.remove('active');
        resetBtn.classList.remove('active');
    }

    function startTimer() {
        if (!timerId) {
            startTime = null; // Reset start time
            defaultTime = parseInt(customTimeInput.value) || defaultTime; // Update default if changed
            timeLeft = defaultTime * 60 * 1000;
            timerId = requestAnimationFrame(updateDisplay);
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            clearActive();
            startBtn.classList.add('active');
            breakSection.style.display = 'none';
        }
    }

    function pauseTimer() {
        if (timerId) {
            cancelAnimationFrame(timerId);
            timerId = null;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            clearActive();
            pauseBtn.classList.add('active');
            sendElapsedTime(sessionElapsedTime);
        }
    }

    function resetTimer() {
        if (timerId) {
            cancelAnimationFrame(timerId);
            timerId = null;
        }
        defaultTime = parseInt(customTimeInput.value) || defaultTime;
        timeLeft = defaultTime * 60 * 1000;
        sessionElapsedTime = 0;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        document.title = `StudySync AI - ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        clearActive();
        resetBtn.classList.add('active');
        setTimeout(() => resetBtn.classList.remove('active'), 200);
        breakSection.style.display = 'none';
    }

    function sendElapsedTime(increment) {
        fetch('/update_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_time: Math.floor(increment / 1000) }) // Convert to seconds
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateStudyBalance(data.study_balance);
                creditsDisplay.textContent = data.credits;
                creditsProfileDisplay.textContent = data.credits;
            }
        })
        .catch(error => console.error('Error updating study time:', error));
    }

    function resetStudyTime() {
        fetch('/reset_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateStudyBalance(0);
                creditsDisplay.textContent = 0;
                creditsProfileDisplay.textContent = 0;
            }
        })
        .catch(error => console.error('Error resetting study time:', error));
    }

    function spendCredits() {
        fetch('/spend_credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credits: 1 })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                creditsDisplay.textContent = data.credits;
                creditsProfileDisplay.textContent = data.credits;
                window.location.href = '/break';
            } else {
                alert(data.message);
            }
        });
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    resetTotalBtn.addEventListener('click', resetStudyTime);
    playMinesweeperBtn.addEventListener('click', spendCredits);

    const initialMinutes = parseInt(timerDisplay.textContent.split(':')[0]);
    timeLeft = initialMinutes * 60 * 1000;
    updateStudyBalance(parseInt(studyBalanceDisplay.textContent.split(':').reduce((acc, time) => (60 * acc) + parseInt(time))));
});