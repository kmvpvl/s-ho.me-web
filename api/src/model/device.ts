import { DbRow, getPool, initSchema, toJsonOrNull, fromJsonOrNull } from "./db";

export interface IDeviceReport {
    _id?: string;
    created: Date;
    timestamp: Date;
    ip?: string;
    value: number;
    strvalue: string;
    extra?: object;
    organizationid: string;    
    id: string;
}

export interface IDevice {
    _id?: string;
    organizationid: string;
    id: string;
    name: string;
    type: string;
    units?: string;
    hardware: string;
    pin: number;
    emulation?: boolean;
    freqRead: number;
    freqReport: number;
    threshold?: number;
    precision?: number;
    reportOnValueChanged: boolean;
    reportOnInit?: boolean;
    location: {
        layer: string;
        x?: number;
        y?: number;
    }
    ranges?: Array<{
        name: string;
        color: string;
        max?: number;
        min?: number;
    }>;
    created: Date;
    changed?: Date;
}

function mapDeviceRow(row: DbRow): IDevice {
    return {
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
    };
}

export class DeviceReport {
    private data?: IDeviceReport;

    constructor(data?: IDeviceReport) {
        this.data = data;
    }

    get json(): IDeviceReport | undefined {
        return this.data;
    }

    public async save() {
        if (!this.data) {
            throw new Error("device report data is not loaded");
        }

        await initSchema();
        const pool = getPool();
        const created = new Date(this.data.created) ?? new Date();
        const timestamp = new Date(this.data.timestamp) ?? created;
        const [result] = await pool.execute(
            `INSERT INTO devicereports (
                organizationid,
                device_id,
                value,
                strvalue,
                extra_json,
                ip,
                timestamp,
                created
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                this.data.organizationid,
                this.data.id,
                this.data.value,
                this.data.strvalue === undefined ? null : this.data.strvalue,
                toJsonOrNull(this.data.extra),
                this.data.ip ?? null,
                timestamp,
                created,
            ],
        );

        this.data = {
            ...this.data,
            _id: String((result as any).insertId),
            created,
            timestamp,
        };
    }
}

export class Device {
    private data?: IDevice;

    constructor(data?: IDevice) {
        this.data = data;
    }

    get json(): IDevice | undefined {
        return this.data;
    }

    public static async getById(orgid: string, name: string): Promise<Device | undefined> {
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(
            `SELECT * FROM devices WHERE organizationid = ? AND device_id = ? LIMIT 1`,
            [orgid, name],
        );
        if (rows.length === 1) {
            return new Device(mapDeviceRow(rows[0]));
        }
    }

    public static async createDevice(device: IDevice): Promise<Device> {
        const d = await Device.getById(device.organizationid as string, device.id);
        if (d) return d;

        await initSchema();
        const pool = getPool();

        const created = device.created ?? new Date();
        const changed = device.changed ?? new Date();
        const [result] = await pool.execute(
            `INSERT INTO devices (
                organizationid,
                device_id,
                name,
                type,
                units,
                hardware,
                pin,
                emulation,
                freq_read,
                freq_report,
                threshold,
                precision_value,
                report_on_value_changed,
                report_on_init,
                location_json,
                ranges_json,
                created,
                changed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                device.organizationid,
                device.id,
                device.name,
                device.type,
                device.units ?? null,
                device.hardware,
                device.pin,
                device.emulation ?? null,
                device.freqRead,
                device.freqReport,
                device.threshold ?? null,
                device.precision ?? null,
                device.reportOnValueChanged,
                device.reportOnInit ?? null,
                JSON.stringify(device.location),
                toJsonOrNull(device.ranges),
                created,
                changed,
            ],
        );

        const newD = new Device({ ...device, _id: String((result as any).insertId), created, changed });
        return newD;
    }

    public getRange(value: number): string | undefined {
        const r = this.data?.ranges?.find(v=>(v.min !== undefined && v.min <= value) && (v.max !== undefined && v.max >= value));
        if (r !== undefined) return r.name;
    }
}
