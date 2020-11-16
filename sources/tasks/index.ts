import { series, parallel } from 'gulp';

import { clean } from './clean';
import { sync, syncWatch } from './sync';
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

const defaultTask = series(clean, sync, compile, watch);


export {
    defaultTask as default,

    clean,
    sync,

    compile,
    watch,
};
