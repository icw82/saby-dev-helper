import { readlink, unlink } from 'fs';
import { resolve, relative, join } from 'path';
import { parallel, series, src, dest, symlink, watch } from 'gulp';
import ts from 'gulp-typescript';
import { settings, base_dir, is } from './../lib/';


const tsProject = ts.createProject({
    alwaysStrict: true,
    baseUrl: settings.resources,
    // importHelpers: true,
    isolatedModules: true,
    lib: [
        'es2015',
        'es2016',
        'es2017',
        'dom',
    ],
    module: 'amd',
    moduleResolution: 'Classic', // 'node'
    // noUnusedLocals: true,
    paths: {
        'Core/*': ['WS.Core/core/*'],
        'Lib/*': ['WS.Core/lib/*'],
        'Transport/*': ['WS.Core/transport/*'],
    },
    target: 'es2020',
    // target: 'es5',

    // declaration: true,
    // noImplicitReturns: true,
    // noUnusedParameters: false,
    // forceConsistentCasingInFileNames: true,

});

// FIXME: Название
const convert = (result, item) => {
    const rel = relative(base_dir, item).replace(/\\/g, '/');

    result.push(`${ rel }/**/*.ts`);
    result.push(`!${ rel }/**/node_modules/**/*.ts`);

    return result;
};

const globToSync = [...settings.targets]
    .reduce(convert, []);

const globToCompile = [...settings.modules]
    .map(module => `${ settings.resources }/${ module }`)
    .reduce(convert, []);

globToCompile.unshift(
    relative(
        base_dir,
        `${ settings.sdk_modules }/WS.Core/ws.d.ts`,
    ).replace(/\\/g, '/'),
);

const sync = () => src(globToSync)
    .pipe(symlink(settings.resources));

const compile = () => src(globToCompile)
    .pipe(tsProject())
    .pipe(dest(file => {
        return join(
            settings.resources,
            relative(settings.resources, file.base),
        );
    }));


const scripts = series(
    sync,
    compile,
);

const scriptsWatch = cb => {
    const watcher = watch(globToSync);

    watcher.on('change', path => console.log(`File ${ resolve(path) } has been changed`));
    watcher.on('add', path => console.log(`File ${ resolve(path) } has been added`));
    watcher.on('unlink', path => console.log(`File ${ resolve(path) } has been removed`));

    watcher.on('change', parallel(scripts));
    watcher.on('add', parallel(scripts));
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
    scripts,
    scriptsWatch,
};
