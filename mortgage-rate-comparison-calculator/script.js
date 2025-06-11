class MortgageCalculator {
    constructor(loanAmount, termYears, rateSchedule, extraPayment = 0) {
        this.loanAmount = loanAmount;
        this.termYears = termYears;
        this.rateSchedule = rateSchedule;
        this.extraPayment = extraPayment;
        this.monthlyPayment = 0;
        this.amortizationSchedule = [];
    }

    calculateMonthlyPayment(principal, rate, termMonths) {
        const monthlyRate = rate / 100 / 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    generateAmortizationSchedule() {
        let remainingBalance = this.loanAmount;
        let totalMonths = this.termYears * 12;
        let currentMonth = 0;
        let totalInterest = 0;
        let totalPrincipal = 0;
        let schedule = [];

        while (currentMonth < totalMonths && remainingBalance > 0) {
            const currentRate = this.getRateForMonth(currentMonth);
            const monthlyRate = currentRate / 100 / 12;
            const monthlyPayment = this.calculateMonthlyPayment(remainingBalance, currentRate, totalMonths - currentMonth);
            const interestPayment = remainingBalance * monthlyRate;
            let principalPayment = monthlyPayment - interestPayment;

            // Add extra payment to principal
            if (this.extraPayment > 0) {
                principalPayment += this.extraPayment;
            }

            // Ensure we don't overpay
            if (principalPayment > remainingBalance) {
                principalPayment = remainingBalance;
            }

            remainingBalance -= principalPayment;
            totalInterest += interestPayment;
            totalPrincipal += principalPayment;

            schedule.push({
                month: currentMonth + 1,
                payment: monthlyPayment + this.extraPayment,
                principal: principalPayment,
                interest: interestPayment,
                remainingBalance: remainingBalance
            });

            currentMonth++;
        }

        this.amortizationSchedule = schedule;
        return {
            schedule,
            totalInterest,
            totalPrincipal,
            totalCost: totalInterest + totalPrincipal,
            actualTerm: currentMonth
        };
    }

    getRateForMonth(month) {
        let currentYear = Math.floor(month / 12) + 1;
        let applicableRate = this.rateSchedule[this.rateSchedule.length - 1].rate;

        for (let rate of this.rateSchedule) {
            if (currentYear <= rate.year) {
                applicableRate = rate.rate;
                break;
            }
        }

        return applicableRate;
    }
}

// DOM Elements
const mortgageForm = document.getElementById('mortgageForm');
const providersContainer = document.getElementById('providersContainer');
const addProviderBtn = document.getElementById('addProvider');
const resultsContainer = document.getElementById('resultsContainer');
const providerTemplate = document.getElementById('providerTemplate');

let providerCount = 0;
let isLoading = false; // Flag to prevent saving during loading
let currentResults = []; // Store current calculation results for schedule viewing
let charts = {}; // Store chart instances for cleanup

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing mortgage calculator...');

    // Clean up old localStorage format first
    cleanupOldData();

    // Add control buttons first
    addControlButtons();

    // Load saved data
    loadFromLocalStorage();

    // Set up event listeners
    setupEventListeners();

    // Calculate initial results
    calculateResults();

    console.log('Initialization complete');
});

function setupEventListeners() {
    // Add provider button
    addProviderBtn.addEventListener('click', () => addProvider());

    // Form inputs
    mortgageForm.addEventListener('input', () => {
        console.log('Form input changed');
        calculateResults();
        saveToLocalStorage();
    });

    // Currency change
    mortgageForm.addEventListener('change', () => {
        console.log('Form selection changed');
        updateCurrencySymbols();
        calculateResults();
        saveToLocalStorage();
    });

    // Initial currency symbol update
    updateCurrencySymbols();
}

function addProvider(data = null) {
    console.log('Adding provider with data:', data);

    if (providerCount >= 8) {
        alert('Maximum 8 providers allowed');
        return;
    }

    const template = providerTemplate.content.cloneNode(true);
    const providerCard = template.querySelector('.provider-card');
    providerCard.dataset.providerId = providerCount;

            // Set unique IDs for collapse functionality
    const contentId = `provider-content-${providerCount}`;
    const collapseContent = template.querySelector('.collapse');
    const headerClickable = template.querySelector('.provider-header-clickable');
    const collapseIndicator = template.querySelector('.collapse-indicator');

    collapseContent.id = contentId;

    const providerNameInput = template.querySelector('.provider-name input');
    const providerTitle = template.querySelector('.provider-title');
    const providerSummary = template.querySelector('.provider-summary');

    // Set provider name if data exists
    if (data && data.name) {
        providerNameInput.value = data.name;
        providerTitle.textContent = data.name;
    } else {
        providerTitle.textContent = 'New Provider';
    }

    // Update title and summary when provider name changes
    providerNameInput.addEventListener('input', () => {
        const name = providerNameInput.value.trim();
        providerTitle.textContent = name || 'New Provider';
        updateProviderSummary(providerCard);
    });

    // Manual collapse/expand functionality - entire header is clickable
    let isExpanded = false;
    headerClickable.addEventListener('click', (e) => {
        e.preventDefault();

        if (isExpanded) {
            // Collapse
            collapseContent.style.display = 'none';
            collapseIndicator.textContent = '▼';
            headerClickable.style.backgroundColor = '';
            isExpanded = false;
        } else {
            // Expand
            collapseContent.style.display = 'block';
            collapseIndicator.textContent = '▲';
            headerClickable.style.backgroundColor = 'rgba(0,0,0,0.05)';
            isExpanded = true;
        }
    });

    // Set up event listeners for provider
    setupProviderEventListeners(template, providerCard);

        // Add rate periods
    if (data && data.rateSchedule && data.rateSchedule.length > 0) {
        // Add rate periods from saved data
        data.rateSchedule.forEach(rate => {
            addRatePeriod(providerCard, rate);
        });
    } else {
        // Add initial empty rate period only if no saved data
        addRatePeriod(providerCard);
    }

    providersContainer.appendChild(template);
    providerCount++;

    // Update summary after adding all rate periods
    updateProviderSummary(providerCard);

    if (!isLoading) {
        calculateResults();
        saveToLocalStorage();
    }
}

function setupProviderEventListeners(template, providerCard) {
    // Add rate button
    const addRateBtn = template.querySelector('.add-rate');
    addRateBtn.addEventListener('click', (e) => {
        addRatePeriod(e.target.closest('.provider-card'));
        calculateResults();
        saveToLocalStorage();
    });

    // Remove provider button
    const removeBtn = template.querySelector('.remove-provider');
    removeBtn.addEventListener('click', (e) => {
        e.target.closest('.provider-card').remove();
        calculateResults();
        saveToLocalStorage();
    });

    // Provider name input
    const nameInput = template.querySelector('.provider-name input');
    nameInput.addEventListener('input', () => {
        console.log('Provider name changed:', nameInput.value);
        calculateResults();
        saveToLocalStorage();
    });
}

function addRatePeriod(providerCard, rateData = null) {
    const rateSchedule = providerCard.querySelector('.rate-schedule');
    const newRateEntry = document.createElement('div');
    newRateEntry.className = 'rate-entry mb-2';
    newRateEntry.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <input type="number" class="form-control" placeholder="Year" min="1" value="${rateData ? rateData.year : ''}">
            </div>
            <div class="col-md-5">
                <input type="number" class="form-control" placeholder="Rate %" step="0.01" value="${rateData ? rateData.rate : ''}">
            </div>
            <div class="col-md-2">
                <button class="btn btn-danger btn-sm remove-rate">×</button>
            </div>
        </div>
    `;

    // Remove rate button
    const removeBtn = newRateEntry.querySelector('.remove-rate');
    removeBtn.addEventListener('click', (e) => {
        e.target.closest('.rate-entry').remove();
        updateProviderSummary(providerCard);
        calculateResults();
        saveToLocalStorage();
    });

    // Rate input event listeners - attach immediately
    const inputs = newRateEntry.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            console.log('Rate input changed:', input.value);
            updateProviderSummary(providerCard);
            calculateResults();
            saveToLocalStorage();
        });
    });

    rateSchedule.appendChild(newRateEntry);
    updateProviderSummary(providerCard);

    return newRateEntry;
}

function updateProviderSummary(providerCard) {
    const summaryElement = providerCard.querySelector('.provider-summary');
    const rateEntries = providerCard.querySelectorAll('.rate-entry');

    let validRates = 0;
    let rateRange = '';

    const rates = [];
    rateEntries.forEach(entry => {
        const year = parseInt(entry.querySelector('input[placeholder="Year"]').value);
        const rate = parseFloat(entry.querySelector('input[placeholder="Rate %"]').value);
        if (!isNaN(year) && !isNaN(rate)) {
            validRates++;
            rates.push(rate);
        }
    });

    if (validRates > 0) {
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);

        if (minRate === maxRate) {
            rateRange = `${minRate}%`;
        } else {
            rateRange = `${minRate}% - ${maxRate}%`;
        }

        summaryElement.textContent = `${validRates} rate${validRates > 1 ? 's' : ''}: ${rateRange}`;
    } else {
        summaryElement.textContent = 'No rates configured';
    }
}

function getProviderData(providerCard) {
    const name = providerCard.querySelector('.provider-name input').value;
    const rateEntries = providerCard.querySelectorAll('.rate-entry');
    const rateSchedule = [];

    rateEntries.forEach(entry => {
        const year = parseInt(entry.querySelector('input[placeholder="Year"]').value);
        const rate = parseFloat(entry.querySelector('input[placeholder="Rate %"]').value);
        if (!isNaN(year) && !isNaN(rate)) {
            rateSchedule.push({ year, rate });
        }
    });

    return { name, rateSchedule, card: providerCard };
}

function calculateResults() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const termYears = parseInt(document.getElementById('loanTerm').value) || 0;
    const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;

    if (!loanAmount || !termYears) {
        resultsContainer.innerHTML = '<p class="text-center">Please enter loan amount and term to see results.</p>';
        return;
    }

    const allProviders = Array.from(providersContainer.querySelectorAll('.provider-card'))
        .map(card => getProviderData(card));

    const validProviders = allProviders.filter(provider => provider.rateSchedule.length > 0);
    const incompleteProviders = allProviders.filter(provider =>
        provider.rateSchedule.length === 0 && (provider.name || hasPartialRateData(provider.card))
    );

    if (validProviders.length === 0 && incompleteProviders.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">Add at least one provider with valid rate schedule to see results.</p>';
        return;
    }

    const results = validProviders.map(provider => {
        const calculator = new MortgageCalculator(loanAmount, termYears, provider.rateSchedule, extraPayment);
        const schedule = calculator.generateAmortizationSchedule();
        return {
            name: provider.name,
            ...schedule
        };
    });

    // Store results globally for schedule viewing
    currentResults = results;

    displayResults(results, incompleteProviders);

}

function hasPartialRateData(providerCard) {
    const rateEntries = providerCard.querySelectorAll('.rate-entry');
    for (let entry of rateEntries) {
        const yearValue = entry.querySelector('input[placeholder="Year"]').value;
        const rateValue = entry.querySelector('input[placeholder="Rate %"]').value;
        if (yearValue || rateValue) {
            return true;
        }
    }
    return false;
}

function displayResults(results, incompleteProviders = []) {
    let html = '';

    // Show incomplete providers warning if any exist
    if (incompleteProviders.length > 0) {
        html += `<div class="alert alert-warning mb-3">
            <strong>Incomplete Data:</strong> The following providers need complete rate information:
            <ul class="mb-0 mt-2">`;

        incompleteProviders.forEach(provider => {
            const missingData = [];
            const rateEntries = provider.card.querySelectorAll('.rate-entry');
            let hasPartialData = false;

            rateEntries.forEach((entry, index) => {
                const yearValue = entry.querySelector('input[placeholder="Year"]').value;
                const rateValue = entry.querySelector('input[placeholder="Rate %"]').value;

                if (yearValue || rateValue) {
                    hasPartialData = true;
                    if (!yearValue) missingData.push(`Rate Period ${index + 1}: Year`);
                    if (!rateValue) missingData.push(`Rate Period ${index + 1}: Rate`);
                }
            });

            if (hasPartialData || provider.name) {
                html += `<li><strong>${provider.name || 'Unnamed Provider'}:</strong> ${missingData.length > 0 ? missingData.join(', ') : 'Add year and rate information'}</li>`;
            }
        });

        html += `</ul></div>`;
    }

    if (results.length === 0) {
        if (incompleteProviders.length === 0) {
            html += '<p class="text-center">Add at least one provider with valid rate schedule to see results.</p>';
        }
        resultsContainer.innerHTML = html;
        return;
    }

    // Sort results by total cost (cheapest first)
    results.sort((a, b) => a.totalCost - b.totalCost);

    html += `
        <div class="table-responsive">
            <table class="table table-bordered results-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Provider</th>
                        <th>Total Cost <small class="text-muted">(sorted ↑)</small></th>
                        <th>Additional Cost vs Best</th>
                        <th>Total Interest</th>
                        <th>Actual Term</th>
                        <th>Monthly Payment</th>
                        <th>Schedule</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Calculate savings comparisons
    const worstCost = results[results.length - 1].totalCost;
    const bestCost = results[0].totalCost;

    results.forEach((result, index) => {
        // Calculate payment range and average
        const payments = result.schedule.map(month => month.payment);
        const minPayment = Math.min(...payments);
        const maxPayment = Math.max(...payments);
        const avgPayment = payments.reduce((a, b) => a + b, 0) / payments.length;

        let paymentDisplay = formatCurrency(avgPayment);
        if (minPayment !== maxPayment) {
            paymentDisplay = `${formatCurrency(minPayment)} - ${formatCurrency(maxPayment)}<br><small>(Avg: ${formatCurrency(avgPayment)})</small>`;
        }

                // Calculate additional cost vs best option
        let additionalCostVsBest = '';
        if (index === 0) {
            additionalCostVsBest = '<span class="text-success fw-bold">Best Option!</span>';
        } else {
            const additionalCost = result.totalCost - bestCost;
            const additionalPercent = ((additionalCost / bestCost) * 100).toFixed(1);
            additionalCostVsBest = `+${formatCurrency(additionalCost)}<br><small class="text-muted">(+${additionalPercent}%)</small>`;
        }

        // Highlight the best option (cheapest)
        const rowClass = index === 0 ? 'table-success' : '';
        const rankBadge = index === 0 ? '<span class="badge bg-success">1st</span>' : `${index + 1}`;

        html += `
            <tr class="${rowClass}">
                <td class="text-center">${rankBadge}</td>
                <td>${result.name || 'Unnamed Provider'}</td>
                <td class="cost-highlight">${formatCurrency(result.totalCost)}</td>
                <td class="text-center">${additionalCostVsBest}</td>
                <td class="cost-highlight">${formatCurrency(result.totalInterest)}</td>
                <td>${result.actualTerm} months</td>
                <td>${paymentDisplay}</td>
                <td class="text-center">
                    <button class="btn btn-outline-primary btn-sm" onclick="showSchedule(${index}, '${(result.name || 'Unnamed Provider').replace(/'/g, "\\'")}')">
                        <i class="fas fa-table"></i> View
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Add best option highlight with savings summary
    if (results.length > 1) {
        const totalSavings = worstCost - bestCost;
        const totalSavingsPercent = ((totalSavings / worstCost) * 100).toFixed(1);

        html += `<div class="alert alert-success mt-3">
            <div class="row">
                <div class="col-md-8">
                    <strong>💰 Best Option:</strong> ${results[0].name || 'Unnamed Provider'}<br>
                    <small>Total cost: ${formatCurrency(results[0].totalCost)}</small>
                </div>
                <div class="col-md-4 text-end">
                    <strong>Maximum Savings:</strong><br>
                    <span class="h5 text-success">${formatCurrency(totalSavings)}</span><br>
                    <small class="text-muted">(${totalSavingsPercent}% vs worst option)</small>
                </div>
            </div>
        </div>`;
    }

    resultsContainer.innerHTML = html;
}

function getCurrentData() {
    const data = {
        loanAmount: document.getElementById('loanAmount').value,
        loanTerm: document.getElementById('loanTerm').value,
        extraPayment: document.getElementById('extraPayment').value,
        currency: document.getElementById('currency').value,
        providers: [],
        timestamp: new Date().toISOString()
    };

    providersContainer.querySelectorAll('.provider-card').forEach(card => {
        const providerData = getProviderData(card);
        // Save all providers, even those without complete data
        data.providers.push(providerData);
    });

    return data;
}

function saveToLocalStorage() {
    if (isLoading) {
        console.log('Skipping save during loading');
        return; // Don't save while loading
    }

    try {
        const data = getCurrentData();
        localStorage.setItem('mortgageData', JSON.stringify(data));
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    isLoading = true; // Prevent saving during loading

    try {
        const savedData = localStorage.getItem('mortgageData');
        console.log('Loading data from localStorage:', savedData);

        if (!savedData) {
            console.log('No saved data found, adding default provider');
            addProvider();
            isLoading = false;
            return;
        }

        const data = JSON.parse(savedData);
        console.log('Parsed data:', data);

        // Clear existing providers
        providersContainer.innerHTML = '';
        providerCount = 0;

                // Restore form values (with error handling for removed fields)
        const loanAmountEl = document.getElementById('loanAmount');
        const loanTermEl = document.getElementById('loanTerm');
        const extraPaymentEl = document.getElementById('extraPayment');
        const currencyEl = document.getElementById('currency');

        if (loanAmountEl) loanAmountEl.value = data.loanAmount || '';
        if (loanTermEl) loanTermEl.value = data.loanTerm || '';
        if (extraPaymentEl) extraPaymentEl.value = data.extraPayment || '';
        if (currencyEl) currencyEl.value = data.currency || 'USD';

        // Restore providers
        if (data.providers && data.providers.length > 0) {
            console.log(`Restoring ${data.providers.length} providers`);
            data.providers.forEach((provider, index) => {
                console.log(`Adding provider ${index + 1}:`, provider);
                addProvider(provider);
            });
        } else {
            console.log('No providers in saved data, adding default provider');
            addProvider();
        }

    } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Add default provider if loading fails
        addProvider();
    } finally {
        isLoading = false; // Re-enable saving
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('mortgageData');
        window.location.reload();
    }
}

function exportData() {
    try {
        const data = getCurrentData();
        const jsonString = JSON.stringify(data);
        const encodedData = btoa(jsonString);

        // Create export modal
        const modalHtml = `
            <div class="modal fade" id="exportModal" tabindex="-1" aria-labelledby="exportModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                                                    <h5 class="modal-title" id="exportModalLabel">
                            <i class="fas fa-download"></i> Export Data
                        </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">Copy this encoded string to share your mortgage comparison scenario:</p>
                            <div class="mb-3">
                                <textarea class="form-control" id="exportedData" rows="6" readonly>${encodedData}</textarea>
                            </div>
                            <div class="alert alert-info">
                                <strong>How to share:</strong> Copy this string and send it to others. They can import it using the "Import Data" button.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="copyToClipboard()">
                                <i class="fas fa-clipboard"></i> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('exportModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM and show
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('exportModal'));
        modal.show();

    } catch (error) {
        alert('Error exporting data: ' + error.message);
    }
}

function showImportModal() {
    const modalHtml = `
        <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="importModalLabel">
                            <i class="fas fa-upload"></i> Import Data
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">Paste the encoded string you received to import a mortgage comparison scenario:</p>
                        <div class="mb-3">
                            <textarea class="form-control" id="importData" rows="6" placeholder="Paste the encoded string here..."></textarea>
                        </div>
                        <div class="alert alert-warning">
                            <strong>Warning:</strong> Importing will replace all current data. Make sure to export your current data first if you want to keep it.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="importData()">
                            <i class="fas fa-upload"></i> Import Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('importModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to DOM and show
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    modal.show();
}

function copyToClipboard() {
    const textarea = document.getElementById('exportedData');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');

        // Update button to show success
        const copyBtn = event.target.closest('button');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.remove('btn-primary');
        copyBtn.classList.add('btn-success');

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-primary');
        }, 2000);

    } catch (err) {
        alert('Failed to copy to clipboard. Please select and copy manually.');
    }
}

function importData() {
    try {
        const encodedData = document.getElementById('importData').value.trim();

        if (!encodedData) {
            alert('Please paste an encoded string to import.');
            return;
        }

        // Decode and parse the data
        const jsonString = atob(encodedData);
        const importedData = JSON.parse(jsonString);

        // Validate that it's mortgage data
        if (!importedData.loanAmount && !importedData.loanTerm && !importedData.providers) {
            alert('Invalid data format. Please check the encoded string.');
            return;
        }

        // Save to localStorage
        localStorage.setItem('mortgageData', JSON.stringify(importedData));

        // Close modal and reload page to show imported data
        const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
        modal.hide();

        // Reload the page to show imported data
        setTimeout(() => {
            window.location.reload();
        }, 300);

    } catch (error) {
        alert('Error importing data: Invalid encoded string. Please check the format and try again.');
    }
}

// Clean up old localStorage data format if needed
function cleanupOldData() {
    try {
        const savedData = localStorage.getItem('mortgageData');
        if (savedData) {
            const data = JSON.parse(savedData);
            // Remove old fields if they exist
            if (data.houseValue !== undefined || data.downPayment !== undefined) {
                console.log('Cleaning up old localStorage format...');
                delete data.houseValue;
                delete data.downPayment;
                localStorage.setItem('mortgageData', JSON.stringify(data));
            }
        }
    } catch (error) {
        console.log('Error cleaning up old data, clearing localStorage:', error);
        localStorage.removeItem('mortgageData');
    }
}

function addControlButtons() {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'card mb-4 shadow-sm';
    controlsDiv.innerHTML = `
        <div class="card-header bg-secondary text-white">
            <h5 class="mb-0"><i class="fas fa-cog me-2"></i>Data Management</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-4 mb-2">
                    <button class="btn btn-success w-100" onclick="exportData()">
                        <i class="fas fa-download me-1"></i> Export Data
                    </button>
                </div>
                <div class="col-md-4 mb-2">
                    <button class="btn btn-info w-100" onclick="showImportModal()">
                        <i class="fas fa-upload me-1"></i> Import Data
                    </button>
                </div>
                <div class="col-md-4 mb-2">
                    <button class="btn btn-danger w-100" onclick="clearAllData()">
                        <i class="fas fa-trash me-1"></i> Clear All Data
                    </button>
                </div>
            </div>
        </div>
    `;

    // Find the calculator section container and insert before the first card in it
    const calculatorSection = document.getElementById('calculator');
    if (calculatorSection) {
        const calculatorContainer = calculatorSection.querySelector('.container');
        const firstCard = calculatorContainer.querySelector('.card');
        if (calculatorContainer && firstCard) {
            calculatorContainer.insertBefore(controlsDiv, firstCard);
        }
    }
}

function updateCurrencySymbols() {
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect ? currencySelect.value : 'USD';

    // Currency symbol mapping
    const currencySymbols = {
        'USD': '$',
        'THB': '฿',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$',
        'JPY': '¥',
        'CHF': 'Fr.',
        'SGD': 'S$',
        'HKD': 'HK$',
        'NZD': 'NZ$'
    };

    const symbol = currencySymbols[currency] || '$';

    // Update currency symbols in input groups
    const currencySymbolEl = document.getElementById('currencySymbol');
    const extraCurrencySymbolEl = document.getElementById('extraCurrencySymbol');

    if (currencySymbolEl) {
        currencySymbolEl.textContent = symbol;
    }
    if (extraCurrencySymbolEl) {
        extraCurrencySymbolEl.textContent = symbol;
    }
}

function formatCurrency(number) {
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect ? currencySelect.value : 'USD';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}



function showSchedule(resultIndex, providerName) {
    if (!currentResults[resultIndex]) {
        alert('Schedule data not available');
        return;
    }

    const result = currentResults[resultIndex];
    const schedule = result.schedule;

    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="scheduleModal" tabindex="-1" aria-labelledby="scheduleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="scheduleModalLabel">
                            Amortization Schedule - ${providerName}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <strong>Total Cost:</strong> ${formatCurrency(result.totalCost)}
                            </div>
                            <div class="col-md-3">
                                <strong>Total Interest:</strong> ${formatCurrency(result.totalInterest)}
                            </div>
                            <div class="col-md-3">
                                <strong>Actual Term:</strong> ${result.actualTerm} months
                            </div>
                            <div class="col-md-3">
                                <strong>Total Payments:</strong> ${schedule.length}
                            </div>
                        </div>
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-striped table-sm">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th>Payment #</th>
                                        <th>Payment Amount</th>
                                        <th>Principal</th>
                                        <th>Interest</th>
                                        <th>Remaining Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${schedule.map(payment => `
                                        <tr>
                                            <td>${payment.month}</td>
                                            <td>${formatCurrency(payment.payment)}</td>
                                            <td>${formatCurrency(payment.principal)}</td>
                                            <td>${formatCurrency(payment.interest)}</td>
                                            <td>${formatCurrency(payment.remainingBalance)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="downloadSchedule(${resultIndex}, '${providerName.replace(/'/g, "\\'")}')">
                            Download CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('scheduleModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    modal.show();
}

function downloadSchedule(resultIndex, providerName) {
    if (!currentResults[resultIndex]) {
        alert('Schedule data not available');
        return;
    }

    const result = currentResults[resultIndex];
    const schedule = result.schedule;

    // Create CSV content
    let csvContent = "Payment Number,Payment Amount,Principal,Interest,Remaining Balance\n";

    schedule.forEach(payment => {
        csvContent += `${payment.month},${payment.payment.toFixed(2)},${payment.principal.toFixed(2)},${payment.interest.toFixed(2)},${payment.remainingBalance.toFixed(2)}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${providerName.replace(/[^a-z0-9]/gi, '_')}_amortization_schedule.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
