<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateLimitTable extends AbstractMigration
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

        $table = $this->table('limits', ['id'=>false, 'primary_key'=>'limit_id']);
        $table
            ->addColumn('limit_id', 'integer', ['limit'=>10,'identity'=>true])
            ->addColumn('month','integer', ['limit'=>2, 'null'=>false])
            ->addColumn('year', 'integer', ['limit'=>4,'null'=>false])
            ->addColumn('amount', 'integer', ['null'=>false])
            ->addColumn('group_id', 'integer',['null'=>false])
            ->addForeignKey('group_id', 'groups', 'group_id')
            ->create();
    }
}
