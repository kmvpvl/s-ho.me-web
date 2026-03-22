import { UUID } from "crypto";
import { Md5 } from "ts-md5";
import SHOMEError from "./error";
import { v4 } from "uuid";
import { Device, IDevice } from "./device";
import { Telegraf } from "telegraf";
import { DbRow, fromJsonOrNull, getPool, initSchema, toJsonOrNull } from "./db";

/**
 * List of available users' roles
 */
export type SHOMERoles = "admin" | "controller" | "user" | "viewer";

export interface IOrganizationToken {
    authTokenHash: string;
    tguserid?: string | number;
    roles: Array<SHOMERoles>;
}

export interface IMode {
    name: string;
    description: string;
    disabled: boolean;
    rules: Array<string>;
    created: Date;
    changed?: Date;
}

interface IEventDataDevice {
    deviceid: string;
    range: string;
    repeat: number;
}

interface IEventDataTime {
}

export interface IEvent {
    name: string;
    description: string;
    device?: IEventDataDevice;
    time?: IEventDataTime;
}

export interface IChangeModeReport {
    organizationid: string;
    mode: string;
    created: Date;
}

interface IActionDeviceData {
}

interface IActionNotifyData {
    tguser: number | string;
}

export interface IAction {
    name: string;
    description: string;
    device?: IActionDeviceData;
    notify?: IActionNotifyData;
}

type OperationType = "NOT" | "AND" | "OR";

export interface IRule {
    name: string;
    description: string;
    events: Array<{operation?: OperationType; event: IEvent}>;
    actions: Array<IAction>;
    disabled: boolean;
    created: Date;
    changed?: Date;
}

export interface IOrganization {
    _id?: string;
    id: string;
    name?: string;
    tokens: Array<IOrganizationToken>;
    modes?: Array<IMode>;
    rules?: Array<IRule>;
    created: Date;
    changed?: Date;
}

interface IDeviceValues extends IDevice {
    value: number;
    value_str: string;
    timestamp: Date;
}

function normalizeOrgRecord(row: DbRow): IOrganization {
    return {
        _id: String(row.id),
        id: row.org_id,
        name: row.name ?? undefined,
        tokens: fromJsonOrNull<IOrganizationToken[]>(row.tokens_json) || [],
        modes: fromJsonOrNull<IMode[]>(row.modes_json),
        rules: fromJsonOrNull<IRule[]>(row.rules_json),
        created: new Date(row.created),
        changed: row.changed ? new Date(row.changed) : undefined,
    };
}

function toDbOrgPayload(data: IOrganization) {
    return {
        org_id: data.id,
        name: data.name ?? null,
        tokens_json: JSON.stringify(data.tokens),
        modes_json: toJsonOrNull(data.modes),
        rules_json: toJsonOrNull(data.rules),
        created: data.created,
        changed: data.changed ?? new Date(),
    };
}

export default class Organization {
    private data?: IOrganization;

    constructor(data?: IOrganization) {
        this.data = data;
    }

    get uid(): string {
        if (this.data?._id === undefined) {
            throw new Error("organization id is not loaded");
        }
        return this.data._id;
    }

    get json() {
        return this.data;
    }

    private async checkData() {
        if (!this.data) {
            throw new Error("organization data is not loaded");
        }
    }

    private static async findByOrgId(id: string): Promise<IOrganization | undefined> {
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(
            `SELECT * FROM organizations WHERE org_id = ? LIMIT 1`,
            [id],
        );
        if (rows.length !== 1) {
            return undefined;
        }
        return normalizeOrgRecord(rows[0]);
    }

    /**
     * Function checks whether id (the unique name of organization) is free
     *
     * @param id unique mnemonic organization name
     * @returns true if id is free, or false if the id is occupied
     */
    public static async isIdFree(id: string): Promise<boolean> {
        const org = await Organization.findByOrgId(id);
        return org === undefined;
    }

    /**
     * Returns Organization and roles of token (user) by organization id and token
     */
    public static async getByToken(id: string, token: UUID): Promise<{organization: Organization, roles: Array<SHOMERoles>}> {
        const hash = Md5.hashStr(`${id} ${token}`);
        const data = await Organization.findByOrgId(id);
        if (!data) {
            throw new SHOMEError("organization:notfound", `id='${id}'`);
        }

        const tokenData = data.tokens.find((el) => el.authTokenHash === hash);
        if (!tokenData) {
            throw new SHOMEError("organization:notfound", `id='${id}'; token='${token}'`);
        }

        return { organization: new Organization(data), roles: tokenData.roles };
    }

    /**
     * Returns Organization and roles of token (user) by Telegram id
     */
    public static async getByTgUserId(tguserid: string | number): Promise<{organization: Organization, roles: Array<SHOMERoles>}> {
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(`SELECT * FROM organizations`);

        for (const row of rows) {
            const org = normalizeOrgRecord(row);
            const tokenData = org.tokens.find((el) => el.tguserid === tguserid);
            if (tokenData) {
                return { organization: new Organization(org), roles: tokenData.roles };
            }
        }

        throw new SHOMEError("organization:notfound", `tguserid='${tguserid}'`);
    }

    /**
     * Creates new organization and create new token (user) with admin role
     */
    public static async create(id: string, name?: string, adminTgUserId?: number | string): Promise<{_id: string; adminToken: UUID}> {
        const token = v4() as UUID;
        const hash = Md5.hashStr(`${id} ${token}`);
        const iOrg: IOrganization = {
            id,
            name,
            tokens: [
                {
                    authTokenHash: hash,
                    tguserid: adminTgUserId,
                    roles: ["admin"],
                },
            ],
            created: new Date(),
            changed: new Date(),
        };

        await initSchema();
        const pool = getPool();
        const payload = toDbOrgPayload(iOrg);
        const [result] = await pool.execute(
            `INSERT INTO organizations (org_id, name, tokens_json, modes_json, rules_json, created, changed)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.org_id,
                payload.name,
                payload.tokens_json,
                payload.modes_json,
                payload.rules_json,
                payload.created,
                payload.changed,
            ],
        );

        return {
            _id: String((result as any).insertId),
            adminToken: token,
        };
    }

    /**
     * Creates new token (user) with chosen roles
     */
    public async createToken(roles: Array<SHOMERoles>, tguserid?: string | number): Promise<UUID> {
        await this.checkData();
        const token = v4() as UUID;
        const hash = Md5.hashStr(`${this.data?.id} ${token}`);
        this.data?.tokens.push({ authTokenHash: hash, tguserid, roles });
        await this.save();
        return token;
    }

    /**
     * Check whether one or more roles are present in assigned roles.
     */
    public static hasRole(rolesToSearch: SHOMERoles | Array<SHOMERoles>, rolesAssigned: Array<SHOMERoles>): boolean {
        if (rolesAssigned.includes("admin")) {
            return true;
        }
        const requiredRoles = rolesToSearch instanceof Array ? rolesToSearch : [rolesToSearch];
        return requiredRoles.some((v) => rolesAssigned.includes(v));
    }

    /**
     * Returns list of devices for organization.
     */
    public async devices(): Promise<IDevice[]> {
        await this.checkData();
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(
            `SELECT * FROM devices WHERE organizationid = ?`,
            [this.data?.id],
        );

        return rows.map((row) => ({
            _id: String(row.id),
            organizationid: row.organizationid,
            id: row.device_id,
            name: row.name,
            type: row.type,
            units: row.units ?? undefined,
            hardware: row.hardware,
            pin: Number(row.pin),
            emulation: row.emulation ?? undefined,
            freqRead: Number(row.freq_read),
            freqReport: Number(row.freq_report),
            threshold: row.threshold ?? undefined,
            precision: row.precision_value ?? undefined,
            reportOnValueChanged: Boolean(row.report_on_value_changed),
            reportOnInit: row.report_on_init ?? undefined,
            location: fromJsonOrNull<IDevice["location"]>(row.location_json) as IDevice["location"],
            ranges: fromJsonOrNull<IDevice["ranges"]>(row.ranges_json),
            created: new Date(row.created),
            changed: row.changed ? new Date(row.changed) : undefined,
        }));
    }

    public async update(id?: string, modes?: Array<IMode>, rules?: Array<IRule>) {
        await this.checkData();
        if (!this.data) {
            return;
        }

        if (id !== undefined) {
            this.data.id = id;
        }
        if (modes !== undefined) {
            this.data.modes = modes;
        }
        if (rules !== undefined) {
            this.data.rules = rules;
        }

        await this.save();
    }

    private async save() {
        await this.checkData();
        if (!this.data) {
            return;
        }

        await initSchema();
        const pool = getPool();

        const payload = toDbOrgPayload({
            ...this.data,
            changed: new Date(),
            created: this.data.created ?? new Date(),
        });

        if (this.data._id) {
            await pool.execute(
                `UPDATE organizations
                 SET org_id = ?, name = ?, tokens_json = ?, modes_json = ?, rules_json = ?, changed = ?
                 WHERE id = ?`,
                [
                    payload.org_id,
                    payload.name,
                    payload.tokens_json,
                    payload.modes_json,
                    payload.rules_json,
                    payload.changed,
                    this.data._id,
                ],
            );
        } else {
            const [result] = await pool.execute(
                `INSERT INTO organizations (org_id, name, tokens_json, modes_json, rules_json, created, changed)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    payload.org_id,
                    payload.name,
                    payload.tokens_json,
                    payload.modes_json,
                    payload.rules_json,
                    payload.created,
                    payload.changed,
                ],
            );
            this.data._id = String((result as any).insertId);
        }

        this.data.changed = payload.changed;
    }

    public async changemode(newmode: string) {
        await this.checkData();
        if (!this.data?.modes?.find((v) => v.name === newmode)) {
            throw new SHOMEError("organozation:modenotfound", `Org = '${this.data?.id}' has no mode = '${newmode}'`);
        }

        await initSchema();
        const pool = getPool();
        await pool.execute(
            `INSERT INTO changemodereports (organizationid, mode, created) VALUES (?, ?, ?)`,
            [this.data?.id, newmode, new Date()],
        );

        console.log(`Organization: '${this.data.id}' changed mode to '${newmode}'`);
    }

    public async getMode(): Promise<string | undefined> {
        await this.checkData();
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(
            `SELECT mode FROM changemodereports WHERE organizationid = ? ORDER BY created DESC, id DESC LIMIT 1`,
            [this.data?.id],
        );

        if (rows.length === 1) {
            return rows[0].mode;
        }
    }

    public async checkRules(bot?: Telegraf) {
        await this.checkData();
        console.log(`Organization: '${this.data?.id}' check rules procedure started`);

        if (this.data === undefined || this.data.rules === undefined || this.data.modes === undefined) {
            return;
        }

        const cur_mode = await this.getMode();
        if (cur_mode === undefined) {
            return;
        }

        const mode_obj = this.data.modes.find((m) => m.name === cur_mode);
        if (mode_obj === undefined) {
            return;
        }

        console.log(`Organization: '${this.data?.id}' check rules procedure all checks passed`);
        for (const rule_id of mode_obj.rules) {
            const rule = this.data.rules.find((r) => r.name === rule_id);
            if (rule === undefined) {
                break;
            }
            console.log(`Organization: '${this.data?.id}' checking rule: '${rule?.description}'`);
            for (const ev_obj of rule.events) {
                if (ev_obj.event.device) {
                    const lv = await this.devicesWithLastValues([ev_obj.event.device.deviceid]);
                    if (lv.length === 1) {
                        const device = new Device(lv[0]);
                        const range = device.getRange((lv[0] as any).value);
                        if (range === ev_obj.event.device.range) {
                            for (const action of rule.actions) {
                                if (action.notify?.tguser !== undefined) {
                                    console.log(`Organization: '${this.data?.id}' need to inform: 🏠${this.data.id} ⚡${rule.description}\n📟${device.json?.name} 📐${range} ⚖️${(lv[0] as any).value}`);
                                    bot?.telegram.sendMessage(action.notify?.tguser, `🏠${this.data.id} ⚡${rule.description}\n📟${device.json?.name} 📐${range} ⚖️${(lv[0] as any).value}`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public async devicesWithLastValues(deviceListIds?: string[]): Promise<IDeviceValues[]> {
        await this.checkData();
        if (!this.data) {
            return [];
        }

        const organizationId = this.data.id;
        if (deviceListIds === undefined) {
            deviceListIds = (await this.devices()).map((v) => v.id);
        }

        if (deviceListIds.length === 0) {
            return [];
        }

        await initSchema();
        const pool = getPool();

        const placeholders = deviceListIds.map(() => "?").join(", ");
        const [rows] = await pool.query<DbRow[]>(
            `SELECT
                d.id,
                d.organizationid,
                d.device_id,
                d.name,
                d.type,
                d.units,
                d.hardware,
                d.pin,
                d.emulation,
                d.freq_read,
                d.freq_report,
                d.threshold,
                d.precision_value,
                d.report_on_value_changed,
                d.report_on_init,
                d.location_json,
                d.ranges_json,
                d.created,
                d.changed,
                dr.value,
                dr.strvalue,
                dr.timestamp
            FROM devices d
            INNER JOIN (
                SELECT r.organizationid, r.device_id, MAX(r.id) AS latest_id
                FROM devicereports r
                WHERE r.organizationid = ?
                GROUP BY r.organizationid, r.device_id
            ) latest ON latest.organizationid = d.organizationid AND latest.device_id = d.device_id
            INNER JOIN devicereports dr ON dr.id = latest.latest_id
            WHERE d.organizationid = ? AND d.device_id IN (${placeholders})`,
            [organizationId, organizationId, ...deviceListIds],
        );

        return rows.map((row) => ({
            _id: String(row.id),
            organizationid: row.organizationid,
            id: row.device_id,
            name: row.name,
            type: row.type,
            units: row.units ?? undefined,
            hardware: row.hardware,
            pin: Number(row.pin),
            emulation: row.emulation ?? undefined,
            freqRead: Number(row.freq_read),
            freqReport: Number(row.freq_report),
            threshold: row.threshold ?? undefined,
            precision: row.precision_value ?? undefined,
            reportOnValueChanged: Boolean(row.report_on_value_changed),
            reportOnInit: row.report_on_init ?? undefined,
            location: fromJsonOrNull<IDevice["location"]>(row.location_json) as IDevice["location"],
            ranges: fromJsonOrNull<IDevice["ranges"]>(row.ranges_json),
            created: new Date(row.created),
            changed: row.changed ? new Date(row.changed) : undefined,
            value: Number(row.value),
            value_str: row.strvalue,
            timestamp: new Date(row.timestamp),
        }));
    }
}
