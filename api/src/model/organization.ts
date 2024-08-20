import { Schema, Types, model } from "mongoose";
import MongoProto from "./mongoproto";
import { UUID } from "crypto";
import { Md5 } from "ts-md5";
import SHOMEError from "./error";
import { v4 } from "uuid";
import { Device, IDevice, mongoDevices } from "./device";
import { Telegraf } from "telegraf";

export type SHOMERoles = "admin" | "controller" | "user" | "viewer";

export interface IOrganizationToken {
    authTokenHash: string;
    tguserid?: string | number;
    roles: Array<SHOMERoles>
}

export interface IMode {
    name: string;
    description: string;
    disabled: boolean;
    rules: Array<string>;
    created: Date;
    changed?: Date;
}
const ModeSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    disabled: {type: Boolean, required: true},
    rules: {type: Array, required: true},
    created: {type: Date, required: true, default: Date.now},
    changed: {type: Date, required: false, default: Date.now},
});

interface IEventDataDevice {
    deviceid: string;
    range: string;
    repeat: number;
}
const EventDataDeviceSchema = new Schema({
    deviceid: {type: String, required: true},
    range: {type: String, required: true},
    repeat: {type: Number, required: true},
});

interface IEventDataTime {

}
const EventDataTimeSchema = new Schema({});

export interface IEvent {
    name: string;
    description: string;
    device?: IEventDataDevice;
    time?: IEventDataTime;
}
const EventSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    device: {type: EventDataDeviceSchema, required: false},
    time: {type: EventDataTimeSchema, required: false},
});

export interface IChangeModeReport {
    organizationid: string;
    mode: string;
    created: Date;
}
const ChangeModeReportSchema = new Schema({
    organizationid: {type: String, required: true},
    mode: {type: String, required: true},
    created: {type: Date, required: true, default: Date.now},
});

/*export interface IEventReport {
    organizationid: string;
    eventname: string;
    timestamp: Date;
    data: IEventData;
    created: Date;
    changed?: Date;
}*/
const EventReportSchema = new Schema({
    organizationid: {type: String, required: true},
    eventname: {type: String, required: true},
    timestamp: {type: Date, required: true},
    data: {type: {oneOf:[EventDataDeviceSchema, EventDataTimeSchema]}, required: true},
    created: {type: Date, required: true, default: Date.now},
    changed: {type: Date, required: true, default: Date.now}
});

//const mongoEventReports = model<IEventReport>('eventreports', EventReportSchema);
const mongoChangeModeReports = model<IChangeModeReport>('changemodereports', ChangeModeReportSchema);

interface IActionDeviceData {

}

const ActionDeviceDataSchema = new Schema({});

interface IActionNotifyData {
    tguser: number | string;
}

const ActionNotifyDataSchema = new Schema({
    tguser: {type: Schema.Types.Mixed, required: true}
});

export interface IAction {
    name: string;
    description: string;
    device?: IActionDeviceData;
    notify?: IActionNotifyData;
}
const ActionSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    device: {type: ActionDeviceDataSchema, required: false},
    notify: {type: ActionNotifyDataSchema, required: false},
});

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
const RuleSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    events: {type: [
        Object({
            operation: {type: String, required: false, enum:["NOT", "AND", "OR"]},
            event: {type: EventSchema, required: true}
        })
    ]},
    actions: {type: [ActionSchema], required: true},
    disabled: {type: Boolean, required: true},
    created: {type: Date, required: true, default: Date.now},
    changed: {type: Date, required: true, default: Date.now}
});

export interface IOrganization {
    _id?: Types.ObjectId;
    id: string;
    name?: string;
    tokens: Array<IOrganizationToken>;
    modes?: Array<IMode>;
    rules?: Array<IRule>;
    created: Date;
    changed?: Date;
}

export const TokenSchema = new Schema({
    authTokenHash: {type: String, required: true},
    tguserid: {type: Schema.Types.Mixed, required: false},
    roles: {type: [String], required: true, enum:["admin", "controller"]}
});

export const OrganizationSchema = new Schema({
    id: {type: String, required: true, index: true, unique: true},
    name: {type: String, required: false},
    tokens: {
        type: [TokenSchema],
        required: true
    },
    modes: {type: [ModeSchema], required: false},
    rules: {type: [RuleSchema], required: false},
    created: {type: Date, required: true, default: Date.now},
    changed: {type: Date, required: true, default: Date.now}
});

export const mongoOrganizations = model<IOrganization>('organizations', OrganizationSchema);

interface IDeviceValues extends IDevice {
    value: number;
    value_str: string;
    timestamp: Date;
} 


export default class Organization extends MongoProto<IOrganization> {
    constructor(id?: Types.ObjectId, data?: IOrganization) {
        super(mongoOrganizations, id, data);
    }
    /**
     * Function checks whether id (the unique name of organization) is free
     *  
     * @param id unique mnemonic organization name 
     * @returns true if id is free, or false if the id is occupied
     */
    public static async isIdFree(id: string): Promise<boolean> {
        MongoProto.connectMongo();
        const orgs = await mongoOrganizations.aggregate([{
            $match: {id: id}
        }]);
        return orgs.length !== 1;
    }
    /**
     * Returns Organization and roles of token (user) by organization id (uniq organization name) and token (private key). Function calcs the public token and search organization by public token
     * 
     * @param id unique mnemonic organization name
     * @param token private key of user of organization
     * @returns Organization and roles of token (user) 
     */
    public static async getByToken(id: string, token: UUID): Promise<{organization: Organization, roles: Array<SHOMERoles>}> {
        MongoProto.connectMongo();
        const hash = Md5.hashStr(`${id} ${token}`);
        const o = await mongoOrganizations.aggregate([
            {"$match": {"tokens.authTokenHash": hash}}
        ]);
        if (1 !== o.length) throw new SHOMEError("organization:notfound", `id='${id}'; token='${token}'`);
        const org = new Organization(undefined, o[0]);
        await org.load();
        const roles = org.json?.tokens.filter(el=>el.authTokenHash==hash)[0].roles as SHOMERoles[];
        return {organization: org, roles: roles};
    }
    
    /**
     * Returns Organization and roles of token (user) by Telegram id
     * 
     * @param tguserid Telegram id of user
     * @returns Organization and roles of token (user)
     */
    public static async getByTgUserId(tguserid: string | number): Promise<{organization: Organization, roles: Array<SHOMERoles>}> {
        MongoProto.connectMongo();
        const o = await mongoOrganizations.aggregate([
            {"$match": {"tokens.tguserid": tguserid}}
        ]);
        if (0 === o.length) throw new SHOMEError("organization:notfound", `tguserid='${tguserid}'`);
        const org = new Organization(undefined, o[0]);
        await org.load();
        const roles = org.json?.tokens.filter(el=>el.tguserid===tguserid)[0].roles as SHOMERoles[];
        return {organization: org, roles: roles};
    }

    /**
     * Creates new organization and create new token (user) of organization with admin role
     * 
     * @param id unique mnemonic organization name
     * @param adminTgUserId Telegram id of user with admin role
     * @returns internal _id organization (not mnemonic, system mongo unique key) and admin token (private key) of user
     */
    public static async create(id: string, name?: string, adminTgUserId?: number | string): Promise<{_id: Types.ObjectId; adminToken: UUID}> {
        const token = v4() as UUID;
        const hash = Md5.hashStr(`${id} ${token}`);
        const iOrg: IOrganization = {
            id: id,
            name: name,
            tokens: [
                {
                    authTokenHash: hash,
                    tguserid: adminTgUserId,
                    roles: ['admin']
                }
            ],
            created: new Date
        }
        const org = new Organization(undefined, iOrg);
        await org.save();
        const ret = {
            _id: org.uid, 
            adminToken: token
        };
        return ret;
    }

    public async createToken(roles: Array<SHOMERoles>, tguserid?: string | number): Promise<UUID> {
        await this.checkData();
        const token = v4() as UUID;
        const hash = Md5.hashStr(`${this.json?.id} ${token}`);
        this.data?.tokens.push({authTokenHash: hash, tguserid: tguserid, roles:roles});
        await this.save();
        return token;
    }

    public static hasRole(rolesToSearch: SHOMERoles | Array<SHOMERoles>, rolesAssigned: Array<SHOMERoles>): boolean {
        // implementing 'admin has any role'
        if (rolesAssigned.includes("admin")) return true;
        if (!(rolesToSearch instanceof Array)) rolesToSearch = [rolesToSearch];
        return  rolesToSearch.some(v=> rolesAssigned.includes(v));
    }
    public async devices(): Promise<IDevice[]> {
        const d = await mongoDevices.aggregate([{
            $match: {"organizationid": this.data?.id}
        }]);
        return d;
    }

    public async update (id?: string, modes?: Array<IMode>, rules?: Array<IRule>) {
        this.checkData();
        if (this.data){
            if (id !== undefined) this.data.id = id;
            if (modes !== undefined) this.data.modes = modes;
            if (rules !== undefined) this.data.rules = rules;
            await this.save();
            await this.load();
        }
    }

    public async changemode(newmode: string) {
        this.checkData();
        if (!this.data?.modes?.find(v=>v.name==newmode)) throw new SHOMEError("organozation:modenotfound", `Org = '${this.data?.id}' has no mode = '${newmode}'`)
        const d = await mongoChangeModeReports.insertMany ([{
            organizationid: this.data?.id,
            mode: newmode
        }]);
        console.log(`Organization: '${this.data.id}' changed mode to '${newmode}'`);
    }

    public async getMode (): Promise<string | undefined>{
        this.checkData();
        const lm = await mongoChangeModeReports.aggregate([
            {
              '$match': {
                'organizationid': this.data?.id
              }
            }, {
              '$sort': {
                'created': -1
              }
            }, {
              '$limit': 1
            }
          ]);
        if (lm.length === 1) return lm[0].mode;
    }

    public async checkRules(bot?:Telegraf){
        this.checkData();
        console.log(`Organization: '${this.data?.id}' check rules procedure started`);
        if (this.data === undefined || this.data.rules === undefined || this.data.modes === undefined) return;
        //calculating current mode of Ogr
        const cur_mode = await this.getMode();
        if (cur_mode === undefined) return;
        const mode_obj = this.data.modes.find(m=>m.name === cur_mode);
        if (mode_obj === undefined) return;

        console.log(`Organization: '${this.data?.id}' check rules procedure all checks passed`);
        // enumeration all rules of mode
        for (const rule_id of mode_obj.rules) {
            const rule = this.data.rules.find(r=>r.name === rule_id);
            if (rule === undefined) break;
            console.log(`Organization: '${this.data?.id}' checking rule: '${rule?.description}'`);
            //enumeration all events of rule
            for (const ev_obj of rule.events) {
                if (ev_obj.event.device) {
                    const lv = await this.devicesWithLastValues([ev_obj.event.device.deviceid]);
                    if (lv.length === 1) {
                        const device = new Device(undefined, lv[0]);
                        const range = device.getRange((lv[0] as any).value);
                        if (range === ev_obj.event.device.range) {
                            // device event triggered
                            for (const action of rule.actions) {
                                if (action.notify?.tguser !== undefined) {
                                    //notify by TG
                                    console.log(`Organization: '${this.data?.id}' need to inform: 🏠${this.data.id} ⚡${rule.description}\n📟${device.json?.name} 📐${range} ⚖️${(lv[0] as any).value}`);
                                    bot?.telegram.sendMessage(action.notify?.tguser, `🏠${this.data.id} ⚡${rule.description}\n📟${device.json?.name} 📐${range} ⚖️${(lv[0] as any).value}`)
                                }
                            }
                        }
                    } 
                }
            }
        }
    }

    public async devicesWithLastValues(deviceListIds?: string[]): Promise<IDeviceValues[]>  {
        if (undefined === deviceListIds) {
            deviceListIds = (await this.devices()).map(v=>v.id);
        }
        const d = await mongoDevices.aggregate([
            {
              '$match': {
                'id': {
                  '$in': deviceListIds
                }, 
                'organizationid': this.data?.id
              }
            }, {
              '$lookup': {
                'from': 'devicereports', 
                'localField': 'id', 
                'foreignField': 'id', 
                'pipeline': [
                  {
                    '$group': {
                      '_id': '$id', 
                      'value': {
                        '$last': '$value'
                      }, 
                      'value_str': {
                        '$last': '$value_str'
                      },
                      'timestamp': {
                        '$last': '$timestamp'
                      }
                    }
                  }
                ], 
                'as': 'result'
              }
            }, {
              '$project': {
                'result._id': 0
              }
            }, {
              '$unwind': '$result'
            }, {
              '$addFields': {
                'value': '$result.value',
                'value_str': '$result.value_str',
                'timestamp': '$result.timestamp'
              }
            }
          ]);
        return d;
    }
}