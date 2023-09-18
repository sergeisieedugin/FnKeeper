const year = [
    {
        month: 'Кукса',
        overall: 540,

    },
];

let currentTab = 'today';

// объявление всех модалок и дроп-даунов
const purchaseForm = document.getElementById('purchase_form');
const groupList = document.getElementById('groups_list');
const select = document.querySelector('.drop-down__settings');

//Функция отрисовки данных
function tableContentRender(rows, columns) {

    //Очистка данных с таблицы
    const tBody = document.getElementById('table-content');
    tBody.innerHTML = '';

    for (const row of rows) {

        const tr = document.createElement('tr');
        for (const rowName of columns) {
            const td = document.createElement('td');
            td.innerText = row[rowName];
            tr.appendChild(td);
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
function generalExpensesRender(data) {
    let sum = 0
    for (let i = 0; i < data.length; i++) {

        sum += parseInt(data[i].sum);
    }

    const expenses = document.getElementById('expenses');
    expenses.innerText = sum + ' ₽';
}

async function renderMonthTable(group_id, date, userId = null) {
    const dateParts = date.split('-');
    console.log(dateParts);
    const year = dateParts[0];
    const month = dateParts[1];
    const myHeaders = new Headers();
    //получаем credentials пользователя из браузера и добавляем в заголовки
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    let url = `http://localhost:5858/api/expenses/year/${year}/month/${month}/group/${group_id}`;

    if (userId) {
        url += `/user/${userId}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })

    const data = await response.json();
    console.log(data);

    generalExpensesRender(data);

    tableContentRender(data, ['goods', 'sum', 'date', 'user_name']);
}

async function renderYearData(groupId, date){
    const dataParts = date.split('-');
    const year = dataParts[0];
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch(`http://localhost:5858/api/expenses/year/${year}/group/${groupId}`,{
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })

    const data = await response.json();
    console.log(data)
    generalExpensesRender(data);
    return data;

}


// Получение кода приглашения в группу
async function getInviteCode() {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch('http://localhost:5858/api/group/invite/code', {
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
    const response = await fetch('http://localhost:5858/api/group/leave', {
        method: 'PUT',
        headers: myHeaders,
        mode: 'cors'
    })
    return response;
}

// Смена группы по коду приглашения
async function changeGroup(code) {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    myHeaders.append("Content-Type", "application/json");
    const body = JSON.stringify({
        code: code
    });
    console.log(body)
    const response = await fetch('http://localhost:5858/api/group/change', {
        method: 'PUT',
        mode: 'cors',
        body: body,
        headers: myHeaders,
    })
    return response;
}

// Получение всех групп текущего пользователя
async function fetchGroups() {

    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    const response = await fetch('http://localhost:5858/api/user/groups', {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })
    const userGroups = await response.json();
    return userGroups;

}

async function renderTodayTable(group_id, date, userId = null) {


    // создаем объект заголовка, который передаем с fetch
    const myHeaders = new Headers();
    //получаем credentials пользователя из браузера и добавляем в заголовки
    myHeaders.append('Authorization', `Basic ${localStorage.getItem('credentials')}`);
    let url = `http://localhost:5858/api/expenses/day/${date}/group/${group_id}`;

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

    // получение суммы всех расходов
    generalExpensesRender(data);

    // отрисовываем таблицу с данными за день
    tableContentRender(data, ['goods', 'sum', 'date', 'user_name']);
}

let currentUserInfo = null;
let userGroups = null;
let chart = null;


// отрисовка таблицы с данными из БД, получение полной информации о юзере
// обработка кнопки с именем аккаунта ( мои группы, лимиты и выход из аккаунта )
(async function () {
    'use strict';

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
    const response = await fetch('http://localhost:5858/api/user/current', {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors'
    })
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
        await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('today-tab');
        currentTab = 'today';
        // если не false, то он выполняет вторую часть условия ( здесь - chart.destroy)
        chart && chart.destroy();
        showElement(table);
        hideElement(yearChart);
        document.getElementById('table-header').innerText = 'Расходы сегодня';
        document.getElementById('limit').innerText = '1500Р';
    });

    // отрисовка данных за месяц
    document.getElementById('month-tab').addEventListener('click', event => {
        event.preventDefault();
        renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('month-tab');
        currentTab = 'month';
        // если не false, то он выполняет вторую часть условия ( здесь - chart.destroy)
        chart && chart.destroy();
        showElement(table);
        hideElement(yearChart)
        document.getElementById('table-header').innerText = 'Расходы за месяц';
        document.getElementById('limit').innerText = '45000Р';
    });


    // отрисовка данных за год
    document.getElementById('year-tab').addEventListener('click', async function(event) {
        event.preventDefault();
        hideElement(table);
        toggleTab('year-tab');
        currentTab = 'year';
        chart && chart.destroy();
        document.getElementById('table-header').innerText = 'Расходы за год';

        const yearData = await renderYearData(currentUserInfo.group_id,currentUserInfo.date);
        let month = [];
        let sum = [];
        for (let i=0;i<yearData.length;i++){
            month.push(yearData[i]['month']);
            sum.push(yearData[i]['sum']);
        }
        chart = new Chart(yearChart, {
            type: 'bar',
            data: {
                labels: month,
                datasets: [{
                    label: 'Расходы, ₽',
                    data: sum,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

    });
    console.log(currentUserInfo);

    //Создание всех элементов вступления в группы
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
        joinBtn.classList.add('form-wrapper__tabs_active-left');

        console.log(userGroups);

        // Рендер информации о группах пользователя
        for (const thisGroup of userGroups) {

            const participantsList = (thisGroup.participants || '').split(',');
            console.log(participantsList)

            if (participantsList.length > 1) {
                // если групп больше чем 1 ( личная и куда вступил ), то отображается информация о ней
                const groupDiv = document.createElement('div');
                groupDiv.setAttribute('class', 'form-wrapper__group');
                const participants = document.createElement('p');
                participants.innerText = `Участники: ${thisGroup.participants}`;
                const groupName = document.createElement('h3');
                groupName.innerText = thisGroup.name;

                // появление кнопки "покинуть группу" только если пользователь является приглашенным
                // скрываются кнопки Пригласить и Вступить
                if (thisGroup.group_id !== currentUserInfo.user_id) {

                    hideElement(inviteBtn);
                    hideElement(joinBtn);
                    hideElement(joinDiv);

                    leaveBtn.innerText = 'Покинуть группу';
                    leaveBtn.addEventListener('click', async function (event) {
                        event.preventDefault();
                        await leaveGroup();
                        window.location.reload();
                    })
                } else {

                    hideElement(joinBtn);
                    hideElement(joinDiv);

                }

                groupDiv.appendChild(groupName);
                groupDiv.appendChild(participants);
                groupDiv.appendChild(leaveBtn);
                generalDiv.appendChild(groupDiv);
            } else {
                const groupDiv = document.createElement('div');
                groupDiv.setAttribute('class', 'form-wrapper__group');
                const groupName = document.createElement('h3');
                groupName.innerText = 'Групп нет';
                const note = document.createElement('p');
                note.innerText = 'Пригласите кого-нибудь. Или вступите в группу друга';
                groupDiv.appendChild(groupName);
                groupDiv.appendChild(note);
                generalDiv.appendChild(groupDiv);
            }
        }

        // обработка кнопки "Пригласить в группу"
        inviteBtn.addEventListener('click', async function (event) {
            hideElement(joinDiv);

            inviteBtn.classList.add('form-wrapper__tabs_active-right');
            joinBtn.classList.remove('form-wrapper__tabs_active-left');

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
            joinBtn.classList.add('form-wrapper__tabs_active-left');
            inviteBtn.classList.remove('form-wrapper__tabs_active-right');
        })

        // отправка формы вступления в группу
        const joinForm = document.getElementById('joinForm');
        console.log(joinForm)
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


// вызов формы заполнения таблицы и добавление туда данных
(function () {
    'use strict';

    document.getElementById('addbtn').addEventListener('click', event => {
        event.stopPropagation();
        closeAllModals()

        // сохраняем первый попавшийся блок с импутами
        const purchaseNode = document.querySelector('#group-wrapper .purchase')
        // полностью удаляем импуты
        document.getElementById('group-wrapper').innerHTML = '';
        // создаем новые импуты в родительском блоке
        document.getElementById('group-wrapper').appendChild(purchaseNode)
        document.querySelector('.form-wrapper__form').reset();

        purchaseForm.classList.remove('invisible');
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

        const response = await fetch(`http://localhost:5858/api/expenses/user/${currentUserInfo.user_id}`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: myHeaders,
        })

        // Если все успешно, очищаем форму от ошибок и данных, скрываем ее и обновляем таблицу с расходами
        if (response.status === 200) {
            document.querySelector('form').reset();
            hideElement(purchaseForm);
            renderTodayTable(currentUserInfo.group_id, currentUserInfo.date);
            toggleTab('today-tab');
            errorDiv.innerHTML = '';
        }

        // сохраняем первый попавшийся блок с импутами
        const purchaseNode = document.querySelector('#group-wrapper .purchase')
        // полностью удаляем импуты
        document.getElementById('group-wrapper').innerHTML = '';
        // создаем новые импуты в родительском блоке
        document.getElementById('group-wrapper').appendChild(purchaseNode)
    })

    // закрытие формы добавления расходов по нажатию кнопки
    document.getElementById('closeform').addEventListener('click', () => {
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

    select.addEventListener('change', event => {
        const userId = event.target.value;

        // при переключении таба, в глобальную переменную вносится изменение
        // это нужно для корректного отображение данных при переключении селекта и табов
        switch (currentTab) {
            case 'today':
                renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                break;
            case 'month':
                renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, userId);
                break;
        }
    });
}

