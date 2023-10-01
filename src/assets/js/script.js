const BASE_URL = 'http://localhost:5858'
let currentTab = 'today';

// объявление всех модалок и дроп-даунов
const purchaseForm = document.getElementById('purchase_form');
const groupList = document.getElementById('groups_list');
const select = document.querySelector('.drop-down__settings');

// Перезагрузка страницы при нажатии на логотип
const logo = document.querySelector('.main-header__logo');
logo.addEventListener('click', event => {
    event.preventDefault();
    window.location.reload();
});

//Функция отрисовки данных
function tableContentRender(rows, columns) {

    //Очистка данных с таблицы
    const tBody = document.getElementById('table-content');
    tBody.innerHTML = '';
    const dataLabel = ['Товар','Стоимость, ₽','Дата','Покупатель',''];

    for (const row of rows) {

        const tr = document.createElement('tr');
        const deleteBtn = document.createElement('td');
        deleteBtn.innerText = 'Удалить';
        deleteBtn.classList.add('table__delete_btn');
        deleteBtn.setAttribute('data-expenses_id', row.expenses_id)
        let counter = 0;
        for (const rowName of columns) {
            const td = document.createElement('td');
            td.setAttribute('data-label', dataLabel[counter])
            td.innerText = row[rowName];
            tr.appendChild(td);
            tr.appendChild(deleteBtn);
            counter++;
        }
        tBody.appendChild(tr);

    }
}

// закрытие всех модалок при открытии одной
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(element => {
        if (!element.classList.contains('invisible')) {
            hideElement(element);
        }
    });
}

// скрывает элемент DOM
function hideElement(element) {
    element.classList.add('invisible');
}

// показывает элемент DOM
function showElement(element) {
    element.classList.remove('invisible');
}


// закрытие модалки при нажатии вне поля модалки
function closeModal(modal) {
    document.addEventListener('click', event => {
        // переменная, с путем событий, для которых вызываются слушатели
        const withinBondaries = event.composedPath().includes(modal);
        // если в пути событий нет дроп дауна, то вешаем ему класс невидимости, тем самым скрывая его
        if (!withinBondaries) {
            hideElement(modal);
        }
    })
}

//переключение состояния табов
function toggleTab(id) {

    document.querySelector('.active-tab').classList.remove('active-tab');
    document.getElementById(id).classList.add('active-tab');
}


// получение суммы всех расходов
function expensesCounter(data) {
    let sum = 0
    for (let i = 0; i < data.length; i++) {

        sum += parseInt(data[i].sum);
    }
    return sum;
}

// Отрисовка траты определенным цветом в зависимости от превышения лимита
function renderExpenses(sum, limit) {
    const expenses = document.getElementById('expenses');
    limit = parseInt(limit.limit)
    if (sum > limit) {
        expenses.innerText = sum.toLocaleString() + ' ₽';
        expenses.classList.add('expenses-amount_exceed')
    } else {
        expenses.classList.remove('expenses-amount_exceed');
        expenses.innerText = sum.toLocaleString() + ' ₽';
    }
}

async function renderLimit (response) {
    const limit = await response.json();

    if (response.status === 201) {

        document.getElementById('limit').innerText = limit.limit.toLocaleString() + ' ₽';

    } else if (response.status === 302) {
        document.getElementById('limit').innerText = limit.message;
    }

    return limit;
}

// Получение лимита расходов на месяц
async function getMonthLimit(groupId, month, year) {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`${BASE_URL}/api/limit/group/${groupId}/month/${month}/year/${year}`, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })
    return await renderLimit(response)
}

// Получение лимита расходов на день
async function getDayLimit(group, month, year,day) {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`${BASE_URL}/api/limit/group/${group}/month/${month}/year/${year}/day/${day}`, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })

    return await renderLimit(response)
}


async function renderTodayTable(group_id, date, userId = null) {


    // создаем объект заголовка, который передаем с fetch
    const myHeaders = new Headers();
    //получаем credentials пользователя из браузера и добавляем в заголовки
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    let url = `${BASE_URL}/api/expenses/day/${date}/group/${group_id}`;

    if (userId) {
        url += `/user/${userId}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    });

    // получаем json ответа с базы данных
    const data = await response.json();

    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    // получение суммы всех расходов
    const sum = expensesCounter(data);

    const limit = await getDayLimit(group_id, month, year, day);

    renderExpenses(sum, limit);


    // отрисовываем таблицу с данными за день
    await tableContentRender(data, ['goods', 'sum', 'date', 'user_name']);
}

async function renderMonthTable(group_id, date, userId = null) {
    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const myHeaders = new Headers();
    //получаем credentials пользователя из браузера и добавляем в заголовки
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    let url = `${BASE_URL}/api/expenses/year/${year}/month/${month}/group/${group_id}`;

    if (userId) {
        url += `/user/${userId}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })

    const data = await response.json();

    const sum = expensesCounter(data);
    const limit = await getMonthLimit(group_id, month, year);

    renderExpenses(sum, limit);

    tableContentRender(data, ['goods', 'sum', 'date', 'user_name']);
}

async function renderYearData(groupId, date) {
    const dataParts = date.split('-');
    const year = dataParts[0];
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`${BASE_URL}/api/expenses/year/${year}/group/${groupId}`, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })

    const data = await response.json();
    let sum = 0;

    const expenses = document.getElementById('expenses');

    for (let i = 0; i < data.length; i++) {
        sum += parseInt(data[i].sum);
    }

    expenses.innerText = sum.toLocaleString() + ' ₽';
    expenses.classList.remove('expenses-amount_exceed');
    expensesCounter(data);
    return data;
}

function deleteExpenses() {
    const table = document.querySelector('table');
    table.addEventListener('click', async event => {

        const body = JSON.stringify({
            expenses_id: event.target.getAttribute('data-expenses_id')
        });

        const myHeaders = new Headers();
        myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
        const response = await fetch(`${BASE_URL}/api/expenses/delete`, {
            method: 'DELETE',
            headers: myHeaders,
            body: body,
            mode: 'cors'
        })
        if (response.status === 201) {
            const userId = document.createElement('select').value;
            switch (currentTab) {
                case 'today':
                    await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                    break;
                case 'month':
                    await renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                    break;
            }
        }
    });
}


// Получение кода приглашения в группу
async function getInviteCode() {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`${BASE_URL}/api/group/invite/code`, {
        method: 'POST',
        headers: myHeaders,
        mode: 'cors'
    });
    const code = await response.json();
    return code['code'];
}

// функция выхода пользователем из группы
async function leaveGroup() {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    return await fetch(`${BASE_URL}/api/group/leave`, {
        method: 'PUT',
        headers: myHeaders,
        mode: 'cors'
    })
}


// Смена группы по коду приглашения
async function changeGroup(code) {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    myHeaders.append("Content-Type", "application/json");
    const body = JSON.stringify({
        code: code
    });

    return await fetch(`${BASE_URL}/api/group/change`, {
        method: 'PUT',
        mode: 'cors',
        body: body,
        headers: myHeaders,
    })
}

// Получение всех групп текущего пользователя
async function fetchGroups() {

    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`${BASE_URL}/api/user/groups`, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })
    return  await response.json();


}


let currentUserInfo = null;
let userGroups = null;
let chart = null;


// отрисовка таблицы с данными из БД
// получение полной информации о юзере
(async function () {
    'use strict';

    await deleteExpenses()
    const yearChart = document.getElementById('yearChart');
    hideElement(yearChart);
    const table = document.querySelector('table');

    // если пользователь не авторизирован, отправляем его на страницу авторизации
    if (!localStorage.getItem('credentials')) {
        window.location.replace("/login.html")
    }

    // получаем json ответа с базы данных
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`)
    // fetch сам по себе это request. В переменную response он возвращает уже ответ от сервера
    const response = await fetch(`${BASE_URL}/api/user/current`, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })
    if (response.status === 401){
        localStorage.removeItem('credentials');
        window.location.replace("/login.html");
        return
    }
    // в переменную получаем объект json с именем пользователя, айди группы и всеъ пользователей этой группы
    currentUserInfo = await response.json();

    await selectOptionsRender(currentUserInfo.group_users);


    // Обработка кнопки аккаунта
    // Подписываем кнопку аккаунта именем пользователя
    document.getElementById('account').innerText = `${currentUserInfo.user_name}`;

    // открытие дроп-даун при нажатии на кнопку аккаунта
    document.getElementById('account').addEventListener('click', event => {
        closeAllModals();
        event.preventDefault();
        //останавливает дальнейшее "проникание" клика, предотвращает вызов события, которое идет следом
        event.stopPropagation();
        document.getElementById('drop-down__settings__header').innerText = `${currentUserInfo.user_name}`
        document.querySelector('.drop-down__settings').classList.remove('invisible');
    });
    //закрытие дроп дауна по нажатию вне поля объекта
    closeModal(select);
    userGroups = await fetchGroups();


    // При отрисовке сегодняшней таблицы мы отдаем туда айди группы, для которой отрисовываем данные
    await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date);

    // отрисовка данных за день
    document.getElementById('today-tab').addEventListener('click', async event => {
        event.preventDefault();
        showElement(document.getElementById('user-filter-select'));
        await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('today-tab');
        currentTab = 'today';
        document.getElementById('table-header').innerText = 'Расходы сегодня';
        // если не false, то он выполняет вторую часть условия ( здесь - chart.destroy)
        chart && chart.destroy();
        showElement(table);
        showElement(document.getElementById('limitText'))
    });

    // отрисовка данных за месяц
    document.getElementById('month-tab').addEventListener('click', async event => {
        event.preventDefault();
        showElement(document.getElementById('limitText'))
        showElement(document.getElementById('user-filter-select'));
        await renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('month-tab');
        currentTab = 'month';
        // если не false, то он выполняет вторую часть условия ( здесь - chart.destroy)
        chart && chart.destroy();
        showElement(table);
        showElement(document.getElementById('limitText'))
        document.getElementById('table-header').innerText = 'Расходы за месяц';
    });


    // отрисовка данных за год
    document.getElementById('year-tab').addEventListener('click', async function (event) {
        event.preventDefault();
        hideElement(table);
        hideElement(document.getElementById('user-filter-select'));
        toggleTab('year-tab');
        hideElement(document.getElementById('limitText'));
        currentTab = 'year';
        chart && chart.destroy();
        document.getElementById('table-header').innerText = 'Расходы за год';

        const yearData = await renderYearData(currentUserInfo.group_id, currentUserInfo.date);

        let month = [];
        let sum = [];
        let colors = [];
        for (let i = 0; i < yearData.length; i++) {
            month.push(yearData[i]['month']);
            sum.push(yearData[i]['sum']);
            colors.push(yearData[i]['color']);
        }

        chart = new Chart(yearChart, {
            type: 'bar',
            data: {
                labels: month,
                datasets: [{
                    maxBarThickness: 60,
                    label: 'Расходы, ₽',
                    data: sum,
                    borderWidth: 0,
                    backgroundColor: colors,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

    });


})();

// Обработка "Мои группы" (вступление, выход, приглашение и тд)
(function () {
    'use strict';

    //Создание переменных всех элементов вступления в группы
    const generalDiv = document.getElementById('groups');
    const inviteDiv = document.getElementById('invite-send');
    const offer = document.createElement('h4');
    const inviteCode = document.createElement('p');
    const leaveBtn = document.createElement('a');
    leaveBtn.classList.add('leave-btn');
    leaveBtn.setAttribute('href', '#');
    const joinDiv = document.getElementById('join-send');
    const inviteBtn = document.getElementById('inviteBtn');
    const joinBtn = document.getElementById('joinBtn');
    const inviteLink = document.getElementById('inviteLink');

    // открытие модалки с группами пользователя
    document.getElementById('my_groups_button').addEventListener('click', event => {
        closeAllModals();

        //Очистка всего и вся после нажатия кнопки "Мои группы"
        inviteDiv.innerHTML = '';
        generalDiv.innerHTML = '';
        offer.innerText = '';
        inviteCode.innerText = '';
        leaveBtn.innerText = '';

        event.preventDefault();
        event.stopPropagation();
        showElement(groupList);
        showElement(joinDiv)
        joinBtn.classList.add('form-wrapper__tab_active');
        inviteBtn.classList.remove('form-wrapper__tab_active');


        // Рендер информации о группах пользователя
        for (const thisGroup of userGroups) {

            const participantsList = (thisGroup.participants || '').split(',');

            // если групп больше чем 1 ( личная и куда вступил ), то отображается информация о ней
            if (participantsList.length > 1) {

                const groupDiv = document.createElement('div');
                groupDiv.setAttribute('class', 'form-wrapper__group');
                const participants = document.createElement('p');

                participants.innerText = `Участники: ${participantsList.join(', ')}`;
                const groupName = document.createElement('h3');
                groupName.innerText = thisGroup.name;

                // появление кнопки "покинуть группу" только если пользователь является приглашенным
                // скрываются кнопки Пригласить и Вступить
                if (thisGroup.group_id !== currentUserInfo.user_id) {

                    hideElement(document.querySelector('.form-wrapper__tabs'));
                    hideElement(joinDiv);
                    hideElement(inviteLink);

                    leaveBtn.innerText = 'Покинуть группу';
                    leaveBtn.addEventListener('click', async function (event) {
                        event.preventDefault();
                        await leaveGroup();
                        window.location.reload();
                    })
                } else {

                    showElement(inviteLink)
                    hideElement(document.querySelector('.form-wrapper__tabs'));
                    hideElement(joinDiv);
                    inviteLink.addEventListener('click', async event => {
                        event.preventDefault();
                        showElement(inviteDiv);

                        offer.innerText = 'Скопируйте код приглашения и отправьте другу';
                        inviteCode.innerText = await getInviteCode();
                        inviteDiv.appendChild(offer);
                        inviteDiv.appendChild(inviteCode);
                    })

                }

                groupDiv.appendChild(groupName);
                groupDiv.appendChild(participants);
                groupDiv.appendChild(leaveBtn);
                generalDiv.appendChild(groupDiv);
            } else {
                hideElement(document.getElementById('inviteLink'));
                const groupDiv = document.createElement('div');
                groupDiv.setAttribute('class', 'form-wrapper__group');
                const groupName = document.createElement('h3');
                groupName.innerText = 'Групп нет';
                const note = document.createElement('p');
                note.innerText = 'Пригласите кого-нибудь. Или вступите в группу';
                groupDiv.appendChild(groupName);
                groupDiv.appendChild(note);
                generalDiv.appendChild(groupDiv);
            }
        }

        // обработка кнопки "Пригласить в группу"
        inviteBtn.addEventListener('click', async function () {
            hideElement(joinDiv);

            inviteBtn.classList.add('form-wrapper__tab_active');
            joinBtn.classList.remove('form-wrapper__tab_active');

            offer.innerText = 'Скопируйте код приглашения и отправьте другу';
            inviteCode.innerText = `${await getInviteCode()}`;
            inviteDiv.appendChild(offer);
            inviteDiv.appendChild(inviteCode);
        })

        // обработка кнопки "Вступить в группу"
        joinBtn.addEventListener('click', event => {
            event.stopPropagation();
            event.preventDefault();
            inviteDiv.innerHTML = '';
            joinDiv.classList.remove('invisible');
            joinBtn.classList.add('form-wrapper__tab_active');
            inviteBtn.classList.remove('form-wrapper__tab_active');
        })

        // отправка формы вступления в группу
        const joinForm = document.getElementById('joinForm');
        joinForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            event.stopPropagation();
            await changeGroup(event.target.querySelector('input[name="code"]').value);
            window.location.reload();

        })

    })
    closeModal(groupList);

    // выход из аккаунта
    document.getElementById('leave-btn').addEventListener('click', event => {
        event.preventDefault();
        localStorage.removeItem('credentials');
        window.location.reload();
    })
})();


// Обработка добавление лимитов
(function () {
    'use strict';


    const limitSpan = document.getElementById('limitDay');
    const form = document.getElementById('newLimit');
    const limitFormWrapper = document.getElementById('limit_form')
    const changeLimitBtn = document.getElementById('change-limit');
    changeLimitBtn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        limitSpan.innerText = 0 + ' ₽';
        form.reset();
        closeAllModals();
        showElement(limitFormWrapper);
    });

    closeModal(limitFormWrapper);

    const closeBtn = document.getElementById('closeLimitForm');
    closeBtn.addEventListener('click', () => {
        hideElement(limitFormWrapper);
    })

    // получение количества дней в месяце и подсчет лимита на день при вводе значений в инпуте
    const limitInput = document.getElementById('limitInput');
    limitInput.addEventListener('input', async event => {
        const myHeaders = new Headers();
        const dateParts = currentUserInfo.date.split('-');
        const year = dateParts[0];
        const month = dateParts[1];
        myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
        const response = await fetch(`${BASE_URL}/api/amount/days/month/${month}/year/${year}`, {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors'
        })
        const days = await response.json();
        const dayLimit = Math.floor(event.target.value / days.days);
        limitSpan.innerText = dayLimit.toLocaleString() + ' ₽';
    })

    // Добавление лимита


    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        event.stopPropagation();

        const body = {
            'limit': event.target.querySelector('input[name="limit"]').value
        }

        const myHeaders = new Headers();
        myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
        const dateParts = currentUserInfo.date.split('-');
        const year = dateParts[0];
        const month = dateParts[1];
        const response = fetch(`${BASE_URL}/api/month/${month}/year/${year}/limit`, {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify(body),
            mode: 'cors'
        })

        if ((await response).status === 201) {
            window.location.reload()
        }
    });


})();


// вызов формы заполнения таблицы и добавление туда данных
(function () {
    'use strict';

    document.getElementById('addBtn').addEventListener('click', event => {
        event.stopPropagation();
        closeAllModals()

        // сохраняем первый попавшийся блок с импутами
        const purchaseNode = document.querySelector('#group-wrapper .purchase')
        // полностью удаляем импуты
        document.getElementById('group-wrapper').innerHTML = '';
        // создаем новые импуты в родительском блоке
        document.getElementById('group-wrapper').appendChild(purchaseNode)
        document.querySelector('.form-wrapper__form').reset();

        showElement(purchaseForm);
    });
    closeModal(purchaseForm);

    // добавление полей товара в форме добавления расходов
    document.querySelector('.form-wrapper__form_add').addEventListener('click', event => {
        event.preventDefault();
        const clone = document.querySelector('.purchase').cloneNode(true);
        // клоны будут с пустыми полями
        clone.querySelector('input[name="goods"]').value = '';
        clone.querySelector('input[name="price"]').value = '';
        document.getElementById('group-wrapper').appendChild(clone);
    })

    // отправка формы добавления расходов
    document.getElementById('newGoodsForm').addEventListener('submit', async event => {
        event.preventDefault();
        event.stopPropagation();

        // каждый раз при попытке отправить форму очищаем див с ошибкой
        const errorDiv = document.querySelector('.form-wrapper__errors');
        errorDiv.innerHTML = '';

        const body = [];
        let isError = false;

        // собираем данные из инпутов и засовываем их в массив body, который передаем в fetch
        document.querySelectorAll('#group-wrapper .purchase').forEach(element => {
            const purchase = {
                goods: element.querySelector('input[name="goods"]').value,
                price: element.querySelector('input[name="price"]').value
            }

            // Проверяем, если пользователь действительно ввел стоимость и название товара
            if (purchase.price > 0 && purchase.goods.length > 0) {
                body.push(purchase);
            } else {
                isError = true;
            }

        })

        // Если пользователь ничего не ввел, или ввел отрицательное число, то возвращаем ошибку и форму не отправляем
        if (isError) {
            const error = document.createElement('p');
            error.innerText = 'Введите корректные данные';
            errorDiv.appendChild(error);
            return;
        }

        const myHeaders = new Headers();
        myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);

        const response = await fetch(`${BASE_URL}/api/expenses/user/${currentUserInfo.user_id}`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: myHeaders,
        })

        // Если все успешно, очищаем форму от ошибок и данных, скрываем ее и обновляем таблицу с расходами
        if (response.status === 200) {
            window.location.reload();
        }

        // сохраняем первый попавшийся блок с импутами
        const purchaseNode = document.querySelector('#group-wrapper .purchase')
        // полностью удаляем импуты
        document.getElementById('group-wrapper').innerHTML = '';
        // создаем новые импуты в родительском блоке
        document.getElementById('group-wrapper').appendChild(purchaseNode)
    })

    // закрытие формы добавления расходов по нажатию кнопки
    document.getElementById('closeForm').addEventListener('click', () => {
        hideElement(document.querySelector('.form-wrapper'));

    });


})();

// Создание и обработка селекта для фильтра расходов по юзерам
const selectOptionsRender = users => {

    const div = document.querySelector('.table-wrapper__top');
    const select = document.createElement('select');
    select.setAttribute('id', 'user-filter-select');
    const genOption = document.createElement('option');
    genOption.setAttribute('value', '');
    genOption.innerText = 'Все члены';
    select.appendChild(genOption);
    for (const thisUser of users) {
        const option = document.createElement('option');
        option.setAttribute('value', thisUser.user_id);
        option.innerText = thisUser.name;
        select.appendChild(option);
    }
    div.appendChild(select);

    select.addEventListener('change', async event => {
        const userId = event.target.value;

        // при переключении таба, в глобальную переменную вносится изменение
        // это нужно для корректного отображение данных при переключении селекта и табов
        switch (currentTab) {
            case 'today':
               await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                break;
            case 'month':
               await renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                break;
        }
    });
}

