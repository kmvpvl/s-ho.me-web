export type ErrorCode = 
"client:unknown" 
| "organization:notfound"
| "settings:mongouriundefined"
| "device:notfound"
| "forbidden:roleexpected"
| "organozation:modenotfound";

export default class SHOMEError extends Error {
    private code: ErrorCode;
    constructor(code:ErrorCode, message?: string) {
        super(`${message}`);
        this.code = code;
    }
    get json(): any {
        return {
            code: this.code,
            message: this.message
        }
    }
}