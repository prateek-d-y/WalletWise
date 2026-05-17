



let accounts = JSON.parse(localStorage.getItem('walletwise_accounts')) || [];
let transactions = JSON.parse(localStorage.getItem('walletwise_transactions')) || [];
let currentDateOffset = new Date();

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');


function initApp() {

    const savedTheme = localStorage.getItem('walletwise_theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('trans-datetime').value = now.toISOString().slice(0,16);

    updateUI();
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('walletwise_theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    
    if(expensePieChart) updateCharts();
});


navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        views.forEach(view => view.classList.add('hidden'));
        views.forEach(view => view.classList.remove('active'));

        const targetId = item.getAttribute('data-target');
        const matchingNavs = document.querySelectorAll(`.nav-item[data-target="${targetId}"]`);
        matchingNavs.forEach(nav => nav.classList.add('active'));
        
        const targetView = document.getElementById(targetId);
        targetView.classList.remove('hidden');
        targetView.classList.add('active');

        if(item.getAttribute('data-target') === 'analysis-view') {
            updateCharts();
        }
    });
});


window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
    if(modalId === 'transaction-modal') {
        populateAccountSelect();
    }
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}


document.getElementById('account-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('acc-name').value;
    const balance = parseFloat(document.getElementById('acc-balance').value);

    const newAccount = {
        id: Date.now().toString(),
        name,
        balance
    };

    accounts.push(newAccount);
    saveData();
    closeModal('account-modal');
    e.target.reset();
    updateUI();
});

function populateAccountSelect() {
    const select = document.getElementById('trans-account');
    select.innerHTML = '';
    
    if(accounts.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No accounts found. Create one first!</option>';
        return;
    }

    accounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = `${acc.name} (₹${acc.balance})`;
        select.appendChild(option);
    });
}

const typeRadios = document.querySelectorAll('input[name="type"]');
const categorySelect = document.getElementById('trans-category');

const transCategories = {
    expense: [
        {val: 'Food', label: 'Food 🍔'},
        {val: 'Transport', label: 'Transport 🚗'},
        {val: 'Education', label: 'Education 📚'},
        {val: 'Health', label: 'Health ❤️'},
        {val: 'Social', label: 'Social 🎉'},
        {val: 'Shopping', label: 'Shopping 🛍️'},
        {val: 'Rent', label: 'Rent 🏠'},
        {val: 'Others', label: 'Others ✨'}
    ],
    income: [
        {val: 'Salary', label: 'Salary 💰'},
        {val: 'Rewards', label: 'Rewards 🏆'},
        {val: 'Business', label: 'Business 💼'},
        {val: 'Dividends', label: 'Dividends 📈'},
        {val: 'Others', label: 'Others ✨'}
    ]
};

function updateCategoryOptions(type) {
    categorySelect.innerHTML = '';
    transCategories[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.val;
        option.textContent = cat.label;
        categorySelect.appendChild(option);
    });
}

typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateCategoryOptions(e.target.value);
    });
});

updateCategoryOptions('expense');


document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if(accounts.length === 0) {
        alert("Please create an account first!");
        return;
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const accountId = document.getElementById('trans-account').value;
    const category = document.getElementById('trans-category').value;
    const datetime = document.getElementById('trans-datetime').value;
    const notes = document.getElementById('trans-notes').value;

    if(!accountId) return;

    const accountIndex = accounts.findIndex(a => a.id === accountId);
    if(accountIndex !== -1) {
        if(type === 'expense') {
            if(accounts[accountIndex].balance < amount) {
                if(!confirm(`Warning: Not enough balance in ${accounts[accountIndex].name}. Proceed anyway?`)) {
                    return;
                }
            }
            accounts[accountIndex].balance -= amount;
        } else {
            accounts[accountIndex].balance += amount;
        }
    }

    const newTx = {
        id: Date.now().toString(),
        type,
        amount,
        accountId,
        accountName: accounts[accountIndex].name,
        category,
        datetime,
        notes
    };

    transactions.push(newTx);
    saveData();
    closeModal('transaction-modal');
    e.target.reset();
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('trans-datetime').value = now.toISOString().slice(0,16);
    
    updateUI();
});


function updateUI() {
    renderAccounts();
    renderTransactions();
    calculateTotals();
}

function renderAccounts() {
    const list = document.getElementById('accounts-list');
    list.innerHTML = '';

    if(accounts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-building-columns"></i>
                <p>No accounts found.<br>Click below to add one.</p>
            </div>
        `;
        return;
    }

    accounts.forEach(acc => {
        list.innerHTML += `
            <div class="list-item">
                <div class="item-left">
                    <div class="item-icon"><i class="fa-solid fa-building-columns"></i></div>
                    <div class="item-details">
                        <h4>${acc.name}</h4>
                        <p>Active</p>
                    </div>
                </div>
                <div class="item-right">
                    <h4>₹${acc.balance.toFixed(2)}</h4>
                </div>
            </div>
        `;
    });
}

function renderTransactions() {
    const list = document.getElementById('transaction-list');
    const filter = document.getElementById('time-filter').value;
    list.innerHTML = '';

    let filteredTxs = [...transactions].sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
    const targetDate = currentDateOffset;
    const dateLabel = document.getElementById('date-label');

    if(filter === 'daily') {
        filteredTxs = filteredTxs.filter(tx => new Date(tx.datetime).toDateString() === targetDate.toDateString());
        dateLabel.innerText = targetDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    } else if (filter === 'monthly') {
        filteredTxs = filteredTxs.filter(tx => new Date(tx.datetime).getMonth() === targetDate.getMonth() && new Date(tx.datetime).getFullYear() === targetDate.getFullYear());
        dateLabel.innerText = targetDate.toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
    } else if (filter === 'weekly') {
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        filteredTxs = filteredTxs.filter(tx => {
            const txDate = new Date(tx.datetime);
            return txDate >= startOfWeek && txDate <= endOfWeek;
        });
        dateLabel.innerText = `${startOfWeek.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${endOfWeek.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`;
    }

    if(filteredTxs.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>No transactions found.</p>
            </div>
        `;
        return;
    }

    const categoryIcons = {
        'Food': 'fa-burger',
        'Transport': 'fa-car',
        'Education': 'fa-book',
        'Health': 'fa-heart-pulse',
        'Social': 'fa-champagne-glasses',
        'Shopping': 'fa-bag-shopping',
        'Rent': 'fa-house',
        'Salary': 'fa-money-bill-wave',
        'Rewards': 'fa-award',
        'Business': 'fa-briefcase',
        'Dividends': 'fa-arrow-trend-up',
        'Others': 'fa-star'
    };

    let currentDateHeader = '';

    filteredTxs.forEach(tx => {
        const isExpense = tx.type === 'expense';
        const sign = isExpense ? '-' : '+';
        const colorClass = isExpense ? 'amt-expense' : 'amt-income';
        const icon = categoryIcons[tx.category] || 'fa-circle-dollar-to-slot';
        
        const dateStr = new Date(tx.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (dateStr !== currentDateHeader) {
            currentDateHeader = dateStr;
            list.innerHTML += `
                <div style="margin-top: 1rem; margin-bottom: 0.2rem; font-size: 0.8rem; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--border-color); padding-bottom: 0.2rem;">
                    ${dateStr}
                </div>
            `;
        }

        list.innerHTML += `
            <div class="list-item">
                <div class="item-left">
                    <div class="item-icon"><i class="fa-solid ${icon}"></i></div>
                    <div class="item-details">
                        <h4>${tx.category}</h4>
                        <p>${tx.accountName}</p>
                    </div>
                </div>
                <div class="item-right">
                    <h4 class="${colorClass}">${sign}₹${tx.amount.toFixed(2)}</h4>
                </div>
            </div>
        `;
    });
}

function calculateTotals() {
    const filter = document.getElementById('time-filter').value;
    let filteredTxs = [...transactions];

    const targetDate = currentDateOffset;
    
    if(filter === 'daily') {
        filteredTxs = filteredTxs.filter(tx => new Date(tx.datetime).toDateString() === targetDate.toDateString());
    } else if (filter === 'monthly') {
        filteredTxs = filteredTxs.filter(tx => new Date(tx.datetime).getMonth() === targetDate.getMonth() && new Date(tx.datetime).getFullYear() === targetDate.getFullYear());
    } else if (filter === 'weekly') {
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        filteredTxs = filteredTxs.filter(tx => {
            const txDate = new Date(tx.datetime);
            return txDate >= startOfWeek && txDate <= endOfWeek;
        });
    }

    let income = 0;
    let expense = 0;

    filteredTxs.forEach(tx => {
        if(tx.type === 'income') income += tx.amount;
        if(tx.type === 'expense') expense += tx.amount;
    });

    const netWorth = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    document.getElementById('total-income').innerText = `₹${income.toFixed(2)}`;
    document.getElementById('total-expense').innerText = `₹${expense.toFixed(2)}`;
    document.getElementById('total-balance').innerText = `₹${netWorth.toFixed(2)}`;
    document.getElementById('net-worth').innerText = `₹${netWorth.toFixed(2)}`;
}

document.getElementById('time-filter').addEventListener('change', (e) => {
    const filter = e.target.value;
    const dateNav = document.getElementById('date-nav');
    
    if(filter === 'all') {
        dateNav.style.display = 'none';
    } else {
        dateNav.style.display = 'flex';
        currentDateOffset = new Date();
    }
    updateUI();
});

document.getElementById('prev-date').addEventListener('click', () => {
    const filter = document.getElementById('time-filter').value;
    if(filter === 'daily') currentDateOffset.setDate(currentDateOffset.getDate() - 1);
    else if(filter === 'weekly') currentDateOffset.setDate(currentDateOffset.getDate() - 7);
    else if(filter === 'monthly') currentDateOffset.setMonth(currentDateOffset.getMonth() - 1);
    updateUI();
});

document.getElementById('next-date').addEventListener('click', () => {
    const filter = document.getElementById('time-filter').value;
    if(filter === 'daily') currentDateOffset.setDate(currentDateOffset.getDate() + 1);
    else if(filter === 'weekly') currentDateOffset.setDate(currentDateOffset.getDate() + 7);
    else if(filter === 'monthly') currentDateOffset.setMonth(currentDateOffset.getMonth() + 1);
    updateUI();
});


function saveData() {
    localStorage.setItem('walletwise_accounts', JSON.stringify(accounts));
    localStorage.setItem('walletwise_transactions', JSON.stringify(transactions));
}



let expensePieChart;
let expenseLineChart;

function updateCharts() {
    const isDark = body.classList.contains('dark-mode');
    const textColor = isDark ? '#f8fafc' : '#2d3748';

    Chart.defaults.color = textColor;

    const expenses = transactions.filter(t => t.type === 'expense');
    

    const categoryTotals = {};
    expenses.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
        '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
    ];


    const pieCtx = document.getElementById('expense-pie-chart').getContext('2d');
    if(expensePieChart) expensePieChart.destroy();
    
    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: categories.length ? categories : ['No Data'],
            datasets: [{
                data: amounts.length ? amounts : [1],
                backgroundColor: amounts.length ? colors : [isDark ? '#334155' : '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            layout: { padding: 15 },
            plugins: {
                legend: { position: 'right' }
            }
        }
    });


    const lineCtx = document.getElementById('expense-line-chart').getContext('2d');
    if(expenseLineChart) expenseLineChart.destroy();

    const last7Days = [];
    const trendData = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toLocaleDateString('en-US', {month:'short', day:'numeric'}));
        

        const dayTotal = expenses.filter(tx => new Date(tx.datetime).toDateString() === d.toDateString())
                                 .reduce((sum, tx) => sum + tx.amount, 0);
        trendData.push(dayTotal);
    }

    expenseLineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Daily Expense',
                data: trendData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { bottom: 15, left: 5, right: 15, top: 10 } },
            scales: {
                y: { beginAtZero: true, grid: { color: isDark ? '#334155' : '#e2e8f0' } },
                x: { grid: { display: false } }
            }
        }
    });


    const catList = document.getElementById('category-list');
    catList.innerHTML = '';
    const totalExp = amounts.reduce((a,b)=>a+b, 0);

    if(categories.length === 0) {
        catList.innerHTML = '<p class="text-muted">No expenses recorded yet.</p>';
    } else {
        categories.forEach((cat, index) => {
            const percent = ((categoryTotals[cat] / totalExp) * 100).toFixed(1);
            catList.innerHTML += `
                <div class="cat-item" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                    <div style="flex: 1; display: flex; align-items: center; gap: 0.5rem; min-width: 70px;">
                        <span style="color:${colors[index]}; font-weight:bold;">●</span> <span style="font-size: 0.85rem;">${cat}</span>
                    </div>
                    <div style="flex: 2; display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; height: 6px; background-color: var(--input-bg); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background-color: ${colors[index]};"></div>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); min-width: 35px; text-align: right;">${percent}%</span>
                    </div>
                    <div style="flex: 1; text-align: right; font-weight:600; font-size: 0.85rem; min-width: 70px;">
                        ₹${categoryTotals[cat].toFixed(2)}
                    </div>
                </div>
            `;
        });
    }
}


document.addEventListener('DOMContentLoaded', initApp);
