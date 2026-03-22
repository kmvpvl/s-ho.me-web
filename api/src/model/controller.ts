import { DbRow, getPool, initSchema, toJsonOrNull, fromJsonOrNull } from "./db";

/**
 * IController settings
 */
export interface IController {
    _id?: string;   //uniq id set by database
    organizationid: string; //facility's uniq text string id
    name: string;           //name of controller
    description: string;    //description of controller 
    autoupdate: {           //about auto-update of controller software chapter 
        auto: boolean;      //is auto-update allowed
        repo?: string;      //path to git repo
        branch?: string;    //branch in git repo
    },
    overwritesettingsfromcontroller?: boolean, //where priority of settings? in database or on controller
    location?: object;      //location of controller; no conception of use; reserved
    buffer?: {              //buffer; no conception of use; reserved
        
    };
    logs?: object;          //logs; no conception of use; reserved
    layers?: [{             //list of layers
        sortNumber: number; //any number for sorting
        bgImage?: string;   //background image of the layer
        id: string;         //uniq id of the layer
        name: string;       //name of the layer
    }];
}

function mapControllerRow(row: DbRow): IController {
    return {
        _id: String(row.id),
        organizationid: row.organizationid,
        name: row.name,
        description: row.description,
        autoupdate: fromJsonOrNull<IController["autoupdate"]>(row.autoupdate_json) as IController["autoupdate"],
        overwritesettingsfromcontroller: row.overwritesettingsfromcontroller ?? undefined,
        location: fromJsonOrNull<object>(row.location_json),
        buffer: fromJsonOrNull<object>(row.buffer_json),
        logs: fromJsonOrNull<object>(row.logs_json),
        layers: fromJsonOrNull<IController["layers"]>(row.layers_json),
    };
}

export default class Controller {
    private data?: IController;

    constructor(data?: IController) {
        this.data = data;
    }

    get json(): IController | undefined {
        return this.data;
    }

    public static async getByName(orgid: string, name: string): Promise<Controller | undefined> {
        await initSchema();
        const pool = getPool();
        const [rows] = await pool.query<DbRow[]>(
            `SELECT * FROM controllers WHERE organizationid = ? AND name = ? LIMIT 1`,
            [orgid, name],
        );
        if (rows.length === 1) {
            return new Controller(mapControllerRow(rows[0]));
        }
    }

    public static async create(ctrl: IController): Promise<Controller> {
        const c = await Controller.getByName(ctrl.organizationid, ctrl.name);
        if (c) return c;

        await initSchema();
        const pool = getPool();
        const [result] = await pool.execute(
            `INSERT INTO controllers (
                organizationid,
                name,
                description,
                autoupdate_json,
                overwritesettingsfromcontroller,
                location_json,
                buffer_json,
                logs_json,
                layers_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ctrl.organizationid,
                ctrl.name,
                ctrl.description,
                JSON.stringify(ctrl.autoupdate),
                ctrl.overwritesettingsfromcontroller ?? null,
                toJsonOrNull(ctrl.location),
                toJsonOrNull(ctrl.buffer),
                toJsonOrNull(ctrl.logs),
                toJsonOrNull(ctrl.layers),
            ],
        );

        const newC = new Controller({ ...ctrl, _id: String((result as any).insertId) });
        return newC;
    }
}