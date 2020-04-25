import { resolve, relative } from 'path';
import { parallel, src, dest, watch } from 'gulp';
import insert from 'gulp-insert';
import less from 'gulp-less';
import { settings, base_dir } from './../lib/';


const glob = [...settings.targets]
    .reduce((result, item) => {
        const rel = relative(base_dir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.less`);
        result.push(`!${ rel }/**/node_modules/*`);
        return result;
    }, []);

const styles = () => src(glob)
    .pipe(insert.prepend('@import \'SBIS3.CONTROLS/themes/online/_variables\';'))
    .pipe(insert.prepend('@import \'Controls-default-theme/_mixins\';'))
    .pipe(insert.prepend('@import \'Controls-default-theme/_variables\';'))
    .pipe(less({
        paths: [
            settings.resources,
            settings.sdk_modules,
        ],
    }))
    .pipe(dest(settings.resources));

const stylesWatch = cb => {
    const watcher = watch(glob);

    console.log('glob', glob);

    watcher.on('change', path => console.log(`File ${ resolve(path) } has been changed`));
    watcher.on('add', path => console.log(`File ${ resolve(path) } has been added`));
    watcher.on('unlink', path => console.log(`File ${ resolve(path) } has been removed`));

    watcher.on('change', parallel(styles));
    cb();
};


export {
    styles,
    stylesWatch,
};
