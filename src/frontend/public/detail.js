const BASE_DOMAIN_URL = 'http://127.0.0.1:8000/api/database/domain/'; 
const ALL_METRICS_URL = 'http://127.0.0.1:8000/api/database/metrics/all/'; 
const LIBRARY_API_URL = 'http://127.0.0.1:8000/api/database/libraries/'; 
const METRIC_BULK_URL = 'http://127.0.0.1:8000/api/database/library_metric_values/bulk-update/';
const GET_VALUE = 'http://127.0.0.1:8000/api/database/library_metric_values/table/';

let tableContainer;
let domainNameHeader;
let modal;
let addLibraryForm;
let updateButton;


function getDomainIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id'); 
}

function showMessage(message, isError = false) {
    const element = document.createElement('div');
    element.className = `p-3 rounded-lg mt-4 ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    element.textContent = message;
    const container = document.querySelector('.container');
    const tableWrapper = document.querySelector('.table-wrapper');
    
    if (tableWrapper && container.contains(tableWrapper)) {
        container.insertBefore(element, tableWrapper.parentElement);
    } else {
        container.prepend(element);
    }
    setTimeout(() => element.remove(), 5000);
}

//Fetching & Rendering

async function fetchAndRenderTable() {
    const domainId = getDomainIdFromUrl();
    if (!domainId) {
        if (domainNameHeader) domainNameHeader.textContent = 'Error: Domain ID not found.';
        if (tableContainer) tableContainer.innerHTML = `<p class='p-4 text-red-700'>Please provide a domain ID in the URL query parameter (e.g., ?id=1).</p>`;
        return;
    }

    if (domainNameHeader) domainNameHeader.textContent = 'Loading Domain Data...';
    if (tableContainer) tableContainer.innerHTML = '<p class="p-4 text-gray-500">Loading table...</p>';
    
    try {
        // 1. Fetch Domain Name
        const domainResponse = await fetch(`${BASE_DOMAIN_URL}${domainId}/`);
        if (!domainResponse.ok) throw new Error(`Domain HTTP error! Status: ${domainResponse.status}`);
        const domainData = await domainResponse.json();
        document.title = `${domainData.domain_name} Detail`;
        if (domainNameHeader) domainNameHeader.textContent = domainData.domain_name;

        // 2. Fetch all Metrics (Columns)
        const metricsResponse = await fetch(ALL_METRICS_URL);
        if (!metricsResponse.ok) throw new Error(`Metrics HTTP error! Status: ${metricsResponse.status}`);
        const metrics = await metricsResponse.json();
        
        // 3. Fetch Libraries and Metric Values
        const tableResponse = await fetch(`${GET_VALUE}?domain_id=${domainId}`); 
        if (!tableResponse.ok) throw new Error(`Table Data HTTP error! Status: ${tableResponse.status}`);
        const librariesWithValues = await tableResponse.json(); 
        
        // 4. Render the table
        const finalLibraries = Array.isArray(librariesWithValues) ? librariesWithValues : [];
        const finalMetrics = Array.isArray(metrics) ? metrics : [];
        
        renderLibraryMetricsTable(finalLibraries, finalMetrics);

    } catch (error) {
        console.error("Failed to fetch domain details:", error);
        if (domainNameHeader) domainNameHeader.textContent = `Error loading domain details.`;
        if (tableContainer) tableContainer.innerHTML = `<p class='mt-4 p-4 bg-red-100 text-red-700 rounded-lg'>Could not load table data: ${error.message}. Ensure your backend server is running and the domain ID is correct.</p>`;
    }
}

function renderLibraryMetricsTable(libraries, metrics) {
    if (!tableContainer) return;
    
    if (libraries.length === 0) {
        tableContainer.innerHTML = "<p class='mt-4 p-4 bg-yellow-50 rounded-lg'>No libraries registered for this domain yet. Use the '+ Add Library' button to start.</p>";
        return;
    }
    if (metrics.length === 0) {
        tableContainer.innerHTML = "<p class='mt-4 p-4 bg-yellow-50 rounded-lg'>No metrics defined. Add metrics to see columns.</p>";
        return;
    }

    let html = '<table class="min-w-full divide-y divide-gray-200">';
    
    html += '<thead><tr class="bg-indigo-600">';
    html += '<th class="sticky-col sticky left-0 bg-indigo-600 text-white p-3 text-left text-sm font-medium tracking-wider rounded-tl-lg">Library Name</th>';
    
    metrics.forEach(metric => {
        html += `<th data-metric-id="${metric.metric_ID}" class="p-3 text-white text-center text-sm font-medium tracking-wider">${metric.metric_name}</th>`;
    });
    
    html += '</tr></thead>';
    
    html += '<tbody class="divide-y divide-gray-200">';
    libraries.forEach(lib => {
        const libId = lib.library_id;
        
        html += `<tr class="bg-white hover:bg-indigo-50 transition duration-100">`;
        
        html += `
            <td class="sticky-col sticky left-0 bg-white p-3 text-sm font-medium text-gray-900 shadow-md">
                <a href="library_detail.html?id=${libId}" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
                    ${lib.library_name}
                </a>
            </td>
        `;
        
        // Fill cells
        metrics.forEach(metric => {
            const metricId = metric.metric_ID;
            const metricNameKey = metric.metric_name; 
            
            const val = lib[metricNameKey] ?? null; 
            const displayValue = val === null ? '' : val; 

            html += `
                <td 
                    data-library-id="${libId}" 
                    data-metric-id="${metricId}" 
                    contenteditable="true"
                    class="text-center font-mono p-3 text-sm text-gray-700 border-l border-r border-gray-100 cursor-text"
                >${displayValue}</td>
            `;
        });
        
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    tableContainer.innerHTML = html;
}

//Update

async function handleBulkUpdate() {
    if (!updateButton || !tableContainer) return;
    
    updateButton.disabled = true;
    updateButton.textContent = 'Updating...';

    const cells = tableContainer.querySelectorAll('td[contenteditable="true"]');
    const updates = [];

    cells.forEach(cell => {
        const libraryId = cell.dataset.libraryId; 
        const metricId = cell.dataset.metricId;
        const value = cell.textContent.trim();

        if (value !== '' && !isNaN(parseFloat(value))) {
            updates.push({
                library_id: libraryId, 
                metric_id: metricId, 
                value: value 
            });
        }
    });

    if (updates.length === 0) {
        showMessage("No scores were entered or changed.", true);
        updateButton.disabled = false;
        updateButton.textContent = 'Update All Scores';
        return;
    }

    try {
        const response = await fetch(METRIC_BULK_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            const result = await response.json();
            showMessage(result.status || "Scores updated successfully!");
            await fetchAndRenderTable();
        } else {
            const errorData = await response.json();
            showMessage(`Error updating scores: ${errorData.error || response.statusText}`, true);
        }
    } catch (error) {
        console.error("Network error during bulk update:", error);
        showMessage("Network error: Could not connect to API.", true);
    } finally {
        updateButton.disabled = false;
        updateButton.textContent = 'Update All Scores';
    }
}


//Library Submission Logic
async function addLibraryToDomain(domainId, url) {    
    let nameToUse;
    try {
        const url_path = new URL(url).pathname;
        nameToUse = url_path.split('/').filter(Boolean).pop().replace('.git', ''); 
    } catch (e) {
        showMessage("Invalid URL format provided.", true);
        return;
    }
    
    try {
        const response = await fetch(LIBRARY_API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                library_name: nameToUse, 
                url: url,
                domain: domainId
            })
        });

        if (response.ok) {
            const newLibrary = await response.json(); 
            showMessage(`Library ${newLibrary.library_name} added, and analysis results loaded automatically!`);
            
            setTimeout(fetchAndRenderTable, 500);
        } else {
            const errorData = await response.json();
            console.error("Failed to add library:", errorData);
            showMessage(`Error adding library: ${errorData.url?.[0] || errorData.library_name?.[0] || response.statusText}`, true);
        }
    } catch (error) {
        console.error("Network error adding library:", error);
        showMessage("Network error: Could not connect to API.", true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    tableContainer = document.getElementById('library-table-container');
    domainNameHeader = document.getElementById('domain-name-header');
    modal = document.getElementById('addLibraryModal');
    addLibraryForm = document.getElementById('add-library-form');
    updateButton = document.getElementById('update-metrics-btn');
    
    if (!tableContainer || !domainNameHeader || !modal || !addLibraryForm || !updateButton) {
        console.error("One or more required DOM elements could not be found.");
        return;
    }

    document.getElementById('add-library-btn').onclick = () => { modal.style.display = "block"; };
    document.querySelector('.close-btn').onclick = () => { modal.style.display = "none"; };
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

    addLibraryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const githubUrl = document.getElementById('githubUrl').value;
        const domainId = getDomainIdFromUrl();

        if (domainId) {
            modal.style.display = "none";
            showMessage(`Attempting to add library from ${githubUrl} and triggering analysis... This may take a moment.`);
            await addLibraryToDomain(domainId, githubUrl);
        } else {
            showMessage("Error: Domain ID is missing from the URL.", true);
        }
        
        addLibraryForm.reset();
    });

    updateButton.addEventListener('click', handleBulkUpdate);
    fetchAndRenderTable();
});