import { existsSync, statSync } from 'fs';


const is = {
    directory: (path: string): boolean =>
        existsSync(path) && statSync(path).isDirectory(),

    file: (path: string): boolean =>
        existsSync(path) && statSync(path).isFile(),

    link: (path: string): boolean =>
        existsSync(path) && statSync(path).isSymbolicLink(),
};


export {
    is,
};
