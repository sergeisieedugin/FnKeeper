<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateUserTable extends AbstractMigration
{

    public function change(): void
    {
        $groups = $this->table('groups', ['id' => false, 'primary_key' => 'group_id']);
        $groups
            ->addColumn('group_id', 'integer', ['limit' => 10, 'identity' => true])
            ->addColumn('name', 'string', ['limit' => 25, 'null' => false])
            ->addColumn('owner', 'integer', ['null' => false, 'default' => -1])
            ->create();

        $users = $this->table('users', ['id' => false, 'primary_key' => 'user_id']);
        $users
            ->addColumn('user_id', 'integer', ['limit' => 10, 'identity' => true])
            ->addColumn('name', 'string', ['limit' => 25, 'null' => false])
            ->addColumn('password', 'string', ['limit' => 16, 'null' => false])
            ->addColumn('account', 'string', ['limit' => 25, 'null' => false])
            ->addColumn('token', 'string', ['limit' => 32, 'null' => false])
            ->addColumn('group_id', 'integer', ['null' => false])
            ->addForeignKey('group_id', 'groups', 'group_id')
            ->create();

        if ($this->isMigratingUp()) {
            $groups->insert(['name' => 'test_user', 'owner' => 1])
                ->save();

            $users->insert([
                'name' => 'Тест',
                'password' => 'thffteymZW796',
                'account' => 'test_user',
                'token' => '6904ce0d6720a19',
                'group_id' => 1
            ])->save();
        }
    }
}
