// =======================================================
// ⚠️ IMPORTANT: Replace with your actual Supabase keys ⚠️
// =======================================================
const SUPABASE_URL = 'https://etsdmkuabdxuhbpqrlqj.supabase.co'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE URL SUPABASE ICI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2Rta3VhYmR4dWhicHFybHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODM1MDcsImV4cCI6MjA2NTc1OTUwN30.ePtphegvMJppdXdIVlk383q-Rz7rcOQoKFolRwcPPdM'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE CLÉ ANONYME SUPABASE ICI

let supabaseClient;
// =======================================================

// Références aux éléments HTML
const reservationsTableBody = document.getElementById('reservationsTableBody');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const loadingReservations = document.getElementById('loadingReservations');
const loadingVehicles = document.getElementById('loadingVehicles');
const filterDateInput = document.getElementById('filterDate');
const filterStatusSelect = document.getElementById('filterStatus');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const totalConfirmedRevenueSpan = document.getElementById('totalConfirmedRevenue');
const printReportBtn = document.getElementById('printReportBtn');

// Modale véhicule
const vehicleModal = document.getElementById('vehicleModal');
const modalTitle = document.getElementById('modalTitle');
const vehicleForm = document.getElementById('vehicleForm');
const vehicleIdInput = document.getElementById('vehicleId');
const brandInput = document.getElementById('brand');
const modelInput = document.getElementById('model');
const licensePlateInput = document.getElementById('licensePlate');
const typeInput = document.getElementById('type');
const dailyPriceInput = document.getElementById('dailyPrice');
const statusInput = document.getElementById('status');
const closeButton = document.querySelector('.close-button');
const addVehicleBtn = document.getElementById('addVehicleBtn');

let allVehiclesData = []; // Pour stocker les données des véhicules et leurs prix

// --- Fonctions utilitaires ---
function showLoading(element) {
    element.style.display = 'block';
}

function hideLoading(element) {
    element.style.display = 'none';
}

function displayMessage(container, message, type = 'info') {
    container.innerHTML = `<div class="message <span class="math-inline">\{type\}"\></span>{message}</div>`;
}

// Fonction pour calculer la durée en jours (Correction appliquée ici)
function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Correction: retiré le +1
    return diffDays;
}

// --- Fonctions de chargement des données ---

async function fetchVehicles() {
    showLoading(loadingVehicles);
    try {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .select('*');
        if (error) throw error;
        allVehiclesData = data; // Stocke les véhicules pour lookup rapide
        renderVehicles(data);
    } catch (error) {
        console.error('Error fetching vehicles:', error.message);
        // Note: 'vehicleList' might not exist, ensure you have a container for messages or use a general one
        displayMessage(vehiclesTableBody.parentNode, `Erreur lors du chargement des véhicules: ${error.message}`, 'error');
    } finally {
        hideLoading(loadingVehicles);
    }
}

async function fetchRentals() {
    showLoading(loadingReservations);
    try {
        let query = supabaseClient.from('rentals').select('*');

        const filterDate = filterDateInput.value;
        if (filterDate) {
            query = query.or(`start_date.lte.<span class="math-inline">\{filterDate\},end\_date\.gte\.</span>{filterDate}`);
        }

        const filterStatus = filterStatusSelect.value;
        if (filterStatus) {
            query = query.eq('booking_status', filterStatus);
        }

        const { data, error } = await query.order('start_date', { ascending: false });
        if (error) throw error;
        renderReservations(data);
    } catch (error) {
        console.error('Error fetching rentals:', error.message);
        // Note: 'reservationList' might not exist, ensure you have a container for messages or use a general one
        displayMessage(reservationsTableBody.parentNode, `Erreur lors du chargement des réservations: ${error.message}`, 'error');
    } finally {
        hideLoading(loadingReservations);
    }
}

// --- Fonctions de rendu ---

function renderVehicles(vehicles) {
    vehiclesTableBody.innerHTML = '';
    if (vehicles.length === 0) {
        vehiclesTableBody.innerHTML = '<tr><td colspan="8">Aucun véhicule enregistré.</td></tr>';
        return;
    }
    vehicles.forEach(vehicle => {
        const row = vehiclesTableBody.insertRow();
        row.insertCell().textContent = vehicle.id;
        row.insertCell().textContent = vehicle.brand;
        row.insertCell().textContent = vehicle.model;
        row.insertCell().textContent = vehicle.license_plate;
        row.insertCell().textContent = vehicle.type;
        row.insertCell().textContent = `${vehicle.daily_price} DA`;
        row.insertCell().textContent = vehicle.status;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="edit-btn" data-id="<span class="math-inline">\{vehicle\.id\}"\><i class\="fas fa\-edit"\></i\> Modifier</button\>
<button class\="delete\-btn" data\-id\="</span>{vehicle.id}"><i class="fas fa-trash"></i> Supprimer</button>
        `;
    });
    addVehicleEventListeners();
}


async function renderReservations(rentals) {
    reservationsTableBody.innerHTML = '';
    let totalConfirmedRevenue = 0;

    if (rentals.length === 0) {
        reservationsTableBody.innerHTML = '<tr><td colspan="10">Aucune réservation trouvée.</td></tr>';
        totalConfirmedRevenueSpan.textContent = `0 DA`;
        return;
    }

    // Récupérer tous les véhicules une seule fois pour optimiser
    if (allVehiclesData.length === 0) {
        // Tente de charger les véhicules si ce n'est pas déjà fait
        await fetchVehicles();
        // Si après fetchVehicles, il n'y a toujours pas de données de véhicules, on ne peut pas calculer les prix
        if (allVehiclesData.length === 0) {
             console.warn('Aucune donnée de véhicule disponible pour calculer les prix des réservations.');
             // Vous pouvez ajouter un message à l'utilisateur ici si nécessaire
        }
    }

    rentals.forEach(rental => {
        const row = reservationsTableBody.insertRow();
        const vehicle = allVehiclesData.find(v => v.id === rental.vehicle_id);
        const duration = calculateDuration(rental.start_date, rental.end_date);
        let totalPrice = 'N/A';
        let vehicleDisplay = 'Inconnu';

        if (vehicle) {
            totalPrice = `${(vehicle.daily_price * duration).toFixed(2)} DA`; // Format à 2 décimales
            vehicleDisplay = `${vehicle.brand} <span class="math-inline">\{vehicle\.model\} \(</span>{vehicle.license_plate})`;
        } else {
            totalPrice = 'Véhicule introuvable';
        }

        row.insertCell().textContent = rental.id;
        row.insertCell().textContent = vehicleDisplay;
        row.insertCell().textContent = rental.client_name;
        row.insertCell().textContent = rental.client_email;
        row.insertCell().textContent = rental.start_date;
        row.insertCell().textContent = rental.end_date;
        row.insertCell().textContent = `${duration} jours`;
        row.insertCell().textContent = totalPrice; // Prix total de la réservation
        row.insertCell().textContent = rental.booking_status;

        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <select class="status-select" data-id="${rental.id}">
                <option value="pending_confirmation" ${rental.booking_status === 'pending_confirmation' ? 'selected' : ''}>En attente</option>
                <option value="confirmed" ${rental.booking_status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                <option value="canceled" ${rental.booking_status === 'canceled' ? 'selected' : ''}>Annulée</option>
                <option value="completed" <span class="math-inline">\{rental\.booking\_status \=\=\= 'completed' ? 'selected' \: ''\}\>Terminée</option\>
</select\>
<button class\="delete\-rental\-btn" data\-id\="</span>{rental.id}"><i class="fas fa-trash"></i> Supprimer</button>
        `;

        // Calcul du revenu total
        if ((rental.booking_status === 'confirmed' || rental.booking_status === 'completed') && vehicle) {
            totalConfirmedRevenue += (vehicle.daily_price * duration);
        }
    });

    totalConfirmedRevenueSpan.textContent = `${totalConfirmedRevenue.toFixed(2)} DA`;
    addReservationEventListeners();
}


// --- Événements et Logique (Ajout/Edition/Suppression) ---

function addReservationEventListeners() {
    document.querySelectorAll('.status-select').forEach(select => {
        select.onchange = (e) => updateBookingStatus(e.target.dataset.id, e.target.value);
    });
    document.querySelectorAll('.delete-rental-btn').forEach(button => {
        button.onclick = (e) => deleteRental(e.target.dataset.id);
    });
}

function addVehicleEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (e) => editVehicle(e.target.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => deleteVehicle(e.target.dataset.id);
    });
}

// Update Booking Status (Mise à jour avec confirmation visuelle directe)
async function updateBookingStatus(rentalId, newStatus) {
    if (confirm(`Voulez-vous vraiment changer le statut de la réservation <span class="math-inline">\{rentalId\} à "</span>{newStatus}" ?`)) {
        try {
            const { data, error } = await supabaseClient
                .from('rentals')
                .update({ booking_status: newStatus })
                .eq('id', rentalId)
                .select(); // Ajout de .select() pour retourner les données mises à jour

            if (error) throw error;

            if (data && data.length > 0) {
                alert('Statut de la réservation mis à jour avec succès !');
                // Trouver la ligne affectée et mettre à jour son select visuellement
                const selectElement = reservationsTableBody.querySelector(`.status-select[data-id="${rentalId}"]`);
                if (selectElement) {
                    selectElement.value = newStatus;
                    // Mettre à jour le texte directement dans la cellule pour les cas où le select est remplacé par du texte
                    const statusCell = selectElement.closest('td');
                    if (statusCell) {
                        statusCell.textContent = newStatus;
                        // On doit recréer le select car textContent le supprime
                        const newSelect = document.createElement('select');
                        newSelect.className = 'status-select';
                        newSelect.dataset.id = rentalId;
                        newSelect.innerHTML = `
                            <option value="pending_confirmation" ${newStatus === 'pending_confirmation' ? 'selected' : ''}>En attente</option>
                            <option value="confirmed" ${newStatus === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                            <option value="canceled" ${newStatus === 'canceled' ? 'selected' : ''}>Annulée</option>
                            <option value="completed" ${newStatus === 'completed' ? 'selected' : ''}>Terminée</option>
                        `;
                        statusCell.innerHTML = ''; // Vide l'ancien texte
                        statusCell.appendChild(newSelect); // Ajoute le nouveau select
                        // Réattacher l'event listener au nouveau select
                        newSelect.onchange = (e) => updateBookingStatus(e.target.dataset.id, e.target.value);
                    }
                }
                // Recharger toutes les réservations pour recalculer le revenu total et rafraîchir complètement
                fetchRentals();
            } else {
                alert('Mise à jour du statut : aucune modification appliquée ou donnée non trouvée.');
            }
        } catch (error) {
            console.error('Error updating booking status:', error.message);
            alert(`Échec de la mise à jour du statut: ${error.message}`);
        }
    }
}


// Delete Rental
async function deleteRental(rentalId) {
    if (confirm(`Voulez-vous vraiment supprimer la réservation ${rentalId} ? Cette action est irréversible.`)) {
        try {
            const { error } = await supabaseClient
                .from('rentals')
                .delete()
                .eq('id', rentalId);
            if (error) throw error;
            alert('Réservation supprimée !');
            fetchRentals(); // Recharger les réservations
        } catch (error) {
            console.error('Error deleting rental:', error.message);
            alert(`Échec de la suppression: ${error.message}`);
        }
    }
}

// CRUD Véhicule (Ajout/Édition/Suppression)
addVehicleBtn.onclick = () => {
    modalTitle.textContent = 'Ajouter un nouveau véhicule';
    vehicleForm.reset();