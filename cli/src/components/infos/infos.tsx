import React from "react";
import { SHomeError } from "../../model/common";
import './infos.css';

interface IInfosProps {
}

interface IInfoState {
    infos: string[];
    errors: SHomeError[];
}

export class Infos extends React.Component<IInfosProps, IInfoState> {
    state = {
        infos: [],
        errors: []
    }
    displayInfo(text: string) {
        const s = this.state;
        if (s) {
            const n = s.infos.push(text as never);
            this.setState(s);
            setTimeout(()=>{
                const s = this.state;
                if (s) {
                    s.infos.splice(n-1, 1);
                    this.setState(s);
                }
            }, 1500);
        }
    }

    displayError(err: SHomeError) {
        const s = this.state;
        if (s) {
            (s.errors as SHomeError[]).push(err);
            this.setState(s);
        }
    }
    render(): React.ReactNode {
        return (<div>
            {this.state.infos.map((v: any, i) => (<div id={`infos_${i}`} className='info' key={`infos_${i}`} onClick={(e)=>{
                const n = parseInt(e.currentTarget.id.split('_')[1]);
                const s = this.state;
                s.infos.splice(n, 1);
                this.setState(s);
            }}>{v}</div>))}
            {this.state.errors.map((v: any, i) => (<div id={`errors_${i}`} className='error' key={`errors_${i}`} onClick={(e)=>{
                const n = parseInt(e.currentTarget.id.split('_')[1]);
                const s = this.state;
                s.errors.splice(n, 1);
                this.setState(s);
            }}>{v.message}</div>))}
        </div>);
    }
}