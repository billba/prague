const isDebug = () =>
    (typeof(window) !== 'undefined' && (window as any)["pragueDebug"]) ||
    (typeof(process) !== 'undefined' && process.env && process.env.debug);

export const konsole = {
    log: (message?: any, ... optionalParams: any[]) => {
        if (isDebug() && message)
            console.log(message, ... optionalParams);
    },
    warn: (message?: any, ... optionalParams: any[]) => {
        if (isDebug() && message)
            console.warn(message, ... optionalParams);
    },
    error: (message?: any, ... optionalParams: any[]) => {
        if (isDebug() && message)
            console.error(message, ... optionalParams);
    }
}
