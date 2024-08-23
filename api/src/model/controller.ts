import { Schema, Types, model } from "mongoose";
import MongoProto from "./mongoproto";

/**
 * IController settings
 */
export interface IController {
    _id?: Types.ObjectId;   //uniq id set by database
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

const ControllerAutoUpdateSchema = new Schema({
    auto: {type: Boolean, required: true},
    repo: {type: String, required: false},
    branch: {type: String, required: false}
});

const ControllerLayerSchema = new Schema({
    sortNumber: {type: Number, required: true},
    bgImage: {type: String, required: false},
    id: {type: String, required: true},
    name: {type: String, required: true}
});

export const ControllerSchema = new Schema({
    organizationid: {type: String, required: true},
    name: {type: String, required: true},
    description: {type: String, required: true},
    autoupdate: {type: ControllerAutoUpdateSchema, required: true},
    location: {type: Object, required: false},
    buffer: {type: Object, required: false},
    logs: {type: Object, required: false},
    layers: {type: [ControllerLayerSchema], required: false},
});

const mongoControllers = model<IController>('controllers', ControllerSchema);

export default class Controller extends MongoProto<IController> {
    constructor (id?: Types.ObjectId, data?: IController) {
        super(mongoControllers, id, data);
    }
    public static async getByName(orgid: string, name: string): Promise<Controller | undefined> {
        const c = await mongoControllers.aggregate([
            {"$match": {
                organizationid: orgid,
                name: name
            }}
        ]);
        if (c.length === 1) return new Controller(undefined, c[0]);
    }
    public static async create(ctrl: IController): Promise<Controller> {
        const c = await Controller.getByName(ctrl.organizationid, ctrl.name);
        if (c) return c;
        const newC = new Controller(undefined, ctrl);
        await newC.save();
        return newC;
    }
}