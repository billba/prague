import { match, Transform } from "./prague";

export function re (
    regexp: RegExp,    
): Transform<[string], RegExpExecArray | null>;

export function re (
    regexp: RegExp,
    group: number,
): Transform<[string], string | null>;

export function re (
    regexp: RegExp,
    group?: number,
) {
    return match(
        (text: string) => regexp.exec(text),
        groups => group ? groups[group] : groups
    );
}
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