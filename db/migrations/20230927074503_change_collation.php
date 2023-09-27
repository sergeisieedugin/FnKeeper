<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class ChangeCollation extends AbstractMigration
{
    public function change(): void
    {
        $this->execute("alter table users modify account varchar(25) collate utf8mb4_bin not null;");
    }
}
