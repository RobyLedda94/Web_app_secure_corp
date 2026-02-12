// Definizione delle funzioni

// Funzione validazione input

function validate_input(username, password) {
  let isValid = true;

  // Reset messaggi di errore precedenti
  msg_error_username.textContent = '';
  msg_error_password.textContent = '';

  // Controllo username vuoto
  if (username === '' || username.trim().length === 0) {
    msg_error_username.textContent = 'Inserire un valore valido nel campo username';
    isValid = false;
  }

  // Controllo lunghezza minima username (security best practice)
  if (username.length < 3) {
    msg_error_username.textContent = 'Username deve essere almeno 3 caratteri';
    isValid = false;
  }

  // Controllo password vuota
  if (password === '' || password.trim().length === 0) {
    msg_error_password.textContent = 'Inserire un valore valido nel campo password';
    isValid = false;
  }

  // Controllo lunghezza minima password
  if (password.length < 8) {
    msg_error_password.textContent = 'Password deve essere almeno 8 caratteri';
    isValid = false;
  }

  return isValid;
}



// Recupero gli elementi del DOM

let btnLogin = document.getElementById('btn_login');

// Elementi messaggi di errore

let msg_error_username = document.getElementById('msg_error_username'); 
let msg_error_password = document.getElementById('msg_error_password');


const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;


btnLogin.addEventListener('click', function() {
    // Input username
    let inputUsername = document.getElementById('input_username').value;
    // Input password
    let inputPassword = document.getElementById('input_password').value;

    
    // Chiamata alla funzione di validazione
    if (validate_input(inputUsername, inputPassword)) {
        // Se la validazione è positiva, procedo con la logica di login
        console.log('Validazione superata. Procedo con il login...');
        // Qui puoi aggiungere la logica per inviare i dati al server o eseguire altre azioni
    } else {
        console.log('Validazione fallita. Correggi gli errori e riprova.');
    }
    
});