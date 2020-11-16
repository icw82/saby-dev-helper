import { resolve, join, dirname, basename, relative } from 'path';
import { readdirSync, readFileSync, mkdirSync } from 'fs';

import { env } from 'process';
import chalk from 'chalk';
import { argv } from 'yargs';

import { is } from './is.js';


interface IParams {
    /**
     * Список целевых директорий
     */
    targets: Set<string>;

    /**
     * Путь до s3cld-файла проекта
     */
    s3cld: string;

    /**
     * Версия ES на выходе
     */
    output?: string;
}

interface IGenieStandMeta {
    CloudFile: string;
}

interface IGenieMeta {
    RootPath: string;
    Stands: IGenieStandMeta[];
    BinarySourceType: 'bstDIRECTORIES' | 'bstDISTRIB';
    BinaryDirectories?: string[];
    Distribution?: string;
}

interface ISettings extends IParams {
    /**
     * Список модулей, находящихся в целевых директориях
     */
    modules: Map<string, string>;

    /**
     * Путь до развёрнутого стенда
     */
    dest: string;

    /**
     * Путь до UI-ресурсов развёрнутого стенда
     */
    destModulesPath: string;

    /**
     * Путь до SDK
     */
    sdkPath: string;

    /**
     * Путь до UI-модулей SDK
     */
    sdkModulesPath: string;

    /**
     * Базовая директория сборщика
     */
    baseDir: string;
}

const messages = {
    meta: {
        notFound: (_strings, path) => `
            Не найден файл мета-информации Genie:
            ${ path }
            Нужно развернуть стенд.
        `,
        standNotFound: (_strings, path) => `
            Не найдена мета-информация стенда.
            Попробуйте удалить файл:
            ${ path }
            и развернуть стенд снова.
        `,
    },
    binaries: {
        notFound: (strings, path) => `
            Не найдена папка с дистрибутивом
            ${ path }
        `,
        modulesNotFound: (strings, path) => `
            Не найдена папка c модулями из дистрибутива
            ${ path }
        `,
    },
    sdk: {
        notFound: (strings, version) => `
            Не найден установленный SDK ${ version }
            Если SDK устанавливался, возможно, требуется перезагрузка
            системы для обновления переменных среды.
        `,
    },
};

/**
 * Возвращает текущие настройки сборщика
 */
const getParams = (): IParams => {
    const { s3cld, target, output } = argv;

    // TODO: проверка допустимых параметров?
    if (!s3cld || !target) {
        throw Error();
    }

    if (
        output !== undefined &&
        output !== 'string'
    ) {
        throw new TypeError();
    }

    if (typeof s3cld !== 'string') {
        throw new TypeError();
    }

    const targets = Array.isArray(target) ? target : [target];

    const result: IParams = {
        s3cld,
        targets: new Set(targets),
    };

    if (output) {
        result.output = output;
    }

    return result;
};

const IGNORE = [
    '.vscode',
];

/**
 * Возвращает список модулей, находящихся в целевых директориях
 * @param targets список целевых директорий
 */
const getModules = (
    targets: Set<string>,
): Map<string, string> => {
    const modules = new Map() as Map<string, string>;

    targets.forEach((target: string) => {
        const list = readdirSync(target);

        list.forEach(name => {
            if (
                !IGNORE.includes(name) &&
                !is.file(join(target, name)) // не is.directory, может быть ещё не создана
            ) {
                modules.set(name, target);
            }
        });

    });

    return modules;
};

/**
 * Возвращает необходимую информацию из меты Genie
 * @param s3cldPath путь до s3cld-файла проекта
 */
const getGenieMeta = (
    s3cldPath: string,
): IGenieMeta => {
    const source = dirname(s3cldPath);
    const name = basename(s3cldPath);

    // const genieMetaPath = join(source, '.genie/Storage', name, 'DeployStandSettings.json');
    const genieMetaPath = join(source, '.genie/Storage', name, 'DeployStandList.json');

    if (!is.file(genieMetaPath)) {
        throw new Error(chalk.red(
            messages.meta.notFound`${ genieMetaPath }`,
        ));
    }

    const fileData = readFileSync(genieMetaPath, 'utf8');

    const genieMeta = JSON.parse(fileData);

    const stand = genieMeta.Stands.find(stand => {
        // console.log(resolve(s3cldPath));
        // console.log(resolve(stand.CloudFile));
        // console.log(relative(resolve(s3cldPath), resolve(stand.CloudFile)), '\n');

        return relative(resolve(s3cldPath), resolve(stand.CloudFile)) === '';
    });

    // const key = Object.keys(genieMeta).find(item => {
    //     const path = resolve(item);
    //     return relative(path, source) === '..';
    // });

    if (!stand) {
        throw new Error(chalk.red(
            messages.meta.standNotFound`${ genieMetaPath }`,
        ));
    }

    console.log('genieMeta →', stand);

    return stand; //[key];
};

// const getGenieUnpackedDistrib = s3cldPath => {
//     const source = dirname(s3cldPath);

//     return join(source, '.genie/unpack_distrib');
// };

/**
 * Возвращает версию SDK, необходимого для s3cld-проекта
 * @param s3cldPath путь до s3cld-файла проекта
 */
const getSDKVersion = s3cldPath => {
    try {
        const data =
            readFileSync(s3cldPath, 'utf8');

        const re = /sdk_version="([\d.]+)"/g;
        const result = re.exec(data);

        if (result) {
            return result[1];
        }

        throw new Error('Не удалось определить версию SDK');
    } catch (error) {
        console.error(error);
    }
};

/**
 * Возвращает путь до SDK, необходимого для s3cld-проекта
 * @param s3cldPath путь до s3cld-файла проекта
 */
const getSDKPath = s3cldPath => {
    const version = getSDKVersion(s3cldPath);
    const envVarName = 'SBISPlatformSDK_' + version.replace('.', '');

    if (envVarName in env) {
        return env[envVarName];
    }

    throw new Error(chalk.red(
        messages.sdk.notFound`${ version }`,
    ));
};


/**
 * Возвращает настройки для сборщика
 */
const getSettings = (): ISettings => {

    const baseDir = resolve();
    const params = getParams();
    const modules = getModules(params.targets);
    const genieMeta = getGenieMeta(params.s3cld);

    // NOTE: Пока дистрибутивы не нужны для конвертации
    /*

    if (genieMeta.BinarySourceType === 'bstDIRECTORIES') {
        throw Error('Не предусмотрено использование папок с бинарниками');
        // const dirs = genieMeta.BinaryDirectories; // Path

    } else if (genieMeta.BinarySourceType === 'bstDISTRIB') {

        if (typeof genieMeta.Distribution !== 'string') {
            throw Error('Что-то поменялось у разработчиков Genie');
        }

        if (genieMeta.Distribution === '') {
            throw Error('Не указано место нахождения дистрибутива');
        }

        locals.binaries = getGenieUnpackedDistrib(locals.s3cld);

        if (!is.directory(locals.binaries)) {
            throw new Error(chalk.red(
                messages.binaries.notFound`${ locals.binaries }`
            ));
        }

        locals.distrib_modules = join(locals.binaries, 'Модули интерфейса');

        // if (!is.directory(locals.distrib_modules)) {
        //     throw new Error(chalk.red(
        //         messages.binaries.modulesNotFound`${locals.distrib_modules }`
        //     ));
        // }

    } else {
        throw Error(
            `Неизвестный тип источника бинарных файлов: ${ genieMeta.BinarySourceType }`
        );
    }
    */

    const dest = resolve(relative(baseDir, genieMeta.RootPath));
    const destModulesPath = join(dest, 'build-ui/resources');

    if (!is.directory(dest)) {
        mkdirSync(dest, { recursive: true });
        console.warn('Не найдена папка развёрнутого стенда. Создана новая');
    }

    if (!is.directory(destModulesPath)) {
        mkdirSync(destModulesPath, { recursive: true });
        console.warn('Не найдена папка UI-ресурсов. Создана новая');
    }

    const sdkPath = getSDKPath(params.s3cld);
    const sdkModulesPath = join(sdkPath, 'ui-modules');

    if (!is.directory(sdkPath)) {
        throw new Error('Не найдена папка SDK');
    }

    if (!is.directory(sdkModulesPath)) {
        throw new Error('Не найдена папка c модулями SDK');
    }

    return {
        ...params,
        baseDir,
        modules,
        dest,
        destModulesPath,
        sdkPath,
        sdkModulesPath,
    };
};

const settings = getSettings();


export {
    settings as default,
    settings,

    ISettings,
};
