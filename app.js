document.addEventListener('DOMContentLoaded', () => {
    const personList = document.getElementById('person-list');
    const emptyState = document.getElementById('empty-state');
    const addBtn = document.getElementById('add-btn');
    const addModal = document.getElementById('add-modal');
    const addForm = document.getElementById('add-form');
    const cancelBtn = document.getElementById('cancel-btn');

    let people = JSON.parse(localStorage.getItem('keepr_people')) || [];



    function savePeople() {
        localStorage.setItem('keepr_people', JSON.stringify(people));
        render();
    }

    function calculateDueDate(lastCheckin, frequencyDays) {
        const last = new Date(lastCheckin);
        const due = new Date(last);
        due.setDate(last.getDate() + parseInt(frequencyDays));
        return due;
    }

    function getDaysOverdue(dueDate) {
        const now = new Date();
        const diffTime = now - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    function render() {
        // Clear list but keep empty state
        const items = personList.querySelectorAll('.person-card');
        items.forEach(i => i.remove());

        if (people.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';

            // Sort by overdue status (most overdue first)
            people.sort((a, b) => {
                const dueA = calculateDueDate(a.lastCheckin, a.frequency);
                const dueB = calculateDueDate(b.lastCheckin, b.frequency);
                return dueA - dueB;
            });

            people.forEach((person, index) => {
                const dueDate = calculateDueDate(person.lastCheckin, person.frequency);
                const now = new Date();
                const isDue = now > dueDate;
                const daysDiff = getDaysOverdue(dueDate); // positive if overdue

                const card = document.createElement('div');
                card.className = `person-card ${isDue ? 'status-due' : 'status-ok'}`;

                let statusText = '';
                if (isDue) {
                    statusText = daysDiff === 1 ? 'Due yesterday' : `Due ${daysDiff} days ago`;
                    if (daysDiff === 0) statusText = 'Due today';
                } else {
                    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                    statusText = daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`;
                }

                card.innerHTML = `
                    <div class="person-info">
                        <h3>${person.name}</h3>
                        <div class="status-text">
                            <div class="status-indicator"></div>
                            <span>${statusText}</span>
                        </div>
                    </div>
                    <button class="checkin-btn" onclick="checkIn(${index})">
                        Done
                    </button>
                    <button class="secondary-btn" style="padding: 4px 8px; margin-left:8px; opacity:0.3;" onclick="deletePerson(${index})">x</button>
                `;
                personList.appendChild(card);


            });
        }
    }

    // Modal logic
    addBtn.addEventListener('click', () => {
        addModal.showModal();
    });

    cancelBtn.addEventListener('click', () => {
        addModal.close();
    });

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(addForm);
        const name = formData.get('name');
        let frequency = parseInt(formData.get('frequency'));
        const unit = formData.get('unit');

        if (unit === 'weeks') frequency *= 7;
        if (unit === 'months') frequency *= 30;

        people.push({
            name,
            frequency, // stored in days
            lastCheckin: new Date().toISOString()
        });

        savePeople();
        addForm.reset();
        addModal.close();
    });

    window.checkIn = (index) => {
        const person = people[index];
        const wasDue = new Date() > calculateDueDate(person.lastCheckin, person.frequency);

        person.lastCheckin = new Date().toISOString();
        savePeople();

        const msg = wasDue ? `Checked in with ${person.name}!` : `Updated ${person.name}'s check-in!`;
        showToast(msg);
    };

    window.deletePerson = (index) => {
        if (confirm('Remove this person?')) {
            people.splice(index, 1);
            savePeople();
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-message');

        toastMsg.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }



    // Check on load
    render();
});
