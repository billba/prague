export const re = (regexp: RegExp) => (text: string) => regexp.exec(text);

export const getFetchJson = (
    error: string | ((body: string) => string)
) => (r: Response) => {
    if (!r.ok) {
        if (typeof error === 'string')
            throw error;
        
        return r.text().then(body => {
            throw error(body);
        });
    }

    return r.json();
}