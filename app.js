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
    let expandedIndices = new Set();

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

                if (expandedIndices.has(index)) {
                    card.classList.add('expanded');
                }

                const formattedDate = dateFormatter.format(dueDate);
                const lastDate = dateFormatter.format(new Date(person.lastCheckin));
                const dateText = isDue ? `✳︎ Due ${formattedDate}` : `Next: ${formattedDate}`;

                // Calculate frequency text
                let freqText;
                if (person.frequency === 1) freqText = 'Daily';
                else if (person.frequency === 7) freqText = 'Weekly';
                else if (person.frequency === 30) freqText = 'Monthly';
                else {
                    let count = person.frequency;
                    let unit = 'days';
                    if (count % 30 === 0) { count /= 30; unit = 'months'; }
                    else if (count % 7 === 0) { count /= 7; unit = 'weeks'; }
                    freqText = `Every ${count} ${unit}`;
                }

                // Notes - editable
                const notesHtml = `
                <div class="note-wrapper">
                    <div class="person-notes" id="note-${index}" contenteditable="true" 
                        onclick="handleNoteClick(event, this)" 
                        oninput="checkNoteChange(${index}, this.innerText)"
                        onblur="updateNote(${index}, this.innerText)">${person.notes || ''}</div>
                    <div class="note-actions">
                        <button class="note-btn note-btn-discard" onmousedown="event.preventDefault()" onclick="event.stopPropagation(); discardNote(${index})">Discard note edits</button>
                        <button class="note-btn note-btn-save" id="save-btn-${index}" disabled onmousedown="event.preventDefault()" onclick="event.stopPropagation(); saveNoteManual(${index})">Save note edits</button>
                    </div>
                </div>`;

                card.onclick = function () {
                    this.classList.toggle('expanded');
                    if (this.classList.contains('expanded')) expandedIndices.add(index);
                    else expandedIndices.delete(index);
                };

                card.innerHTML = `
                    <button class="round-checkbox" onclick="event.stopPropagation(); checkIn(${index})" aria-label="Mark done"></button>
                    <div class="person-info">
                        <div class="person-name-label">
                            <h3>${person.name}</h3>
                            ${person.label ? `<div class="badge">${person.label.replace('-', ' ')}</div>` : '<div></div>'}
                        </div>
                        <div class="status-text">
                            ${dateText}
                        </div>
                        ${notesHtml}
                        <div class="card-details">
                            <div>Target check-in frequency: ${freqText}</div>
                            <div>Last check-in: ${lastDate}</div>
                        </div>
                    </div>

                    <div class="kebab-menu-container">
                        <button class="kebab-btn" onclick="toggleMenu(event, ${index})" aria-label="Options">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                        <div id="menu-${index}" class="kebab-dropdown">
                            <button class="kebab-item" onclick="openEdit(${index})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                            </button>
                            <button class="kebab-item delete" onclick="deletePerson(${index})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Remove
                            </button>
                        </div>
                    </div>
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

        // Create a sorted list with original indices to ensure actions target correct person
        const sortedPeople = people.map((p, i) => ({ ...p, originalIndex: i }))
            .sort((a, b) => a.name.localeCompare(b.name));

        sortedPeople.forEach((personWithIndex) => {
            const person = people[personWithIndex.originalIndex]; // Get original ref or use copy
            const index = personWithIndex.originalIndex;

            const item = document.createElement('div');
            item.className = 'admin-item';

            let freqText;
            if (person.frequency === 1) freqText = 'Daily';
            else if (person.frequency === 7) freqText = 'Weekly';
            else if (person.frequency === 30) freqText = 'Monthly';
            else {
                let count = person.frequency;
                let unit = 'days';
                if (count % 30 === 0) { count /= 30; unit = 'months'; }
                else if (count % 7 === 0) { count /= 7; unit = 'weeks'; }
                freqText = `Every ${count} ${unit}`;
            }

            item.innerHTML = `
                <div class="person-info" style="flex:1">
                    <div class="admin-item-name">
                        ${person.name} 
                        ${person.label ? `<span class="badge" style="margin-left:8px; font-size:0.7em; padding: 1px 6px;">${person.label}</span>` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${freqText}
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
            modalTitle.textContent = "Edit person";
            addForm.name.value = person.name;
            addForm.label.value = person.label || '';
            if (addForm.notes) addForm.notes.value = person.notes || '';

            // Populate Last Check-in
            if (addForm.lastCheckin && person.lastCheckin) {
                // Use simple ISO date part for input
                addForm.lastCheckin.value = person.lastCheckin.split('T')[0];
            }

            let freq = person.frequency;
            let unit = 'days';
            if (freq % 30 === 0) { freq /= 30; unit = 'months'; }
            else if (freq % 7 === 0) { freq /= 7; unit = 'weeks'; }

            addForm.frequency.value = freq;
            addForm.unit.value = unit;
        } else {
            // New Mode
            modalTitle.textContent = "New person";
            addForm.frequency.value = 7;
            if (addForm.lastCheckin) {
                addForm.lastCheckin.value = new Date().toISOString().split('T')[0];
            }
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
            const notes = formData.get('notes'); // Get notes
            let lastCheckin = formData.get('lastCheckin'); // Get date input

            // Format date to ISO if present, else default
            if (lastCheckin) {
                // Determine if we need to preserve time or just use date?
                // Using new Date(dateString) creates UTC midnight. 
                lastCheckin = new Date(lastCheckin).toISOString();
            } else {
                lastCheckin = new Date().toISOString();
            }

            let frequency = parseInt(formData.get('frequency'));
            const unit = formData.get('unit');

            if (unit === 'weeks') frequency *= 7;
            if (unit === 'months') frequency *= 30;

            if (editingIndex !== null) {
                // Update
                people[editingIndex].name = name;
                people[editingIndex].label = label;
                people[editingIndex].notes = notes;
                people[editingIndex].lastCheckin = lastCheckin; // Update date
                people[editingIndex].frequency = frequency;
                showToast('Person updated');
            } else {
                // Create
                people.push({
                    name,
                    label,
                    notes,
                    frequency,
                    lastCheckin: lastCheckin // Use from form
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
        ``
        const msg = wasDue ? `Checked in with ${person.name}!` : `Checked in with ${person.name}!`;
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

    window.toggleMenu = (event, index) => {
        event.stopPropagation();
        // Close all others
        document.querySelectorAll('.kebab-dropdown').forEach(d => {
            if (d.id !== `menu-${index}`) d.classList.remove('show');
        });
        const menu = document.getElementById(`menu-${index}`);
        if (menu) menu.classList.toggle('show');
    };

    window.handleNoteClick = (event, element) => {
        const card = element.closest('.person-card');
        if (card && card.classList.contains('expanded')) {
            event.stopPropagation();
        }
    };

    window.updateNote = (index, text) => {
        const cleanText = text.trim();
        if (people[index].notes !== cleanText) {
            people[index].notes = cleanText;
            savePeople(); // Triggers render
            showToast('Note saved');
        }
    };

    window.saveNoteManual = (index) => {
        const noteEl = document.getElementById(`note-${index}`);
        if (noteEl) {
            updateNote(index, noteEl.innerText);
        }
    };

    window.checkNoteChange = (index, text) => {
        const btn = document.getElementById(`save-btn-${index}`);
        if (btn) {
            const original = people[index].notes || '';
            btn.disabled = (original === text.trim());
        }
    };

    window.discardNote = (index) => {
        const noteEl = document.getElementById(`note-${index}`);
        if (noteEl) {
            noteEl.innerText = people[index].notes || '';
            noteEl.blur();
            const btn = document.getElementById(`save-btn-${index}`);
            if (btn) btn.disabled = true;
        }
    };

    window.addEventListener('click', () => {
        document.querySelectorAll('.kebab-dropdown').forEach(d => d.classList.remove('show'));
    });

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
