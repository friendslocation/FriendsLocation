// =======================================================
// ⚠️ IMPORTANT: Replace with your actual Supabase keys ⚠️
// =======================================================
const SUPABASE_URL = 'https://etsdmkuabdxuhbpqrlqj.supabase.co'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE URL SUPABASE ICI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2Rta3VhYmR4dWhicHFybHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODM1MDcsImV4cCI6MjA2NTc1OTUwN30.ePtphegvMJppdXdIVlk383q-Rz7rcOQoKFolRwcPPdM'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE CLÉ ANONYME SUPABASE ICI

let supabaseClient;
// =======================================================

// Get references to our HTML elements
const checkDateInput = document.getElementById('checkDate');
const checkAvailabilityBtn = document.getElementById('checkAvailabilityBtn');
const vehicleResultsContainer = document.getElementById('vehicleResults');
const loadingIndicator = document.getElementById('loadingIndicator');

// Modal related elements
const bookingModal = document.getElementById('bookingModal');
const modalVehicleDetails = document.getElementById('modalVehicleDetails');
const bookingForm = document.getElementById('bookingForm');
const clientNameInput = document.getElementById('clientName');
const clientEmailInput = document.getElementById('clientEmail');
const rentalStartDateInput = document.getElementById('rentalStartDate');
const rentalEndDateInput = document.getElementById('rentalEndDate');

let selectedVehicleId = null; // To store the ID of the vehicle being booked

// --- Utility Functions ---

function showLoading() {
    loadingIndicator.style.display = 'block';
    vehicleResultsContainer.innerHTML = ''; // Clear previous results
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function displayMessage(container, message, type = 'info') {
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
}

// Function to render vehicle cards
function renderVehicleCards(vehicles, statusType) {
    if (vehicles.length === 0) {
        let message = `No ${statusType} vehicles for this date.`;
        if (statusType === 'available') message = `Aucun véhicule disponible pour cette date.`;
        else if (statusType === 'reserved') message = `Aucun véhicule réservé pour cette date.`;
        else if (statusType === 'rented') message = `Aucun véhicule loué pour cette date.`;

        return `<div class="no-vehicles-message ${statusType}">${message}</div>`;
    }

    return vehicles.map(vehicle => `
        <div class="vehicle-card ${statusType}">
            <div class="vehicle-header">
                <h3>${vehicle.brand} ${vehicle.model}</h3>
                <span class="license-plate">${vehicle.license_plate}</span>
            </div>
            <div class="vehicle-details">
                <p>Type: ${vehicle.type}</p>
                ${statusType === 'available' ? `<p>Prix Journalier: ${vehicle.daily_price} DA</p>` : ''}
            </div>
            <div class="vehicle-status">
                ${statusType === 'available' ? '<i class="fas fa-check-circle available-icon"></i> Disponible' : ''}
                ${statusType === 'reserved' ? '<i class="fas fa-hourglass-half reserved-icon"></i> Réservé' : ''}
                ${statusType === 'rented' ? '<i class="fas fa-times-circle rented-icon"></i> Loué/Indisponible' : ''}
            </div>
            ${statusType === 'available' ? `<button class="booking-button" onclick="showBookingModal('${vehicle.id}', '${vehicle.brand}', '${vehicle.model}', '${vehicle.license_plate}')">Réserver ce véhicule</button>` : ''}
        </div>
    `).join('');
}

// --- Test Data Insertion Functions (unchanged, but now works with new status) ---

async function addTestVehiclesIfEmpty() {
    try {
        const { data: vehicles, error } = await supabaseClient
            .from('vehicles')
            .select('id');

        if (error) throw error;

        if (vehicles.length === 0) {
            console.log("Adding test vehicles...");
            const { error: insertError } = await supabaseClient
                .from('vehicles')
                .insert([
                    { brand: 'Renault', model: 'Clio', license_plate: 'AA-123-BB', type: 'Citadine', daily_price: 30, status: 'available' },
                    { brand: 'Peugeot', model: '308', license_plate: 'CC-456-DD', type: 'Compacte', daily_price: 40, status: 'available' },
                    { brand: 'Dacia', model: 'Duster', license_plate: 'EE-789-FF', type: 'SUV', daily_price: 50, status: 'available' },
                    { brand: 'Volkswagen', model: 'Golf', license_plate: 'GG-101-HH', type: 'Compacte', daily_price: 45, status: 'available' }
                ]);
            if (insertError) throw insertError;
            console.log("Test vehicles added successfully!");
        } else {
            console.log("Vehicles already exist in the database.");
        }
    } catch (error) {
        console.error('Error adding test vehicles:', error.message);
    }
}

async function addTestRentalsIfEmpty() {
    try {
        const { data: rentals, error } = await supabaseClient
            .from('rentals')
            .select('id');

        if (error) throw error;

        if (rentals.length === 0) {
            console.log("Adding test rentals...");

            const { data: vehicles, error: vehicleError } = await supabaseClient
                .from('vehicles')
                .select('id, license_plate')
                .limit(2); // Get two vehicle IDs for test rentals

            if (vehicleError) throw vehicleError;
            if (!vehicles || vehicles.length === 0) {
                console.warn("No vehicles found to add test rental. Please add vehicles first.");
                return;
            }
            // Use specific vehicles if possible, or just the first two found
            const vehicle1Id = vehicles[0] ? vehicles[0].id : null;
            const vehicle2Id = vehicles[1] ? vehicles[1].id : null;


            const rentalsToInsert = [];
            if (vehicle1Id) {
                rentalsToInsert.push({ vehicle_id: vehicle1Id, client_name: 'Client Test Confirmed', client_email: 'test1@example.com', start_date: '2025-07-01', end_date: '2025-07-05', booking_status: 'confirmed' });
            }
            if (vehicle2Id) {
                 // Example: a vehicle that will be "reserved" for a future date
                rentalsToInsert.push({ vehicle_id: vehicle2Id, client_name: 'Client Test Reserved', client_email: 'test2@example.com', start_date: '2025-07-20', end_date: '2025-07-22', booking_status: 'pending_confirmation' });
            }

            if (rentalsToInsert.length > 0) {
                const { error: insertError } = await supabaseClient
                    .from('rentals')
                    .insert(rentalsToInsert);
                if (insertError) throw insertError;
                console.log("Test rentals added successfully!");
            } else {
                console.log("No vehicles available to add test rentals.");
            }

        } else {
            console.log("Rentals already exist in the database.");
        }
    } catch (error) {
        console.error('Error adding test rentals:', error.message);
    }
}


// --- Main Availability Check Function (MODIFIED) ---
async function checkAvailability() {
    showLoading();
    const checkDate = checkDateInput.value;

    if (!checkDate) {
        hideLoading();
        displayMessage(vehicleResultsContainer, 'Veuillez sélectionner une date.', 'warning');
        return;
    }

    try {
        // 1. Fetch all vehicles
        const { data: allVehicles, error: vehiclesError } = await supabaseClient
            .from('vehicles')
            .select('*');

        if (vehiclesError) throw vehiclesError;
        if (!allVehicles || allVehicles.length === 0) {
            hideLoading();
            displayMessage(vehicleResultsContainer, 'Aucun véhicule enregistré dans la base de données.', 'info');
            return;
        }

        // 2. Fetch all rentals that overlap with the selected date, including booking_status
        const { data: overlappingRentals, error: rentalsError } = await supabaseClient
            .from('rentals')
            .select('vehicle_id, booking_status') // Select booking_status as well
            .or(`and(start_date.lte.${checkDate},end_date.gte.${checkDate})`);

        if (rentalsError) throw rentalsError;

        // Create Maps for quick lookup based on booking status
        const confirmedRentedVehicleIds = new Set();
        const pendingReservedVehicleIds = new Set();

        overlappingRentals.forEach(rental => {
            if (rental.booking_status === 'confirmed') {
                confirmedRentedVehicleIds.add(rental.vehicle_id);
            } else if (rental.booking_status === 'pending_confirmation') {
                pendingReservedVehicleIds.add(rental.vehicle_id);
            }
        });

        // Filter vehicles into available, reserved, and rented/unavailable
        const available = [];
        const reserved = [];
        const rentedOrUnavailable = []; // This will include both 'rented' by booking AND vehicles with status != 'available'

        allVehicles.forEach(vehicle => {
            if (confirmedRentedVehicleIds.has(vehicle.id)) {
                rentedOrUnavailable.push(vehicle);
            } else if (pendingReservedVehicleIds.has(vehicle.id)) {
                reserved.push(vehicle);
            } else if (vehicle.status === 'available') { // Only add to available if its general status is 'available' and not booked
                available.push(vehicle);
            } else { // Vehicles that are not available for general reasons (e.g., 'maintenance')
                rentedOrUnavailable.push(vehicle);
            }
        });


        // Display results using the new card rendering
        let resultsHtml = '';
        if (available.length > 0) {
            resultsHtml += `<h2 class="available-header">Véhicules Disponibles (${available.length})</h2>`;
            resultsHtml += `<div class="vehicle-grid">${renderVehicleCards(available, 'available')}</div>`;
        } else {
            resultsHtml += `<h2 class="available-header">Véhicules Disponibles (0)</h2>`;
            resultsHtml += renderVehicleCards([], 'available');
        }

        if (reserved.length > 0) {
            resultsHtml += `<h2 class="reserved-header">Véhicules Réservés (${reserved.length})</h2>`;
            resultsHtml += `<div class="vehicle-grid">${renderVehicleCards(reserved, 'reserved')}</div>`;
        } else {
            resultsHtml += `<h2 class="reserved-header">Véhicules Réservés (0)</h2>`;
            resultsHtml += renderVehicleCards([], 'reserved');
        }

        if (rentedOrUnavailable.length > 0) {
            resultsHtml += `<h2 class="rented-header">Véhicules Loués / Indisponibles (${rentedOrUnavailable.length})</h2>`;
            resultsHtml += `<div class="vehicle-grid">${renderVehicleCards(rentedOrUnavailable, 'rented')}</div>`;
        } else {
            resultsHtml += `<h2 class="rented-header">Véhicules Loués / Indisponibles (0)</h2>`;
            resultsHtml += renderVehicleCards([], 'rented');
        }

        vehicleResultsContainer.innerHTML = resultsHtml;

    } catch (error) {
        console.error('Error checking availability:', error.message);
        displayMessage(vehicleResultsContainer, `Erreur: ${error.message}. Vérifiez la console pour plus de détails.`, 'error');
    } finally {
        hideLoading();
    }
}

// --- Modal Functions (NEW) ---

// Displays the booking modal
function showBookingModal(vehicleId, brand, model, licensePlate) {
    selectedVehicleId = vehicleId; // Store the ID of the vehicle being booked

    // Populate modal with vehicle details
    modalVehicleDetails.innerHTML = `
        <p>Véhicule: <span>${brand} ${model}</span></p>
        <p>Plaque d'immatriculation: <span>${licensePlate}</span></p>
    `;

    // Pre-fill dates in the form with the current selected date from checkDateInput
    rentalStartDateInput.value = checkDateInput.value;
    rentalEndDateInput.value = checkDateInput.value;

    bookingModal.style.display = 'flex'; // Show the modal
}

// Closes the booking modal
function closeBookingModal() {
    bookingModal.style.display = 'none';
    bookingForm.reset(); // Clear the form fields
    selectedVehicleId = null; // Clear the selected vehicle
}

// Submits the booking form (NEW)
async function submitBooking(event) {
    event.preventDefault(); // Prevent default form submission

    if (!selectedVehicleId) {
        alert("Aucun véhicule sélectionné pour la réservation.");
        return;
    }

    const clientName = clientNameInput.value;
    const clientEmail = clientEmailInput.value; // Get client email
    const rentalStartDate = rentalStartDateInput.value;
    const rentalEndDate = rentalEndDateInput.value;

    if (!clientName || !clientEmail || !rentalStartDate || !rentalEndDate) {
        alert("Veuillez remplir tous les champs du formulaire.");
        return;
    }

    if (new Date(rentalStartDate) > new Date(rentalEndDate)) {
        alert("La date de début ne peut pas être postérieure à la date de fin.");
        return;
    }

    showLoading(); // Show loading indicator during booking submission

    try {
        const { data, error } = await supabaseClient
            .from('rentals')
            .insert([
                {
                    vehicle_id: selectedVehicleId,
                    client_name: clientName,
                    client_email: clientEmail, // Save client email
                    start_date: rentalStartDate,
                    end_date: rentalEndDate,
                    booking_status: 'pending_confirmation' // New booking starts as 'pending'
                }
            ]);

        if (error) throw error;

        console.log('Réservation ajoutée avec succès:', data);
        alert('Votre réservation a été enregistrée ! Elle est en attente de confirmation.'); // User feedback
        closeBookingModal(); // Close the modal
        checkAvailability(); // Re-check availability to update the display

        // --- PARTIE ENVOI D'EMAIL (À IMPLÉMENTER CÔTÉ SERVEUR) ---
        // Si vous décidez d'implémenter l'envoi d'e-mails via une Supabase Edge Function,
        // ce serait ici que vous feriez l'appel à cette fonction.
        console.log(`Préparer l'envoi d'email à ${clientEmail} pour le véhicule ${selectedVehicleId}. (Cette partie nécessite un serveur externe ou une Edge Function)`);
        // Exemple hypothétique d'appel à une fonction Edge nommée 'send-booking-email':
        /*
        fetch('VOTRE_URL_SUPABASE/functions/v1/send-booking-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` // Si votre fonction le requiert
            },
            body: JSON.stringify({
                vehicleId: selectedVehicleId,
                brand: 'Véhicule Marque', // Vous devrez passer ces infos si la fonction en a besoin
                model: 'Véhicule Modèle',
                clientName,
                clientEmail,
                rentalStartDate,
                rentalEndDate
            })
        })
        .then(response => response.json())
        .then(data => console.log('Email function response:', data))
        .catch(error => console.error('Error calling email function:', error));
        */

    } catch (error) {
        console.error('Erreur lors de la réservation:', error.message);
        alert(`Échec de la réservation: ${error.message}. Veuillez réessayer.`);
    } finally {
        hideLoading();
    }
}

// --- Event Listeners and Initialization ---

// Attach event listener to the check button
checkAvailabilityBtn.addEventListener('click', checkAvailability);

// Attach event listener for form submission
bookingForm.addEventListener('submit', submitBooking);

// Set default date to today
checkDateInput.valueAsDate = new Date();

// This function dynamically loads the Supabase JS SDK and initializes our app.
// It ensures 'supabase.createClient' is available before we try to use it.
async function initializeApp() {
    showLoading();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; // Supabase JS SDK v2

    script.onload = async () => {
        console.log('Supabase JS SDK loaded successfully.');
        // Initialize the Supabase client ONLY after the SDK is loaded
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Then, proceed with adding test data (if tables are empty) and checking availability
        // Vous pouvez commenter ou supprimer ces lignes si vous ne voulez plus de données de test
        // await addTestVehiclesIfEmpty();
        // await addTestRentalsIfEmpty();
        checkAvailability(); // Perform initial check on load
        hideLoading(); // Hide loading after initial check
    };

    script.onerror = () => {
        console.error('Failed to load Supabase JS SDK. Check your internet connection or the script URL.');
        displayMessage(vehicleResultsContainer, 'Échec du chargement des composants. Veuillez vérifier votre connexion Internet.', 'error');
        hideLoading();
    };

    document.head.appendChild(script);
}

// Start the application initialization process
initializeApp();