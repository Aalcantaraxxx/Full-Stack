class Task {
    constructor(title, description, priority, dueDate) {
        this.id = crypto.randomUUID();
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.dueDate = dueDate;
        this.status = 'todo';
        this.createdAt = new Date();
    }
}

class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('angelTasks')) || [];
        this.currentView = 'board'; 
        
        // Carga tema guardado
        const theme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', theme);
        if(theme === 'dark') document.getElementById('theme-toggle').checked = true;

        this.initEventListeners();
        this.renderBoard();
    }

    save() {
        localStorage.setItem('angelTasks', JSON.stringify(this.tasks));
        this.renderBoard();
        this.renderCalendar(); 
    }

    addTask(title, desc, priority, date) {
        const newTask = new Task(title, desc, priority, date);
        this.tasks.push(newTask);
        this.save();
    }

    deleteTask(id) {
        if(confirm('¿Seguro que quieres borrar esta tarea?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
        }
    }

    updateStatus(id, newStatus) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.status = newStatus;
            this.save();
        }
    }

    clearAllData() {
        if(confirm('ADVERTENCIA: ¿Borrar todas las tareas? Esto no se puede deshacer.')) {
            this.tasks = [];
            this.save();
            alert('Sistema restablecido.');
        }
    }

    switchView(viewName) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));

        document.getElementById(`view-${viewName}`).classList.remove('hidden');
        document.getElementById(`nav-${viewName}`).classList.add('active');

        const titles = {
            'board': 'Tablero Principal',
            'calendar': 'Calendario',
            'settings': 'Configuración'
        };
        document.getElementById('current-view-name').innerText = titles[viewName];
        
        this.currentView = viewName;

        if (viewName === 'calendar') this.renderCalendar();
    }

    // --- Drag & Drop ---
    drag(e, id) {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
    }
    allowDrop(e) { e.preventDefault(); }
    drop(e, newStatus) {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        this.updateStatus(id, newStatus);
    }

    formatDate(dateString) {
        if (!dateString) return 'Sin fecha';
        const date = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
    }
    isOverdue(dateString, status) {
        if (!dateString || status === 'done') return false;
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(dateString + 'T00:00:00');
        return due < today;
    }

    renderBoard() {
        ['todo', 'inprogress', 'done'].forEach(status => {
            const list = document.getElementById(`list-${status}`);
            if(list) list.innerHTML = ''; 
            document.getElementById(`count-${status}`).innerText = '0';
        });

        const counts = { todo: 0, inprogress: 0, done: 0 };

        this.tasks.forEach(task => {
            counts[task.status]++;
            const container = document.getElementById(`list-${task.status}`);
            if (!container) return; 

            const card = document.createElement('div');
            const overdueClass = this.isOverdue(task.dueDate, task.status) ? 'overdue' : '';
            const dateIcon = this.isOverdue(task.dueDate, task.status) ? 'event_busy' : 'calendar_today';

            card.className = 'task-card';
            card.draggable = true;
            card.addEventListener('dragstart', (e) => this.drag(e, task.id));

            card.innerHTML = `
                <div class="task-header">
                    <span class="task-title">${task.title}</span>
                    <span class="material-symbols-outlined trash-btn" onclick="app.deleteTask('${task.id}')" style="font-size: 1.2rem;">delete</span>
                </div>
                <p class="task-desc">${task.description}</p>
                <div class="task-meta">
                    <span class="badge badge-${task.priority}">${task.priority}</span>
                    <div class="date-tag ${overdueClass}">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">${dateIcon}</span>
                        ${this.formatDate(task.dueDate)}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        Object.keys(counts).forEach(key => {
            const el = document.getElementById(`count-${key}`);
            if(el) el.innerText = counts[key];
        });
    }

    renderCalendar() {
        const container = document.getElementById('calendar-list');
        container.innerHTML = '';

        // Agrupa tareas por fecha
        const tasksByDate = this.tasks.reduce((acc, task) => {
            const dateKey = task.dueDate || 'Sin Fecha';
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
        }, {});

        // Ordena fechas
        const sortedDates = Object.keys(tasksByDate).sort();

        if (sortedDates.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No hay tareas programadas.</p>';
            return;
        }

        sortedDates.forEach(date => {
            const group = document.createElement('div');
            group.className = 'calendar-group';
            
            const displayDate = date === 'Sin Fecha' ? 'Sin Fecha Asignada' : this.formatDate(date);
            
            let itemsHtml = '';
            tasksByDate[date].forEach(task => {
                const statusMap = { 'todo': 'Por Hacer', 'inprogress': 'En Curso', 'done': 'Finalizado' };
                itemsHtml += `
                    <div class="calendar-item">
                        <span class="calendar-item-title">${task.title}</span>
                        <span class="calendar-item-status">${statusMap[task.status]}</span>
                    </div>
                `;
            });

            group.innerHTML = `
                <div class="calendar-header">${displayDate}</div>
                ${itemsHtml}
            `;
            container.appendChild(group);
        });
    }

    initEventListeners() {
        const modal = document.getElementById('modal-overlay');
        const btnNew = document.getElementById('btn-nueva-tarea');
        const btnCancel = document.getElementById('btn-cancel');
        const btnClose = document.getElementById('btn-close-modal');
        const btnSave = document.getElementById('btn-save');
        const themeToggle = document.getElementById('theme-toggle');

        const openModal = () => {
            document.getElementById('input-title').value = '';
            document.getElementById('input-desc').value = '';
            document.getElementById('input-date').value = '';
            modal.classList.remove('hidden');
        };
        const closeModal = () => modal.classList.add('hidden');

        btnNew.addEventListener('click', openModal);
        btnCancel.addEventListener('click', closeModal);
        btnClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

        btnSave.addEventListener('click', () => {
            const title = document.getElementById('input-title').value;
            const desc = document.getElementById('input-desc').value;
            const prio = document.getElementById('input-priority').value;
            const date = document.getElementById('input-date').value;

            if (title.trim()) {
                this.addTask(title, desc, prio, date);
                closeModal();
            } else {
                alert('El título es obligatorio');
            }
        });

        // Dark Mode
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

const app = new TaskManager();