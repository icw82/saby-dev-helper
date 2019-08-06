import { series, parallel } from 'gulp';
import {
    clean,

    build,
    buildWatch,

    scripts,
    scriptsWatch,

    styles,
    stylesWatch,

} from './tasks/';


const watch = parallel(
    buildWatch,
);

const defaultTask = series(
    build,
    watch,
);


export {
    defaultTask as default,

    clean,

    build,
    buildWatch,

    scripts,
    scriptsWatch,

    styles,
    stylesWatch,

    watch,
};
