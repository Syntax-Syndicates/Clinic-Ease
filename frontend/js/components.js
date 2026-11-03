// frontend/js/components.js
const components = {
    showModal(title, content, onSubmit) {
        let modal = document.getElementById('dynamicModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dynamicModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${title}</h2>
                ${content}
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn-primary" id="modalSubmit">Submit</button>
                    <button class="btn-secondary" id="modalClose">Cancel</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
        document.getElementById('modalSubmit').onclick = () => {
            onSubmit();
            modal.classList.remove('active');
        };
        document.getElementById('modalClose').onclick = () => {
            modal.classList.remove('active');
        };
    },

    hideModal() {
        const modal = document.getElementById('dynamicModal');
        if (modal) modal.classList.remove('active');
    },

    renderTable(columns, data, actions = null) {
        const toClass = (name) => name.toString().trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\-]/g, '');
        const toLabel = (name) => name.toString().trim().replace(/[_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const formatValue = (col, value) => {
            if (!value) return '-';
            if (col === 'appointment_date' || col === 'date_of_birth' || col === 'follow_up_date') {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            if (col === 'appointment_time') {
                const time = value.toString().slice(0, 5);
                const [hours, minutes] = time.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
            return value;
        };
        return `
            <table>
                <thead>
                    <tr>${columns.map(col => `<th class="col-${toClass(col)}">${toLabel(col)}</th>`).join('')}${actions ? '<th class="col-actions">Actions</th>' : ''}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => `<td class="col-${toClass(col)}">${formatValue(col, row[col])}</td>`).join('')}
                            ${actions ? `<td class="col-actions">${actions(row)}</td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};