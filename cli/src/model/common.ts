export type ErrorCode = "notauth" | "rolerequired" | "servernotresponding" | "badrequest" | "unknown" | "notfound";
export class SHomeError extends Error{
    code: ErrorCode;
    constructor (code: ErrorCode, message: string){
        super(`${code} - ${message}`);
        this.code = code;
    }
} 
export type TServerVersion = string;

export interface ILoginReq {
    organizationid?: string;
    authtoken?: string;
}

console.log(JSON.stringify(process.env));
export function serverFetch(command: string, method: string, headers?: HeadersInit, body?: BodyInit, successcb?: (res: any)=>void, failcb?: (err: SHomeError)=>void) {
    const h: Headers = new Headers([
        ['Access-Control-Allow-Origin', '*'],
        ["ngrok-skip-browser-warning", "any"],
        ["Content-Type", "application/json"]
    ]);
    if (headers) {
        const oheaders = new Headers(headers);
        for (const [h1, h2] of oheaders.entries()) {
            h.append(h1, h2);
        }
    }    
    fetch(`${process.env.REACT_APP_SERVER_BASE_URL}/${command}`,{
        method: method,
        headers: h,
        body: body
    }).then(res=>{
        if (!res.ok) return Promise.reject(res);
        return res.json()})
    .then((v)=>{
        if (successcb) successcb(v);
    })
    .catch((v)=>{
        if (v instanceof Error) {
            if (failcb) failcb(new SHomeError("servernotresponding", `command='${command}'; error='${v.message}'`));
        } else {
            v.json().then((j: any) =>{
                let errcode: ErrorCode;
                switch (v.status){
                    case 500:
                    case 400: errcode = "badrequest"
                    break;
                    case 401: errcode = "notauth"
                    break;
                    case 403: errcode = "rolerequired"
                    break; 
                    case 404: errcode = "notfound"
                    break; 
                    default: errcode = "unknown";
                }
                const err = new SHomeError(errcode, `command='${command}; url='${v.url}'; status='${v.status}'; text='${v.statusText}'; server_desc='${JSON.stringify(j)}'`);
                if (failcb) failcb(err);
            })
            .catch((err: any)=> {
                debugger;
            });
        }
    });
}

export function serverCommand (command: string, lr?: ILoginReq, body?: BodyInit, successcb?: (res: any)=>void, failcb?: (err: SHomeError)=>void){
    serverFetch(command, 'POST', {
        'shome-organizationid': lr?.organizationid?lr.organizationid.toString():'',
        'shome-authtoken': lr?.authtoken?lr.authtoken:''
    }, body, successcb, failcb);
}