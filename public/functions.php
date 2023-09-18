<?php

class Data
{


    private $pdo;

    public function __construct()
    {
        $this->pdo = new PDO('mysql:host=localhost;port=3306;dbname=financial;', 'root', 'root');
    }

    public function getPdo()
    {
        return $this->pdo;
    }


    public function getUsersForAuth()
    {
        $users = $this->selectData('select account, password from users');
        $result = [];
        foreach ($users as $user) {
            $result[$user['account']] = $user['password'];
        }
        return $result;
    }


    public function selectData($query)
    {
        $sql = $this->pdo->query($query);
        $sql->execute();
        $result = [];
        while ($row = $sql->fetch(PDO::FETCH_ASSOC)) {
            $result [] = $row;
        }
        return $result;
    }

    public function getRow($query)
    {
        $row = $this->selectData($query);
        if (count($row)) {
            return $row[0];
        } else {
            return false;
        }
    }

    // получение данных за месяц
    public function getMonthData($year, $month, $groupId, $userId = null)
    {
        $date = $year . '-' . $month;
        $query = "select u.name user_name, e.name goods, DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%Y-%m-%d, %H:%i') date, e.sum
                      from expenses e inner join users u on e.user_id=u.user_id 
                      where DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%Y-%m') = '$date' and e.group_id=$groupId";
        if ($userId) {
            $query .= " AND u.user_id=$userId";
        }
        $query .= ' order by date DESC';
        return $this->selectData($query);
    }

    public function getYearData($year, $groupId)
    {
        $query = "select DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%m') month, SUM(e.sum) sum
                        from expenses e
                        where DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%Y') = '$year' and e.group_id=$groupId
                        group by month";
        return $this->selectData($query);
    }

    public function getDayData($day, $groupId, $userId = null)
    {
        $query = "select u.name user_name, e.name goods, DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%H:%i') date, e.sum
                      from expenses e inner join users u on e.user_id=u.user_id 
                      where DATE_FORMAT(CONVERT_TZ(e.date,'+00:00','+11:00'), '%Y-%m-%d')='$day' AND e.group_id=$groupId";

        if ($userId) {
            $query .= " AND u.user_id=$userId";
        }
        $query .= ' order by date DESC';
        return $this->selectData($query);
    }

    public function getUserByAccount($account)
    {
        $query = "select * from users where account = \"$account\"";
        return $this->selectData($query)[0];
    }


    public function addExpense($purchase, $user)
    {
        // groupId для того, чтобы история расходов сохранялась даже тогда, когда пользователь переключает свои группы
        $groupId = $this->selectData("select group_id from users where user_id = $user")[0]['group_id'];
        $query = 'insert into expenses (name, sum, user_id, group_id) values ';
        $queries = [];
        // values  и queries оставляем пустым. Добавим значения ниже. Нужно для случаев, когда пользователь добавляет несколько товаров
        $values = [];

        foreach ($purchase as $item) {
            // Вопросы нужны вместо шаблонной строки (:example => example)
            $queries[] = '(?,?,?,?)';
            $values[] = $item['goods'];
            $values[] = $item['price'];
            $values[] = $user;
            $values[] = $groupId;
        }

        // подставляем в конец запроса строку с вопросиками. Туда пойдут значения, которые ввел пользователь
        $query .= implode(', ', $queries);

        $stmt = $this->pdo->prepare($query);
        $stmt->execute($values);
    }

    public function getGroupUsers($group)
    {
        $query = "select name, user_id from users where group_id = $group";
        return $this->selectData($query);
    }

    public function getLimitForMonth($group, $month, $year)
    {
        $query = "select month,year,amount from limits where group_id=$group and month = $month and year = $year";
        return $this->selectData($query);
    }

    public function getLimitForDay($group, $month, $year)
    {
        $query = "select month,year,amount from limits where group_id=$group and month=$month and year=$year";
        return $this->selectData($query);
    }
}
