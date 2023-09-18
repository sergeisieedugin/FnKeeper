<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require_once 'functions.php';
require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$app->options('/{routes:.+}', function ($request, $response) {
    return $response;
});

// для избежания блокировок cors'ом. Разрешение всем адресам стучаться к моему бэку
$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

$app->add(new Tuupola\Middleware\HttpBasicAuthentication([ #---Отправляет заголовок Authorization со значением "Basic credentials"
    "path" => "/api",                                      #где credentials - зашифрованный login:password (шифровка Basic64)
    "realm" => "Protected",
    "ignore" => ['/api/signup', '/api/login'],             #---На каких апи не проверять Authorization
    "users" => (new Data())->getUsersForAuth()             #---Задаем допустимых пользователей
]));                                                       #Принимаемый формат: 'user' => 'password'

// создание пользователем нового аккаунта
$app->put('/api/signup', function (Request $request, Response $response, $args) {
    $data = new Data;
    $parsedBody = $request->getBody()->getContents();
    #Перекодируем строку json в ассоциативный массив, чтобы положить в БД
    $body = json_decode($parsedBody, true);

    // Проверяем если пользователь заполнил все поля
    if ($body['name'] === '' || $body['password'] === '' || $body['account'] === '') {
        $payload = json_encode([
            'message' => 'Заполните все поля'
        ]);
        $response->getBody()->write($payload);
        return $response->withStatus(400);
    }

    // Проверяем, если такой аккаунт существует
    $findUser = $data->getRow('select * from users where account="' . $body['account'] . '"');
    if ($findUser) {
        $payload = json_encode([
            'message' => 'Профиль с таким логином уже существует'
        ]);
        $response->getBody()->write($payload);
        return $response->withStatus(400);
    }

    //Создаем новую группу, называя ее именем пользователя. Создаем владельца группы (-1 так как пока нет владельца)
    $stmt = $data->getPdo()->prepare("insert into `groups` (name, owner) value (:n, -1)");
    $stmt->execute([
        ':n' => $body['account'],
    ]);

    //Выбираем айди последней добавленной строки в таблице (группа)
    $stmt = $data->getPdo()->query("SELECT LAST_INSERT_ID()");
    //Возвращаем последнее значение столбца (айди), чтобы в дальнейшем внести ее в таблицу пользователя
    $groupId = $stmt->fetchColumn();

    $insert = 'insert into users(name,password,account, group_id) values (:name,:password,:account,:group_id);';
    $stmt = $data->getPdo()->prepare($insert);
    $stmt->execute([
        ':name' => $body['name'],
        ':password' => $body['password'],
        ':account' => $body['account'],
        ':group_id' => $groupId
    ]);


    //Выбираем айди последней добавленной строки в таблице (группа)
    $stmt = $data->getPdo()->query("SELECT LAST_INSERT_ID()");
    //Возвращаем последнее значение столбца (айди), чтобы в дальнейшем внести ее в таблицу группы
    $userId = $stmt->fetchColumn();
    // добавляем владельца группы (передаем айди пользователя)
    $stmt = $data->getPdo()->prepare("update `groups` SET owner=:owner where group_id=:group_id");
    $stmt->execute([
        ':owner' => $userId,
        'group_id' => $groupId
    ]);

    return $response->withStatus(201);
});

// вход пользователя
$app->post('/api/login', function (Request $request, Response $response, $args) {
    $data = new Data();
    $parsedBody = $request->getBody()->getContents();
    #Перекодируем строку json в ассоциативный массив, чтобы проверить есть ли данные в БД
    $body = json_decode($parsedBody, true);
    $row = $data->getRow('select account, password from users where account="' . $body['account'] . '" and password = "' . $body['password'] . '"');
    var_dump($body['account'], $row);
    if ($row) {
        return $response->withStatus(201);
    }
    return $response->withStatus(401);

});

// получение всех групп пользователя ( личная группа и группы, куда он вступил )
$app->get('/api/user/groups', function (Request $request, Response $response, $args) {
    $account = $request->getServerParams()["PHP_AUTH_USER"];
    $data = new Data();
    $user = $data->getUserByAccount($account);
    $groups = $data->selectData("
        select g.name, g.group_id, GROUP_CONCAT(u.name) participants from `groups` g
                      left join users u on g.group_id = u.group_id
                      where g.group_id = " . $user['group_id'] . "
                      group by g.group_id;");

    $payload = json_encode($groups);
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);

});

// здесь мы узнаем текущего пользователя, его группу и всех пользователей, которые входят в эту группу
$app->get('/api/user/current', function (Request $request, Response $response, $args) {
    // Указываем часовой пояс, чтобы не было бага, когда отдаются данные по часовому поясу сервера
    date_default_timezone_set('Asia/Sakhalin');
    // узнаем текущий авторизированный аккаунт
    $account = $request->getServerParams()["PHP_AUTH_USER"];
    $data = new Data();
    $user = $data->getUserByAccount($account);
    $body = [
        'user_id' => $user['user_id'],
        'user_name' => $user['name'],
        'user_account' => $user['account'],
        'group_id' => $user['group_id'],
        'group_users' => $data->getGroupUsers($user['group_id']),
        'date' => date('Y-m-d')
    ];
    $payload = json_encode($body);
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});

// формирование кода приглашения в группу и добавление его в таблицу invites
$app->post('/api/group/invite/code', function (Request $request, Response $response, $args) {
    $data = new Data();
    $unique = substr(base64_encode(mt_rand()), 0, 15);
    $user = $request->getServerParams()["PHP_AUTH_USER"];
    $stmt = $data->getPdo()->query('select group_id from `groups` where name="' . $user . '"');
    // возвращает столбец из PDO объекта
    $group = $stmt->fetchColumn();
    $stmt = $data->getPdo()->prepare('insert into invites(code,group_id) values(:code,:group_id)');
    $stmt->execute([
        ':code' => $unique,
        ':group_id' => $group
    ]);

    // Отправляем на фронт код, который был сгенерирован и записан в БД
    $code = json_encode([
        'code' => $unique
    ]);
    $response->getBody()->write($code);
    return $response->withStatus(201);


});

// Выход из группы, куда был приглашен пользователь
$app->put('/api/group/leave', function (Request $request, Response $response, $args) {
    $data = new Data();
    $user = $request->getServerParams()["PHP_AUTH_USER"];
    $stmt = $data->getPdo()->query('select owner from `groups` where name="' . $user . '"');
    $personalGroup = $stmt->fetchColumn();
    $stmt = $data->getPdo()->prepare('update users set group_id="' . $personalGroup . '" where account="' . $user . '"');
    $stmt->execute();
    return $response->withStatus(201);

});

// приглашение по коду
$app->put('/api/group/change', function (Request $request, Response $response, $args) {
    $data = new Data();
    $parsedBody = $request->getBody()->getContents();
    $body = json_decode($parsedBody, true);
    $stmt = $data->getPdo()->query('select group_id from invites where code= "' . $body['code'] . '" and activated = 0');
    $group = $stmt->fetchColumn();

    if (!$group) {
        return $response->withStatus(403);
    }

    $user = $request->getServerParams()["PHP_AUTH_USER"];
    $stmt = $data->getPdo()->prepare('update users set group_id= "' . $group . '" where account= "' . $user . '"');
    $stmt->execute();
    $stmt = $data->getPdo()->prepare('update invites set activated = 1 where code= "' . $body['code'] . '"');
    $stmt->execute();

    return $response->withStatus(201);
});

#Получение трат за определенный день всей группы (или определенного пользователя, если передан в урле)
#user взят в квадратные скобки так как это опциональный параметр. Он может быть, а может и не быть. Если он появится, то будет показаны траты для одноого юзера
#регулярное выражение после user_id запрещает ввод всего, кроме цифр
$app->get('/api/expenses/day/{day}/group/{group}[/user/{user_id:[0-9]+}]', function (Request $request, Response $response, $args) {
    $data = new Data();
    $result = $data->getDayData($args['day'], $args['group'], $args['user_id']);
#getQueryParams отдает get переменные запроса в виде ассоц массива: /.../...?user_id=1 (часть URL) => ['user_id => 1]

    #Перекодируем массив в строку json
    $payload = json_encode($result);

    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});

// получение данных за месяц
$app->get('/api/expenses/year/{year}/month/{month}/group/{group}[/user/{user_id:[0-9]+}]', function (Request $request, Response $response, $args) {
    $data = new Data();
    $result = $data->getMonthData($args['year'], $args['month'], $args['group'], $args['user_id']);
    $payload = json_encode($result);
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});

$app->get('/api/expenses/year/{year}/group/{group}', function (Request $request, Response $response, $args) {
    $data = new Data();
    $months = [
        '01' => 'Январь',
        '02' => 'Февраль',
        '03' => 'Март',
        '04' => 'Апрель',
        '05' => 'Май',
        '06' => 'Июнь',
        '07' => 'Июль',
        '08' => 'Август',
        '09' => 'Сентябрь',
        '10' => 'Октябрь',
        '11' => 'Ноябрь',
        '12' => 'Декабрь'
    ]
    ;
    $result = $data->getYearData($args['year'], $args['group']);
    // меняем цифры месяца на нормальное название
    for ($i = 0; $i<count($result); $i++){
        $result[$i]['month'] = $months[$result[$i]['month']];
    }
    $payload = json_encode($result);
    $response->getBody()->write($payload);
    return $response
        ->withStatus(201)
        ->withHeader('Content-Type', 'application/json');
});


#Добавление пользователем траты
$app->post('/api/expenses/user/{user_id}', function (Request $request, Response $response, $args) {#В args идет то, что в {}
    $parsedBody = $request->getBody()->getContents();
    $body = json_decode($parsedBody, true); #Перекодируем строку json в ассоциативный массив

    $data = new Data();
    $data->addExpense($body, $args['user_id']);
    return $response
        ->withStatus(200);
});

#Получение всех пользователей определенной группы (для селекта)
$app->get('/api/group/{group}/users', function (Request $request, Response $response, $args) {
    $data = new Data();
    $result = $data->getGroupUsers($args['group']);
    $payload = json_encode($result);#Перекодируем массив в строку json
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')#указываем какой тип данных
        ->withStatus(201);
});

#Получение лимита на месяц
$app->get('/api/limit/group/{group}/month/{month}/year/{year}', function (Request $request, Response $response, $args) {
    $data = new Data();
    $result = $data->getLimitForMonth($args['group'], $args['month'], $args['year'])[0];
    $monthLimit = ['limit' => $result['amount']]; #Получаем только значение лимита на месяц
    $payload = json_encode($monthLimit); #Перекодируем массив в строку json
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')#указываем какой тип данных
        ->withStatus(201);
});

#Получение лимита на день
$app->get('/api/limit/group/{group}/month/{month}/year/{year}/day', function (Request $request, Response $response, $args) {
    $data = new Data();
    $limit = $data->getLimitForDay($args['group'], $args['month'], $args['year'])[0];#Получение первой строки из таблицы

    $days = cal_days_in_month(CAL_GREGORIAN, $limit['month'], $limit['year']);#Считаем сколько дней в месяце
    $daySum = intval($limit['amount'] / $days);
    $result = ['dayLimit' => $daySum];
    $payload = json_encode($result); #Перекодируем массив в строки json
    $response->getBody()->write($payload);#Получаем обертку тела и пишем содержимое тела
    return $response
        ->withHeader('Content-Type', 'application/json')#указываем какой тип данных
        ->withStatus(201);
});


$app->run();
