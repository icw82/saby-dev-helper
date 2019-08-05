import { parallel } from 'gulp';
import { scripts, scriptsWatch } from './scripts.js';
import { styles, stylesWatch } from './styles.js';


const build = parallel(
    scripts,
    styles,
);

const buildWatch = parallel(
    scriptsWatch,
    stylesWatch,
);


export {
    build,
    buildWatch,
    stylesWatch,
};
