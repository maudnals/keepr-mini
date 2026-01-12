document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const personList = document.getElementById('person-list');
    const emptyState = document.getElementById('empty-state');
    const adminList = document.getElementById('admin-list');
    const adminAddBtn = document.getElementById('admin-add-btn');

    // Tabs logic
    const tabOverdue = document.getElementById('tab-overdue');
    const tabOntrack = document.getElementById('tab-ontrack');
    let activeTab = 'overdue'; // 'overdue' or 'ontrack'

    // Modal Elements (likely only on Admin page)
    const addModal = document.getElementById('add-modal');
    const addForm = document.getElementById('add-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const modalTitle = document.getElementById('modal-title');

    // Data
    let people = JSON.parse(localStorage.getItem('keepr_people')) || [];
    let editingIndex = null;

    // --- Core Logic ---

    function savePeople() {
        localStorage.setItem('keepr_people', JSON.stringify(people));
        // Refresh whichever view is active
        if (personList) render();
        if (adminList) renderAdmin();
    }

    function calculateDueDate(lastCheckin, frequencyDays) {
        const last = new Date(lastCheckin);
        const due = new Date(last);
        due.setDate(last.getDate() + parseInt(frequencyDays));
        return due;
    }

    // --- Main View (Index) Logic ---

    function render() {
        if (!personList) return;

        // Clear list but keep empty state
        const items = personList.querySelectorAll('.person-card, .section-header, .tab-empty-msg');
        items.forEach(i => i.remove());

        // Handle global empty state (no people at all)
        if (people.length === 0) {
            emptyState.style.display = 'flex';
            if (tabOverdue) tabOverdue.parentElement.style.display = 'none'; // Hide tabs if no people
        } else {
            emptyState.style.display = 'none';
            if (tabOverdue) tabOverdue.parentElement.style.display = 'flex'; // Show tabs

            // Sort by overdue status
            people.sort((a, b) => {
                const dueA = calculateDueDate(a.lastCheckin, a.frequency);
                const dueB = calculateDueDate(b.lastCheckin, b.frequency);
                return dueA - dueB;
            });

            const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });

            let hasVisibleItems = false;

            people.forEach((person, index) => {
                const dueDate = calculateDueDate(person.lastCheckin, person.frequency);
                const now = new Date();
                const compareDate = new Date(dueDate);
                compareDate.setHours(23, 59, 59, 999);

                const isDue = now > compareDate;

                // Filtering based on Active Tab
                if (activeTab === 'overdue' && !isDue) return;
                if (activeTab === 'ontrack' && isDue) return;

                hasVisibleItems = true;

                const card = document.createElement('div');
                const categoryClass = person.label ? `cat-${person.label}` : '';
                card.className = `person-card ${categoryClass} ${isDue ? 'status-due' : ''}`;

                const formattedDate = dateFormatter.format(dueDate);
                const lastDate = dateFormatter.format(new Date(person.lastCheckin));
                const dateText = isDue ? `✳︎ Due ${formattedDate}` : `Next: ${formattedDate}`;

                card.innerHTML = `
                    <button class="round-checkbox" onclick="checkIn(${index})" aria-label="Mark done"></button>
                    <div class="person-info">
                        <h3>${person.name}</h3>
                        <div class="status-text">
                            ${dateText}
                        </div>
                        <div class="status-text last-check-in">
                            Last: ${lastDate}
                        </div>
                    </div>
                    
                    ${person.label ? `<div class="badge">${person.label.replace('-', ' ')}</div>` : '<div></div>'}
                `;

                personList.appendChild(card);
            });

            // Tab specific empty state
            if (!hasVisibleItems) {
                const msg = document.createElement('div');
                msg.className = 'tab-empty-msg';
                msg.style.textAlign = 'center';
                msg.style.marginTop = '40px';
                msg.style.color = 'var(--text-muted)';
                msg.innerHTML = activeTab === 'overdue'
                    ? '<p>You\'re all caught up! 🎉</p>'
                    : '<p>No one is officially "on track" (check overdue?).</p>';
                personList.appendChild(msg);
            }
        }
    }

    // Tab Switching Logic
    if (tabOverdue && tabOntrack) {
        tabOverdue.addEventListener('click', () => {
            activeTab = 'overdue';
            tabOverdue.classList.add('active');
            tabOntrack.classList.remove('active');
            render();
        });

        tabOntrack.addEventListener('click', () => {
            activeTab = 'ontrack';
            tabOntrack.classList.add('active');
            tabOverdue.classList.remove('active');
            render();
        });
    }

    // --- Admin View Logic ---

    function renderAdmin() {
        if (!adminList) return;
        adminList.innerHTML = '';
        people.forEach((person, index) => {
            const item = document.createElement('div');
            item.className = 'admin-item';

            let freqText = `${person.frequency} day(s)`;
            if (person.frequency % 30 === 0) freqText = `${person.frequency / 30} month(s)`;
            else if (person.frequency % 7 === 0) freqText = `${person.frequency / 7} week(s)`;

            item.innerHTML = `
                <div class="person-info" style="flex:1">
                    <div class="admin-item-name">
                        ${person.name} 
                        ${person.label ? `<span class="badge" style="margin-left:8px; font-size:0.7em; padding: 1px 6px;">${person.label}</span>` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        Every ${freqText}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn edit" onclick="openEdit(${index})" aria-label="Edit">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="admin-action-btn delete" onclick="deletePerson(${index})" aria-label="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
            adminList.appendChild(item);
        });
    }

    // --- Form Logic (Shared/Admin) ---

    function openForm(index = null) {
        if (!addModal) return;
        editingIndex = index;
        addForm.reset();

        if (index !== null) {
            // Edit Mode
            const person = people[index];
            modalTitle.textContent = "Edit Person";
            addForm.name.value = person.name;
            addForm.label.value = person.label || '';

            let freq = person.frequency;
            let unit = 'days';
            if (freq % 30 === 0) { freq /= 30; unit = 'months'; }
            else if (freq % 7 === 0) { freq /= 7; unit = 'weeks'; }

            addForm.frequency.value = freq;
            addForm.unit.value = unit;
        } else {
            // New Mode
            modalTitle.textContent = "New Person";
            addForm.frequency.value = 7;
        }
        addModal.showModal();
    }

    // Event Listeners
    if (adminAddBtn) {
        adminAddBtn.addEventListener('click', () => openForm(null));
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => addModal.close());
    }

    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(addForm);
            const name = formData.get('name');
            const label = formData.get('label');
            let frequency = parseInt(formData.get('frequency'));
            const unit = formData.get('unit');

            if (unit === 'weeks') frequency *= 7;
            if (unit === 'months') frequency *= 30;

            if (editingIndex !== null) {
                // Update
                people[editingIndex].name = name;
                people[editingIndex].label = label;
                people[editingIndex].frequency = frequency;
                showToast('Person updated');
            } else {
                // Create
                people.push({
                    name,
                    label,
                    frequency,
                    lastCheckin: new Date().toISOString()
                });
                showToast('Person added');
            }

            savePeople();
            addModal.close();
        });
    }

    // --- Global Actions (exposed to window for onclick) ---

    window.checkIn = (index) => {
        const person = people[index];
        const wasDue = new Date() > calculateDueDate(person.lastCheckin, person.frequency);

        person.lastCheckin = new Date().toISOString();
        savePeople();

        const msg = wasDue ? `Checked in with ${person.name}!` : `Early check-in with ${person.name}!`;
        showToast(msg);
    };

    window.openEdit = (index) => {
        openForm(index);
    };

    window.deletePerson = (index) => {
        if (confirm(`Remove ${people[index].name}?`)) {
            people.splice(index, 1);
            savePeople();
            showToast('Person removed');
        }
    };

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const toastMsg = document.getElementById('toast-message');

        toastMsg.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // --- Initialization ---
    if (personList) render();
    if (adminList) renderAdmin();
});
