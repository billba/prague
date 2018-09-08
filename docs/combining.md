## Combining asynchronous functions

Consider this set of asynchronous functions:

```ts
const getfullName = alias => fetch(`directoryService/getProfile/${alias}`)
    .then(r => r.ok
        ? r.json().then(r => r.fullName
        : null
    );

const writeNameOnMoon = name => fetch(`moonService/writeName/${name}`)
    .then(r => r.ok === true ? true : null);

const updateProfile = async (alias, key, value) => fetch(`directoryService/update/${alias}/${key}/${value}`);
```

To use them in series we can either nest `Promise`s:

```ts
const writeFullNameOnMoonAndUpdateProfile = alias =>
    getFullName(alias).then(fullName => {
        if (fullName !== null)
            return writeNameOnMoon(fullName).then(succeeded => {
                if (succeeded != null)
                    return updateProfile('alias', 'nameOnMoon', true);
            });
    });
```

Or use `async`/`await`:

```ts
const writeFullNameOnMoonAndUpdateProfile = async alias => {
    const fullName = await getFullName(alias);
    if (fullName !== null) {
        const succeeded = await writeNameOnMoon(fullName);
        if (succeeded !== null)
            return updateProfile('alias', 'nameOnMoon', true);
    }
}
```

*Prague* streamlines this common 

```ts
const writeFullNameOnMoonAndUpdateProfile = alias => pipe(
    getFullName,
    ({ value }) => writeNameOnMoon(value),
    () => updateProfile('alias', 'nameOnMoon', true)
)(alias);

