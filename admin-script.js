// =======================================================
// ⚠️ IMPORTANT: Replace with your actual Supabase keys ⚠️
// =======================================================
const SUPABASE_URL = 'https://etsdmkuabdxuhbpqrlqj.supabase.co'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE URL SUPABASE ICI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2Rta3VhYmR4dWhicHFybHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODM1MDcsImV4cCI6MjA2NTc1OTUwN30.ePtphegvMJppdXdIVlk383q-Rz7rcOQoKFolRwcPPdM'; // VÉRIFIEZ ET RÉINSÉREZ VOTRE CLÉ ANONYME SUPABASE ICI

let supabaseClient;
// =======================================================

// Get references to HTML elements
const filterStatusSelect = document.getElementById('filterStatus');
const refreshBookingsBtn = document.getElementById('refreshBookingsBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const bookingsListContainer = document.getElementById('bookingsList');
const initialMessage = document.getElementById('initialMessage');

// Modal elements for actions
const actionModal = document.getElementById('actionModal');
const actionModalTitle = document.getElementById('actionModalTitle');
const actionModalMessage = document.getElementById('actionModalMessage');
const confirmActionButton = document.getElementById('confirmActionButton');

let currentBookingId = null; // Store the ID of the booking currently being actioned

// --- Utility Functions ---

function showLoading() {
    loadingIndicator.style.display = 'flex';
    bookingsListContainer.innerHTML = ''; // Clear previous results
    if (initialMessage) initialMessage.style.display = 'none'; // Hide initial message
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function displayMessage(container, message, type = 'info') {
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
}

// Function to format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Function to render booking cards
function renderBookingCards(bookings) {
    if (bookings.length === 0) {
        displayMessage(bookingsListContainer, 'Aucune réservation trouvée pour ce filtre.', 'info');
        return;
    }

    let bookingsHtml = '';
    bookings.forEach(booking => {
        bookingsHtml += `
            <div class="booking-card" style="border-left-color: var(--${booking.booking_status}-color);">
                <div class="booking-details">
                    <p class="vehicle-info">Véhicule: <strong>${booking.vehicles.brand} ${booking.vehicles.model}</strong> (${booking.vehicles.license_plate})</p>
                    <p>Client: <strong>${booking.client_name}</strong></p>
                    <p>Email: <span>${booking.client_email}</span></p>
                    <p>Du: <strong>${formatDate(booking.start_date)}</strong> Au: <strong>${formatDate(booking.end_date)}</strong></p>
                    <p>Statut: <span class="booking-status-tag ${booking.booking_status}">${getBookingStatusText(booking.booking_status)}</span></p>
                </div>
                <div class="booking-actions">
                    ${booking.booking_status === 'pending_confirmation' ? `
                        <button class="action-button confirm" onclick="showActionModal('${booking.id}', 'confirmed', 'Confirmer la réservation pour ${booking.client_name} (${booking.vehicles.brand} ${booking.vehicles.model}) ?')">
                            <i class="fas fa-check-circle"></i> Confirmer
                        </button>
                        <button class="action-button cancel" onclick="showActionModal('${booking.id}', 'cancelled', 'Annuler la réservation pour ${booking.client_name} (${booking.vehicles.brand} ${booking.vehicles.model}) ?')">
                            <i class="fas fa-times-circle"></i> Annuler
                        </button>
                    ` : ''}
                    ${booking.booking_status === 'confirmed' ? `
                        <button class="action-button cancel" onclick="showActionModal('${booking.id}', 'cancelled', 'Annuler la réservation CONFIRMÉE pour ${booking.client_name} (${booking.vehicles.brand} ${booking.vehicles.model}) ?')">
                            <i class="fas fa-times-circle"></i> Annuler
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    bookingsListContainer.innerHTML = bookingsHtml;
}

function getBookingStatusText(status) {
    switch (status) {
        case 'pending_confirmation': return 'En attente';
        case 'confirmed': return 'Confirmée';
        case 'cancelled': return 'Annulée';
        default: return status;
    }
}

// --- Main Function to Fetch and Display Bookings ---

async function fetchAndRenderBookings() {
    showLoading();
    const selectedStatus = filterStatusSelect.value;

    try {
        let query = supabaseClient
            .from('rentals')
            .select(`
                *,
                vehicles ( brand, model, license_plate ) // Join to get vehicle details
            `)
            .order('start_date', { ascending: false }); // Order by newest first

        if (selectedStatus !== 'all') {
            query = query.eq('booking_status', selectedStatus);
        }

        const { data: bookings, error } = await query;

        if (error) throw error;

        renderBookingCards(bookings);

    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        displayMessage(bookingsListContainer, `Erreur lors du chargement des réservations: ${error.message}.`, 'error');
    } finally {
        hideLoading();
    }
}

// --- Modal and Action Functions (NEW) ---

function showActionModal(bookingId, newStatus, message) {
    currentBookingId = bookingId; // Store for later use
    actionModalTitle.textContent = getBookingStatusText(newStatus) + ' la Réservation'; // Update modal title
    actionModalMessage.textContent = message;

    // Set up the confirm button's action
    confirmActionButton.onclick = () => updateBookingStatus(currentBookingId, newStatus);
    confirmActionButton.textContent = getBookingStatusText(newStatus); // Label for the button

    actionModal.style.display = 'flex'; // Show the modal
}

function closeActionModal() {
    actionModal.style.display = 'none';
    currentBookingId = null;
}

async function updateBookingStatus(bookingId, newStatus) {
    closeActionModal(); // Close modal immediately
    showLoading(); // Show loading indicator

    try {
        const { data, error } = await supabaseClient
            .from('rentals')
            .update({ booking_status: newStatus })
            .eq('id', bookingId);

        if (error) throw error;

        console.log(`Réservation ${bookingId} mise à jour au statut ${newStatus}:`, data);
        alert(`Réservation mise à jour au statut "${getBookingStatusText(newStatus)}" !`);
        fetchAndRenderBookings(); // Re-fetch and re-render bookings

    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error.message);
        alert(`Échec de la mise à jour du statut: ${error.message}`);
    } finally {
        hideLoading();
    }
}


// --- Event Listeners and Initialization ---

// Initialize Supabase client and fetch data on page load
async function initializeApp() {
    showLoading();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; // Supabase JS SDK v2

    script.onload = async () => {
        console.log('Supabase JS SDK loaded successfully.');
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        fetchAndRenderBookings(); // Fetch and display bookings on load
        hideLoading();
    };

    script.onerror = () => {
        console.error('Failed to load Supabase JS SDK. Check your internet connection or the script URL.');
        displayMessage(bookingsListContainer, 'Échec du chargement des composants. Veuillez vérifier votre connexion Internet.', 'error');
        hideLoading();
    };

    document.head.appendChild(script);
}

// Attach event listeners
filterStatusSelect.addEventListener('change', fetchAndRenderBookings);
refreshBookingsBtn.addEventListener('click', fetchAndRenderBookings);

// Initialisation de l'application au chargement de la page
initializeApp();