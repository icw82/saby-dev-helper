import * as fs from 'fs';
import { promisify } from 'util';
import { resolve, relative, join, extname, basename, dirname } from 'path';

import { watch } from 'gulp';
import globby from 'globby';

import { settings, is, ISettings } from './../lib/';


const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const symlink = promisify(fs.symlink);
const readlink = promisify(fs.readlink);
const unlink = promisify(fs.unlink);

const getGlobOfSources = (
    settings: ISettings,
): {
    glob: string[];
    relTargets: Set<string>;
} => {
    const glob = new Set() as Set<string>;
    const relTargets = new Set() as Set<string>;

    settings.targets.forEach((target: string) => {
        const rel = relative(settings.baseDir, target);

        relTargets.add(rel);

        const base = rel.replace(/\\/g, '/');

        glob.add(`${ base }/**/*.(ts|js|less|css|xhtml|tmpl|wml)`);
        glob.add(`!${ base }/**/node_modules/**/*`);
    });

    return {
        glob: [...glob],
        relTargets,
    };
};

const { glob, relTargets } = getGlobOfSources(settings);

// const sdkGlob = [
//     `${ relative(base_dir, settings.sdk_modules) }/*`,
// ];

// src(sdkGlob)
//     .pipe(debug({title: 'Модуль SDK'}))
//     .pipe(symlink(settings.resources));

// const sync = () => src(globToSync)
//     // .pipe(debug())
//     .pipe(symlink(settings.destModulesPath));

// const isCompiled = async(path, sourceExt, outputExt) => {

// };

const getPathInModule = ((path: string) => {
    let result: string;

    relTargets.forEach((target: string) => {
        const relPath = relative(target, path);

        if (!relPath.startsWith('..')) {
            if (result) {
                throw new Error();
            }

            result = relPath;
        }
    });

    return result;
});

const syncFile = async(
    source: string,
): Promise<void> => {
    const ext = extname(source);

    if (ext === '.js') {
        const name = basename(source, '.js');
        const ts = join(dirname(source),`${name}.ts`);

        if (is.file(ts)) {
            // Если JS-файл имеет одноимённый TS-файл,
            // то символическую ссылку создавать не нужно,
            // так как это приведёт к порче исходного JS при компиляции
            return;
        }
    }

    const pathInModule = getPathInModule(source);

    if (!pathInModule) {
        return;
    }

    const target = resolve(source);

    const dest = resolve(
        join(settings.destModulesPath, pathInModule),
    );

    const dir = dirname(dest);

    try {
        const stats = await stat(dest);

        if (stats.isSymbolicLink()) {
            const symlinkTarget = await readlink(dest);

            if (is.file(symlinkTarget)) {
                await unlink(dest);
            }
        }

        return;
    } catch (error) {
        if (error.code === 'ENOENT') {
            if (!is.directory(dir)) {
                await mkdir(dir, { recursive: true });
            }

            await symlink(target, dest, 'file');
        } else {
            console.error(error);
        }
    }
};

const sync = async() => {
    const files = await globby(glob, {
        onlyFiles: true,
    }) as unknown[];

    await Promise.all(files.map(syncFile));
};

const syncWatch = async() => {
    const watcher = watch(glob);

    watcher.on('change', path => {
        console.log(`File ${ resolve(path) } has been changed`);
        syncFile(path);
    });

    watcher.on('add', path => {
        console.log(`File ${ resolve(path) } has been added`);
        syncFile(path);
    });

    watcher.on('unlink', path => {
        console.log(`File ${ resolve(path) } has been removed`);
        syncFile(path);
    });
};


export {
    sync,
    syncWatch,
};
