import { series, parallel } from 'gulp';

import {
    syncSDK,
} from './syncSDK';

import {
    sync,
    syncWatch,
} from './sync';

import {
    compileTypescript,
    watchTypescript,
} from './typescript';

import {
    compileLess,
    watchLess,
} from './less';


const compile = parallel(
    compileTypescript,
    compileLess,
);

const watch = series(
    syncWatch,
    parallel(
        watchTypescript,
        watchLess,
    ),
);

const defaultTask = series(
    syncSDK,
    sync,
    compile,
    watch,
);


export {
    defaultTask as default,

    sync,

    compile,
    watch,
};
