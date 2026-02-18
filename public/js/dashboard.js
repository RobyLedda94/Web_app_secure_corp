const token = sessionStorage.getItem("accessToken");

if (!token) {
    window.location.href = "/index_login.html";
}

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    try {
        const [usersRes, ticketsRes] = await Promise.all([
            fetch("/api/users", {
                headers: { Authorization: "Bearer " + token }
            }),
            fetch("/api/tickets", {
                headers: { Authorization: "Bearer " + token }
            })
        ]);

        if (!usersRes.ok || !ticketsRes.ok) {
            throw new Error("Non autorizzato");
        }

        const users = await usersRes.json();
        const tickets = await ticketsRes.json();

        renderUsers(users);
        renderTickets(tickets);

    } catch (error) {
        console.error(error);
        sessionStorage.clear();
        window.location.href = "/index_login.html";
    }
}

// ==========================
// 👤 UTENTI
// ==========================

function renderUsers(users) {
    const container = document.getElementById("users_container");
    container.innerHTML = "";

    users.forEach(user => {

        const col = document.createElement("div");
        col.className = "col-md-4 mb-3";

        col.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5>${user.username}</h5>
                    <p>Email: ${user.email}</p>
                    <p>Ruolo: ${user.role}</p>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// ==========================
// 🎫 TICKET
// ==========================

function renderTickets(tickets) {
    const container = document.getElementById("tickets_container");
    container.innerHTML = "";

    tickets.forEach(ticket => {

        const col = document.createElement("div");
        col.className = "col-md-4 mb-3";

        col.innerHTML = `
            <div class="card border-primary shadow-sm">
                <div class="card-body">
                    <h5>${ticket.title}</h5>
                    <p>${ticket.description}</p>
                    <p>Status: ${ticket.status}</p>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}
