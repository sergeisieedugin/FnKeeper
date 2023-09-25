<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateInvitesTable extends AbstractMigration
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

        $table = $this->table('invites', ['id'=>false,'primary_key'=>'invite_id']);
        $table
            ->addColumn('invite_id', 'integer',['limit'=>10,'identity'=>true])
            ->addColumn('code', 'string',['limit'=>15])
            ->addColumn('group_id', 'integer')
            ->addColumn('activated', 'integer',['limit'=>1,'default'=>0])
            ->create();
    }
}
