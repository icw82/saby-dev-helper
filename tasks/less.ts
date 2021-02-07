import { relative } from 'path';

import { parallel, src, dest, watch as gulpWatch } from 'gulp';

import insert = require('gulp-insert');
import gulpLess = require('gulp-less');

import { settings } from '../lib/settings';


const glob = [...settings.targets]
    .reduce((result, item) => {
        const rel = relative(settings.baseDir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.less`);
        result.push(`!${ rel }/**/node_modules/*`);

        return result;
    }, []);

const compileLess = () => src(glob)
    .pipe(insert.prepend('@import \'SBIS3.CONTROLS/themes/online/_variables\';'))
    .pipe(insert.prepend('@import \'Controls-default-theme/_mixins\';'))
    .pipe(insert.prepend('@import \'Controls-default-theme/_aliases\';'))
    .pipe(gulpLess({
        paths: [
            settings.destModulesPath,
            settings.sdkModulesPath,
        ],
    }))
    .pipe(dest(settings.destModulesPath));

const watchLess = async() => {
    const watcher = gulpWatch(glob);

    watcher.on('change', parallel(compileLess));
    watcher.on('add', parallel(compileLess));
};


export {
    compileLess,
    watchLess,
};
