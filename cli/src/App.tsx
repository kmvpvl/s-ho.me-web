import React, { RefObject } from 'react';
import './App.css';
import Org from './components/org/org';
import { serverCommand, serverFetch } from './model/common';
import Pending from './components/pending/pending';
import {Infos} from './components/infos/infos';
import { Devices } from './components/devices/devices';
import { Layers } from './components/layers/layers';

interface IAppProps {

}
interface IAppState {
    version?: string;
    credentials: {
        organizationid?: string;
        authtoken?: string;
    };
    loggedin: boolean;
    orginfo: {
        org?: any;
        devices?: any[];
        layers?: string[];
    };
    reqdevices?: any[];
}
export default class App extends React.Component<IAppProps, IAppState> {
    state: IAppState = {
        version: undefined,
        credentials: {
            organizationid: undefined,
            authtoken: undefined
        },
        loggedin: false,
        orginfo: {
        },
    }
    pendingRef: RefObject<Pending> = React.createRef();
    infosRef: RefObject<Infos> = React.createRef();
    orgRef: RefObject<Org> = React.createRef();
    loadVersion(){
        this.pendingRef.current?.incUse();
        serverFetch('version', 'GET', undefined, undefined, res=>{
            const nState: IAppState = this.state;
            nState.version = res.version;
            this.setState(nState)
            this.pendingRef.current?.decUse();
        }, err=>{
            this.pendingRef.current?.decUse();
            this.infosRef.current?.displayError(err);
        })
    }
    componentDidMount(): void {
        this.loadVersion();
    }

    private createLayersList(devices: any[]): string[] {
        const ret = new Array<string>();
        devices.forEach((v)=>ret.includes(v.location.layer)?'':ret.push(v.location.layer));
        return ret;
    }

    onLogin(orgid: string, authcode: string) {
        this.pendingRef.current?.incUse();
        serverCommand('organizationinfo', {
            organizationid: orgid,
            authtoken: authcode
        }, undefined, res=>{
            this.pendingRef.current?.decUse();
            const nState: IAppState = this.state;
            nState.credentials.organizationid = orgid;
            nState.credentials.authtoken = authcode;
            nState.loggedin = true;
            nState.orginfo = res;
            if (nState.orginfo) res.devices?nState.orginfo.layers = this.createLayersList(res.devices):nState.orginfo.layers = undefined;
            this.setState(nState)
        }, err=>{
            this.pendingRef.current?.decUse();
            this.infosRef.current?.displayError(err);
        })
    }

    render(): React.ReactNode {
        return (<>
        <div className='home-container'>
            <img src="./favicon-32x32.png" alt=''/>
        </div>
        <div className='location-selector-container'>Location</div>
        <Org org={this.state.orginfo?(this.state.orginfo as any).org:undefined} ref={this.orgRef} loggedin={this.state.loggedin} serverVersion={this.state.version} onLogin={(orgid, authcode)=>{
            this.onLogin(orgid, authcode);
        }}/>
        <Layers layers={this.state.orginfo?(this.state.orginfo as any).layers:[]} onLayerChanged={layer=>{
            const devIds = this.state.orginfo.devices?.filter(v=>layer==='' || v.location.layer===layer)
                .map((v, i)=>v.id);
            this.pendingRef.current?.incUse();
            serverCommand('getlastvalues', this.state.credentials, JSON.stringify(devIds), res=>{
                this.pendingRef.current?.decUse();
                const nState: IAppState = this.state;
                nState.reqdevices = res;
                this.setState(nState)
            }, err=>{
                this.pendingRef.current?.decUse();
                this.infosRef.current?.displayError(err);
            })
        }}/>
        <Devices devices={this.state.reqdevices?this.state.reqdevices:[]}/>
        <Pending ref={this.pendingRef}/>
        <Infos ref={this.infosRef}/>
        </>
        );
    }
}
