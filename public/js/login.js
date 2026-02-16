// ==============================
// LOGIN SECURECORP
// ==============================

// Regex sicurezza
const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// Elementi DOM
const btnLogin = document.getElementById("btn_login");
const msg_error_username = document.getElementById("msg_error_username");
const msg_error_password = document.getElementById("msg_error_password");

// ==============================
// VALIDAZIONE
// ==============================
function validateInput(username, password) {

  let isValid = true;

  msg_error_username.textContent = "";
  msg_error_password.textContent = "";

  if (!usernameRegex.test(username)) {
    msg_error_username.textContent =
      "Username non valido (min 3 caratteri, solo lettere, numeri, underscore)";
    isValid = false;
  }

  if (!passwordRegex.test(password)) {
    msg_error_password.textContent =
      "Password deve contenere almeno 8 caratteri, maiuscola, minuscola, numero e simbolo";
    isValid = false;
  }

  return isValid;
}

// ==============================
// LOGIN FUNCTION
// ==============================
async function login(username, password) {

  try {

    btnLogin.disabled = true;
    btnLogin.textContent = "Accesso in corso...";

    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Errore login");
    }

    // 🔐 Salvataggio token
    sessionStorage.setItem("accessToken", data.accessToken);
    sessionStorage.setItem("refreshToken", data.refreshToken);

    // Redirect
    window.location.href = "/dashboard.html";

  } catch (error) {

    alert(error.message);

  } finally {

    btnLogin.disabled = false;
    btnLogin.textContent = "Login";

  }
}

// ==============================
// EVENT LISTENER
// ==============================
btnLogin.addEventListener("click", function () {

  const inputUsername = document.getElementById("input_username").value.trim();
  const inputPassword = document.getElementById("input_password").value.trim();

  if (validateInput(inputUsername, inputPassword)) {
    login(inputUsername, inputPassword);
  }

});