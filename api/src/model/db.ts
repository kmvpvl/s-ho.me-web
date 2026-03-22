import mysql, { Pool, PoolOptions, ResultSetHeader, RowDataPacket } from "mysql2/promise";

type DbState = {
    pool?: Pool;
    schemaReady: boolean;
};

const state: DbState = {
    schemaReady: false,
};

function buildConnectionOptions(): PoolOptions {
    if (process.env.mysqluri) {
        return {
            uri: process.env.mysqluri,
            waitForConnections: true,
            connectionLimit: Number(process.env.mysql_connection_limit || 10),
        };
    }

    return {
        host: process.env.mysqlhost || "127.0.0.1",
        port: Number(process.env.mysqlport || 3306),
        user: process.env.mysqluser || "root",
        password: process.env.mysqlpassword,
        database: process.env.mysqldatabase || "SHOME",
        waitForConnections: true,
        connectionLimit: Number(process.env.mysql_connection_limit || 10),
    };
}

export function getPool(): Pool {
    if (!state.pool) {
        state.pool = mysql.createPool(buildConnectionOptions());
    }
    return state.pool;
}

export async function initSchema(): Promise<void> {
    if (state.schemaReady) {
        return;
    }

    const pool = getPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS organizations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            org_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NULL,
            tokens_json JSON NOT NULL,
            modes_json JSON NULL,
            rules_json JSON NULL,
            created DATETIME(3) NOT NULL,
            changed DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_organizations_org_id (org_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS controllers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            organizationid VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            autoupdate_json JSON NOT NULL,
            overwritesettingsfromcontroller BOOLEAN NULL,
            location_json JSON NULL,
            buffer_json JSON NULL,
            logs_json JSON NULL,
            layers_json JSON NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_controller_name (organizationid, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS devices (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            organizationid VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(255) NOT NULL,
            units VARCHAR(255) NULL,
            hardware VARCHAR(255) NOT NULL,
            pin INT NOT NULL,
            emulation BOOLEAN NULL,
            freq_read INT NOT NULL,
            freq_report INT NOT NULL,
            threshold DOUBLE NULL,
            precision_value DOUBLE NULL,
            report_on_value_changed BOOLEAN NOT NULL,
            report_on_init BOOLEAN NULL,
            location_json JSON NOT NULL,
            ranges_json JSON NULL,
            created DATETIME(3) NOT NULL,
            changed DATETIME(3) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_device_org_id (organizationid, device_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS devicereports (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            organizationid VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            value DOUBLE NOT NULL,
            strvalue TEXT NULL,
            extra_json JSON NULL,
            ip VARCHAR(255) NULL,
            timestamp DATETIME(3) NOT NULL,
            created DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY idx_devicereports_org_device_ts (organizationid, device_id, timestamp),
            KEY idx_devicereports_org_device_id (organizationid, device_id, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS changemodereports (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            organizationid VARCHAR(255) NOT NULL,
            mode VARCHAR(255) NOT NULL,
            created DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY idx_changemodereports_org_created (organizationid, created)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    state.schemaReady = true;
}

export function toJsonOrNull<T>(value?: T): string | null {
    if (value === undefined || value === null) {
        return null;
    }
    return JSON.stringify(value);
}

export function fromJsonOrNull<T>(value: unknown): T | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string") {
        return JSON.parse(value) as T;
    }
    return value as T;
}

export type DbRow = RowDataPacket;
export type DbResult = ResultSetHeader;
