const API_URL = 'http://127.0.0.1:8000/api/database/'; 
const domainListElement = document.getElementById('domain-list');
// Modal Elements
const modalDomain = document.getElementById('newDomainModal');
const modalMetric = document.getElementById('newMetricModal');
const openModalBtnDomain = document.getElementById('create-new-domain');
const openModalBtnMetric = document.getElementById('create-new-metric');
const closeButtons = document.querySelectorAll('.close-btn');
const domainForm = document.getElementById('create-domain-form');
const metricForm = document.getElementById('create-metric-form');



// When the user clicks the button, open the modal 
openModalBtnDomain.onclick = function() {
    modalDomain.style.display = "block";
}

openModalBtnMetric.onclick = function() {
    modalMetric.style.display = "block";
}


closeButtons.forEach(btn => {
    btn.onclick = function() {
        // Find the parent modal and close it
        const modalToClose = btn.closest('.modal');
        if (modalToClose) {
            modalToClose.style.display = "none";
            
            // Determine which form to reset based on the modal ID
            if (modalToClose.id === 'newDomainModal') {
                domainForm.reset();
            } else if (modalToClose.id === 'newMetricModal') {
                metricForm.reset();
            }
        }
    }
});

domainForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // Stop the default form submission

    const nameInput = document.getElementById('domainName').value;
    const descInput = document.getElementById('domainDescription').value;

    await createDomain(nameInput, descInput);

    // Close the modal and clear the form after submission
    modalDomain.style.display = "none";
    domainForm.reset();
});

metricForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // Stop the default form submission

    const nameInput = document.getElementById('metricName').value;
    const descInput = document.getElementById('metricDescription').value;

    await createMetric(nameInput, descInput);

    // Close the modal and clear the form after submission
    modalMetric.style.display = "none";
    domainForm.reset();
});

/**
 * Creates a new domain by sending a POST request to the API.
 */
async function createDomain(name, desc) {
    try {
        const response = await fetch(API_URL+'domain/', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                domain_name: name,
                description: desc 
            })
        });
        
        if (response.ok) {
            console.log("Domain created successfully!");
            // Refresh the list to show the new domain
            await fetchDomains(); 
        } else {
            const errorData = await response.json();
            console.error("Failed to create domain. Server errors:", errorData);
            alert("Error creating domain. Check console for details.");
        }
    } catch (error) {
        console.error("Network or Fetch Error:", error);
        alert("A network error occurred.");
    }
}

async function createMetric(name, desc) {
    try {
        const response = await fetch(API_URL+'metrics/', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                metric_name: name,
                description: desc 
            })
        });
        
        if (response.ok) {
            console.log("Metric created successfully!");
        } else {
            const errorData = await response.json();
            console.error("Failed to create metric. Server errors:", errorData);
            alert("Error creating metric. Check console for details.");
        }
    } catch (error) {
        console.error("Network or Fetch Error:", error);
        alert("A network error occurred.");
    }
}

//fetch domains

async function fetchDomains() {
    try {
        const response = await fetch(API_URL+'domain/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const domains = await response.json(); 
        domainListElement.innerHTML = '';

        if (domains.length === 0) {
            domainListElement.innerHTML = '<li>No domains found.</li>';
        } else {
            domains.forEach(domain => {
                //Create the card element
                const card = document.createElement('div');
                card.classList.add('domain-card');
                
                //Add the content and the ID
                const date = new Date(domain.created_at).toLocaleDateString(); 
                card.innerHTML = `
                    <strong>${domain.domain_name}</strong>
                    <p>${domain.description}</p>
                    <small>Created on: ${date}</small>
                `;
                
                //Attach the click listener for redirection
                card.addEventListener('click', () => {
                    //Redirect to the domain detail page
                    window.location.href = `domain_detail.html?id=${domain.domain_ID}`;
                });
                
                //Append the card to the list container
                domainListElement.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Could not fetch domains:", error);
        domainListElement.innerHTML = '<li>Error loading domains. Check console for details.</li>';
    }
}
fetchDomains();