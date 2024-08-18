import React from 'react';
import './device.css';

interface IDeviceProps {
    data: any;
}

interface IDeviceState {

}

export class Device extends React.Component<IDeviceProps, IDeviceState> {
    render(): React.ReactNode {
        const v = this.props.data;
        return <span className='device-container' style={{left:`${v.location.x}%`, top:`${v.location.y}%`}}>
            <div><img src={`img/${v.type}.gif`} alt={v.name} className='device-icon'/></div>
            <div>{v.value}</div>
            <div>{new Date(v.timestamp).toLocaleString()}</div>
        </span>;
    }
}