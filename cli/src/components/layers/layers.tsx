import React from 'react';
import './layers.css';
interface ILayersProps {
    layers: string[];
    onLayerChanged?: (newLayer: string)=>void;
}

interface ILayersState {

}

export class Layers extends React.Component<ILayersProps, ILayersState> {
    componentDidUpdate(prevProps: Readonly<ILayersProps>, prevState: Readonly<ILayersState>, snapshot?: any): void {
        if (prevProps.layers === this.props.layers) return;
        if (this.props.onLayerChanged && this.props.layers) this.props.onLayerChanged('');
    }
    render(): React.ReactNode {
        return <span className='layers-selector-container'>
        <select onChange={(e)=>{
            if (this.props.onLayerChanged && this.props.layers) this.props.onLayerChanged(e.currentTarget.value);
        }}>
            <option value=''>All layers</option>
            {this.props.layers?this.props.layers.map((v, i)=><option value={v} key={i}>{v}</option>):<></>}
        </select>
        </span>;
    }
}