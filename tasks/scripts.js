import { resolve, relative, join } from 'path';
import { parallel, series, src, dest, symlink, watch } from 'gulp';
import ts from 'gulp-typescript';
import { settings, base_dir } from './../lib/';


const tsProject = ts.createProject({
    target: 'es5',
    module: 'amd',
    lib: [
        'es2015',
        'es2016',
        'es2017',
        'dom',
    ],

    // declaration: true,
    noImplicitReturns: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    strict: true,

    forceConsistentCasingInFileNames: true,

    moduleResolution: 'Classic', // 'node'
});

const globToSync = [...settings.targets]
    .reduce((result, item) => {
        const rel = relative(base_dir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.ts`);
        result.push(`!${ rel }/**/node_modules/**/*.ts`);
        return result;
    }, []);


const globToCompile = [...settings.modules]
    .map(module => `${ settings.resources }/${ module }`)
    .reduce((result, item) => {
        const rel = relative(base_dir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.ts`);
        result.push(`!${ rel }/**/node_modules/**/*.ts`);
        return result;
    }, []);

const sync = () => src(globToSync)
    .pipe(symlink(settings.resources));

const aaa = file => {
    return join(
        settings.resources,
        relative(settings.resources, file.base)
    );
};

const compile = () => src(globToCompile)
    .pipe(tsProject())
    .pipe(dest(aaa));


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
    cb();
};


export {
    scripts,
    scriptsWatch,
};
