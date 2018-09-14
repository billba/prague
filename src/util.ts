import { match } from "./prague";

/**
 * Wraps a Regular Expression in a transform
 * @param regexp The Regular Expression
 * @param group (optional) the capture group to return. If omitted, the array of all capture groups will be returned
 * @returns A new transform which returns the result of executing the Regular Expression on its argument
 */

export function re (
    regexp: RegExp,    
): (text: string) => Promise<RegExpExecArray | null>;

export function re (
    regexp: RegExp,
    group: number,
): (text: string) => Promise<string | null>;

export function re (
    regexp: RegExp,
    group?: number,
) {
    return match(
        (text: string) => regexp.exec(text),
        groups => group ? groups[group] : groups
    );
}

/**
 * Helper for calling fetch
 * @param T the type of the response (defaults to any)
 * @param error (optional) the string to return if the response is not ok, or a function which creates the string to return based on the body
 * @returns Promise<T>
 */

export const getFetchJson = <T = any> (
    error: undefined | string | ((body: string) => string)
) => (r: Response) => {
    if (!r.ok) {
        if (typeof error === 'string')
            throw error;

        if (typeof error === 'function')    
            return r.text().then(body => {
                throw error(body);
            });

        throw "the fetch returned an error";
    }

    return r.json() as Promise<T>;
}