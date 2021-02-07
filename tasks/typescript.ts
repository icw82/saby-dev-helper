import { relative, join } from 'path';

import { parallel, src, dest, watch as gulpWatch } from 'gulp';
import { createProject } from 'gulp-typescript';

import { settings } from '../lib/settings';

// TODO: Индикатор прогресса

const tsProject = createProject({
    alwaysStrict: true,
    baseUrl: settings.destModulesPath,
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
    target: settings.output || 'es2019', // Стенд пока не понимает «??»

    // declaration: true,
    // noImplicitReturns: true,
    // noUnusedParameters: false,
    // forceConsistentCasingInFileNames: true,
});

// FIXME: Название
const convert = (result, item) => {
    const rel = relative(settings.baseDir, item).replace(/\\/g, '/');

    result.push(`${ rel }/**/*.ts`);
    result.push(`!${ rel }/**/node_modules/**/*.ts`);

    return result;
};

const globToSync = [...settings.targets]
    .reduce(convert, []);

const globToCompile = [...settings.modules.keys()]
    .map(module => `${ settings.destModulesPath }/${ module }`)
    .reduce(convert, []);

globToCompile.unshift(
    relative(
        settings.baseDir,
        `${ settings.sdkModulesPath }/WS.Core/ws.d.ts`,
    ).replace(/\\/g, '/'),
);

const compileTypescript = () => src(globToCompile)
    .pipe(tsProject())
    .pipe(dest(file => {
        return join(
            settings.destModulesPath,
            relative(settings.destModulesPath, file.base),
        );
    }));

const watchTypescript = async() => {
    const watcher = gulpWatch(globToSync);

    watcher.on('change', parallel(compileTypescript));
    watcher.on('add', parallel(compileTypescript));
};


export {
    compileTypescript,
    watchTypescript,
};
