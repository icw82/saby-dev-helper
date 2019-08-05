import { series, parallel } from 'gulp';
import {
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

    build,
    buildWatch,

    scripts,
    scriptsWatch,

    styles,
    stylesWatch,

    watch,
};
