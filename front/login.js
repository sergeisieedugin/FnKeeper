const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form')

// переключение на форму с регистрацией
document.getElementById('signup-link').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('signup_error').innerHTML='';
    const forms = document.querySelectorAll('form');

    //перебираем формы и смотрим, где нет класса show-form - ставим такой класс. Где есть - убираем
    //это нужно для того, чтобы в дальнейшем отправлять данные на сервер с конкретной формы (где есть такой класс)
    for (const thisForm of forms) {
        if (!thisForm.classList.contains('show-form')) {
            thisForm.classList.add('show-form');
        } else {
            thisForm.classList.remove('show-form');
        }
    }
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';

});

// переключение на форму авторизации
document.getElementById('login-link').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('login_error').innerHTML='';

    const forms = document.querySelectorAll('form');
    //перебираем формы и смотрим, где нет класса show-form - ставим такой класс. Где есть - убираем
    //это нужно для того, чтобы в дальнейшем отправлять данные на сервер с конкретной формы (где есть такой класс)
    for (const thisForm of forms) {
        if (!thisForm.classList.contains('show-form')) {
            thisForm.classList.add('show-form');
        } else {
            thisForm.classList.remove('show-form');
        }
    }

    loginForm.style.display = 'block';
    signupForm.style.display = 'none';

});

const errorDiv = document.querySelector('.form-wrapper__errors');

// авторизация
(function () {

    'use strict';

    // если пользователь уже авторизировался, редиректим его на главную страницу
    if (localStorage.getItem('credentials')) {
        window.location.replace('/index.html');
    }

    document.getElementById('login').addEventListener('submit', async (event) => {
        event.preventDefault();
        // FormData формирует объект формы. Методом .get(name) мы получаем значения полей
        const dataForm = new FormData(event.target)
        console.log(dataForm.get('login'));

        // создаем переменную, куда получаем значение полей формы
        const body = {
            account: dataForm.get('login'),
            password: dataForm.get('password')
        }

        // Очищаем форму при нажатии на кнопку "Войти"
        event.target.reset();

        // создаем заголовки для передачи в fetch
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');

        // Очищаем див с ошибкой после каждой попытки. Позже, если данные ввода неверны, туда идет параграф с ошибкой
        errorDiv.innerHTML = '';

        // fetch обращается к адресу с параметрами ( метод, хэдерс, боди, мод и тд) и формирует ответ
        // fetch = получить (URL(откуда), настройка запроса)
        // так как в слушателе я определил ассинхронность функции, перед fetch пишу await
        const response = await fetch('http://localhost:5858/api/login', {
            method: 'post',
            //headers: myHeaders,
            // перекодируем объект в строки json
            body: JSON.stringify(body),
            mode: "cors"

        });
        console.log(response)
        if (response.status === 201) {
            // если такой профиль есть ( ответ 201), перекодирую данные в Basic64 и сохраняю
            // логин и пароль кодирую в Basic64 (для сохранения в локальном хранилище)
            const credentials = btoa(`${body.account}:${body.password}`);
            // сохраняю в хранилище браузера. В дальнейшем это пригодится при навигации на других страницах.
            //  Буду вызывать fetch с headers : "Authorization", "Basic dGVzdC1hY2M6MTIz" для проверки авторизации
            localStorage.setItem('credentials', credentials);
            console.log(credentials);
            window.location.replace("/index.html")
        } else {
            // Добавляем в див формы ошибку, если вводимые данные неверны
            const error = document.createElement('p');
            error.innerText = 'Неверные данные';
            errorDiv.appendChild(error);
        }
    });
})();
// регистрация
(function () {

    'use strict';

    document.getElementById('registration').addEventListener('submit', async event => {
        const errorDiv = document.getElementById('signup_error');
        errorDiv.innerHTML = '';
        event.preventDefault();
        const formData = new FormData(event.target);

        const body = {
            name: formData.get('name'),
            account: formData.get('login'),
            password: formData.get('password')
        }
        console.log(body);

        event.target.reset();

        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');

        const response = await fetch('http://localhost:5858/api/signup', {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: myHeaders,
            mode: "cors"
        });

        if (response.status === 201) {
            const credentials = btoa(`${body.account}:${body.password}`);
            localStorage.setItem('credentials', credentials)
            window.location.replace('/index.html');
        }
        else if (response.status === 301){
            const error = document.createElement('p');
            error.innerText = 'Такой аккаунт существует';
            errorDiv.appendChild(error);
        }


    })

})();


