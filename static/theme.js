document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("theme");

    if (currentTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "Light Mode";
        themeToggle.classList.add("active"); // Glow on dark mode start
    } else {
        themeToggle.textContent = "Dark Mode";
        themeToggle.classList.remove("active"); // No glow on light mode start
    }

    themeToggle.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        themeToggle.classList.toggle("active"); // Toggle glow with theme

        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "dark");
            themeToggle.textContent = "Light Mode";
        } else {
            localStorage.setItem("theme", "light");
            themeToggle.textContent = "Dark Mode";
        }
    });
});