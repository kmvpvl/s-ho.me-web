import React from 'react';
import './devices.css';
import { Device } from './device';
interface IDevicesProps {
    devices: any[];
}

interface IDevicesState {

}

export class Devices extends React.Component<IDevicesProps, IDevicesState> {
    render(): React.ReactNode {
        const bkgndimg = this.props.devices.length?`img/customers/${'TestEntrance'}.png`:undefined;
        return <>
        {this.props.devices.length?<div className='devices-management-container' style={{backgroundImage:`url(${bkgndimg})`}}>
        {this.props.devices.map((v, i)=> 
            <Device key={i} data={v}/>
        )}
        </div>:<span></span>}
        </>;
    }
}