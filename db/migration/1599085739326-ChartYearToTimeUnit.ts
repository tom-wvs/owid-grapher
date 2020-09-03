import { MigrationInterface, QueryRunner } from "typeorm"

export class ChartYearToTimeUnit1599085739326 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "ALTER TABLE `data_values` MODIFY year VARCHAR(255) NOT NULL;"
        )
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "ALTER TABLE `data_values` MODIFY year INT NOT NULL;"
        )
    }
}
