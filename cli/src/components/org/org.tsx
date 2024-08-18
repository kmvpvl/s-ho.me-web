import './org.css';
import React, { RefObject } from 'react';


interface IOrgProps {
    loggedin: boolean;
    serverVersion?: string;
    onLogin?: (orgid: string, authcode: string)=>void;
    onNewOrg?: (orgid: string, tguser: string | number)=>string;
    org?: any;
}

interface IOrgState {
}

export default class Org extends React.Component<IOrgProps, IOrgState> {
    orgidRef: RefObject<HTMLInputElement> = React.createRef();
    authcodeRef: RefObject<HTMLInputElement> = React.createRef();
    neworgidRef: RefObject<HTMLInputElement> = React.createRef();
    tguser: RefObject<HTMLInputElement> = React.createRef();
    getCredentials(): {
        organizationid?: string;
        authtoken?: string;
    } {
        return {
            organizationid: this.orgidRef.current?.value, 
            authtoken: this.authcodeRef.current?.value
        };
    }
    componentDidMount(): void {
        const strorgid = localStorage.getItem('orgid');
        const strauthcode = localStorage.getItem('authcode');
        if (this.props.onLogin && strorgid && strauthcode) this.props.onLogin(strorgid, strauthcode);
        if (this.orgidRef.current) this.orgidRef.current.value = strorgid?strorgid:'';
        if (this.authcodeRef.current) this.authcodeRef.current.value = strauthcode?strauthcode:'';
    }
    render(): React.ReactNode {
        return <>
        <div className='org-management-container'>
        <span>{this.props.org?this.props.org.id:''}</span>
        {!this.props.loggedin?<div className='org-management-loginform'>
            <div className='org-management-loginform-intro'>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vestibulum rhoncus est pellentesque elit ullamcorper dignissim cras. Sit amet consectetur adipiscing elit duis tristique. Amet tellus cras adipiscing enim eu turpis egestas. Nunc aliquet bibendum enim facilisis. Lectus sit amet est placerat in egestas erat. Ultricies leo integer malesuada nunc. Porta nibh venenatis cras sed felis eget velit. Semper quis lectus nulla at volutpat. Tellus in hac habitasse platea dictumst vestibulum rhoncus. Blandit aliquam etiam erat velit scelerisque in dictum non. Gravida cum sociis natoque penatibus et magnis dis. Suscipit adipiscing bibendum est ultricies integer quis auctor elit sed. Nulla aliquet porttitor lacus luctus accumsan tortor posuere ac. Sed enim ut sem viverra. Vitae purus faucibus ornare suspendisse sed nisi lacus sed viverra. Nisl rhoncus mattis rhoncus urna. Viverra suspendisse potenti nullam ac tortor vitae purus faucibus. Nisi scelerisque eu ultrices vitae auctor. Viverra justo nec ultrices dui.
            </div>
            <label style={{gridArea:'label1'}}>I have an organization</label>
            <input ref={this.orgidRef} style={{gridArea:'orgname1'}} placeholder='Organization name'/>
            <input ref={this.authcodeRef} style={{gridArea:'authcode'}} placeholder='Auth code' type='password'/>
            <button style={{gridArea:'btnlogin'}} onClick={()=>{
                if (this.props.onLogin && this.orgidRef.current && this.authcodeRef.current) {
                    this.props.onLogin(this.orgidRef.current.value, this.authcodeRef.current.value);
                    localStorage.setItem('orgid', this.orgidRef.current.value);
                    localStorage.setItem('authcode', this.authcodeRef.current.value);
                }
            }}>Login</button>
            <span style={{gridArea:'or', textAlign:'center'}}>or</span>
            <label style={{gridArea:'label2'}}>I want to create new one</label>
            <input style={{gridArea:'orgname2'}} placeholder='Organization name'/>
            <input style={{gridArea:'tguser'}} placeholder='Telegram user'/>
            <button style={{gridArea:'btncreate'}}>Create</button>
            <span style={{gridArea:'status'}}>{`Server version: ${this.props.serverVersion}`}</span>
        </div>:<></>}
        </div>
        </>;
    }
}