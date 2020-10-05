import { MigrationInterface, QueryRunner } from "typeorm"

export class ChartYearToTimeUnit21601909631346 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `
            UPDATE data_values
            JOIN variables v on data_values.variableId = v.id
            SET year = DATE_ADD(COALESCE(display->>"$.zeroDay", '2020-01-21'), INTERVAL year DAY)
            WHERE JSON_EXTRACT(display, "$.yearIsDay") IS TRUE
            `
        )

        await queryRunner.query(
            `
            UPDATE variables
            SET display = JSON_SET(
                display,
                "$.timeUnit",
                CASE
                    WHEN JSON_EXTRACT(display, "$.yearIsDay") IS TRUE
                    THEN 'day'
                    ELSE 'year'
                END
            )
            `
        )

        await queryRunner.query(
            `
            UPDATE variables
            SET display = JSON_REMOVE(display, "$.yearIsDay", "$.zeroDay")
            `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // TODO
    }
}
