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

    #Создаем новую группу, называя ее именем пользовател
    $stmt = $data->getPdo()->prepare('insert into groups(name) value (:n)');
    $stmt->execute([
        ':n' => $body['account'],
    ]);

    #Выбираем айди последней добавленной строки в таблице (группа)
    $stmt = $data->getPdo()->query("SELECT LAST_INSERT_ID()");
    #Возвращаем последнее значение столбца (айди), чтобы в дальнейшем внести ее в таблицу пользователя
    $groupId = $stmt->fetchColumn();

    $insert = 'insert into users(name,password,account, group_id) values (:name,:password,:account,:group_id);';
    $stmt = $data->getPdo()->prepare($insert);
    $stmt->execute([
        ':name' => $body['name'],
        ':password' => $body['password'],
        ':account' => $body['account'],
        ':group_id' => $groupId
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
    var_dump($body['account'],$row);
    if ($row) {
        return $response->withStatus(201);
    }
    return $response->withStatus(401);

});

// здесь мы узнаем текущего пользователя, его группу и всех пользователей, которые входят в эту группу
$app->get('/api/user/current', function (Request $request, Response $response, $args) {
    // узнаем текущий авторизированный аккаунт
    $account = $request->getServerParams()["PHP_AUTH_USER"];
    $data = new Data();
    $user = $data->getUserByAccount($account);
    $body = [
        'user_id' => $user['user_id'],
        'user_name' => $user['name'],
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
$app->get('/api/expenses/year/{year}/month/{month}/group/{group}[/user/{user_id:[0-9]+}]', function (Request $request, Response $response, $args){
    $data = new Data();
    $result = $data->getMonthData($args['year'], $args['month'], $args['group'], $args['user_id']);
    $payload = json_encode($result);
    $response->getBody()->write($payload);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(201);
});


#Добавление пользователем траты
$app->put('/api/expenses/user/{user_id}', function (Request $request, Response $response, $args) {#В args идет то, что в {}
    $parsedBody = $request->getBody()->getContents();
    $body = json_decode($parsedBody, true); #Перекодируем строку json в ассоциативный массив

    $data = new Data();
    $data->addExpense($body['goods'], $body['price'], $args['user_id']);
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
