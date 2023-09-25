<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateExpensesTable extends AbstractMigration
{
    /**
     * Change Method.
     *
     * Write your reversible migrations using this method.
     *
     * More information on writing migrations is available here:
     * https://book.cakephp.org/phinx/0/en/migrations.html#the-change-method
     *
     * Remember to call "create()" or "update()" and NOT "save()" when working
     * with the Table class.
     */
    public function change(): void
    {
        $table = $this->table('expenses', ['id' => false, 'primary_key' => 'expenses_id']);
        $table
            ->addColumn('expenses_id', 'integer', ['limit' => 10, 'identity' => true])
            ->addColumn('name', 'string', ['limit' => 65, 'null' => false])
            ->addColumn('sum', 'integer', ['null' => false])
            ->addColumn('date', 'datetime', ['null' => false, 'default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('user_id', 'integer', ['limit' => 10, 'null'=>false])
            ->addColumn('group_id','integer',['null'=>false,'limit'=>10])
            ->addForeignKey('user_id','users','user_id')
            ->addForeignKey('group_id', 'groups','group_id')
            ->create();
    }
}
