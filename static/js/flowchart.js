/**
 * Star Citizen Cargo Route Optimizer - Flowchart Visualization
 */

// Create a flowchart visualization of the route
function createRouteFlowchart(data) {
    const flowchartContainer = document.getElementById('route-flowchart-container');
    flowchartContainer.innerHTML = '';
    
    // Add each step to the flowchart
    for (let i = 0; i < data.route.length; i++) {
        const location = data.route[i];
        const action = data.mission_order[i - 1] || 'Start';
        const cargo = data.cargo_at_each_step[i];
        const cargoTypes = data.cargo_types_at_steps && data.cargo_types_at_steps[i] ? data.cargo_types_at_steps[i] : {};
        
        // Create a step container
        const stepElement = document.createElement('div');
        stepElement.className = 'flowchart-step';
        
        // Create the node
        const nodeElement = document.createElement('div');
        nodeElement.className = 'flowchart-node';
        nodeElement.dataset.stepIndex = i;
        
        // Create the completion section
        const completionDiv = document.createElement('div');
        completionDiv.className = 'flowchart-completion';
        completionDiv.innerHTML = `
            <label for="step-${i}">Mark as completed:</label>
        `;
        
        // Add checkbox for completion tracking
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'flowchart-checkbox';
        checkbox.id = `step-${i}`;
        checkbox.addEventListener('change', handleStepCompletion);
        
        // Add the checkbox to the completion section
        completionDiv.appendChild(checkbox);
        
        // Create the content
        let stepTitle = '';
        if (i === 0) {
            stepTitle = `Start: ${location}`;
        } else {
            const isPickup = action.toLowerCase().includes('pickup');
            stepTitle = isPickup ? `Pickup at ${location}` : `Dropoff at ${location}`;
        }
        
        // Add the node content
        nodeElement.innerHTML = `
            <div class="flowchart-header">
                <h5>${stepTitle}</h5>
                <div class="flowchart-icon">${i === 0 ? '🚀' : (action.toLowerCase().includes('pickup') ? '📥' : '📤')}</div>
            </div>
            <div class="flowchart-content">
                <p><span class="flowchart-label">Action:</span> ${action}</p>
                <p><span class="flowchart-label">Cargo:</span> ${cargo} SCU</p>
            </div>
        `;
        
        // Add cargo types if available
        if (Object.keys(cargoTypes).length > 0) {
            let cargoTypesHTML = '<div class="cargo-types-container">';
            cargoTypesHTML += '<p><span class="flowchart-label">Cargo Types:</span></p>';
            cargoTypesHTML += '<ul class="cargo-types-list">';
            
            for (const [type, amount] of Object.entries(cargoTypes)) {
                cargoTypesHTML += `<li><span class="cargo-type-name">${type}</span> <span class="cargo-type-amount">${amount} SCU</span></li>`;
            }
            
            cargoTypesHTML += '</ul></div>';
            
            // Append to the flowchart content
            const contentDiv = nodeElement.querySelector('.flowchart-content');
            contentDiv.innerHTML += cargoTypesHTML;
        }
        
        // Add the completion section to the node
        nodeElement.appendChild(completionDiv);
        
        // Add the node to the step
        stepElement.appendChild(nodeElement);
        
        // Add connector (arrow) if not last step
        if (i < data.route.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'flowchart-connector';
            stepElement.appendChild(connector);
        }
        
        // Add the step to the flowchart
        flowchartContainer.appendChild(stepElement);
    }
}

// Handle step completion checkbox changes
function handleStepCompletion(event) {
    const checkbox = event.target;
    const nodeElement = checkbox.closest('.flowchart-node');
    const stepIndex = nodeElement.dataset.stepIndex;
    
    // Update the node styling
    if (checkbox.checked) {
        nodeElement.classList.add('completed');
    } else {
        nodeElement.classList.remove('completed');
    }
    
    // Update the corresponding list item
    const listItem = document.querySelector(`#route-steps li[data-step-index="${stepIndex}"]`);
    if (listItem) {
        if (checkbox.checked) {
            listItem.classList.add('completed');
        } else {
            listItem.classList.remove('completed');
        }
    }
    
    // Save progress
    saveRouteProgress();
}

// Save route progress to localStorage
function saveRouteProgress() {
    const checkboxes = document.querySelectorAll('.flowchart-checkbox');
    const progress = Array.from(checkboxes).map(checkbox => checkbox.checked);
    
    // Save to localStorage
    localStorage.setItem('routeProgress', JSON.stringify(progress));
}

// Load route progress from localStorage
function loadRouteProgress() {
    const savedProgress = localStorage.getItem('routeProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const checkboxes = document.querySelectorAll('.flowchart-checkbox');
        
        // Only restore if the number of steps matches
        if (progress.length === checkboxes.length) {
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = progress[index];
                // Trigger the change event to update styling
                checkbox.dispatchEvent(new Event('change'));
            });
        }
    }
}

// Add a reset progress button to the UI
function addResetProgressButton(container) {
    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn-warning btn-sm mt-2';
    resetButton.textContent = 'Reset Progress';
    resetButton.onclick = function() {
        // Clear saved progress
        localStorage.removeItem('routeProgress');
        
        // Uncheck all checkboxes
        document.querySelectorAll('.flowchart-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        });
    };
    
    container.appendChild(resetButton);
} 