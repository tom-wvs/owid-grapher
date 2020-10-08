import { MigrationInterface, QueryRunner } from "typeorm"

export class ChartYearToTimeUnit1602158086346 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // Rename data_values.year (INT) -> data_values.time (VARCHAR)
        await queryRunner.query(
            `
            ALTER TABLE data_values
            CHANGE year time VARCHAR(255) NOT NULL
            `
        )

        // Convert numeric dates to a date string, e.g. 2 -> 2020-01-23
        await queryRunner.query(
            `
            UPDATE data_values
            JOIN variables v on data_values.variableId = v.id
            SET time = DATE_ADD(COALESCE(display->>"$.zeroDay", '2020-01-21'), INTERVAL time DAY)
            WHERE JSON_EXTRACT(display, "$.yearIsDay") IS TRUE
            `
        )

        // Add a proper timeUnit (day/year) to the display config of every variable
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

        // Drop the yearIsDay and zeroDay fields from the variable display config
        await queryRunner.query(
            `
            UPDATE variables
            SET display = JSON_REMOVE(display, "$.yearIsDay", "$.zeroDay")
            `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // There's no going back!
    }
}
