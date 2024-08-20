export function relativeDateString(d: Date): string {
    const today = new Date().getTime();
    const changed = d.getTime();
    let delta = (today - changed)/1000;
    let deltastr = "just now";
    if (delta > 60) {
        delta = delta / 60;
        if (delta < 60) deltastr = `${Math.round(delta)} mins ago`
        else {
            delta = delta / 60;
            if (delta < 24) deltastr = `${Math.round(delta)} hours ago`
            else {
                delta = delta / 24;
                if (delta < 365) deltastr = `${Math.round(delta)} days ago`
                else deltastr = `More year ago`
            }
        }
    } 
    return deltastr
}
