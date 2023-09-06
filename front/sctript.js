const year = [
    {
        month: 'Кукса',
        overall: 540,

    },
];

let currentTab = 'today';

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


//переключение состояния табов
function toggleTab(id) {

    document.querySelector('.active-tab').classList.remove('active-tab');
    document.getElementById(id).classList.add('active-tab');
}


// получение суммы всех расходов
function generalExpensesRender(data) {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
        sum += data[i].sum;
    }
    console.log(sum);
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

    generalExpensesRender(data);

    tableContentRender(data, ['goods', 'sum', 'date', 'user_name']);

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

// отрисовка таблицы с данными из БД, получение полной информации о юзере
(async function () {
    'use strict';

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
    console.log(currentUserInfo.group_users)

    // Подписываем кнопку аккаунта именем пользователя
    document.getElementById('account').innerText = `${currentUserInfo.user_name}`;

    // открытие дроп-даун при нажатии на кнопку аккаунта
    document.getElementById('account').addEventListener('click', event => {
        event.preventDefault();
        //останавливает дальнейшее "проникание" клика, предотвращает вызов события, которое идет следом
        event.stopPropagation();
        document.getElementById('drop-down__settings__header').innerText = `${currentUserInfo.user_name}`
        document.querySelector('.drop-down__settings').classList.remove('drop-down__settings_invisible');
    });

    //закрытие дроп дауна по нажатию вне поля объекта
    const modal = document.querySelector('.drop-down__settings');
    document.addEventListener('click', event => {
        // переменная, с путем событий, для которых вызываются слушатели
        const withinBondaries = event.composedPath().includes(modal);
        // если в пути событий нет дроп дауна, то вешаем ему класс невидимости, тем самым скрывая его
        if (!withinBondaries) {
            modal.classList.add('drop-down__settings_invisible');
        }
    })

    // выход из аккаунта
    document.getElementById('leave-btn').addEventListener('click', event => {
        event.preventDefault();
        localStorage.removeItem('credentials');
        window.location.reload();
    })

    // При отрисовки сегодняшней таблицы мы отдаем туда айди группы, для которой отрисовываем данные
    await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date);

    // отрисовка данных за день
    document.getElementById('today-tab').addEventListener('click', async event => {
        event.preventDefault();
        await renderTodayTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('today-tab');
        currentTab = 'today';
        document.getElementById('table-header').innerText = 'Расходы сегодня';
        document.getElementById('limit').innerText = '1500Р';
    });

    // отрисовка данных за месяц
    document.getElementById('month-tab').addEventListener('click', event => {
        event.preventDefault();
        renderMonthTable(currentUserInfo.group_id, currentUserInfo.date, document.getElementById('user-filter-select').value);
        toggleTab('month-tab');
        currentTab = 'month'
        document.getElementById('table-header').innerText = 'Расходы за месяц';
        document.getElementById('limit').innerText = '45000Р';
    });
    console.log(currentUserInfo);
    // отрисовка данных за год
    document.getElementById('year-tab').addEventListener('click', event => {
        event.preventDefault();
        toggleTab('year-tab');
        currentTab = 'year';
        document.getElementById('table-header').innerText = 'Расходы за год';
    });

})();

// вызов формы заполнения таблицы и добавление туда данных
(function () {
    'use strict';

    document.getElementById('addbtn').addEventListener('click', () => {
        document.querySelector('.form-wrapper_invisible').classList.remove('form-wrapper_invisible')

    });

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
    document.querySelector('form').addEventListener('submit', async event => {
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
            method: "PUT",
            body: JSON.stringify(body),
            headers: myHeaders,
        })

        // Если все успешно, очищаем форму от ошибок и данных, скрываем ее и обновляем таблицу с расходами
        if (response.status === 200) {
            document.querySelector('form').reset();
            document.querySelector('.form-wrapper').classList.add('form-wrapper_invisible');
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
        document.querySelector('.form-wrapper').classList.add('form-wrapper_invisible');
        // сохраняем первый попавшийся блок с импутами
        const purchaseNode = document.querySelector('#group-wrapper .purchase')
        // полностью удаляем импуты
        document.getElementById('group-wrapper').innerHTML = '';
        // создаем новые импуты в родительском блоке
        document.getElementById('group-wrapper').appendChild(purchaseNode);
        document.querySelector('.form-wrapper__form').reset();
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


};



