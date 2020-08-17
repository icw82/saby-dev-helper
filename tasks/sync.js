import { readlink, unlink } from 'fs';
import { resolve, relative, join } from 'path';
import { parallel, src, symlink, watch } from 'gulp';
import { default as debug } from 'gulp-debug';
import { settings, base_dir, is } from './../lib/';


const globToSync = [...settings.targets]
    .reduce((result, item) => {
        const rel = relative(base_dir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.xhtml`);
        result.push(`${ rel }/**/*.tmpl`);
        result.push(`${ rel }/**/*.wml`);

        result.push(`${ rel }/**/*.css`);
        result.push(`${ rel }/**/*.less`);

        // result.push(`${ rel }/**/*.js`);

        result.push(`!${ rel }/**/node_modules/**/*`);

        return result;
    }, []);

// const sdkGlob = [
//     `${ relative(base_dir, settings.sdk_modules) }/*`,
// ];

// src(sdkGlob)
//     .pipe(debug({title: 'Модуль SDK'}))
//     .pipe(symlink(settings.resources));

const sync = () => src(globToSync)
    // .pipe(debug())
    .pipe(symlink(settings.resources));


const syncWatch = cb => {
    const watcher = watch(globToSync);

    watcher.on('change', path => console.log(`File ${ resolve(path) } has been changed`));
    watcher.on('add', path => console.log(`File ${ resolve(path) } has been added`));
    watcher.on('unlink', path => console.log(`File ${ resolve(path) } has been removed`));

    watcher.on('change', parallel(sync));
    watcher.on('add', parallel(sync));
    watcher.on('unlink', path => {
        [...settings.targets].forEach(item => {
            const dest = join(
                settings.resources,
                relative(item, path),
            );

            if (is.link(dest)) {
                readlink(dest, (error, linkString) => {
                    if (!is.file(linkString)) {
                        unlink(dest);
                    }
                });
            }
        });
    });

    cb();
};


export {
    sync,
    syncWatch,
};
