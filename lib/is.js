import { existsSync, statSync } from 'fs';

const is = {
    directory: path => existsSync(path) && statSync(path).isDirectory(),
    file: path => existsSync(path) && statSync(path).isFile(),
    link: path => existsSync(path) && statSync(path).isSymbolicLink(),
};

export default is;
