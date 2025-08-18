class WarehouseDistanceCalculator {
    constructor() {
        this.warehouses = [];
        this.customers = [];
        this.apiKey = '';
        this.distanceMatrix = [];
                this.googleMapsLoaded = false;
                this.distanceMatrixService = null;
        this.map = null;
        this.directionsServices = [];
                this.directionsRenderers = [];
        this.markers = [];
        this.routeColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
        ];
        this.progressModal = null;
        this.isLoading = false;
        this.autocompleteInstances = [];

        this.init();
    }

    init() {
        // Wrap initialization in try-catch to handle any Google Maps related errors gracefully
        try {
            this.loadSavedData();
            this.bindEvents();
            this.updateCalculateButton();
        } catch (error) {
            console.error('Error during initialization:', error);
            // Continue with basic functionality even if some features fail
        }
    }

        loadSavedData() {
        console.log('=== Starting loadSavedData ===');
        this.isLoading = true; // Prevent auto-save during loading

        try {
            // Load API key from localStorage
            const savedApiKey = localStorage.getItem('warehouse_calculator_api_key');
            if (savedApiKey && savedApiKey.trim()) {
                document.getElementById('apiKey').value = savedApiKey;
                this.apiKey = savedApiKey;
                console.log('Loaded saved API key');
                // Auto-load Google Maps API if we have a saved key
                if (savedApiKey.length > 10) {
                    this.loadGoogleMapsAPI();
                }
            }

            // Load preferences
            const savedUnits = localStorage.getItem('warehouse_calculator_units');
            if (savedUnits) {
                document.getElementById('units').value = savedUnits;
            }

            const savedTravelMode = localStorage.getItem('warehouse_calculator_travel_mode');
            if (savedTravelMode) {
                document.getElementById('travelMode').value = savedTravelMode;
            }

            // Load checkboxes
            const avoidHighways = localStorage.getItem('warehouse_calculator_avoid_highways') === 'true';
            document.getElementById('avoidHighways').checked = avoidHighways;

            const avoidTolls = localStorage.getItem('warehouse_calculator_avoid_tolls') === 'true';
            document.getElementById('avoidTolls').checked = avoidTolls;

            const avoidFerries = localStorage.getItem('warehouse_calculator_avoid_ferries') === 'true';
            document.getElementById('avoidFerries').checked = avoidFerries;

            // Debug localStorage contents
            console.log('LocalStorage contents:');
            console.log('- Warehouses:', localStorage.getItem('warehouse_calculator_warehouses'));
            console.log('- Customers:', localStorage.getItem('warehouse_calculator_customers'));

            // Load saved warehouse locations
            try {
                this.loadSavedWarehouses();
            } catch (error) {
                console.error('Error loading warehouses:', error);
                this.showEmptyState('warehousesContainer', 'warehouse');
            }

            // Load saved customer locations
            try {
                this.loadSavedCustomers();
            } catch (error) {
                console.error('Error loading customers:', error);
                this.showEmptyState('customersContainer', 'customer');
            }
        } finally {
            this.isLoading = false; // Re-enable auto-save
            console.log('=== Finished loadSavedData, isLoading set to false ===');

            // If Google Maps is already loaded, setup autocomplete for loaded inputs
            if (this.googleMapsLoaded && typeof google !== 'undefined' && google && google.maps && google.maps.places) {
                setTimeout(() => this.setupAutocompleteForExistingInputs(), 200);
            }
        }
    }

                loadSavedWarehouses() {
        const savedWarehouses = localStorage.getItem('warehouse_calculator_warehouses');
        console.log('Loading warehouses from localStorage:', savedWarehouses);

        const container = document.getElementById('warehousesContainer');

        if (savedWarehouses && savedWarehouses !== 'null' && savedWarehouses !== 'undefined') {
            try {
                const warehouses = JSON.parse(savedWarehouses);
                console.log('Parsed warehouses:', warehouses);

                if (Array.isArray(warehouses) && warehouses.length > 0) {
                    // Clear empty state
                    container.innerHTML = '';

                                        let loadedCount = 0;
                    warehouses.forEach((warehouse, index) => {
                        console.log(`Processing warehouse ${index}:`, warehouse);
                        // Only add if there's actual data
                        if (warehouse && (warehouse.address || warehouse.name)) {
                            console.log(`Adding warehouse: ${warehouse.name || 'Unnamed'} at ${warehouse.address || 'No address'}`);

                            // Create the warehouse item and get reference to it
                            const newElement = this.addWarehouseWithoutSave();

                                                        if (newElement) {
                                // Use pre-stored input references
                                const addressInput = newElement._addressInput;
                                const nameInput = newElement._nameInput;

                                if (addressInput && nameInput) {
                                    addressInput.value = warehouse.address || '';
                                    nameInput.value = warehouse.name || '';
                                    console.log(`Successfully populated warehouse ${index}`);
                                } else {
                                    console.error('Could not find input fields for warehouse', index, {
                                        addressInput: !!addressInput,
                                        nameInput: !!nameInput,
                                        element: newElement
                                    });
                                }
                            } else {
                                console.error('Failed to create warehouse element', index);
                            }

                            loadedCount++;
                        }
                    });

                    console.log(`Loaded ${loadedCount} warehouse locations`);

                    // Setup autocomplete for loaded warehouse inputs (only if Google Maps is ready)
                    if (this.googleMapsLoaded && typeof google !== 'undefined' && google && google.maps && google.maps.places) {
                        setTimeout(() => this.setupAutocompleteForWarehouseInputs(), 200);
                    }
                } else {
                    console.log('No valid warehouse data found');
                    this.showEmptyState('warehousesContainer', 'warehouse');
                }
            } catch (error) {
                console.error('Error loading saved warehouses:', error);
                this.showEmptyState('warehousesContainer', 'warehouse');
            }
        } else {
            console.log('No saved warehouses found in localStorage');
            this.showEmptyState('warehousesContainer', 'warehouse');
        }
    }

                loadSavedCustomers() {
        const savedCustomers = localStorage.getItem('warehouse_calculator_customers');
        console.log('Loading customers from localStorage:', savedCustomers);

        const container = document.getElementById('customersContainer');

        if (savedCustomers && savedCustomers !== 'null' && savedCustomers !== 'undefined') {
            try {
                const customers = JSON.parse(savedCustomers);
                console.log('Parsed customers:', customers);

                if (Array.isArray(customers) && customers.length > 0) {
                    // Clear empty state
                    container.innerHTML = '';

                                        let loadedCount = 0;
                    customers.forEach((customer, index) => {
                        console.log(`Processing customer ${index}:`, customer);
                        // Only add if there's actual data
                        if (customer && (customer.address || customer.name)) {
                            console.log(`Adding customer: ${customer.name || 'Unnamed'} at ${customer.address || 'No address'}`);

                            // Create the customer item and get reference to it
                            const newElement = this.addCustomerWithoutSave();

                                                        if (newElement) {
                                // Use pre-stored input references
                                const addressInput = newElement._addressInput;
                                const nameInput = newElement._nameInput;

                                if (addressInput && nameInput) {
                                    addressInput.value = customer.address || '';
                                    nameInput.value = customer.name || '';
                                    console.log(`Successfully populated customer ${index}`);
                                } else {
                                    console.error('Could not find input fields for customer', index, {
                                        addressInput: !!addressInput,
                                        nameInput: !!nameInput,
                                        element: newElement
                                    });
                                }
                            } else {
                                console.error('Failed to create customer element', index);
                            }

                            loadedCount++;
                        }
                    });

                    console.log(`Loaded ${loadedCount} customer locations`);

                    // Setup autocomplete for loaded customer inputs (only if Google Maps is ready)
                    if (this.googleMapsLoaded && typeof google !== 'undefined' && google && google.maps && google.maps.places) {
                        setTimeout(() => this.setupAutocompleteForCustomerInputs(), 200);
                    }
                } else {
                    console.log('No valid customer data found');
                    this.showEmptyState('customersContainer', 'customer');
                }
            } catch (error) {
                console.error('Error loading saved customers:', error);
                this.showEmptyState('customersContainer', 'customer');
            }
        } else {
            console.log('No saved customers found in localStorage');
            this.showEmptyState('customersContainer', 'customer');
        }
    }

    showEmptyState(containerId, type) {
        const container = document.getElementById(containerId);
        const icon = type === 'warehouse' ? 'warehouse' : 'users';
        const text = type === 'warehouse' ?
            'Click "Add Location" to start adding potential warehouse locations' :
            'Click "Add Customer" to start adding customer addresses';

        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-${icon} fs-1 mb-3"></i>
                <p>${text}</p>
            </div>
        `;
    }

        saveDataToLocalStorage() {
        if (this.isLoading) {
            console.log('Skipping save - currently loading data');
            return; // Don't save during loading
        }

        try {
            // Save warehouse locations (only non-empty ones)
            const warehouseItems = document.querySelectorAll('#warehousesContainer .location-item');
            const warehouses = Array.from(warehouseItems)
                .map(item => ({
                    address: item.querySelector('.warehouse-address').value.trim(),
                    name: item.querySelector('.warehouse-name').value.trim()
                }))
                .filter(item => item.address || item.name); // Only save if has content
            localStorage.setItem('warehouse_calculator_warehouses', JSON.stringify(warehouses));

            // Save customer locations (only non-empty ones)
            const customerItems = document.querySelectorAll('#customersContainer .location-item');
            const customers = Array.from(customerItems)
                .map(item => ({
                    address: item.querySelector('.customer-address').value.trim(),
                    name: item.querySelector('.customer-name').value.trim()
                }))
                .filter(item => item.address || item.name); // Only save if has content
            localStorage.setItem('warehouse_calculator_customers', JSON.stringify(customers));

            console.log('Data saved to localStorage:', {
                warehouses: warehouses.length,
                customers: customers.length,
                warehouseData: warehouses,
                customerData: customers
            });
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
        }
    }

    // Debug method to check localStorage contents
    debugLocalStorage() {
        console.log('=== DEBUG: Current localStorage contents ===');
        console.log('API Key:', localStorage.getItem('warehouse_calculator_api_key'));
        console.log('Warehouses:', localStorage.getItem('warehouse_calculator_warehouses'));
        console.log('Customers:', localStorage.getItem('warehouse_calculator_customers'));
        console.log('Units:', localStorage.getItem('warehouse_calculator_units'));
        console.log('Travel Mode:', localStorage.getItem('warehouse_calculator_travel_mode'));
        console.log('=== END DEBUG ===');
    }

    bindEvents() {
                // API Key events
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
            localStorage.setItem('warehouse_calculator_api_key', this.apiKey);
            this.updateCalculateButton();

            // Load Google Maps API when user enters key
            if (this.apiKey.length > 10 && !this.googleMapsLoaded) {
                this.loadGoogleMapsAPI();
            }
        });

        // Also save API key on blur to ensure it's saved
        document.getElementById('apiKey').addEventListener('blur', (e) => {
            this.apiKey = e.target.value.trim();
            localStorage.setItem('warehouse_calculator_api_key', this.apiKey);
        });

        // Settings events
        document.getElementById('units').addEventListener('change', (e) => {
            localStorage.setItem('warehouse_calculator_units', e.target.value);
        });

        document.getElementById('travelMode').addEventListener('change', (e) => {
            localStorage.setItem('warehouse_calculator_travel_mode', e.target.value);
        });

        document.getElementById('avoidHighways').addEventListener('change', (e) => {
            localStorage.setItem('warehouse_calculator_avoid_highways', e.target.checked);
        });

        document.getElementById('avoidTolls').addEventListener('change', (e) => {
            localStorage.setItem('warehouse_calculator_avoid_tolls', e.target.checked);
        });

        document.getElementById('avoidFerries').addEventListener('change', (e) => {
            localStorage.setItem('warehouse_calculator_avoid_ferries', e.target.checked);
        });

        // Add location events
        document.getElementById('addWarehouse').addEventListener('click', () => {
            this.addWarehouse();
        });

        document.getElementById('addCustomer').addEventListener('click', () => {
            this.addCustomer();
        });

        // Calculate button
        document.getElementById('calculateDistances').addEventListener('click', () => {
            this.calculateDistances();
        });

        // Export button
        document.getElementById('exportResults').addEventListener('click', () => {
            this.exportToCsv();
        });

        // Clear all data button
        document.getElementById('clearAllData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Toggle map button
        document.getElementById('toggleMap').addEventListener('click', () => {
            this.toggleMapVisibility();
        });
    }

        addWarehouse() {
        this.addWarehouseWithoutSave();

        // Save data and setup autocomplete
        if (!this.isLoading) {
            this.saveDataToLocalStorage();
        }

        // Setup autocomplete for the address field
        const container = document.getElementById('warehousesContainer');
        const newAddressInput = container.lastElementChild.querySelector('.warehouse-address');
        const newNameInput = container.lastElementChild.querySelector('.warehouse-name');
        this.setupAutocomplete(newAddressInput, newNameInput, 'warehouse');

        // Focus on the new input
        newAddressInput.focus();
    }

            addWarehouseWithoutSave() {
        const container = document.getElementById('warehousesContainer');
        const template = document.getElementById('warehouseTemplate');
        const clone = template.content.cloneNode(true);

        // Clear empty state
        if (container.querySelector('.text-center')) {
            container.innerHTML = '';
        }

        // Get references to inputs before appending
        const addressInput = clone.querySelector('.warehouse-address');
        const nameInput = clone.querySelector('.warehouse-name');
        const removeBtn = clone.querySelector('.remove-location');
        const locationItem = clone.querySelector('.location-item');

        console.log('Clone elements found:', {
            addressInput: !!addressInput,
            nameInput: !!nameInput,
            removeBtn: !!removeBtn,
            locationItem: !!locationItem
        });

        // Add event listeners to the new location
        removeBtn.addEventListener('click', (e) => {
            e.target.closest('.location-item').remove();
            this.updateCalculateButton();
            if (!this.isLoading) {
                this.saveDataToLocalStorage();
            }

            // Show empty state if no items left
            if (container.children.length === 0) {
                this.showEmptyState('warehousesContainer', 'warehouse');
            }
        });

        // Auto-save on input
        [addressInput, nameInput].forEach(input => {
            input.addEventListener('input', () => {
                this.updateCalculateButton();
                if (!this.isLoading) {
                    this.saveDataToLocalStorage();
                }
            });
        });

        container.appendChild(clone);
        this.updateCalculateButton();

        // Return the newly appended element with pre-stored input references
        const newElement = container.lastElementChild;
        newElement._addressInput = addressInput;
        newElement._nameInput = nameInput;

        return newElement;
    }

        addCustomer() {
        this.addCustomerWithoutSave();

        // Save data and setup autocomplete
        if (!this.isLoading) {
            this.saveDataToLocalStorage();
        }

        // Setup autocomplete for the address field
        const container = document.getElementById('customersContainer');
        const newAddressInput = container.lastElementChild.querySelector('.customer-address');
        const newNameInput = container.lastElementChild.querySelector('.customer-name');
        this.setupAutocomplete(newAddressInput, newNameInput, 'customer');

        // Focus on the new input
        newAddressInput.focus();
    }

            addCustomerWithoutSave() {
        const container = document.getElementById('customersContainer');
        const template = document.getElementById('customerTemplate');
        const clone = template.content.cloneNode(true);

        // Clear empty state
        if (container.querySelector('.text-center')) {
            container.innerHTML = '';
        }

        // Get references to inputs before appending
        const addressInput = clone.querySelector('.customer-address');
        const nameInput = clone.querySelector('.customer-name');
        const removeBtn = clone.querySelector('.remove-location');
        const locationItem = clone.querySelector('.location-item');

        console.log('Customer clone elements found:', {
            addressInput: !!addressInput,
            nameInput: !!nameInput,
            removeBtn: !!removeBtn,
            locationItem: !!locationItem
        });

        // Add event listeners to the new location
        removeBtn.addEventListener('click', (e) => {
            e.target.closest('.location-item').remove();
            this.updateCalculateButton();
            if (!this.isLoading) {
                this.saveDataToLocalStorage();
            }

            // Show empty state if no items left
            if (container.children.length === 0) {
                this.showEmptyState('customersContainer', 'customer');
            }
        });

        // Auto-save on input
        [addressInput, nameInput].forEach(input => {
            input.addEventListener('input', () => {
                this.updateCalculateButton();
                if (!this.isLoading) {
                    this.saveDataToLocalStorage();
                }
            });
        });

        container.appendChild(clone);
        this.updateCalculateButton();

        // Return the newly appended element with pre-stored input references
        const newElement = container.lastElementChild;
        newElement._addressInput = addressInput;
        newElement._nameInput = nameInput;

        return newElement;
    }

    updateCalculateButton() {
        const warehouseInputs = document.querySelectorAll('.warehouse-address');
        const customerInputs = document.querySelectorAll('.customer-address');
        const apiKey = document.getElementById('apiKey').value;

        const hasWarehouses = Array.from(warehouseInputs).some(input => input.value.trim());
        const hasCustomers = Array.from(customerInputs).some(input => input.value.trim());
        const hasApiKey = apiKey.trim().length > 0;
        const mapsReady = this.distanceMatrixService !== null;

        const calculateBtn = document.getElementById('calculateDistances');
        const canCalculate = hasWarehouses && hasCustomers && hasApiKey;

        calculateBtn.disabled = !canCalculate;

        if (!hasApiKey) {
            calculateBtn.innerHTML = '<i class="fas fa-key me-2"></i>Enter API Key First';
        } else if (!mapsReady && hasApiKey) {
            calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading Google Maps...';
        } else if (!canCalculate) {
            calculateBtn.innerHTML = '<i class="fas fa-calculator me-2"></i>Add Locations to Calculate';
        } else {
            calculateBtn.innerHTML = '<i class="fas fa-calculator me-2"></i>Calculate Distances';
        }
    }

    collectLocations() {
        this.warehouses = [];
        this.customers = [];

        // Collect warehouse locations
        const warehouseItems = document.querySelectorAll('#warehousesContainer .location-item');
        warehouseItems.forEach(item => {
            const address = item.querySelector('.warehouse-address').value.trim();
            const name = item.querySelector('.warehouse-name').value.trim() || 'Warehouse';
            if (address) {
                this.warehouses.push({ address, name });
            }
        });

        // Collect customer locations
        const customerItems = document.querySelectorAll('#customersContainer .location-item');
        customerItems.forEach(item => {
            const address = item.querySelector('.customer-address').value.trim();
            const name = item.querySelector('.customer-name').value.trim() || 'Customer';
            if (address) {
                this.customers.push({ address, name });
            }
        });
    }

        async calculateDistances() {
        this.collectLocations();

        if (this.warehouses.length === 0 || this.customers.length === 0) {
            this.showAlert('Please add at least one warehouse and one customer location.', 'warning');
            return;
        }

        const calculateBtn = document.getElementById('calculateDistances');
        calculateBtn.disabled = true;

        // Show progress modal
        this.showProgressModal();

        try {
            // Step 1: Setup
            this.updateProgress(1, 25, 'Setting up calculation', 'Preparing distance matrix calculation');
            await this.sleep(500);

            // Step 2: Calculate distances
            this.updateProgress(2, 50, 'Calculating distances', 'Getting driving distances from Google Maps');
            await this.fetchDistanceMatrix();

            // Step 3: Display results
            this.updateProgress(3, 75, 'Processing results', 'Creating comparison matrix and analysis');
            await this.sleep(300);
            this.displayResults();

            // Step 4: Create map visualization
            this.updateProgress(4, 100, 'Creating map visualization', 'Drawing routes and markers on map');
            await this.displayMapVisualization();

            // Hide progress modal
            this.hideProgressModal();

            // Show results
            document.getElementById('resultsCard').classList.remove('d-none');

            // Scroll to results
            setTimeout(() => {
                document.getElementById('resultsCard').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);

        } catch (error) {
            this.hideProgressModal();
            console.error('Error calculating distances:', error);
            this.showAlert(`Error calculating distances: ${error.message}`, 'danger');
        } finally {
            calculateBtn.disabled = false;
        }
    }

    // Progress Modal Methods
    showProgressModal() {
        this.progressModal = new bootstrap.Modal(document.getElementById('progressModal'), {
            backdrop: 'static',
            keyboard: false
        });
        this.progressModal.show();

        // Reset progress
        this.updateProgress(1, 0, 'Initializing...', 'Preparing calculation');
    }

    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.hide();
        }
    }

    updateProgress(step, percentage, title, description) {
        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);

        // Update current step text
        document.getElementById('currentStep').textContent = title;
        document.getElementById('stepDescription').textContent = description;

        // Update step indicators
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (i < step) {
                stepElement.className = 'step-indicator completed';
            } else if (i === step) {
                stepElement.className = 'step-indicator active';
            } else {
                stepElement.className = 'step-indicator';
            }
        }
    }

        sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Autocomplete Methods
        setupAutocomplete(addressInput, nameInput, type) {
        if (typeof google === 'undefined' || !google || !google.maps || !google.maps.places) {
            console.log(`Google Maps not ready for ${type} autocomplete, skipping for now`);
            return;
        }

        try {
            // Create autocomplete instance
            const autocomplete = new google.maps.places.Autocomplete(addressInput, {
                types: ['establishment', 'geocode'],
                fields: ['formatted_address', 'name', 'place_id', 'geometry']
            });

            // Store the instance for cleanup later
            this.autocompleteInstances.push({
                autocomplete: autocomplete,
                element: addressInput
            });

            // Add visual indicator that autocomplete is active
            addressInput.placeholder = `Enter ${type} address (autocomplete enabled)`;
            addressInput.classList.add('autocomplete-enabled');

            // Handle place selection
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();

                if (place.formatted_address) {
                    addressInput.value = place.formatted_address;

                    // Auto-fill name if it's empty
                    if (!nameInput.value.trim() && place.name) {
                        nameInput.value = place.name;
                    }

                    // Trigger save if not loading
                    if (!this.isLoading) {
                        this.saveDataToLocalStorage();
                    }

                    this.updateCalculateButton();
                }
            });

            console.log(`Autocomplete setup complete for ${type} field`);
        } catch (error) {
            console.error(`Error setting up autocomplete for ${type}:`, error);
        }
    }

    setupAutocompleteForWarehouseInputs() {
        // Only setup if Google Maps is available
        if (typeof google === 'undefined' || !google || !google.maps || !google.maps.places) {
            console.log('Google Maps not ready for warehouse autocomplete, will retry when API loads');
            return;
        }

        // Setup autocomplete for existing warehouse inputs
        const warehouseItems = document.querySelectorAll('#warehousesContainer .location-item');
        warehouseItems.forEach(item => {
            const addressInput = item.querySelector('.warehouse-address');
            const nameInput = item.querySelector('.warehouse-name');
            if (addressInput && !addressInput.classList.contains('autocomplete-enabled')) {
                this.setupAutocomplete(addressInput, nameInput, 'warehouse');
            }
        });
    }

    setupAutocompleteForCustomerInputs() {
        // Only setup if Google Maps is available
        if (typeof google === 'undefined' || !google || !google.maps || !google.maps.places) {
            console.log('Google Maps not ready for customer autocomplete, will retry when API loads');
            return;
        }

        // Setup autocomplete for existing customer inputs
        const customerItems = document.querySelectorAll('#customersContainer .location-item');
        customerItems.forEach(item => {
            const addressInput = item.querySelector('.customer-address');
            const nameInput = item.querySelector('.customer-name');
            if (addressInput && !addressInput.classList.contains('autocomplete-enabled')) {
                this.setupAutocomplete(addressInput, nameInput, 'customer');
            }
        });
    }

    setupAutocompleteForExistingInputs() {
        this.setupAutocompleteForWarehouseInputs();
        this.setupAutocompleteForCustomerInputs();
    }

             // Load Google Maps JavaScript API dynamically
    loadGoogleMapsAPI() {
        if (this.googleMapsLoaded) return;

        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) return;

        this.googleMapsLoaded = true;

                const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;

                script.onload = () => {
            this.distanceMatrixService = new google.maps.DistanceMatrixService();
            this.initializeMap();
            this.updateCalculateButton();

            console.log('Google Maps API loaded successfully');

            // Setup autocomplete for any existing inputs that were loaded before Google Maps was ready
            setTimeout(() => {
                console.log('Setting up autocomplete for existing inputs...');
                this.setupAutocompleteForExistingInputs();
            }, 500);
        };

        script.onerror = () => {
            this.googleMapsLoaded = false;
            this.showAlert('Failed to load Google Maps API. Please check your API key.', 'danger');
        };

        document.head.appendChild(script);
    }

    async fetchDistanceMatrix() {
        // Ensure Google Maps API is loaded
        if (!this.googleMapsLoaded || !this.distanceMatrixService) {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                throw new Error('Please enter your Google Maps API key');
            }

            this.loadGoogleMapsAPI();

            // Wait for API to load
            return new Promise((resolve, reject) => {
                const checkLoaded = () => {
                    if (this.distanceMatrixService) {
                        this.fetchDistanceMatrix().then(resolve).catch(reject);
                    } else {
                        setTimeout(checkLoaded, 500);
                    }
                };
                setTimeout(checkLoaded, 1000);
            });
        }

        const origins = this.warehouses.map(w => w.address);
        const destinations = this.customers.map(c => c.address);

        const units = document.getElementById('units').value === 'metric' ?
            google.maps.UnitSystem.METRIC : google.maps.UnitSystem.IMPERIAL;

        const travelMode = this.getTravelMode();
        const avoidHighways = document.getElementById('avoidHighways').checked;
        const avoidTolls = document.getElementById('avoidTolls').checked;
        const avoidFerries = document.getElementById('avoidFerries').checked;

        return new Promise((resolve, reject) => {
            this.distanceMatrixService.getDistanceMatrix({
                origins: origins,
                destinations: destinations,
                travelMode: travelMode,
                unitSystem: units,
                avoidHighways: avoidHighways,
                avoidTolls: avoidTolls,
                avoidFerries: avoidFerries
            }, (result, status) => {
                if (status === google.maps.DistanceMatrixStatus.OK) {
                    // Convert Google Maps result to our expected format
                    this.distanceMatrix = this.convertGoogleMapsResult(result);
                    resolve(this.distanceMatrix);
                } else {
                    reject(new Error(`Google Maps API error: ${status}`));
                }
            });
        });
    }

    getTravelMode() {
        const mode = document.getElementById('travelMode').value;
        switch (mode) {
            case 'DRIVING': return google.maps.TravelMode.DRIVING;
            case 'WALKING': return google.maps.TravelMode.WALKING;
            case 'BICYCLING': return google.maps.TravelMode.BICYCLING;
            case 'TRANSIT': return google.maps.TravelMode.TRANSIT;
            default: return google.maps.TravelMode.DRIVING;
        }
    }

    convertGoogleMapsResult(result) {
        // Convert Google Maps DistanceMatrixResponse to our expected format
        return {
            status: 'OK',
            rows: result.rows.map(row => ({
                elements: row.elements.map(element => ({
                    status: element.status === google.maps.DistanceMatrixElementStatus.OK ? 'OK' : 'ERROR',
                    distance: element.distance ? {
                        text: element.distance.text,
                        value: element.distance.value
                    } : null,
                    duration: element.duration ? {
                        text: element.duration.text,
                        value: element.duration.value
                    } : null
                }))
            }))
        };
    }

    displayResults() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';

        if (!this.distanceMatrix || !this.distanceMatrix.rows) {
            container.innerHTML = '<p class="text-danger">No results to display.</p>';
            return;
        }

        // Create summary statistics
        this.createSummaryStats(container);

        // Create distance matrix table
        this.createDistanceTable(container);

        // Create best options summary
        this.createBestOptionsSummary(container);
    }

    createSummaryStats(container) {
        const stats = this.calculateSummaryStats();

        const statsHTML = `
            <div class="summary-stats">
                <div class="row text-center">
                    <div class="col-md-3">
                        <div class="stat-value">${this.warehouses.length}</div>
                        <div class="text-muted">Warehouse Locations</div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-value">${this.customers.length}</div>
                        <div class="text-muted">Customer Locations</div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-value">${stats.avgDistance}</div>
                        <div class="text-muted">Average Distance</div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-value">${stats.totalCalculations}</div>
                        <div class="text-muted">Total Calculations</div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', statsHTML);
    }

    calculateSummaryStats() {
        let totalDistance = 0;
        let validCalculations = 0;

        this.distanceMatrix.rows.forEach(row => {
            row.elements.forEach(element => {
                if (element.status === 'OK') {
                    totalDistance += element.distance.value;
                    validCalculations++;
                }
            });
        });

        const avgDistanceMeters = validCalculations > 0 ? totalDistance / validCalculations : 0;
        const units = document.getElementById('units').value;
        const avgDistance = this.formatDistance(avgDistanceMeters, units);

        return {
            avgDistance,
            totalCalculations: validCalculations,
            totalDistance: this.formatDistance(totalDistance, units)
        };
    }

    createDistanceTable(container) {
        const table = document.createElement('table');
        table.className = 'table table-bordered distance-matrix-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Warehouse \\ Customer</th>';

        this.customers.forEach(customer => {
            const th = document.createElement('th');
            th.textContent = customer.name;
            th.title = customer.address;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');

        this.warehouses.forEach((warehouse, warehouseIndex) => {
            const row = document.createElement('tr');

            // Warehouse name cell
            const warehouseCell = document.createElement('td');
            warehouseCell.innerHTML = `<strong>${warehouse.name}</strong>`;
            warehouseCell.title = warehouse.address;
            row.appendChild(warehouseCell);

            // Distance cells
            this.customers.forEach((customer, customerIndex) => {
                const cell = document.createElement('td');
                const element = this.distanceMatrix.rows[warehouseIndex]?.elements[customerIndex];

                if (element && element.status === 'OK') {
                    const distance = element.distance.text;
                    const duration = element.duration.text;
                    cell.innerHTML = `${distance}<br><small class="text-muted">${duration}</small>`;
                    cell.className = 'distance-cell';
                } else {
                    cell.innerHTML = '<span class="text-danger">N/A</span>';
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        // Highlight best and worst distances
        this.highlightBestWorstDistances(table);

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive mt-3';
        tableContainer.appendChild(table);
        container.appendChild(tableContainer);
    }

    highlightBestWorstDistances(table) {
        const cells = table.querySelectorAll('.distance-cell');
        const distances = [];

        cells.forEach(cell => {
            const distanceText = cell.textContent.split('\n')[0];
            const distanceValue = this.parseDistanceValue(distanceText);
            if (distanceValue > 0) {
                distances.push({ cell, value: distanceValue });
            }
        });

        if (distances.length === 0) return;

        distances.sort((a, b) => a.value - b.value);
        const minDistance = distances[0].value;
        const maxDistance = distances[distances.length - 1].value;

        distances.forEach(({ cell, value }) => {
            if (value === minDistance) {
                cell.classList.add('best-distance');
            } else if (value === maxDistance) {
                cell.classList.add('worst-distance');
            }
        });
    }

    parseDistanceValue(distanceText) {
        const match = distanceText.match(/[\d,]+\.?\d*/);
        if (!match) return 0;
        return parseFloat(match[0].replace(/,/g, ''));
    }

    createBestOptionsSummary(container) {
        const bestOptions = this.findBestOptions();

        const summaryHTML = `
            <div class="mt-4">
                <h5>Optimization Summary</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title text-success">
                                    <i class="fas fa-trophy me-2"></i>Best Overall Location
                                </h6>
                                <p class="card-text">
                                    <strong>${bestOptions.bestWarehouse.name}</strong><br>
                                    Average distance: ${bestOptions.bestWarehouse.avgDistance}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title text-info">
                                    <i class="fas fa-route me-2"></i>Shortest Single Route
                                </h6>
                                <p class="card-text">
                                    <strong>${bestOptions.shortestRoute.warehouse}</strong> to
                                    <strong>${bestOptions.shortestRoute.customer}</strong><br>
                                    Distance: ${bestOptions.shortestRoute.distance}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', summaryHTML);
    }

    findBestOptions() {
        let bestWarehouse = null;
        let minAvgDistance = Infinity;
        let shortestRoute = null;
        let minSingleDistance = Infinity;

        this.warehouses.forEach((warehouse, warehouseIndex) => {
            let totalDistance = 0;
            let validDistances = 0;

            this.customers.forEach((customer, customerIndex) => {
                const element = this.distanceMatrix.rows[warehouseIndex]?.elements[customerIndex];

                if (element && element.status === 'OK') {
                    const distanceValue = element.distance.value;
                    totalDistance += distanceValue;
                    validDistances++;

                    // Check for shortest single route
                    if (distanceValue < minSingleDistance) {
                        minSingleDistance = distanceValue;
                        shortestRoute = {
                            warehouse: warehouse.name,
                            customer: customer.name,
                            distance: element.distance.text
                        };
                    }
                }
            });

            if (validDistances > 0) {
                const avgDistance = totalDistance / validDistances;
                if (avgDistance < minAvgDistance) {
                    minAvgDistance = avgDistance;
                    const units = document.getElementById('units').value;
                    bestWarehouse = {
                        name: warehouse.name,
                        avgDistance: this.formatDistance(avgDistance, units)
                    };
                }
            }
        });

        return { bestWarehouse, shortestRoute };
    }

    formatDistance(meters, units) {
        if (units === 'imperial') {
            const miles = meters * 0.000621371;
            return `${miles.toFixed(1)} mi`;
        } else {
            if (meters >= 1000) {
                return `${(meters / 1000).toFixed(1)} km`;
            } else {
                return `${Math.round(meters)} m`;
            }
        }
    }

        formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    escapeCsvValue(value) {
        // Convert to string and handle null/undefined
        const str = String(value || '');

        // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
    }

        exportToCsv() {
        if (!this.distanceMatrix || this.warehouses.length === 0 || this.customers.length === 0) {
            this.showAlert('No data to export. Please calculate distances first.', 'warning');
            return;
        }

        let csv = '';

        // DISTANCES SECTION
        csv += 'DISTANCES\n';
        csv += 'Warehouse,' + this.customers.map(c => this.escapeCsvValue(c.name)).join(',') + '\n';

        this.warehouses.forEach((warehouse, warehouseIndex) => {
            csv += this.escapeCsvValue(warehouse.name) + ',';
            const distances = this.customers.map((customer, customerIndex) => {
                const element = this.distanceMatrix.rows[warehouseIndex]?.elements[customerIndex];
                if (element && element.status === 'OK') {
                    return this.escapeCsvValue(element.distance.text);
                } else {
                    return 'N/A';
                }
            });
            csv += distances.join(',') + '\n';
        });

        // Add blank line between sections
        csv += '\n';

        // DRIVE TIMES SECTION
        csv += 'DRIVE TIMES\n';
        csv += 'Warehouse,' + this.customers.map(c => this.escapeCsvValue(c.name)).join(',') + '\n';

        this.warehouses.forEach((warehouse, warehouseIndex) => {
            csv += this.escapeCsvValue(warehouse.name) + ',';
            const times = this.customers.map((customer, customerIndex) => {
                const element = this.distanceMatrix.rows[warehouseIndex]?.elements[customerIndex];
                if (element && element.status === 'OK') {
                    return this.escapeCsvValue(element.duration.text);
                } else {
                    return 'N/A';
                }
            });
            csv += times.join(',') + '\n';
        });

        // Add blank line before summary
        csv += '\n';

        // SUMMARY SECTION
        csv += 'SUMMARY\n';
        csv += 'Warehouse,Average Distance,Average Drive Time\n';
        this.warehouses.forEach((warehouse, warehouseIndex) => {
            let totalDistance = 0;
            let totalDuration = 0;
            let validEntries = 0;

            this.customers.forEach((customer, customerIndex) => {
                const element = this.distanceMatrix.rows[warehouseIndex]?.elements[customerIndex];
                if (element && element.status === 'OK') {
                    totalDistance += element.distance.value;
                    totalDuration += element.duration.value;
                    validEntries++;
                }
            });

            if (validEntries > 0) {
                const avgDistance = totalDistance / validEntries;
                const avgDuration = totalDuration / validEntries;
                const units = document.getElementById('units').value;
                const formattedDistance = this.formatDistance(avgDistance, units);
                const formattedDuration = this.formatDuration(avgDuration);
                csv += `${this.escapeCsvValue(warehouse.name)},${this.escapeCsvValue(formattedDistance)},${this.escapeCsvValue(formattedDuration)}\n`;
            } else {
                csv += `${this.escapeCsvValue(warehouse.name)},N/A,N/A\n`;
            }
        });

        this.downloadCsv(csv, 'warehouse-distance-comparison.csv');
    }

        downloadCsv(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all saved data? This will remove all warehouse locations, customer locations, and reset your preferences.')) {
            // Clear localStorage
            localStorage.removeItem('warehouse_calculator_warehouses');
            localStorage.removeItem('warehouse_calculator_customers');
            localStorage.removeItem('warehouse_calculator_api_key');
            localStorage.removeItem('warehouse_calculator_units');
            localStorage.removeItem('warehouse_calculator_travel_mode');
            localStorage.removeItem('warehouse_calculator_avoid_highways');
            localStorage.removeItem('warehouse_calculator_avoid_tolls');
            localStorage.removeItem('warehouse_calculator_avoid_ferries');

            // Reset form fields
            document.getElementById('apiKey').value = '';
            document.getElementById('units').value = 'metric';
            document.getElementById('travelMode').value = 'DRIVING';
            document.getElementById('avoidHighways').checked = false;
            document.getElementById('avoidTolls').checked = false;
            document.getElementById('avoidFerries').checked = false;

            // Clear containers and show empty states
            this.showEmptyState('warehousesContainer', 'warehouse');
            this.showEmptyState('customersContainer', 'customer');

            // Hide results and map
            document.getElementById('resultsCard').classList.add('d-none');
            document.getElementById('mapContainer').style.display = 'none';

            // Clear map data
            this.clearMapData();

            // Clear autocomplete instances
            this.clearAutocompleteInstances();

            // Reset calculator state
            this.warehouses = [];
            this.customers = [];
            this.apiKey = '';
            this.distanceMatrix = [];
            this.googleMapsLoaded = false;
            this.distanceMatrixService = null;

            // Update button state
            this.updateCalculateButton();

            this.showAlert('All data cleared successfully!', 'success');
        }
    }

    // Map Visualization Methods
    initializeMap() {
        if (typeof google === 'undefined' || !google || !google.maps) return;

        const mapOptions = {
            zoom: 10,
            center: { lat: 13.7563, lng: 100.5018 }, // Bangkok default
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        };

        this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
    }

    async displayMapVisualization() {
        if (!this.map || this.warehouses.length === 0 || this.customers.length === 0) {
            return;
        }

        // Clear existing map data
        this.clearMapData();

        // Show map container
        document.getElementById('mapContainer').style.display = 'block';

        // Update progress for geocoding
        if (this.progressModal) {
            this.updateProgress(4, 80, 'Creating map visualization', 'Converting addresses to map coordinates');
        }

        // Geocode all locations and add markers
        const warehouseLocations = await this.geocodeLocations(this.warehouses, 'warehouse');
        const customerLocations = await this.geocodeLocations(this.customers, 'customer');

        // Add markers to map
        this.addMarkersToMap(warehouseLocations, customerLocations);

        // Update progress for route drawing
        if (this.progressModal) {
            this.updateProgress(4, 90, 'Creating map visualization', 'Drawing routes between locations');
        }

        // Draw routes between warehouses and customers
        await this.drawRoutes(warehouseLocations, customerLocations);

        // Create legend and finalize
        if (this.progressModal) {
            this.updateProgress(4, 95, 'Creating map visualization', 'Finalizing map display');
        }

        // Create legend
        this.createMapLegend(warehouseLocations);

        // Fit map to show all markers
        this.fitMapToMarkers();
    }

    async geocodeLocations(locations, type) {
        const geocoder = new google.maps.Geocoder();
        const geocodedLocations = [];

        for (let i = 0; i < locations.length; i++) {
            const location = locations[i];
            try {
                const result = await new Promise((resolve, reject) => {
                    geocoder.geocode({ address: location.address }, (results, status) => {
                        if (status === google.maps.GeocoderStatus.OK) {
                            resolve(results[0]);
                        } else {
                            reject(new Error(`Geocoding failed: ${status}`));
                        }
                    });
                });

                geocodedLocations.push({
                    ...location,
                    position: result.geometry.location,
                    type: type,
                    index: i
                });
            } catch (error) {
                console.warn(`Could not geocode ${type} location: ${location.address}`, error);
            }
        }

        return geocodedLocations;
    }

    addMarkersToMap(warehouseLocations, customerLocations) {
        // Add warehouse markers
        warehouseLocations.forEach((warehouse, index) => {
            const marker = new google.maps.Marker({
                position: warehouse.position,
                map: this.map,
                title: `${warehouse.name}\n${warehouse.address}`,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="${this.routeColors[index]}"/>
                            <path d="M16 8L20 12H18V20H14V12H12L16 8Z" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 40),
                    anchor: new google.maps.Point(16, 40)
                }
            });

            this.markers.push(marker);

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="font-family: Arial, sans-serif;">
                        <strong style="color: ${this.routeColors[index]};">📦 ${warehouse.name}</strong><br>
                        <small>${warehouse.address}</small>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });
        });

        // Add customer markers
        customerLocations.forEach((customer) => {
            const marker = new google.maps.Marker({
                position: customer.position,
                map: this.map,
                title: `${customer.name}\n${customer.address}`,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="#28a745"/>
                            <circle cx="16" cy="16" r="6" fill="white"/>
                            <circle cx="16" cy="16" r="3" fill="#28a745"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 40),
                    anchor: new google.maps.Point(16, 40)
                }
            });

            this.markers.push(marker);

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="font-family: Arial, sans-serif;">
                        <strong style="color: #28a745;">🏢 ${customer.name}</strong><br>
                        <small>${customer.address}</small>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });
        });
    }

    async drawRoutes(warehouseLocations, customerLocations) {
        const directionsService = new google.maps.DirectionsService();

        for (let i = 0; i < warehouseLocations.length; i++) {
            const warehouse = warehouseLocations[i];
            const color = this.routeColors[i];

            for (let j = 0; j < customerLocations.length; j++) {
                const customer = customerLocations[j];

                try {
                    const result = await new Promise((resolve, reject) => {
                        directionsService.route({
                            origin: warehouse.position,
                            destination: customer.position,
                            travelMode: this.getTravelMode(),
                            avoidHighways: document.getElementById('avoidHighways').checked,
                            avoidTolls: document.getElementById('avoidTolls').checked,
                            avoidFerries: document.getElementById('avoidFerries').checked
                        }, (result, status) => {
                            if (status === google.maps.DirectionsStatus.OK) {
                                resolve(result);
                            } else {
                                reject(new Error(`Directions request failed: ${status}`));
                            }
                        });
                    });

                    const directionsRenderer = new google.maps.DirectionsRenderer({
                        directions: result,
                        map: this.map,
                        suppressMarkers: true, // We have our own markers
                        polylineOptions: {
                            strokeColor: color,
                            strokeWeight: 4,
                            strokeOpacity: 0.7
                        }
                    });

                    this.directionsRenderers.push(directionsRenderer);

                } catch (error) {
                    console.warn(`Could not get directions from ${warehouse.name} to ${customer.name}:`, error);
                }
            }
        }
    }

    createMapLegend(warehouseLocations) {
        const legendContainer = document.getElementById('mapLegend');

        if (warehouseLocations.length === 0) {
            legendContainer.innerHTML = '';
            return;
        }

        let legendHTML = '<div class="map-legend">';

        warehouseLocations.forEach((warehouse, index) => {
            const color = this.routeColors[index];
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color};"></div>
                    <div class="legend-text">${warehouse.name}</div>
                </div>
            `;
        });

        legendHTML += '</div>';
        legendContainer.innerHTML = legendHTML;
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        this.map.fitBounds(bounds);

        // Add some padding
        google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
            if (this.map.getZoom() > 15) {
                this.map.setZoom(15);
            }
        });
    }

    toggleMapVisibility() {
        const mapContainer = document.getElementById('mapContainer');
        const toggleButton = document.getElementById('toggleMap');

        if (mapContainer.style.display === 'none') {
            mapContainer.style.display = 'block';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash me-1"></i>Hide Map';

            // Trigger map resize to ensure proper display
            if (this.map) {
                google.maps.event.trigger(this.map, 'resize');
                this.fitMapToMarkers();
            }
        } else {
            mapContainer.style.display = 'none';
            toggleButton.innerHTML = '<i class="fas fa-eye me-1"></i>Show Map';
        }
    }

    clearMapData() {
        // Clear existing markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        // Clear existing direction renderers
        this.directionsRenderers.forEach(renderer => renderer.setMap(null));
        this.directionsRenderers = [];

        // Clear legend
        document.getElementById('mapLegend').innerHTML = '';
    }

    clearAutocompleteInstances() {
        // Clear autocomplete instances to prevent memory leaks
        if (typeof google !== 'undefined' && google && google.maps && google.maps.event) {
            this.autocompleteInstances.forEach(instance => {
                if (instance.element) {
                    try {
                        google.maps.event.clearInstanceListeners(instance.element);
                    } catch (error) {
                        console.warn('Error clearing autocomplete listeners:', error);
                    }
                }
            });
        }
        this.autocompleteInstances = [];
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new WarehouseDistanceCalculator();

    // Make calculator available for debugging
    window.warehouseCalculator = calculator;

    // Add debug function to window for easy testing
    window.debugLocalStorage = () => calculator.debugLocalStorage();

    console.log('Warehouse Distance Calculator initialized. Use window.debugLocalStorage() to check saved data.');
});

// Auto-save results to localStorage when calculated
document.addEventListener('DOMContentLoaded', () => {
    // Results are now automatically saved and restored through the main calculator class
    // No need for demo data since we have proper persistence
});
