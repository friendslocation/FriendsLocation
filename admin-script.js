// =======================================================
// ⚠️ IMPORTANT: Replace with your actual Supabase keys ⚠️
// =======================================================
const SUPABASE_URL = 'https://etsdmkuabdxuhbpqrlqj.supabase.co'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE URL SUPABASE ICI
const SUPABASE_ANON_KEY = '// =======================================================
// ⚠️ IMPORTANT: Replace with your actual Supabase keys ⚠️
// =======================================================
const SUPABASE_URL = 'https://etsdmkuabdxuhbpqrlqj.supabase.co'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE URL SUPABASE ICI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2Rta3VhYmR4dWhicHFybHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODM1MDcsImexb3iIjoiMjA2NTc1OTUwN30.ePtphegvMJppdXdIVlk383q-Rz7rcOQoKFolRwcPPxM'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE CLÉ ANONYME SUPABASE ICI

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
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
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
        displayMessage(vehicleList, `Erreur lors du chargement des véhicules: ${error.message}`, 'error');
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
            query = query.or(`start_date.lte.${filterDate},end_date.gte.${filterDate}`);
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
        displayMessage(reservationList, `Erreur lors du chargement des réservations: ${error.message}`, 'error');
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
            <button class="edit-btn" data-id="${vehicle.id}"><i class="fas fa-edit"></i> Modifier</button>
            <button class="delete-btn" data-id="${vehicle.id}"><i class="fas fa-trash"></i> Supprimer</button>
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
        await fetchVehicles(); // Assure que les véhicules sont chargés si ce n'est pas déjà fait
    }

    rentals.forEach(rental => {
        const row = reservationsTableBody.insertRow();
        const vehicle = allVehiclesData.find(v => v.id === rental.vehicle_id);
        const duration = calculateDuration(rental.start_date, rental.end_date);
        let totalPrice = 'N/A';
        let vehicleDisplay = 'Inconnu';

        if (vehicle) {
            totalPrice = `${(vehicle.daily_price * duration).toFixed(2)} DA`; // Format à 2 décimales
            vehicleDisplay = `${vehicle.brand} ${vehicle.model} (${vehicle.license_plate})`;
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
                <option value="completed" ${rental.booking_status === 'completed' ? 'selected' : ''}>Terminée</option>
            </select>
            <button class="delete-rental-btn" data-id="${rental.id}"><i class="fas fa-trash"></i> Supprimer</button>
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
    if (confirm(`Voulez-vous vraiment changer le statut de la réservation ${rentalId} à "${newStatus}" ?`)) {
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
                        statusCell.appendChild(selectElement); // Remettre le select dedans
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
    vehicleIdInput.value = ''; // Clear ID for new vehicle
    vehicleModal.style.display = 'flex';
};

closeButton.onclick = () => {
    vehicleModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === vehicleModal) {
        vehicleModal.style.display = 'none';
    }
};

vehicleForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = vehicleIdInput.value;
    const vehicleData = {
        brand: brandInput.value,
        model: modelInput.value,
        license_plate: licensePlateInput.value,
        type: typeInput.value,
        daily_price: parseFloat(dailyPriceInput.value),
        status: statusInput.value
    };

    try {
        if (id) {
            // Update existing vehicle
            const { error } = await supabaseClient
                .from('vehicles')
                .update(vehicleData)
                .eq('id', id);
            if (error) throw error;
            alert('Véhicule mis à jour !');
        } else {
            // Add new vehicle
            const { error } = await supabaseClient
                .from('vehicles')
                .insert([vehicleData]);
            if (error) throw error;
            alert('Véhicule ajouté !');
        }
        vehicleModal.style.display = 'none';
        fetchVehicles(); // Reload vehicles
        fetchRentals(); // Reload rentals in case vehicle data affects them
    } catch (error) {
        console.error('Error saving vehicle:', error.message);
        alert(`Échec de l'enregistrement du véhicule: ${error.message}`);
    }
};

async function editVehicle(id) {
    try {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single(); // Get single record
        if (error) throw error;

        modalTitle.textContent = 'Modifier Véhicule';
        vehicleIdInput.value = data.id;
        brandInput.value = data.brand;
        modelInput.value = data.model;
        licensePlateInput.value = data.license_plate;
        typeInput.value = data.type;
        dailyPriceInput.value = data.daily_price;
        statusInput.value = data.status;
        vehicleModal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching vehicle for edit:', error.message);
        alert(`Impossible de charger les détails du véhicule: ${error.message}`);
    }
}

async function deleteVehicle(id) {
    if (confirm(`Voulez-vous vraiment supprimer le véhicule ${id} ? Cette action est irréversible.`)) {
        try {
            // Vérifier s'il y a des réservations actives pour ce véhicule
            const { data: rentals, error: rentalError } = await supabaseClient
                .from('rentals')
                .select('id, booking_status')
                .eq('vehicle_id', id)
                .in('booking_status', ['pending_confirmation', 'confirmed']);

            if (rentalError) throw rentalError;

            if (rentals && rentals.length > 0) {
                alert('Impossible de supprimer ce véhicule. Il a des réservations actives ou en attente.');
                return;
            }

            const { error } = await supabaseClient
                .from('vehicles')
                .delete()
                .eq('id', id);
            if (error) throw error;
            alert('Véhicule supprimé !');
            fetchVehicles(); // Recharger les véhicules
        } catch (error) {
            console.error('Error deleting vehicle:', error.message);
            alert(`Échec de la suppression du véhicule: ${error.message}`);
        }
    }
}

// --- Fonctions de filtrage ---
filterDateInput.onchange = fetchRentals;
filterStatusSelect.onchange = fetchRentals;
resetFiltersBtn.onclick = () => {
    filterDateInput.value = '';
    filterStatusSelect.value = '';
    fetchRentals();
};

// --- Fonction d'impression de rapport ---
printReportBtn.onclick = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Rapport des Réservations Friends Location</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css">');
    printWindow.document.write('<link rel="stylesheet" href="admin-style.css">');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: Arial, sans-serif; margin: 20px; }
        .print-header { text-align: center; margin-bottom: 30px; }
        .print-header h1 { color: #333; }
        .print-section { margin-bottom: 40px; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
        .print-section h2, .print-section h3 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .revenue-summary { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
        /* Masquer les boutons et contrôles de formulaire pour l'impression */
        .filter-controls, .button-group, .actions-cell, .status-select, .delete-rental-btn, .edit-btn, .delete-btn {
            display: none !important;
        }
        /* Ajuster la largeur des colonnes si nécessaire pour l'impression */
        th:nth-child(1), td:nth-child(1) { width: 5%; } /* ID Réservation */
        th:nth-child(2), td:nth-child(2) { width: 20%; } /* Véhicule */
        th:nth-child(3), td:nth-child(3) { width: 15%; } /* Client */
        th:nth-child(4), td:nth-child(4) { width: 15%; } /* Email */
        th:nth-child(5), td:nth-child(5) { width: 8%; } /* Début */
        th:nth-child(6), td:nth-child(6) { width: 8%; } /* Fin */
        th:nth-child(7), td:nth-child(7) { width: 5%; } /* Jours */
        th:nth-child(8), td:nth-child(8) { width: 10%; } /* Prix Total */
        th:nth-child(9), td:nth-child(9) { width: 8%; } /* Statut */
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');

    // Contenu du rapport
    printWindow.document.write('<div class="print-header"><h1>Rapport des Réservations Friends Location</h1></div>');

    // Section Comptabilité
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Résumé des Revenus</h2>`);
    printWindow.document.write(`<div class="revenue-summary">Revenu Total des Locations Terminées/Confirmées : ${totalConfirmedRevenueSpan.textContent}</div>`);
    printWindow.document.write('</div>');

    // Section Réservations
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Détail des Réservations (${reservationsTableBody.children.length} entrées)</h2>`);
    printWindow.document.write('<table>');
    printWindow.document.write('<thead>' + document.querySelector('#reservationList table thead').innerHTML + '</thead>');
    printWindow.document.write('<tbody>' + reservationsTableBody.innerHTML + '</tbody>');
    printWindow.document.write('</table>');
    printWindow.document.write('</div>');

    // Section Véhicules
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Liste des Véhicules (${vehiclesTableBody.children.length} entrées)</h2>`);
    printWindow.document.write('<table>');
    printWindow.document.write('<thead>' + document.querySelector('#vehicleList table thead').innerHTML + '</thead>');
    printWindow.document.write('<tbody>' + vehiclesTableBody.innerHTML + '</tbody>');
    printWindow.document.write('</table>');
    printWindow.document.write('</div>');


    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
};


// --- Initialisation ---
async function initializeAdminApp() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

    script.onload = async () => {
        console.log('Supabase JS SDK loaded successfully.');
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await fetchVehicles(); // Charger les véhicules en premier
        fetchRentals(); // Puis charger les réservations
    };

    script.onerror = () => {
        console.error('Failed to load Supabase JS SDK. Check your internet connection or the script URL.');
        displayMessage(document.body, 'Échec du chargement des composants. Veuillez vérifier votre connexion Internet.', 'error');
    };
    document.head.appendChild(script);
}

initializeAdminApp();'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE CLÉ ANONYME SUPABASE ICI

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
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
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
        displayMessage(vehicleList, `Erreur lors du chargement des véhicules: ${error.message}`, 'error');
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
            query = query.or(`start_date.lte.${filterDate},end_date.gte.${filterDate}`);
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
        displayMessage(reservationList, `Erreur lors du chargement des réservations: ${error.message}`, 'error');
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
            <button class="edit-btn" data-id="${vehicle.id}"><i class="fas fa-edit"></i> Modifier</button>
            <button class="delete-btn" data-id="${vehicle.id}"><i class="fas fa-trash"></i> Supprimer</button>
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
        await fetchVehicles(); // Assure que les véhicules sont chargés si ce n'est pas déjà fait
    }

    rentals.forEach(rental => {
        const row = reservationsTableBody.insertRow();
        const vehicle = allVehiclesData.find(v => v.id === rental.vehicle_id);
        const duration = calculateDuration(rental.start_date, rental.end_date);
        let totalPrice = 'N/A';
        let vehicleDisplay = 'Inconnu';

        if (vehicle) {
            totalPrice = `${(vehicle.daily_price * duration).toFixed(2)} DA`; // Format à 2 décimales
            vehicleDisplay = `${vehicle.brand} ${vehicle.model} (${vehicle.license_plate})`;
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
                <option value="completed" ${rental.booking_status === 'completed' ? 'selected' : ''}>Terminée</option>
            </select>
            <button class="delete-rental-btn" data-id="${rental.id}"><i class="fas fa-trash"></i> Supprimer</button>
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
    if (confirm(`Voulez-vous vraiment changer le statut de la réservation ${rentalId} à "${newStatus}" ?`)) {
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
                        statusCell.appendChild(selectElement); // Remettre le select dedans
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
    vehicleIdInput.value = ''; // Clear ID for new vehicle
    vehicleModal.style.display = 'flex';
};

closeButton.onclick = () => {
    vehicleModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === vehicleModal) {
        vehicleModal.style.display = 'none';
    }
};

vehicleForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = vehicleIdInput.value;
    const vehicleData = {
        brand: brandInput.value,
        model: modelInput.value,
        license_plate: licensePlateInput.value,
        type: typeInput.value,
        daily_price: parseFloat(dailyPriceInput.value),
        status: statusInput.value
    };

    try {
        if (id) {
            // Update existing vehicle
            const { error } = await supabaseClient
                .from('vehicles')
                .update(vehicleData)
                .eq('id', id);
            if (error) throw error;
            alert('Véhicule mis à jour !');
        } else {
            // Add new vehicle
            const { error } = await supabaseClient
                .from('vehicles')
                .insert([vehicleData]);
            if (error) throw error;
            alert('Véhicule ajouté !');
        }
        vehicleModal.style.display = 'none';
        fetchVehicles(); // Reload vehicles
        fetchRentals(); // Reload rentals in case vehicle data affects them
    } catch (error) {
        console.error('Error saving vehicle:', error.message);
        alert(`Échec de l'enregistrement du véhicule: ${error.message}`);
    }
};

async function editVehicle(id) {
    try {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single(); // Get single record
        if (error) throw error;

        modalTitle.textContent = 'Modifier Véhicule';
        vehicleIdInput.value = data.id;
        brandInput.value = data.brand;
        modelInput.value = data.model;
        licensePlateInput.value = data.license_plate;
        typeInput.value = data.type;
        dailyPriceInput.value = data.daily_price;
        statusInput.value = data.status;
        vehicleModal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching vehicle for edit:', error.message);
        alert(`Impossible de charger les détails du véhicule: ${error.message}`);
    }
}

async function deleteVehicle(id) {
    if (confirm(`Voulez-vous vraiment supprimer le véhicule ${id} ? Cette action est irréversible.`)) {
        try {
            // Vérifier s'il y a des réservations actives pour ce véhicule
            const { data: rentals, error: rentalError } = await supabaseClient
                .from('rentals')
                .select('id, booking_status')
                .eq('vehicle_id', id)
                .in('booking_status', ['pending_confirmation', 'confirmed']);

            if (rentalError) throw rentalError;

            if (rentals && rentals.length > 0) {
                alert('Impossible de supprimer ce véhicule. Il a des réservations actives ou en attente.');
                return;
            }

            const { error } = await supabaseClient
                .from('vehicles')
                .delete()
                .eq('id', id);
            if (error) throw error;
            alert('Véhicule supprimé !');
            fetchVehicles(); // Recharger les véhicules
        } catch (error) {
            console.error('Error deleting vehicle:', error.message);
            alert(`Échec de la suppression du véhicule: ${error.message}`);
        }
    }
}

// --- Fonctions de filtrage ---
filterDateInput.onchange = fetchRentals;
filterStatusSelect.onchange = fetchRentals;
resetFiltersBtn.onclick = () => {
    filterDateInput.value = '';
    filterStatusSelect.value = '';
    fetchRentals();
};

// --- Fonction d'impression de rapport ---
printReportBtn.onclick = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Rapport des Réservations Friends Location</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css">');
    printWindow.document.write('<link rel="stylesheet" href="admin-style.css">');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: Arial, sans-serif; margin: 20px; }
        .print-header { text-align: center; margin-bottom: 30px; }
        .print-header h1 { color: #333; }
        .print-section { margin-bottom: 40px; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
        .print-section h2, .print-section h3 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .revenue-summary { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
        /* Masquer les boutons et contrôles de formulaire pour l'impression */
        .filter-controls, .button-group, .actions-cell, .status-select, .delete-rental-btn, .edit-btn, .delete-btn {
            display: none !important;
        }
        /* Ajuster la largeur des colonnes si nécessaire pour l'impression */
        th:nth-child(1), td:nth-child(1) { width: 5%; } /* ID Réservation */
        th:nth-child(2), td:nth-child(2) { width: 20%; } /* Véhicule */
        th:nth-child(3), td:nth-child(3) { width: 15%; } /* Client */
        th:nth-child(4), td:nth-child(4) { width: 15%; } /* Email */
        th:nth-child(5), td:nth-child(5) { width: 8%; } /* Début */
        th:nth-child(6), td:nth-child(6) { width: 8%; } /* Fin */
        th:nth-child(7), td:nth-child(7) { width: 5%; } /* Jours */
        th:nth-child(8), td:nth-child(8) { width: 10%; } /* Prix Total */
        th:nth-child(9), td:nth-child(9) { width: 8%; } /* Statut */
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');

    // Contenu du rapport
    printWindow.document.write('<div class="print-header"><h1>Rapport des Réservations Friends Location</h1></div>');

    // Section Comptabilité
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Résumé des Revenus</h2>`);
    printWindow.document.write(`<div class="revenue-summary">Revenu Total des Locations Terminées/Confirmées : ${totalConfirmedRevenueSpan.textContent}</div>`);
    printWindow.document.write('</div>');

    // Section Réservations
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Détail des Réservations (${reservationsTableBody.children.length} entrées)</h2>`);
    printWindow.document.write('<table>');
    printWindow.document.write('<thead>' + document.querySelector('#reservationList table thead').innerHTML + '</thead>');
    printWindow.document.write('<tbody>' + reservationsTableBody.innerHTML + '</tbody>');
    printWindow.document.write('</table>');
    printWindow.document.write('</div>');

    // Section Véhicules
    printWindow.document.write('<div class="print-section">');
    printWindow.document.write(`<h2>Liste des Véhicules (${vehiclesTableBody.children.length} entrées)</h2>`);
    printWindow.document.write('<table>');
    printWindow.document.write('<thead>' + document.querySelector('#vehicleList table thead').innerHTML + '</thead>');
    printWindow.document.write('<tbody>' + vehiclesTableBody.innerHTML + '</tbody>');
    printWindow.document.write('</table>');
    printWindow.document.write('</div>');


    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
};


// --- Initialisation ---
async function initializeAdminApp() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

    script.onload = async () => {
        console.log('Supabase JS SDK loaded successfully.');
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await fetchVehicles(); // Charger les véhicules en premier
        fetchRentals(); // Puis charger les réservations
    };

    script.onerror = () => {
        console.error('Failed to load Supabase JS SDK. Check your internet connection or the script URL.');
        displayMessage(document.body, 'Échec du chargement des composants. Veuillez vérifier votre connexion Internet.', 'error');
    };
    document.head.appendChild(script);
}

initializeAdminApp();