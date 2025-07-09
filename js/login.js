document.addEventListener('DOMContentLoaded', () => {
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        signupContainer.classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // Handle form submissions
    const loginForm = loginContainer.querySelector('form');
    const signupForm = signupContainer.querySelector('form');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // In a real application, you would send the data to a server
        alert('Logged in successfully! (demo)');
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Add validation logic here if needed
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // In a real application, you would send the data to a server
        alert('Account created successfully! (demo)');
    });
});