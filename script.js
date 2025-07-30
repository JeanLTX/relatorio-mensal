// ====================================================================
// NOVAS VARIÁVEIS PARA O SUPABASE
// SUBSTITUA PELAS SUAS CHAVES DO SUPABASE!
const SUPABASE_URL = 'https://sfahifkwumpgdtbwjmcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYWhpZmt3dW1wZ2R0YndqbWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTE4OTAsImV4cCI6MjA2OTM4Nzg5MH0.ukrnyr3_3aaqpZqUFSLyqL7axLAsezSmRKags1peveU';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ====================================================================

// Global arrays (agora serão preenchidas do Supabase para SKUs e Erros)
let skus = [];
let errors = [];
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]'); // Tasks ainda usam localStorage
let draggedTask = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() { // Adicione 'async' aqui
    initializeNavigation();
    initializeForms(); // Renomeado para initializeForms
    initializeActionCards();
    initializeKanban();
    
    await fetchAndRenderData(); // Nova função para buscar dados do Supabase
});

// ====================================================================
// NOVA FUNÇÃO PARA BUSCAR E RENDERIZAR DADOS DO SUPABASE
async function fetchAndRenderData() {
    await fetchSKUs();
    await fetchErrors();
    updateDashboardStats(); // Atualiza dashboard com dados do Supabase
    renderSKUs(); // Renderiza SKUs
    renderErrors(); // Renderiza Erros
    renderTasks(); // Kanban ainda usa localStorage, então pode manter
}

// Funções para buscar dados do Supabase
async function fetchSKUs() {
    const { data, error } = await supabase
        .from('skus')
        .select('*')
        .order('created_at', { ascending: false }); // Ordena do mais novo para o mais antigo

    if (error) {
        console.error('Erro ao buscar SKUs:', error.message);
        showToast('Erro ao carregar SKUs.', 'error');
        skus = []; // Garante que a lista esteja vazia em caso de erro
    } else {
        skus = data;
    }
}

async function fetchErrors() {
    const { data, error } = await supabase
        .from('errors')
        .select('*')
        .order('created_at', { ascending: false }); // Ordena do mais novo para o mais antigo

    if (error) {
        console.error('Erro ao buscar Erros:', error.message);
        showToast('Erro ao carregar Erros.', 'error');
        errors = []; // Garante que a lista esteja vazia em caso de erro
    } else {
        errors = data;
    }
}
// ====================================================================

// Navigation
function initializeNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            showPage(page);
            
            // Update active menu item
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Action cards navigation
function initializeActionCards() {
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action) {
                showPage(action);
                // Update menu
                const menuItems = document.querySelectorAll('.menu-item');
                menuItems.forEach(mi => mi.classList.remove('active'));
                const targetMenuItem = document.querySelector(`[data-page="${action}"]`);
                if (targetMenuItem) {
                    targetMenuItem.classList.add('active');
                }
            }
        });
    });
}

// ====================================================================
// ATUALIZAÇÃO DA FUNÇÃO initializeForms
function initializeForms() { // Renomeado de initializeForm para initializeForms
    // SKU Form
    document.getElementById('sku-form').addEventListener('submit', async function(e) { // Adicione 'async' aqui
        e.preventDefault();
        const name = document.getElementById('sku-name').value.trim();
        const code = document.getElementById('sku-code').value.trim();
        
        if (!name || !code) {
            showToast('Nome e código do SKU são obrigatórios', 'error');
            return;
        }
        
        const newSKU = {
            name,
            code,
            // id e created_at são gerados automaticamente pelo Supabase
        };
        
        // ====================================================================
        // ENVIAR PARA O SUPABASE
        const { data, error } = await supabase
            .from('skus')
            .insert([newSKU]);

        if (error) {
            console.error('Erro ao criar SKU no Supabase:', error.message);
            showToast(`Erro ao criar SKU: ${error.message}`, 'error');
            return;
        }
        // ====================================================================
        
        // Reset form
        this.reset();
        
        showToast(`SKU "${name}" criado com sucesso!`, 'success');
        await fetchAndRenderData(); // Refetch e re-renderiza todos os dados para atualizar
    });
    
    // Error Form
    document.getElementById('error-form').addEventListener('submit', async function(e) { // Adicione 'async' aqui
        e.preventDefault();
        const title = document.getElementById('error-title').value.trim();
        const description = document.getElementById('error-description').value.trim();
        const severity = document.getElementById('error-severity').value;
        
        if (!title || !description || !severity) {
            showToast('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        const newError = {
            title,
            description,
            severity,
            resolved: false // Valor padrão
            // id e created_at são gerados automaticamente pelo Supabase
        };
        
        // ====================================================================
        // ENVIAR PARA O SUPABASE
        const { data, error } = await supabase
            .from('errors')
            .insert([newError]);

        if (error) {
            console.error('Erro ao registrar erro no Supabase:', error.message);
            showToast(`Erro ao registrar erro: ${error.message}`, 'error');
            return;
        }
        // ====================================================================
        
        // Reset form
        this.reset();
        
        showToast(`Erro "${title}" registrado com sucesso!`, 'success');
        await fetchAndRenderData(); // Refetch e re-renderiza todos os dados para atualizar
    });
    
    // Task Form (mantém o mesmo código, pois ainda usa localStorage)
    document.getElementById('task-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        
        if (!title || !priority) {
            showToast('Título e prioridade são obrigatórios', 'error');
            return;
        }
        
        const newTask = {
            id: Date.now().toString(),
            title,
            description,
            priority,
            status: 'todo',
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Reset form and close modal
        this.reset();
        closeTaskModal();
        
        showToast(`Tarefa "${title}" criada com sucesso!`, 'success');
        renderTasks();
        updateDashboardStats();
    });
    
    // Calculator Form (mantém o mesmo código)
    document.getElementById('calculator-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const percentage = parseFloat(document.getElementById('percentage').value);
        const value = parseFloat(document.getElementById('value').value);
        
        if (isNaN(percentage) || isNaN(value)) {
            showToast('Por favor, insira valores numéricos válidos', 'error');
            return;
        }
        
        const result = (percentage / 100) * value;
        showCalculatorResult(percentage, value, result);
    });
}
// ====================================================================


// Dashboard stats (atualizado para usar 'skus' e 'errors' que virão do Supabase)
function updateDashboardStats() {
    // Count SKUs this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthSKUs = skus.filter(sku => {
        const skuDate = new Date(sku.created_at); // Alterado de 'createdAt' para 'created_at'
        return skuDate.getMonth() === thisMonth && skuDate.getFullYear() === thisYear;
    }).length;
    
    // Count errors last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentErrors = errors.filter(error => {
        return new Date(error.created_at) >= lastWeek; // Alterado de 'createdAt' para 'created_at'
    }).length;
    
    // Count open tasks (ainda usa localStorage)
    const openTasks = tasks.filter(task => task.status !== 'done').length;
    
    document.getElementById('total-skus').textContent = thisMonthSKUs;
    document.getElementById('total-errors').textContent = recentErrors;
    document.getElementById('total-tasks').textContent = openTasks;
}

// SKU management (atualizado para renderizar dados de 'skus' que virão do Supabase)
function renderSKUs() {
    const monthlyStats = getMonthlyStats(skus);
    const monthlyStatsContainer = document.getElementById('monthly-stats');
    const recentSKUsContainer = document.getElementById('recent-skus');
    
    // Render monthly stats
    if (monthlyStats.length > 0) {
        monthlyStatsContainer.innerHTML = monthlyStats.map(([month, count]) => `
            <div class="monthly-stat">
                <span>${month}</span>
                <span class="badge">${count} SKUs</span>
            </div>
        `).join('');
    } else {
        monthlyStatsContainer.innerHTML = '<p class="empty-state">Nenhum SKU criado ainda</p>';
    }
    
    // Render recent SKUs
    if (skus.length > 0) {
        recentSKUsContainer.innerHTML = skus.slice(0, 10).map(sku => {
            const date = new Date(sku.created_at); // Alterado de 'createdAt' para 'created_at'
            return `
                <div class="sku-item">
                    <div class="sku-info">
                        <h4>${sku.name}</h4>
                        <p>Código: ${sku.code}</p>
                    </div>
                    <div class="sku-date">
                        <div>${date.toLocaleDateString('pt-BR')}</div>
                        <div>${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        recentSKUsContainer.innerHTML = '<p class="empty-state">Nenhum SKU encontrado. Crie seu primeiro SKU!</p>';
    }
}

// Error management (atualizado para renderizar dados de 'errors' que virão do Supabase)
function renderErrors() {
    const errorStats = getErrorStats();
    const errorStatsContainer = document.getElementById('error-stats');
    const recentErrorsContainer = document.getElementById('recent-errors');
    
    // Render error stats
    if (Object.keys(errorStats).length > 0) {
        errorStatsContainer.innerHTML = Object.entries(errorStats).map(([severity, count]) => `
            <div class="monthly-stat">
                <span class="error-severity severity-${severity}">${getSeverityLabel(severity)}</span>
                <span class="badge">${count} erros</span>
            </div>
        `).join('');
    } else {
        errorStatsContainer.innerHTML = '<p class="empty-state">Nenhum erro registrado ainda</p>';
    }
    
    // Render recent errors
    if (errors.length > 0) {
        recentErrorsContainer.innerHTML = errors.slice(0, 10).map(error => {
            const date = new Date(error.created_at); // Alterado de 'createdAt' para 'created_at'
            return `
                <div class="error-item">
                    <div class="error-info">
                        <h4>${error.title}</h4>
                        <p>${error.description}</p>
                        <span class="error-severity severity-${error.severity}">${getSeverityLabel(error.severity)}</span>
                    </div>
                    <div class="error-date">
                        <div>${date.toLocaleDateString('pt-BR')}</div>
                        <div>${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        recentErrorsContainer.innerHTML = '<p class="empty-state">Nenhum erro encontrado. Registre o primeiro erro!</p>';
    }
}

// Kanban management (mantém o mesmo código, ainda usa localStorage)
function initializeKanban() {
    const addTaskBtn = document.getElementById('add-task-btn');
    addTaskBtn.addEventListener('click', openTaskModal);
    
    // Initialize drag and drop
    const columns = document.querySelectorAll('.column-content');
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });
}

function renderTasks() {
    const todoTasks = tasks.filter(task => task.status === 'todo');
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
    const doneTasks = tasks.filter(task => task.status === 'done');
    
    renderTaskColumn('todo-tasks', todoTasks);
    renderTaskColumn('in-progress-tasks', inProgressTasks);
    renderTaskColumn('done-tasks', doneTasks);
    
    // Update counters
    document.getElementById('todo-count').textContent = todoTasks.length;
    document.getElementById('in-progress-count').textContent = inProgressTasks.length;
    document.getElementById('done-count').textContent = doneTasks.length;
}

function renderTaskColumn(containerId, taskList) {
    const container = document.getElementById(containerId);
    
    if (taskList.length > 0) {
        container.innerHTML = taskList.map(task => {
            const date = new Date(task.createdAt);
            return `
                <div class="task-card" draggable="true" data-task-id="${task.id}">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
                        <span class="task-date">${date.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add drag event listeners
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });
    } else {
        container.innerHTML = '';
    }
}

// Drag and drop handlers (mantém o mesmo código, ainda usa localStorage)
function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedTask) return;
    
    const taskId = draggedTask.dataset.taskId;
    const newStatus = e.target.closest('.kanban-column').dataset.status;
    
    // Update task status
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
        updateDashboardStats();
        showToast('Tarefa movida com sucesso!', 'success');
    }
}

// Modal management (mantém o mesmo código)
function openTaskModal() {
    document.getElementById('task-modal').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
}

// Calculator
function showCalculatorResult(percentage, value, result) {
    const resultContainer = document.getElementById('calculator-result');
    resultContainer.innerHTML = `
        <div class="calculator-result">
            <div class="result-label">Resultado:</div>
            <div class="result-value">${result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="result-formula">${percentage}% de ${value} = ${result.toFixed(2)}</div>
        </div>
    `;
    resultContainer.style.display = 'block';
}

function useExample(percent, val, res) {
    document.getElementById('percentage').value = percent;
    document.getElementById('value').value = val;
    showCalculatorResult(percent, val, res);
}

function clearCalculation() {
    document.getElementById('percentage').value = '';
    document.getElementById('value').value = '';
    document.getElementById('calculator-result').style.display = 'none';
}

// Utility functions (atualizado para usar 'created_at' do Supabase)
function getMonthlyStats(items) {
    const monthlyCount = {};
    
    items.forEach(item => {
        const date = new Date(item.created_at); // Alterado de 'createdAt' para 'created_at'
        const monthKey = date.toLocaleDateString('pt-BR', { 
            year: 'numeric', 
            month: 'long' 
        });
        monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
    });
    
    return Object.entries(monthlyCount)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .reverse();
}

function getErrorStats() {
    const stats = {};
    errors.forEach(error => {
        stats[error.severity] = (stats[error.severity] || 0) + 1;
    });
    return stats;
}

function getSeverityLabel(severity) {
    const labels = {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta',
        critical: 'Crítica'
    };
    return labels[severity] || severity;
}

function getPriorityLabel(priority) {
    const labels = {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta'
    };
    return labels[priority] || priority;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('task-modal');
    if (e.target === modal) {
        closeTaskModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
});