import { parallel, src, dest, watch } from 'gulp';
import insert from 'gulp-insert';
import less from 'gulp-less';
import { settings } from './../lib/';


const glob = [];
settings.targets.forEach(target => {
    glob.push(`${target}/**/*.less`);
    glob.push(`!${target}/**/node_modules/**/*.less`);
});

const styles = () => src(glob)
    .pipe(insert.append('@import \'Controls-theme/themes/default/helpers/_mixins\';'))
    .pipe(insert.append('@import \'SBIS3.CONTROLS/themes/online/_variables.less\';'))
    .pipe(less({
        paths: [
            settings.resources,
            settings.sdk_modules,
        ],
    }))
    .pipe(dest(settings.resources));

const stylesWatch = cb => {
    const watcher = watch(glob);
    watcher.on('change', parallel(styles));
    cb();
};


export {
    styles,
    stylesWatch,
};
