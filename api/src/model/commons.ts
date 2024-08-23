/**
 * Function converts date to the string which describes how much time was spend from the moment of the date parameter to the current time
 * 
 * @param date date will be converted to relative date string. Must be in the past
 * @returns string which describes how much time was spend from the moment of the date parameter to the current time
 */
export function relativeDateString(date: Date): string {
    const today = new Date().getTime();
    const changed = date.getTime();
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
