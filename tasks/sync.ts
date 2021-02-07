import { promises as fs, Dirent, Stats } from 'fs';
import { resolve, relative, join, extname, basename, dirname } from 'path';

import { watch } from 'gulp';
import globby = require('globby');

import { settings, ISettings } from './../lib/settings';
import { is } from './../lib/is';


interface IFileObject {
    name: string;
    path: string;
    dirent: Dirent;
    stats: Stats;
}

/**
 * Возвращает glob и набор относительных путей к заданным целям
 */
const getGlobOfSources = (
    targets,
    baseDir,
): {
    glob: string[];
    relTargets: Set<string>;
} => {
    const glob = new Set() as Set<string>;
    const relTargets = new Set() as Set<string>;

    targets.forEach((target: string) => {
        const rel = relative(baseDir, target);

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

/**
 * Возвращает Glob файлов модулей в билде
 */
const getGlobOfModulesInDest = (
    settings: ISettings,
): string[] => {

    const glob = new Set() as Set<string>;
    const relPathToResources = relative(
        settings.baseDir,
        settings.destModulesPath,
    );

    settings.modules.forEach((
        target: string,
        module: string,
    ): void => {
        const rel = join(relPathToResources, module).replace(/\\/g, '/');

        glob.add(`${ rel }/**/*.(ts|js|less|css|xhtml|tmpl|wml)`);
        glob.add(`!${ rel }/**/node_modules/**/*`);
        glob.add(`!${ rel }/**/*.min.*`);
    });

    return [...glob];
};

const { glob, relTargets } = getGlobOfSources(settings.targets, settings.baseDir);

const destGlob = getGlobOfModulesInDest(settings);

// const sdkGlob = [
//     `${ relative(base_dir, settings.sdk_modules) }/*`,
// ];

// src(sdkGlob)
//     .pipe(debug({title: 'Модуль SDK'}))
//     .pipe(symlink(settings.resources));

// const sync = () => src(globToSync)
//     // .pipe(debug())
//     .pipe(symlink(settings.destModulesPath));

/**
 * Возвращает часть пути к файлу в модуле
 * @param path путь к исходному файлу
 */
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

const CONVERTING = new Map([
    ['ts', 'js'],
    ['less', 'css'],
]);

const ORIGIN = new Map([
    ['js', 'ts'],
    ['css', 'less'],
]);

const makeSymLink = async(
    path: string,
    value: string,
) => {
    const dir = dirname(path);
    const target = resolve(value);

    if (!is.directory(dir)) {
        await fs.mkdir(dir, { recursive: true });
    }

    await fs.symlink(target, path, 'file');
};

/**
 * Синхронизирует исходный файл
 * @param path путь к исходному файлу
 */
const syncSourceFile = async(
    path: string,
): Promise<void> => {
    const pathInModule = getPathInModule(path);

    /**
     * Если файл не относится к целевым модулям, он игнорируется
     */
    if (!pathInModule) {
        return;
    }

    const extension = extname(path).slice(1);
    const name = basename(path, extname(path));

    /**
     * Файл может быть результатом компиляции,
     * проверка наличия исходного файла
     */
    if (ORIGIN.has(extension)) {
        /**
         * Путь к предполагаемому одноимённому исходному файлу
         */
        const origin = join(
            dirname(path),
            `${name}.${ORIGIN.get(extension)}`,
        );

        /**
         * Если есть одноимённыё исходный файл
         */
        if (is.file(origin)) {
            console.error(path);
            console.error(origin);

            // TODO: удалять по флагу

            throw new Error();
        }
    }

    /**
     * Файл является исходным, нужно создать ссылку в билде
     */

    /**
     * Путь до файла в билде
     */
    const dest = resolve(
        join(settings.destModulesPath, pathInModule),
    );

    try {
        const destFileStats = await fs.lstat(dest);

        if (destFileStats.isFile()) {
            // Файл в билде не нужен
            await fs.unlink(dest);

            // Замена ссылкой
            await makeSymLink(dest, path);

        } else if (destFileStats.isSymbolicLink()) {
            // Оставляет только ту ссылку в билде,
            // что ссылается на исходный файл
            const symlinkTarget = await fs.readlink(dest);

            if (relative(symlinkTarget, path) !== '') {
                // Ссылка левая
                await fs.unlink(dest);

                await makeSymLink(dest, path);
            }
        }
    } catch (error) {
        // По пути dest ничего нет
        if (error.code === 'ENOENT') {
            await makeSymLink(dest, path);
        } else {
            console.error(error);
        }
    }

    // На данном этапе создана ссылка на оригинальный файл
    // NOTE: ссылки нужны для работы ts в vs code, так как импорты часто указаны
    //       относительно директории со всеми модулями

    if (CONVERTING.has(extension)) {
        // Проверка наличия одноименного конвертированного файла в билде
        const destCompiled =
            dest.replace(/\.[^/.]+$/, '.' + CONVERTING.get(extension));

        try {
            await fs.unlink(destCompiled);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.log(error);
            }
        }
    }
};

const checkDestFile = async(file: IFileObject) => {
    if (file.dirent.isSymbolicLink()) {
        const linkString = await fs.readlink(file.path);

        if (!is.file(linkString)) {
            await fs.unlink(file.path);

            console.log('Unlinked:', resolve(file.path));
        }
    } else if (file.dirent.isFile()) {
        const ext = extname(file.name);

        if (['.ts','.less'].includes(ext)) {
            await fs.unlink(file.path);
        }
    }
};

const sync = async() => {
    {
        // Очистка билда от битых ссылок

        const files = await globby(destGlob, {
            onlyFiles: false,
            stats: true,
        }) as unknown[];

        await Promise.all(files.map(checkDestFile));
    }

    {
        const files = await globby(glob, {
            onlyFiles: true,
        }) as unknown[];

        await Promise.all(files.map(syncSourceFile));
    }
};

const syncWatch = async() => {
    const watcher = watch(glob);

    watcher.on('change', path => {
        console.log(`File ${ resolve(path) } has been changed`);
        // syncSourceFile(path);
    });

    watcher.on('add', path => {
        console.log(`File ${ resolve(path) } has been added`);
        syncSourceFile(path);
    });

    // FIXME: Почему не удаляются TS?
    watcher.on('unlink', path => {
        console.log(`File ${ resolve(path) } has been removed`);
        syncSourceFile(path);
    });
};


export {
    sync,
    syncWatch,
};
