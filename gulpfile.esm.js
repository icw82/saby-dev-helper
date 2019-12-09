import { series, parallel } from 'gulp';
import {
    clean,

    sync,
    syncWatch,

    build,
    buildWatch,

    scripts,
    scriptsWatch,

    styles,
    stylesWatch,

} from './tasks/';


const watch = parallel(
    syncWatch,
    buildWatch,
);

const defaultTask = series(
    clean,
    sync,
    build,
    watch,
);


export {
    defaultTask as default,

    clean,

    sync,
    syncWatch,

    build,
    buildWatch,

    scripts,
    scriptsWatch,

    styles,
    stylesWatch,

    watch,
};
