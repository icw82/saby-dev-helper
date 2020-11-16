import * as fs from 'fs';
import { promisify } from 'util';
import { resolve, relative, join, extname, basename, dirname, sep } from 'path';

import globby from 'globby';

import { settings, ISettings, is } from './../lib/';
import { check } from 'yargs';


const stat = promisify(fs.stat);
const readlink = promisify(fs.readlink);
const unlink = promisify(fs.unlink);

/**
 * Возвращает Glob файлов модулей в развёрнутом стенде
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
    });

    return [...glob];
};

const glob = getGlobOfModulesInDest(settings);

interface IFileObject {
    name: string;
    path: string;
    dirent: fs.Dirent;
    stats: fs.Stats;
}

const checkOrigin = async(
    file: IFileObject,
    fileExt: string,
    originExt?: string,
) => {
    const path = dirname(relative(settings.destModulesPath, file.path));
    const module = path.split(sep).shift();
    const name = basename(file.name, fileExt);

    const target = resolve(settings.modules.get(module), path);

    const filePath = join(target, name + fileExt);

    if (originExt) {
        const originPath = join(target, name + originExt);

        if (is.file(originPath)) {
            // Если существует одноимённый исходный файл, то, скорее всего,
            // этот компилирован из него и трогать его не нужно
            return;
        }
    }

    if (is.file(filePath)) {
        // Если существует одноимённый исходный файл, нужно его удалить,
        // чтобы в последствии корректно создать символическую ссылку на него
        await unlink(file.path);

        // console.log('Unlinked:', resolve(file.path));
    }
};

const checkFile = async(file: IFileObject) => {
    if (file.dirent.isSymbolicLink()) {
        const linkString = await readlink(file.path);

        if (!is.file(linkString)) {
            await unlink(file.path);

            console.log('Unlinked:', resolve(file.path));
        }
    } else if (file.dirent.isFile()) {
        const ext = extname(file.name);

        if (ext === '.js') {
            return checkOrigin(file, '.js', '.ts');
        }

        if (ext === '.css') {
            return checkOrigin(file, '.css', '.less');
        }

        return checkOrigin(file, ext);
    }
};

const clean = async() => {
    const files = await globby(glob, {
        onlyFiles: false,
        stats: true,
    }) as unknown[];

    await Promise.all(files.map(checkFile));
};


export {
    clean,
};
